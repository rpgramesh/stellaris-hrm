import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bonusCalculationsService } from '../bonusCalculationsService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
        }))
      }))
    }))
  }
}));

describe('BonusCalculationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateBonus', () => {
    const mockEmployee = {
      id: 'emp-123',
      companyId: 'comp-456',
      annualSalary: 80000,
      payFrequency: 'fortnightly',
      employmentType: 'FullTime',
      dateOfBirth: '1990-01-01',
      startDate: '2020-01-01',
      superannuationRate: 0.11
    };

    const paymentDate = new Date('2024-01-15');

    it('should calculate performance bonus with marginal tax rates', async () => {
      const result = await bonusCalculationsService.calculateBonus(
        mockEmployee,
        'performance',
        5000,
        paymentDate
      );

      expect(result).toBeDefined();
      expect(result.bonusPayment.grossAmount).toBe(5000);
      expect(result.bonusPayment.taxMethod).toBe('marginal-rates');
      expect(result.bonusPayment.taxWithheld).toBeGreaterThan(0);
      expect(result.bonusPayment.netAmount).toBeGreaterThan(0);
      expect(result.bonusPayment.netAmount).toBeLessThan(5000);
    });

    it('should calculate commission bonus with schedule-5 tax method', async () => {
      const result = await bonusCalculationsService.calculateBonus(
        mockEmployee,
        'commission',
        3000,
        paymentDate,
        {
          commissionRate: 0.05,
          salesAmount: 60000
        }
      );

      expect(result.bonusPayment.taxMethod).toBe('schedule-5');
      expect(result.bonusPayment.calculationDetails.commissionRate).toBe(0.05);
      expect(result.bonusPayment.calculationDetails.salesAmount).toBe(60000);
    });

    it('should calculate retention bonus with average tax rates', async () => {
      const result = await bonusCalculationsService.calculateBonus(
        mockEmployee,
        'retention',
        10000,
        paymentDate,
        {
          taxMethod: 'average-rates'
        }
      );

      expect(result.bonusPayment.taxMethod).toBe('average-rates');
      expect(result.bonusPayment.grossAmount).toBe(10000);
      expect(result.bonusPayment.taxWithheld).toBeGreaterThan(0);
    });

    it('should calculate referral bonus with fixed tax rate', async () => {
      const result = await bonusCalculationsService.calculateBonus(
        mockEmployee,
        'referral',
        2000,
        paymentDate,
        {
          taxMethod: 'fixed-rate'
        }
      );

      expect(result.bonusPayment.taxMethod).toBe('fixed-rate');
      // Fixed rate is 47%, so tax should be approximately 47% of bonus
      const expectedTax = 2000 * 0.47;
      expect(result.bonusPayment.taxWithheld).toBeCloseTo(expectedTax, 0);
    });

    it('should handle pro-rata calculations', async () => {
      const result = await bonusCalculationsService.calculateBonus(
        mockEmployee,
        'performance',
        10000,
        paymentDate,
        {
          proRataDays: 180 // Half year
        }
      );

      // Pro-rata should reduce the bonus amount
      expect(result.bonusPayment.grossAmount).toBeLessThan(10000);
      expect(result.bonusPayment.grossAmount).toBeCloseTo(5000, 0); // Approximately half
    });

    it('should include superannuation by default', async () => {
      const result = await bonusCalculationsService.calculateBonus(
        mockEmployee,
        'performance',
        5000,
        paymentDate
      );

      expect(result.bonusPayment.superannuationAmount).toBeGreaterThan(0);
      const expectedSuper = result.bonusPayment.grossAmount * 0.11;
      expect(result.bonusPayment.superannuationAmount).toBeCloseTo(expectedSuper, 2);
    });

    it('should exclude superannuation when specified', async () => {
      const result = await bonusCalculationsService.calculateBonus(
        mockEmployee,
        'performance',
        5000,
        paymentDate,
        {
          includeSuperannuation: false
        }
      );

      expect(result.bonusPayment.superannuationAmount).toBe(0);
    });

    it('should handle ETP calculations for termination payments', async () => {
      const result = await bonusCalculationsService.calculateBonus(
        mockEmployee,
        'retirement',
        50000,
        paymentDate,
        {
          taxMethod: 'etf'
        }
      );

      expect(result.bonusPayment.taxMethod).toBe('etf');
      expect(result.taxCalculation.method).toContain('ETP');
      expect(result.taxCalculation.taxFreeComponent).toBeDefined();
      expect(result.taxCalculation.taxableComponent).toBeDefined();
    });

    it('should validate bonus parameters', async () => {
      await expect(
        bonusCalculationsService.calculateBonus(
          mockEmployee,
          'commission',
          1000,
          paymentDate
          // Missing required commission parameters
        )
      ).rejects.toThrow('Sales amount is required for commission bonuses');
    });

    it('should handle negative bonus amounts', async () => {
      await expect(
        bonusCalculationsService.calculateBonus(
          mockEmployee,
          'performance',
          -1000,
          paymentDate
        )
      ).rejects.toThrow('Bonus amount must be greater than zero');
    });
  });

  describe('calculateCommissionBonus', () => {
    const mockEmployee = {
      id: 'emp-123',
      companyId: 'comp-456',
      annualSalary: 80000,
      payFrequency: 'fortnightly',
      employmentType: 'FullTime',
      dateOfBirth: '1990-01-01',
      startDate: '2020-01-01',
      superannuationRate: 0.11
    };

    const paymentDate = new Date('2024-01-15');

    it('should calculate basic commission', async () => {
      const result = await bonusCalculationsService.calculateCommissionBonus(
        mockEmployee,
        100000, // Sales amount
        0.05,   // 5% commission rate
        paymentDate
      );

      expect(result.bonusPayment.grossAmount).toBe(5000); // 5% of 100,000
      expect(result.bonusPayment.calculationDetails.salesAmount).toBe(100000);
      expect(result.bonusPayment.calculationDetails.commissionRate).toBe(0.05);
    });

    it('should handle tiered commission rates', async () => {
      const tieredRates = [
        { threshold: 0, rate: 0.02 },
        { threshold: 50000, rate: 0.05 },
        { threshold: 100000, rate: 0.08 }
      ];

      const result = await bonusCalculationsService.calculateCommissionBonus(
        mockEmployee,
        150000, // Sales amount
        0,      // Not used with tiered rates
        paymentDate,
        {
          tieredRates
        }
      );

      // Tiered calculation: (50,000 * 2%) + (50,000 * 5%) + (50,000 * 8%) = 1,000 + 2,500 + 4,000 = 7,500
      expect(result.bonusPayment.grossAmount).toBe(7500);
    });

    it('should enforce minimum sales requirements', async () => {
      await expect(
        bonusCalculationsService.calculateCommissionBonus(
          mockEmployee,
          10000, // Below minimum
          0.05,
          paymentDate,
          {
            minimumSales: 50000
          }
        )
      ).rejects.toThrow('Sales amount 10000 is below minimum requirement 50000');
    });

    it('should apply maximum commission caps', async () => {
      const result = await bonusCalculationsService.calculateCommissionBonus(
        mockEmployee,
        1000000, // Very high sales
        0.10,    // 10% commission
        paymentDate,
        {
          maximumCommission: 10000
        }
      );

      expect(result.bonusPayment.grossAmount).toBe(10000); // Capped at maximum
    });
  });

  describe('calculatePerformanceBonus', () => {
    const mockEmployee = {
      id: 'emp-123',
      companyId: 'comp-456',
      annualSalary: 80000,
      payFrequency: 'fortnightly',
      employmentType: 'FullTime',
      dateOfBirth: '1990-01-01',
      startDate: '2020-01-01',
      superannuationRate: 0.11
    };

    const paymentDate = new Date('2024-01-15');

    it('should calculate performance bonus with standard multipliers', async () => {
      const result = await bonusCalculationsService.calculatePerformanceBonus(
        mockEmployee,
        10000, // Base bonus amount
        85,    // Performance score
        paymentDate
      );

      expect(result.bonusPayment.grossAmount).toBeGreaterThan(0);
      expect(result.bonusPayment.calculationDetails.performanceScore).toBe(85);
      expect(result.bonusPayment.calculationDetails.performanceMultiplier).toBeDefined();
    });

    it('should apply custom performance thresholds', async () => {
      const performanceThresholds = [
        { threshold: 90, multiplier: 1.5 },
        { threshold: 80, multiplier: 1.2 },
        { threshold: 70, multiplier: 1.0 },
        { threshold: 60, multiplier: 0.5 }
      ];

      const result = await bonusCalculationsService.calculatePerformanceBonus(
        mockEmployee,
        10000,
        85,
        paymentDate,
        {
          performanceThresholds
        }
      );

      expect(result.bonusPayment.grossAmount).toBe(12000); // 1.2 * 10,000
      expect(result.bonusPayment.calculationDetails.performanceMultiplier).toBe(1.2);
    });

    it('should apply team performance factor', async () => {
      const result = await bonusCalculationsService.calculatePerformanceBonus(
        mockEmployee,
        10000,
        80,
        paymentDate,
        {
          teamPerformance: 90
        }
      );

      // Base multiplier for 80% is 1.0, team performance factor is 0.7 + 0.3 * (90/100) = 0.97
      // Final multiplier should be 1.0 * 0.97 = 0.97
      expect(result.bonusPayment.grossAmount).toBeCloseTo(9700, 0);
    });

    it('should apply company performance factor', async () => {
      const result = await bonusCalculationsService.calculatePerformanceBonus(
        mockEmployee,
        10000,
        80,
        paymentDate,
        {
          companyPerformance: 120
        }
      );

      // Base multiplier for 80% is 1.0, company performance factor is 0.8 + 0.2 * (120/100) = 1.04
      // Final multiplier should be 1.0 * 1.04 = 1.04
      expect(result.bonusPayment.grossAmount).toBeCloseTo(10400, 0);
    });

    it('should validate performance score range', async () => {
      await expect(
        bonusCalculationsService.calculatePerformanceBonus(
          mockEmployee,
          10000,
          150, // Invalid score
          paymentDate
        )
      ).rejects.toThrow('Performance score must be between 0 and 100');
    });
  });

  describe('processBonusPayment', () => {
    it('should create bonus payment record', async () => {
      const bonusResult = {
        bonusPayment: {
          employeeId: 'emp-123',
          bonusType: 'performance',
          grossAmount: 5000,
          taxMethod: 'marginal-rates',
          taxWithheld: 1500,
          superannuationAmount: 550,
          netAmount: 3500,
          paymentDate: new Date('2024-01-15'),
          status: 'calculated',
          calculationDetails: {},
          approvalStatus: 'pending',
          isReportable: true,
          payPeriodStart: new Date('2024-01-01'),
          payPeriodEnd: new Date('2024-01-15')
        },
        taxCalculation: {},
        warnings: [],
        validationErrors: []
      };

      const result = await bonusCalculationsService.processBonusPayment(bonusResult);

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id');
      expect(result.employee_id).toBe('emp-123');
      expect(result.bonus_type).toBe('performance');
    });
  });

  describe('approveBonusPayment', () => {
    it('should approve pending bonus payment', async () => {
      // Mock existing bonus payment
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'bonus_payments') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ 
                  data: { 
                    id: 'bonus-123',
                    employee_id: 'emp-123',
                    bonus_type: 'performance',
                    gross_amount: 5000,
                    tax_method: 'marginal-rates',
                    tax_withheld: 1500,
                    superannuation_amount: 550,
                    net_amount: 3500,
                    payment_date: '2024-01-15',
                    status: 'calculated',
                    calculation_details: {},
                    approval_status: 'pending',
                    is_reportable: true,
                    pay_period_start: '2024-01-01',
                    pay_period_end: '2024-01-15',
                    created_at: '2024-01-01',
                    updated_at: '2024-01-01'
                  }, 
                  error: null 
                })
              })
            })
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      } as any);

      const result = await bonusCalculationsService.approveBonusPayment('bonus-123', 'manager-456');

      expect(result.approval_status).toBe('approved');
      expect(result.approved_by).toBe('manager-456');
      expect(result.approved_at).toBeDefined();
    });

    it('should reject approval for non-pending bonus', async () => {
      // Mock already approved bonus payment
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'bonus_payments') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ 
                  data: { 
                    id: 'bonus-123',
                    approval_status: 'approved'
                  }, 
                  error: null 
                })
              })
            })
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      } as any);

      await expect(
        bonusCalculationsService.approveBonusPayment('bonus-123', 'manager-456')
      ).rejects.toThrow('Bonus payment is not in pending status');
    });
  });

  describe('getBonusPaymentsByEmployee', () => {
    it('should return all employee bonus payments', async () => {
      const mockBonusPayments = [
        {
          id: 'bonus-1',
          employee_id: 'emp-123',
          bonus_type: 'performance',
          gross_amount: 5000,
          tax_method: 'marginal-rates',
          tax_withheld: 1500,
          superannuation_amount: 550,
          net_amount: 3500,
          payment_date: '2024-01-15',
          status: 'paid',
          calculation_details: {},
          approval_status: 'approved',
          is_reportable: true,
          pay_period_start: '2024-01-01',
          pay_period_end: '2024-01-15',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        {
          id: 'bonus-2',
          employee_id: 'emp-123',
          bonus_type: 'commission',
          gross_amount: 3000,
          tax_method: 'schedule-5',
          tax_withheld: 900,
          superannuation_amount: 330,
          net_amount: 2100,
          payment_date: '2024-02-15',
          status: 'paid',
          calculation_details: {},
          approval_status: 'approved',
          is_reportable: true,
          pay_period_start: '2024-02-01',
          pay_period_end: '2024-02-15',
          created_at: '2024-02-01',
          updated_at: '2024-02-01'
        }
      ];

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockBonusPayments, error: null })
          })
        })
      } as any));

      const result = await bonusCalculationsService.getBonusPaymentsByEmployee('emp-123');

      expect(result).toHaveLength(2);
      expect(result[0].bonusType).toBe('performance');
      expect(result[1].bonusType).toBe('commission');
    });
  });
});