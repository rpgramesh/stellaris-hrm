import { AnnualSalaryStatementService } from '../annualSalaryStatementService';
import { AnnualSalaryStatement, PayrollEmployee, PayComponent, Deduction, SuperannuationContribution, STPSubmission } from '../../types/payroll';

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
            limit: jest.fn(() => ({
              data: null,
              error: null
            }))
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
          or: jest.fn(() => ({
            data: null,
            error: null
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: 'test-statement-id' },
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { id: 'test-statement-id', is_final: true },
                error: null
              }))
            }))
          }))
        }))
      }))
    }))
  }
}));

describe('AnnualSalaryStatementService', () => {
  let service: AnnualSalaryStatementService;
  let mockEmployee: any;
  let mockPayslips: any[];
  let mockSuperContributions: any[];
  let mockDeductions: any[];
  let mockBonusPayments: any[];

  beforeEach(() => {
    service = new AnnualSalaryStatementService();

    // Mock employee data
    mockEmployee = {
      id: 'emp-001',
      first_name: 'John',
      last_name: 'Doe',
      employee_id: 'EMP001',
      date_of_birth: '1985-06-15',
      address: '123 Main St, Sydney NSW 2000',
      tax_file_number: '123456789'
    };

    // Mock payslips for FY 2023-2024
    mockPayslips = [
      { gross_pay: 6250.00, tax_withheld: 1250.00, pay_period_start: '2023-07-01', pay_period_end: '2023-07-31' },
      { gross_pay: 6250.00, tax_withheld: 1250.00, pay_period_start: '2023-08-01', pay_period_end: '2023-08-31' },
      { gross_pay: 6250.00, tax_withheld: 1250.00, pay_period_start: '2023-09-01', pay_period_end: '2023-09-30' },
      { gross_pay: 6250.00, tax_withheld: 1250.00, pay_period_start: '2023-10-01', pay_period_end: '2023-10-31' },
      { gross_pay: 6250.00, tax_withheld: 1250.00, pay_period_start: '2023-11-01', pay_period_end: '2023-11-30' },
      { gross_pay: 6250.00, tax_withheld: 1250.00, pay_period_start: '2023-12-01', pay_period_end: '2023-12-31' },
      { gross_pay: 6250.00, tax_withheld: 1250.00, pay_period_start: '2024-01-01', pay_period_end: '2024-01-31' },
      { gross_pay: 6250.00, tax_withheld: 1250.00, pay_period_start: '2024-02-01', pay_period_end: '2024-02-29' },
      { gross_pay: 6250.00, tax_withheld: 1250.00, pay_period_start: '2024-03-01', pay_period_end: '2024-03-31' },
      { gross_pay: 6250.00, tax_withheld: 1250.00, pay_period_start: '2024-04-01', pay_period_end: '2024-04-30' },
      { gross_pay: 6250.00, tax_withheld: 1250.00, pay_period_start: '2024-05-01', pay_period_end: '2024-05-31' },
      { gross_pay: 6250.00, tax_withheld: 1250.00, pay_period_start: '2024-06-01', pay_period_end: '2024-06-30' }
    ];

    // Mock super contributions
    mockSuperContributions = [
      { amount: 687.50, contribution_type: 'SuperGuarantee', period_start: '2023-07-01', period_end: '2023-07-31', is_paid: true },
      { amount: 687.50, contribution_type: 'SuperGuarantee', period_start: '2023-08-01', period_end: '2023-08-31', is_paid: true },
      { amount: 687.50, contribution_type: 'SuperGuarantee', period_start: '2023-09-01', period_end: '2023-09-30', is_paid: true },
      { amount: 687.50, contribution_type: 'SuperGuarantee', period_start: '2023-10-01', period_end: '2023-10-31', is_paid: true },
      { amount: 687.50, contribution_type: 'SuperGuarantee', period_start: '2023-11-01', period_end: '2023-11-30', is_paid: true },
      { amount: 687.50, contribution_type: 'SuperGuarantee', period_start: '2023-12-01', period_end: '2023-12-31', is_paid: true },
      { amount: 687.50, contribution_type: 'SuperGuarantee', period_start: '2024-01-01', period_end: '2024-01-31', is_paid: true },
      { amount: 687.50, contribution_type: 'SuperGuarantee', period_start: '2024-02-01', period_end: '2024-02-29', is_paid: true },
      { amount: 687.50, contribution_type: 'SuperGuarantee', period_start: '2024-03-01', period_end: '2024-03-31', is_paid: true },
      { amount: 687.50, contribution_type: 'SuperGuarantee', period_start: '2024-04-01', period_end: '2024-04-30', is_paid: true },
      { amount: 687.50, contribution_type: 'SuperGuarantee', period_start: '2024-05-01', period_end: '2024-05-31', is_paid: true },
      { amount: 687.50, contribution_type: 'SuperGuarantee', period_start: '2024-06-01', period_end: '2024-06-30', is_paid: true }
    ];

    // Mock deductions (workplace giving)
    mockDeductions = [
      { amount: 50.00, category: 'WorkplaceGiving', is_active: true, effective_from: '2023-07-01', effective_to: null }
    ];

    // Mock bonus payments
    mockBonusPayments = [
      { amount: 2500.00, payment_date: '2023-12-15' }
    ];
  });

  describe('Annual Salary Statement Generation', () => {
    it('should generate annual salary statement correctly', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'annual_salary_statements') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    data: null,
                    error: { code: 'PGRST116' } // Not found
                  }))
                }))
              }))
            }))
          };
        }
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
        if (table === 'payslips') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    data: mockPayslips,
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        if (table === 'superannuation_contributions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    data: mockSuperContributions,
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        if (table === 'deductions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  or: jest.fn(() => ({
                    data: mockDeductions,
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        if (table === 'bonus_payments') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    data: mockBonusPayments,
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        if (table === 'employees') {
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
        if (table === 'company_information') {
          return {
            select: jest.fn(() => ({
              limit: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    company_name: 'Test Company Pty Ltd',
                    registration_number: '12345678901',
                    address: '456 Business St, Sydney NSW 2000',
                    phone: '02 1234 5678',
                    email: 'payroll@testcompany.com.au'
                  },
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'annual_salary_statement_ato_data') {
          return {
            insert: jest.fn(() => ({ error: null }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.generateAnnualSalaryStatement('emp-001', '2023-2024');

      expect(result.employeeId).toBe('emp-001');
      expect(result.financialYear).toBe('2023-2024');
      expect(result.grossPayments).toBe(77000.00); // 12 * 6250 + 2500 bonus
      expect(result.taxWithheld).toBe(15000.00); // 12 * 1250
      expect(result.superannuation).toBe(8250.00); // 12 * 687.50
      expect(result.workplaceGiving).toBe(600.00); // 12 * 50
      expect(result.lumpSumPayments).toBe(2500.00); // Bonus
      expect(result.isFinal).toBe(false); // Draft by default
    });

    it('should return existing final statement without regeneration', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const existingStatement = {
        id: 'statement-001',
        employee_id: 'emp-001',
        financial_year: '2023-2024',
        gross_payments: 77000.00,
        tax_withheld: 15000.00,
        superannuation: 8250.00,
        reportable_fringe_benefits: 0,
        reportable_super_contributions: 0,
        workplace_giving: 600.00,
        allowances: 0,
        lump_sum_payments: 2500.00,
        termination_payments: 0,
        is_final: true,
        generated_at: '2024-07-01T00:00:00Z'
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'annual_salary_statements') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    data: existingStatement,
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.generateAnnualSalaryStatement('emp-001', '2023-2024');

      expect(result).toEqual(existingStatement);
    });

    it('should regenerate statement when explicitly requested', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const existingStatement = {
        id: 'statement-001',
        employee_id: 'emp-001',
        financial_year: '2023-2024',
        gross_payments: 77000.00,
        tax_withheld: 15000.00,
        superannuation: 8250.00,
        is_final: true,
        generated_at: '2024-07-01T00:00:00Z'
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'annual_salary_statements') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => {
                    callCount++;
                    return {
                      data: callCount === 1 ? existingStatement : null, // First call returns existing, second returns null
                      error: callCount === 1 ? null : { code: 'PGRST116' }
                    };
                  })
                }))
              }))
            }))
          };
        }
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
        if (table === 'payroll_runs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      data: [],
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          };
        }
        if (table === 'payslips') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    data: [{ gross_pay: 77000, tax_withheld: 15000 }],
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        if (table === 'superannuation_contributions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    data: [{ amount: 8250 }],
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({
                  data: [],
                  error: null
                })),
                or: jest.fn(() => ({
                  data: [],
                  error: null
                }))
              }))
            })),
            limit: jest.fn(() => ({
              single: jest.fn(() => ({
                data: null,
                error: null
              }))
            }))
          })),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { id: 'new-statement-001', ...existingStatement, is_final: false },
                error: null
              }))
            }))
          }))
        };
      });

      const result = await service.generateAnnualSalaryStatement('emp-001', '2023-2024', true);

      // When regenerate=true, it should generate a new statement even if one exists
      expect(result).toBeDefined();
      expect(result.id).toBe('new-statement-001');
    });
  });
});