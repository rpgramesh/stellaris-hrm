import { SuperannuationManagementService } from '../superannuationManagementService';
import { SuperannuationContribution, SuperFund, PayrollEmployee, SuperannuationPayment, SuperChoiceRequest, SuperComplianceReport } from '../../types/payroll';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null
          })),
          order: jest.fn(() => ({
            data: null,
            error: null
          })),
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              data: null,
              error: null
            })),
            data: null,
            error: null
          })),
          lte: jest.fn(() => ({
            data: null,
            error: null
          })),
          in: jest.fn(() => ({
            data: null,
            error: null
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: 'test-id' },
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe('SuperannuationManagementService', () => {
  let service: SuperannuationManagementService;
  let mockEmployee: PayrollEmployee;
  let mockSuperFund: SuperFund;

  beforeEach(() => {
    service = new SuperannuationManagementService();
    
    // Mock employee data
    mockEmployee = {
      id: 'payroll-emp-001',
      employeeId: 'emp-001',
      baseSalary: 75000,
      payFrequency: 'Monthly',
      taxFileNumber: '123456789',
      taxScale: 'TaxFreeThreshold',
      residencyStatus: 'Resident',
      employmentType: 'FullTime',
      superFundId: 'super-fund-001',
      superMemberNumber: 'MEM123456',
      awardClassification: 'Level 1',
      isSalarySacrifice: false,
      effectiveFrom: '2024-01-01',
      effectiveTo: undefined
    };

    // Mock super fund data
    mockSuperFund = {
      id: 'super-fund-001',
      name: 'AustralianSuper',
      abn: '65714394856',
      usi: '65714394856001',
      contactDetails: {
        address: 'Level 31, 50 Lonsdale Street, Melbourne VIC 3000',
        phone: '1300 300 273',
        email: 'info@australiansuper.com'
      },
      isActive: true,
      createdAt: '2020-01-01T00:00:00Z'
    };
  });

  describe('Super Contribution Calculations', () => {
    it('should calculate Super Guarantee contribution correctly', async () => {
      // Mock employee and fund data
      const mockSupabase = require('../../lib/supabase').supabase;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'payroll_employees') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockEmployee,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'super_funds') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockSuperFund,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'superannuation_contributions') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    id: 'contribution-001',
                    employeeId: 'emp-001',
                    fundId: 'super-fund-001',
                    contributionType: 'SuperGuarantee',
                    amount: 825.00, // 11% of $7500 monthly salary
                    periodStart: '2024-02-01',
                    periodEnd: '2024-02-29',
                    paymentDate: '2024-05-28', // 21 days after quarter end
                    isPaid: false,
                    createdAt: '2024-02-29T00:00:00Z'
                  },
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const ordinaryTimeEarnings = 7500; // Monthly salary
      const result = await service.calculateSuperContribution(
        'emp-001',
        ordinaryTimeEarnings,
        '2024-02-01',
        '2024-02-29',
        'SuperGuarantee'
      );

      expect(result.amount).toBe(825.00); // 11% of $7500
      expect(result.contributionType).toBe('SuperGuarantee');
      expect(result.employeeId).toBe('emp-001');
      expect(result.fundId).toBe('super-fund-001');
      expect(result.isPaid).toBe(false);
    });

    it('should apply quarterly maximum contribution base', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'payroll_employees') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockEmployee,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'super_funds') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockSuperFund,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'superannuation_contributions') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    id: 'contribution-002',
                    employeeId: 'emp-001',
                    fundId: 'super-fund-001',
                    contributionType: 'SuperGuarantee',
                    amount: 7170.90, // Max quarterly base * 11%
                    periodStart: '2024-02-01',
                    periodEnd: '2024-02-29',
                    paymentDate: '2024-05-28',
                    isPaid: false,
                    createdAt: '2024-02-29T00:00:00Z'
                  },
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      // High earner - should be capped at quarterly maximum
      const highEarnings = 80000; // Above quarterly maximum base
      const result = await service.calculateSuperContribution(
        'emp-001',
        highEarnings,
        '2024-02-01',
        '2024-02-29',
        'SuperGuarantee'
      );

      expect(result.amount).toBe(7170.90); // Quarterly max base * 11%
    });

    it('should handle salary sacrifice contributions', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'payroll_employees') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockEmployee,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'super_funds') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockSuperFund,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'superannuation_contributions') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    id: 'contribution-003',
                    employeeId: 'emp-001',
                    fundId: 'super-fund-001',
                    contributionType: 'SalarySacrifice',
                    amount: 500.00,
                    periodStart: '2024-02-01',
                    periodEnd: '2024-02-29',
                    paymentDate: '2024-05-28',
                    isPaid: false,
                    createdAt: '2024-02-29T00:00:00Z'
                  },
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const sacrificeAmount = 500;
      const result = await service.calculateSuperContribution(
        'emp-001',
        sacrificeAmount,
        '2024-02-01',
        '2024-02-29',
        'SalarySacrifice'
      );

      expect(result.amount).toBe(500.00);
      expect(result.contributionType).toBe('SalarySacrifice');
    });

    it('should throw error for missing super fund details', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const employeeWithoutSuper = { ...mockEmployee, superFundId: undefined, superMemberNumber: undefined };
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'payroll_employees') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: employeeWithoutSuper,
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      await expect(service.calculateSuperContribution(
        'emp-001',
        7500,
        '2024-02-01',
        '2024-02-29'
      )).rejects.toThrow('Super fund details not configured for employee: emp-001');
    });
  });

  describe('Super Choice Processing', () => {
    it('should process valid super choice request', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      let insertCalled = false;
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'super_funds') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockSuperFund,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'super_choice_requests') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    id: 'choice-001',
                    employeeId: 'emp-001',
                    chosenFundId: 'super-fund-002',
                    memberNumber: 'NEW123456',
                    stapledFund: false,
                    status: 'Pending',
                    complianceChecked: false,
                    createdAt: '2024-02-01T00:00:00Z'
                  },
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'payroll_employees') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => ({ error: null }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.processSuperChoiceRequest(
        'emp-001',
        'super-fund-002',
        'NEW123456',
        false
      );

      expect(result.employeeId).toBe('emp-001');
      expect(result.chosenFundId).toBe('super-fund-002');
      expect(result.memberNumber).toBe('NEW123456');
      expect(result.status).toBe('Pending');
    });

    it('should reject inactive super fund', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const inactiveFund = { ...mockSuperFund, isActive: false };
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'super_funds') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: inactiveFund,
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      await expect(service.processSuperChoiceRequest(
        'emp-001',
        'super-fund-inactive',
        'NEW123456'
      )).rejects.toThrow('Selected super fund is not active: AustralianSuper');
    });
  });

  describe('Super Payment Processing', () => {
    it('should process super payment with multiple contributions', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const mockContributions = [
        {
          id: 'contrib-001',
          employee_id: 'emp-001',
          fund_id: 'super-fund-001',
          amount: 825.00,
          employee: mockEmployee,
          fund: mockSuperFund
        },
        {
          id: 'contrib-002',
          employee_id: 'emp-002',
          fund_id: 'super-fund-001',
          amount: 1100.00,
          employee: { ...mockEmployee, employeeId: 'emp-002' },
          fund: mockSuperFund
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'superannuation_contributions') {
          return {
            select: jest.fn(() => ({
              in: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: mockContributions,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'superannuation_payments') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    id: 'payment-001',
                    paymentReference: 'SUPER-2024-001',
                    paymentDate: '2024-03-28',
                    totalAmount: 1925.00,
                    contributionIds: ['contrib-001', 'contrib-002'],
                    status: 'Pending',
                    superStreamCompliant: false,
                    complianceChecked: false,
                    createdAt: '2024-03-28T00:00:00Z'
                  },
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'super_stream_submissions') {
          return {
            insert: jest.fn(() => ({ error: null }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.processSuperPayment(
        ['contrib-001', 'contrib-002'],
        '2024-03-28',
        'SUPER-2024-001'
      );

      expect(result.totalAmount).toBe(1925.00); // 825 + 1100
      expect(result.paymentReference).toBe('SUPER-2024-001');
      expect(result.contributionIds).toHaveLength(2);
      expect(result.status).toBe('Pending');
    });

    it('should handle empty contribution list', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'superannuation_contributions') {
          return {
            select: jest.fn(() => ({
              in: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: [],
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      await expect(service.processSuperPayment(
        [],
        '2024-03-28',
        'SUPER-2024-001'
      )).rejects.toThrow('No unpaid contributions found for payment');
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate compliance report with issues', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const mockContributions = [
        {
          id: 'contrib-001',
          employee_id: 'emp-001',
          fund_id: 'super-fund-001',
          amount: 825.00,
          is_paid: true,
          payment_date: '2024-03-28',
          employee: mockEmployee,
          fund: mockSuperFund
        },
        {
          id: 'contrib-002',
          employee_id: 'emp-002',
          fund_id: 'super-fund-001',
          amount: 1100.00,
          is_paid: false,
          payment_date: '2024-03-15', // Overdue
          employee: { ...mockEmployee, employeeId: 'emp-002' },
          fund: mockSuperFund
        }
      ];

      const mockPayments = [
        {
          id: 'payment-001',
          payment_date: '2024-03-28',
          super_stream_compliant: true,
          total_amount: 825.00
        },
        {
          id: 'payment-002',
          payment_date: '2024-03-15',
          super_stream_compliant: false,
          total_amount: 1100.00
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'superannuation_contributions') {
          return {
            select: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({
                  data: mockContributions,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'superannuation_payments') {
          return {
            select: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({
                  data: mockPayments,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'super_compliance_reports') {
          return {
            insert: jest.fn(() => ({ error: null }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.generateComplianceReport('2024-01-01', '2024-03-31');

      expect(result.totalContributions).toBe(2);
      expect(result.totalContributionAmount).toBe(1925.00);
      expect(result.paidContributions).toBe(1);
      expect(result.overdueContributions).toBe(1);
      expect(result.totalPayments).toBe(2);
      expect(result.compliantPayments).toBe(1);
      expect(result.complianceRate).toBe(50); // 1 out of 2 compliant
      expect(result.issues).toHaveLength(3); // overdue, SuperStream failed, unpaid
      expect(result.recommendations).toHaveLength(6); // 2 for each issue type
    });

    it('should generate clean compliance report', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const mockContributions = [
        {
          id: 'contrib-001',
          employee_id: 'emp-001',
          fund_id: 'super-fund-001',
          amount: 825.00,
          is_paid: true,
          payment_date: '2024-03-28',
          employee: mockEmployee,
          fund: mockSuperFund
        }
      ];

      const mockPayments = [
        {
          id: 'payment-001',
          payment_date: '2024-03-28',
          super_stream_compliant: true,
          total_amount: 825.00
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'superannuation_contributions') {
          return {
            select: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({
                  data: mockContributions,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'superannuation_payments') {
          return {
            select: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({
                  data: mockPayments,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'super_compliance_reports') {
          return {
            insert: jest.fn(() => ({ error: null }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.generateComplianceReport('2024-01-01', '2024-03-31');

      expect(result.totalContributions).toBe(1);
      expect(result.paidContributions).toBe(1);
      expect(result.overdueContributions).toBe(0);
      expect(result.complianceRate).toBe(100);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toHaveLength(2); // Continue best practices
    });
  });

  describe('Super Fund Management', () => {
    it('should get super fund details', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'super_funds') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockSuperFund,
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.getSuperFund('super-fund-001');

      expect(result).toEqual(mockSuperFund);
      expect(result?.name).toBe('AustralianSuper');
      expect(result?.abn).toBe('65714394856');
    });

    it('should get all active super funds', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const mockFunds = [
        mockSuperFund,
        {
          id: 'super-fund-002',
          name: 'REST Super',
          abn: '62658083723',
          usi: '62658083723001',
          contactDetails: {
            address: 'Level 4, 140 Bourke Street, Melbourne VIC 3000',
            phone: '1300 300 778',
            email: 'info@rest.com.au'
          },
          isActive: true,
          createdAt: '2020-01-01T00:00:00Z'
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'super_funds') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: mockFunds,
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.getActiveSuperFunds();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('AustralianSuper');
      expect(result[1].name).toBe('REST Super');
    });
  });

  describe('Employee Super Contribution History', () => {
    it('should get employee super contributions with date range', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const mockContributions = [
        {
          id: 'contrib-001',
          employee_id: 'emp-001',
          fund_id: 'super-fund-001',
          amount: 825.00,
          contribution_type: 'SuperGuarantee',
          period_start: '2024-02-01',
          period_end: '2024-02-29',
          is_paid: true,
          fund: mockSuperFund
        },
        {
          id: 'contrib-002',
          employee_id: 'emp-001',
          fund_id: 'super-fund-001',
          amount: 825.00,
          contribution_type: 'SuperGuarantee',
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          is_paid: true,
          fund: mockSuperFund
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'superannuation_contributions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  gte: jest.fn(() => ({
                    lte: jest.fn(() => ({
                      data: mockContributions,
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.getEmployeeSuperContributions(
        'emp-001',
        '2024-01-01',
        '2024-02-29'
      );

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(825.00);
      expect(result[0].contributionType).toBe('SuperGuarantee');
      expect(result[0].fund.name).toBe('AustralianSuper');
    });

    it('should get all employee super contributions without date range', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const mockContributions = [
        {
          id: 'contrib-001',
          employee_id: 'emp-001',
          fund_id: 'super-fund-001',
          amount: 825.00,
          contribution_type: 'SuperGuarantee',
          period_start: '2024-02-01',
          period_end: '2024-02-29',
          is_paid: true,
          fund: mockSuperFund
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'superannuation_contributions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: mockContributions,
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.getEmployeeSuperContributions('emp-001');

      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('emp-001');
    });
  });

  describe('Overdue Contributions', () => {
    it('should identify overdue super contributions', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 30); // 30 days ago

      const mockContributions = [
        {
          id: 'contrib-001',
          employee_id: 'emp-001',
          fund_id: 'super-fund-001',
          amount: 825.00,
          is_paid: false,
          payment_date: overdueDate.toISOString().split('T')[0], // Overdue
          employee: mockEmployee,
          fund: mockSuperFund
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'superannuation_contributions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                lt: jest.fn(() => ({
                  order: jest.fn(() => ({
                    data: mockContributions,
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.getOverdueSuperContributions();

      expect(result).toHaveLength(1);
      expect(result[0].isPaid).toBe(false);
      expect(new Date(result[0].paymentDate) < new Date()).toBe(true);
    });
  });
});