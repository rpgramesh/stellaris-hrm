import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deductionsProcessingService } from '../deductionsProcessingService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          or: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
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

describe('DeductionsProcessingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateEmployeeDeductions', () => {
    const mockEmployee = {
      id: 'emp-123',
      companyId: 'comp-456',
      annualSalary: 80000,
      payFrequency: 'fortnightly',
      employmentType: 'FullTime'
    };

    const mockPayPeriod = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-14'),
      frequency: 'fortnightly'
    };

    it('should calculate pre-tax deductions correctly', async () => {
      // Mock employee deductions
      const mockDeductions = [
        {
          id: 'ded-1',
          employee_id: 'emp-123',
          name: 'Salary Packaging',
          deduction_type: 'pre-tax',
          category: 'salary-packaging',
          calculation_method: 'fixed',
          amount: 200,
          priority: 10,
          status: 'active',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      // Mock the database response
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            or: () => ({
              order: () => Promise.resolve({ data: mockDeductions, error: null })
            })
          })
        })
      } as any));

      const grossPay = 3000;
      const taxableIncome = 3000;

      const result = await deductionsProcessingService.calculateEmployeeDeductions(
        mockEmployee,
        grossPay,
        taxableIncome,
        mockPayPeriod
      );

      expect(result).toBeDefined();
      expect(result.preTaxDeductions).toHaveLength(1);
      expect(result.totalPreTaxDeductions).toBe(200);
      expect(result.taxableIncomeAfterDeductions).toBe(2800);
    });

    it('should calculate post-tax deductions correctly', async () => {
      const mockDeductions = [
        {
          id: 'ded-2',
          employee_id: 'emp-123',
          name: 'Union Fees',
          deduction_type: 'post-tax',
          category: 'union-fees',
          calculation_method: 'percentage',
          percentage: 1,
          base_for_percentage: 'gross',
          priority: 5,
          status: 'active',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            or: () => ({
              order: () => Promise.resolve({ data: mockDeductions, error: null })
            })
          })
        })
      } as any));

      const grossPay = 3000;
      const taxableIncome = 3000;

      const result = await deductionsProcessingService.calculateEmployeeDeductions(
        mockEmployee,
        grossPay,
        taxableIncome,
        mockPayPeriod
      );

      expect(result.postTaxDeductions).toHaveLength(1);
      expect(result.totalPostTaxDeductions).toBe(30); // 1% of 3000
    });

    it('should handle priority ordering correctly', async () => {
      const mockDeductions = [
        {
          id: 'ded-1',
          employee_id: 'emp-123',
          name: 'High Priority',
          deduction_type: 'pre-tax',
          category: 'salary-packaging',
          calculation_method: 'fixed',
          amount: 100,
          priority: 20,
          status: 'active',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        {
          id: 'ded-2',
          employee_id: 'emp-123',
          name: 'Low Priority',
          deduction_type: 'pre-tax',
          category: 'voluntary',
          calculation_method: 'fixed',
          amount: 50,
          priority: 10,
          status: 'active',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            or: () => ({
              order: () => Promise.resolve({ data: mockDeductions, error: null })
            })
          })
        })
      } as any));

      const grossPay = 3000;
      const taxableIncome = 3000;

      const result = await deductionsProcessingService.calculateEmployeeDeductions(
        mockEmployee,
        grossPay,
        taxableIncome,
        mockPayPeriod
      );

      expect(result.preTaxDeductions).toHaveLength(2);
      expect(result.preTaxDeductions[0].name).toBe('High Priority');
      expect(result.preTaxDeductions[1].name).toBe('Low Priority');
    });

    it('should handle formula-based deductions (child support)', async () => {
      const mockDeductions = [
        {
          id: 'ded-1',
          employee_id: 'emp-123',
          name: 'Child Support',
          deduction_type: 'post-tax',
          category: 'child-support',
          calculation_method: 'formula',
          formula: 'disposable_income * 0.18',
          formula_parameters: { childrenCount: 1 },
          priority: 15,
          status: 'active',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            or: () => ({
              order: () => Promise.resolve({ data: mockDeductions, error: null })
            })
          })
        })
      } as any));

      const grossPay = 3000;
      const taxableIncome = 3000;

      const result = await deductionsProcessingService.calculateEmployeeDeductions(
        mockEmployee,
        grossPay,
        taxableIncome,
        mockPayPeriod
      );

      expect(result.postTaxDeductions).toHaveLength(1);
      expect(result.postTaxDeductions[0].name).toBe('Child Support');
      expect(result.postTaxDeductions[0].currentAmount).toBeGreaterThan(0);
    });

    it('should apply annual caps correctly', async () => {
      const mockDeductions = [
        {
          id: 'ded-1',
          employee_id: 'emp-123',
          name: 'Meal Entertainment',
          deduction_type: 'pre-tax',
          category: 'salary-packaging',
          calculation_method: 'fixed',
          amount: 500,
          annual_cap: 2650,
          priority: 10,
          status: 'active',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      // Mock YTD amount
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation(((table: string) => {
        if (table === 'deductions') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({
                  order: () => Promise.resolve({ data: mockDeductions, error: null })
                })
              })
            })
          };
        }
        if (table === 'payslip_deductions') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  lte: () => Promise.resolve({
                    data: [{ amount: 2000 }], // Already used $2000 of cap
                    error: null
                  })
                })
              })
            })
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }) as any);

      const grossPay = 3000;
      const taxableIncome = 3000;

      const result = await deductionsProcessingService.calculateEmployeeDeductions(
        mockEmployee,
        grossPay,
        taxableIncome,
        mockPayPeriod
      );

      expect(result.preTaxDeductions[0].currentAmount).toBe(650); // Remaining cap
    });

    it('should handle minimum and maximum limits', async () => {
      const mockDeductions = [
        {
          id: 'ded-1',
          employee_id: 'emp-123',
          name: 'Union Fees',
          deduction_type: 'post-tax',
          category: 'union-fees',
          calculation_method: 'percentage',
          percentage: 0.5, // 0.5% of gross
          base_for_percentage: 'gross',
          minimum_amount: 10,
          maximum_amount: 25,
          priority: 10,
          status: 'active',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            or: () => ({
              order: () => Promise.resolve({ data: mockDeductions, error: null })
            })
          })
        })
      } as any));

      const grossPay = 3000;
      const taxableIncome = 3000;

      const result = await deductionsProcessingService.calculateEmployeeDeductions(
        mockEmployee,
        grossPay,
        taxableIncome,
        mockPayPeriod
      );

      // 0.5% of 3000 = 15, which is between min (10) and max (25)
      expect(result.postTaxDeductions[0].currentAmount).toBe(15);
    });

    it('should handle tiered deductions', async () => {
      const mockDeductions = [
        {
          id: 'ded-1',
          employee_id: 'emp-123',
          name: 'Graduated Union Fees',
          deduction_type: 'post-tax',
          category: 'union-fees',
          calculation_method: 'tiered',
          tiers: [
            { threshold: 0, rate: 0.5 },
            { threshold: 2000, rate: 0.3 },
            { threshold: 4000, rate: 0.1 }
          ],
          base_for_percentage: 'gross',
          priority: 10,
          status: 'active',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            or: () => ({
              order: () => Promise.resolve({ data: mockDeductions, error: null })
            })
          })
        })
      } as any));

      const grossPay = 3000;
      const taxableIncome = 3000;

      const result = await deductionsProcessingService.calculateEmployeeDeductions(
        mockEmployee,
        grossPay,
        taxableIncome,
        mockPayPeriod
      );

      // Tiered calculation: (2000 * 0.5%) + (1000 * 0.3%) = 10 + 3 = 13
      expect(result.postTaxDeductions[0].currentAmount).toBe(13);
    });
  });

  describe('createDeduction', () => {
    it('should create a valid deduction', async () => {
      const newDeduction = {
        employeeId: 'emp-123',
        name: 'Test Deduction',
        deductionType: 'pre-tax' as const,
        category: 'voluntary' as const,
        calculationMethod: 'fixed' as const,
        amount: 100,
        priority: 10,
        roundingMethod: 'nearest-cent' as const,
        superannuationTreatment: 'no-effect' as const,
        reportableFbt: false,
        requiresApproval: false
      };

      const result = await deductionsProcessingService.createDeduction(newDeduction);

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id');
      expect(result.name).toBe('Test Deduction');
    });

    it('should validate required fields', async () => {
      const invalidDeduction = {
        employeeId: '',
        name: '',
        deductionType: 'invalid' as any,
        category: 'voluntary' as const,
        calculationMethod: 'fixed' as const,
        priority: 10,
        roundingMethod: 'nearest-cent' as const,
        superannuationTreatment: 'no-effect' as const,
        reportableFbt: false,
        requiresApproval: false
      };

      await expect(
        deductionsProcessingService.createDeduction(invalidDeduction)
      ).rejects.toThrow('Employee ID is required');
    });

    it('should validate percentage deductions', async () => {
      const invalidDeduction = {
        employeeId: 'emp-123',
        name: 'Invalid Percentage Deduction',
        deductionType: 'pre-tax' as const,
        category: 'voluntary' as const,
        calculationMethod: 'percentage' as const,
        // Missing percentage
        priority: 10,
        roundingMethod: 'nearest-cent' as const,
        superannuationTreatment: 'no-effect' as const,
        reportableFbt: false,
        requiresApproval: false
      };

      await expect(
        deductionsProcessingService.createDeduction(invalidDeduction)
      ).rejects.toThrow('Percentage is required for percentage-based deductions');
    });
  });

  describe('updateDeduction', () => {
    it('should update an existing deduction', async () => {
      // Mock existing deduction
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation(((table: string) => {
        if (table === 'deductions') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'ded-123',
                    employee_id: 'emp-123',
                    name: 'Old Name',
                    deduction_type: 'pre-tax',
                    category: 'voluntary',
                    calculation_method: 'fixed',
                    amount: 100,
                    priority: 10,
                    status: 'active',
                    start_date: '2024-01-01',
                    end_date: null,
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
      }) as any);

      const updates = {
        name: 'Updated Name',
        amount: 150
      };

      const result = await deductionsProcessingService.updateDeduction('ded-123', updates);

      expect(result.name).toBe('Updated Name');
      expect(result.amount).toBe(150);
    });

    it('should reject update for non-existent deduction', async () => {
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } })
          })
        })
      } as any));

      await expect(
        deductionsProcessingService.updateDeduction('non-existent', { name: 'New Name' })
      ).rejects.toThrow('Deduction not found');
    });
  });

  describe('getDeductionsByEmployee', () => {
    it('should return all employee deductions', async () => {
      const mockDeductions = [
        {
          id: 'ded-1',
          employee_id: 'emp-123',
          name: 'Deduction 1',
          deduction_type: 'pre-tax',
          category: 'voluntary',
          calculation_method: 'fixed',
          amount: 100,
          priority: 10,
          status: 'active',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        {
          id: 'ded-2',
          employee_id: 'emp-123',
          name: 'Deduction 2',
          deduction_type: 'post-tax',
          category: 'union-fees',
          calculation_method: 'percentage',
          percentage: 1,
          base_for_percentage: 'gross',
          priority: 5,
          status: 'active',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockDeductions, error: null })
          })
        })
      } as any));

      const result = await deductionsProcessingService.getDeductionsByEmployee('emp-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Deduction 1');
      expect(result[1].name).toBe('Deduction 2');
    });
  });
});