import { EarningsManagementService, EarningsConfiguration, EarningsCalculationRequest } from '../earningsManagementService';
import { PayComponent, PayrollEmployee } from '../../types/payroll';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
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

describe('EarningsManagementService', () => {
  let service: EarningsManagementService;
  let mockEmployee: PayrollEmployee;
  let mockConfigurations: EarningsConfiguration[];

  beforeEach(() => {
    service = new EarningsManagementService();
    
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

    // Mock earnings configurations
    mockConfigurations = [
      {
        id: 'config-001',
        name: 'Base Salary',
        description: 'Regular base salary payment',
        componentType: 'BaseSalary',
        calculationMethod: 'Fixed',
        rate: 6250, // Monthly base salary
        taxTreatment: 'Taxable',
        stpCategory: 'SAW',
        isActive: true,
        effectiveFrom: '2024-01-01',
        effectiveTo: undefined
      },
      {
        id: 'config-002',
        name: 'Overtime Rate',
        description: 'Overtime payment at 1.5x base rate',
        componentType: 'Overtime',
        calculationMethod: 'Hourly',
        rate: 45.45, // 1.5x base hourly rate
        taxTreatment: 'Taxable',
        stpCategory: 'OVT',
        isActive: true,
        effectiveFrom: '2024-01-01',
        effectiveTo: undefined,
        conditions: {
          employmentTypes: ['FullTime', 'PartTime']
        }
      },
      {
        id: 'config-003',
        name: 'Tool Allowance',
        description: 'Daily tool allowance for tradespeople',
        componentType: 'Allowance',
        calculationMethod: 'Daily',
        rate: 15.00,
        taxTreatment: 'Taxable',
        stpCategory: 'ALW',
        isActive: true,
        effectiveFrom: '2024-01-01',
        effectiveTo: undefined
      },
      {
        id: 'config-004',
        name: 'Performance Bonus',
        description: 'Monthly performance bonus',
        componentType: 'Bonus',
        calculationMethod: 'Percentage',
        rate: 0,
        percentage: 10,
        taxTreatment: 'Taxable',
        stpCategory: 'BON',
        isActive: true,
        effectiveFrom: '2024-01-01',
        effectiveTo: undefined
      },
      {
        id: 'config-005',
        name: 'Commission Rate',
        description: 'Sales commission based on performance',
        componentType: 'Commission',
        calculationMethod: 'Formula',
        rate: 0,
        formula: 'salesAmount * 0.05',
        taxTreatment: 'Taxable',
        stpCategory: 'COM',
        isActive: true,
        effectiveFrom: '2024-01-01',
        effectiveTo: undefined
      }
    ];

    // Mock the internal configurations map
    (service as any).earningsConfigurations = new Map(
      mockConfigurations.map(config => [config.id, config])
    );
  });

  describe('Basic Earnings Calculations', () => {
    it('should calculate fixed base salary correctly', async () => {
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
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const request: EarningsCalculationRequest = {
        employeeId: 'emp-001',
        periodStart: '2024-02-01',
        periodEnd: '2024-02-29'
      };

      const result = await service.calculateEarnings(request);

      expect(result).toHaveLength(1);
      expect(result[0].componentType).toBe('BaseSalary');
      expect(result[0].amount).toBe(6250); // Monthly base salary
      expect(result[0].taxTreatment).toBe('Taxable');
      expect(result[0].stpCategory).toBe('SAW');
    });

    it('should calculate hourly overtime correctly', async () => {
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
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const request: EarningsCalculationRequest = {
        employeeId: 'emp-001',
        periodStart: '2024-02-01',
        periodEnd: '2024-02-29',
        hoursWorked: 10 // 10 hours of overtime
      };

      const result = await service.calculateEarnings(request);

      const overtimeComponent = result.find(c => c.componentType === 'Overtime');
      expect(overtimeComponent).toBeDefined();
      expect(overtimeComponent?.amount).toBe(454.50); // 10 hours × $45.45
      expect(overtimeComponent?.units).toBe(10);
      expect(overtimeComponent?.rate).toBe(45.45);
    });

    it('should calculate daily allowance correctly', async () => {
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
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const request: EarningsCalculationRequest = {
        employeeId: 'emp-001',
        periodStart: '2024-02-01',
        periodEnd: '2024-02-29',
        daysWorked: 20 // 20 working days
      };

      const result = await service.calculateEarnings(request);

      const allowanceComponent = result.find(c => c.componentType === 'Allowance');
      expect(allowanceComponent).toBeDefined();
      expect(allowanceComponent?.amount).toBe(300); // 20 days × $15.00
      expect(allowanceComponent?.units).toBe(20);
      expect(allowanceComponent?.rate).toBe(15);
    });

    it('should calculate percentage-based bonus correctly', async () => {
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
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const request: EarningsCalculationRequest = {
        employeeId: 'emp-001',
        periodStart: '2024-02-01',
        periodEnd: '2024-02-29'
      };

      const result = await service.calculateEarnings(request);

      const bonusComponent = result.find(c => c.componentType === 'Bonus');
      expect(bonusComponent).toBeDefined();
      expect(bonusComponent?.amount).toBe(625); // 10% of monthly base salary ($6250)
      expect(bonusComponent?.units).toBe(1);
    });

    it('should calculate formula-based commission correctly', async () => {
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
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const request: EarningsCalculationRequest = {
        employeeId: 'emp-001',
        periodStart: '2024-02-01',
        periodEnd: '2024-02-29',
        customInputs: {
          salesAmount: 10000 // $10,000 in sales
        }
      };

      const result = await service.calculateEarnings(request);

      const commissionComponent = result.find(c => c.componentType === 'Commission');
      expect(commissionComponent).toBeDefined();
      expect(commissionComponent?.amount).toBe(500); // 5% of $10,000 sales
      expect(commissionComponent?.units).toBe(1);
    });
  });

  describe('Configuration Management', () => {
    it('should create new earnings configuration', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'earnings_configurations') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    id: 'config-new',
                    name: 'New Allowance',
                    description: 'Test allowance',
                    componentType: 'Allowance',
                    calculationMethod: 'Daily',
                    rate: 25,
                    taxTreatment: 'Taxable',
                    stpCategory: 'ALW',
                    isActive: true,
                    effectiveFrom: '2024-01-01',
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z'
                  },
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const newConfig = {
        name: 'New Allowance',
        description: 'Test allowance',
        componentType: 'Allowance' as const,
        calculationMethod: 'Daily' as const,
        rate: 25,
        taxTreatment: 'Taxable' as const,
        stpCategory: 'ALW' as const,
        effectiveFrom: '2024-01-01'
      };

      const result = await service.createEarningsConfiguration(newConfig);

      expect(result.name).toBe('New Allowance');
      expect(result.rate).toBe(25);
      expect(result.componentType).toBe('Allowance');
      expect(result.isActive).toBe(true);
    });

    it('should update earnings configuration', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'earnings_configurations') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn(() => ({
                    data: {
                      ...mockConfigurations[0],
                      rate: 6500,
                      updatedAt: '2024-02-01T00:00:00Z'
                    },
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const updates = {
        rate: 6500
      };

      const result = await service.updateEarningsConfiguration('config-001', updates);

      expect(result.rate).toBe(6500);
      expect(result.name).toBe('Base Salary');
    });

    it('should deactivate earnings configuration', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      let updateCalled = false;
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'earnings_configurations') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => {
                updateCalled = true;
                return { error: null };
              })
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      await service.deactivateEarningsConfiguration('config-001');

      expect(updateCalled).toBe(true);
    });

    it('should get earnings configuration by ID', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'earnings_configurations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockConfigurations[0],
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.getEarningsConfiguration('config-001');

      expect(result).toEqual(mockConfigurations[0]);
      expect(result?.name).toBe('Base Salary');
    });

    it('should get all active earnings configurations', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'earnings_configurations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: mockConfigurations,
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.getActiveEarningsConfigurations();

      expect(result).toHaveLength(5);
      expect(result[0].name).toBe('Base Salary');
      expect(result[4].name).toBe('Commission Rate');
    });

    it('should get earnings configurations by type', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'earnings_configurations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn(() => ({
                    data: [mockConfigurations[2]], // Only Allowance type
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const result = await service.getEarningsConfigurationsByType('Allowance');

      expect(result).toHaveLength(1);
      expect(result[0].componentType).toBe('Allowance');
      expect(result[0].name).toBe('Tool Allowance');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', async () => {
      const validConfig: EarningsConfiguration = {
        id: 'config-valid',
        name: 'Valid Allowance',
        description: 'A valid allowance configuration',
        componentType: 'Allowance',
        calculationMethod: 'Daily',
        rate: 20,
        taxTreatment: 'Taxable',
        stpCategory: 'ALW',
        isActive: true,
        effectiveFrom: '2024-01-01'
      };

      const result = await service.validateEarningsConfiguration(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect missing name', async () => {
      const invalidConfig: EarningsConfiguration = {
        id: 'config-invalid',
        name: '',
        description: 'Invalid configuration',
        componentType: 'Allowance',
        calculationMethod: 'Daily',
        rate: 20,
        taxTreatment: 'Taxable',
        stpCategory: 'ALW',
        isActive: true,
        effectiveFrom: '2024-01-01'
      };

      const result = await service.validateEarningsConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration name is required');
    });

    it('should detect negative rate', async () => {
      const invalidConfig: EarningsConfiguration = {
        id: 'config-invalid',
        name: 'Invalid Rate',
        description: 'Invalid configuration',
        componentType: 'Allowance',
        calculationMethod: 'Daily',
        rate: -20,
        taxTreatment: 'Taxable',
        stpCategory: 'ALW',
        isActive: true,
        effectiveFrom: '2024-01-01'
      };

      const result = await service.validateEarningsConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rate cannot be negative');
    });

    it('should detect missing percentage for percentage calculations', async () => {
      const invalidConfig: EarningsConfiguration = {
        id: 'config-invalid',
        name: 'Invalid Percentage',
        description: 'Invalid configuration',
        componentType: 'Bonus',
        calculationMethod: 'Percentage',
        rate: 0,
        taxTreatment: 'Taxable',
        stpCategory: 'BON',
        isActive: true,
        effectiveFrom: '2024-01-01'
      };

      const result = await service.validateEarningsConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Percentage is required for percentage-based calculations');
    });

    it('should detect missing formula for formula calculations', async () => {
      const invalidConfig: EarningsConfiguration = {
        id: 'config-invalid',
        name: 'Invalid Formula',
        description: 'Invalid configuration',
        componentType: 'Commission',
        calculationMethod: 'Formula',
        rate: 0,
        taxTreatment: 'Taxable',
        stpCategory: 'COM',
        isActive: true,
        effectiveFrom: '2024-01-01'
      };

      const result = await service.validateEarningsConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Formula is required for formula-based calculations');
    });

    it('should detect invalid effective dates', async () => {
      const invalidConfig: EarningsConfiguration = {
        id: 'config-invalid',
        name: 'Invalid Dates',
        description: 'Invalid configuration',
        componentType: 'Allowance',
        calculationMethod: 'Daily',
        rate: 20,
        taxTreatment: 'Taxable',
        stpCategory: 'ALW',
        isActive: true,
        effectiveFrom: '2024-01-01',
        effectiveTo: '2023-12-31' // Before effective from
      };

      const result = await service.validateEarningsConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Effective to date must be after effective from date');
    });

    it('should warn about missing description', async () => {
      const configWithWarning: EarningsConfiguration = {
        id: 'config-warning',
        name: 'Valid Name',
        description: '',
        componentType: 'Allowance',
        calculationMethod: 'Daily',
        rate: 20,
        taxTreatment: 'Taxable',
        stpCategory: 'ALW',
        isActive: true,
        effectiveFrom: '2024-01-01'
      };

      const result = await service.validateEarningsConfiguration(configWithWarning);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Configuration description is recommended');
    });
  });

  describe('Employee Conditions', () => {
    it('should apply configuration based on employment type', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const casualEmployee = { ...mockEmployee, employmentType: 'Casual' };
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'payroll_employees') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: casualEmployee,
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const request: EarningsCalculationRequest = {
        employeeId: 'emp-001',
        periodStart: '2024-02-01',
        periodEnd: '2024-02-29',
        hoursWorked: 10
      };

      const result = await service.calculateEarnings(request);

      // Casual employee should not get overtime (based on our mock config conditions)
      const overtimeComponent = result.find(c => c.componentType === 'Overtime');
      expect(overtimeComponent).toBeUndefined();
    });

    it('should apply configuration based on classification', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      const level2Employee = { ...mockEmployee, awardClassification: 'Level 2' };
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'payroll_employees') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: level2Employee,
                  error: null
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const request: EarningsCalculationRequest = {
        employeeId: 'emp-001',
        periodStart: '2024-02-01',
        periodEnd: '2024-02-29'
      };

      const result = await service.calculateEarnings(request);

      // Should still get base salary regardless of classification
      const baseSalaryComponent = result.find(c => c.componentType === 'BaseSalary');
      expect(baseSalaryComponent).toBeDefined();
      expect(baseSalaryComponent?.amount).toBe(6250);
    });
  });

  describe('Validation Rules', () => {
    it('should apply minimum amount validation', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      
      // Create a configuration with minimum amount validation
      const configWithMinAmount: EarningsConfiguration = {
        id: 'config-min',
        name: 'Minimum Bonus',
        description: 'Bonus with minimum amount',
        componentType: 'Bonus',
        calculationMethod: 'Percentage',
        rate: 0,
        percentage: 1, // Very low percentage
        taxTreatment: 'Taxable',
        stpCategory: 'BON',
        isActive: true,
        effectiveFrom: '2024-01-01',
        validationRules: {
          minimumAmount: 100 // Minimum $100
        }
      };

      (service as any).earningsConfigurations.set('config-min', configWithMinAmount);

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
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const request: EarningsCalculationRequest = {
        employeeId: 'emp-001',
        periodStart: '2024-02-01',
        periodEnd: '2024-02-29'
      };

      const result = await service.calculateEarnings(request);

      const bonusComponent = result.find(c => c.componentType === 'Bonus');
      expect(bonusComponent).toBeDefined();
      expect(bonusComponent?.amount).toBe(625); // Normal calculation (10% of $6250)
      expect(bonusComponent?.amount).toBeGreaterThanOrEqual(100); // Should meet minimum
    });

    it('should apply maximum amount validation', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      
      // Create a configuration with maximum amount validation
      const configWithMaxAmount: EarningsConfiguration = {
        id: 'config-max',
        name: 'Maximum Commission',
        description: 'Commission with maximum amount',
        componentType: 'Commission',
        calculationMethod: 'Formula',
        rate: 0,
        formula: 'salesAmount * 0.50', // 50% commission
        taxTreatment: 'Taxable',
        stpCategory: 'COM',
        isActive: true,
        effectiveFrom: '2024-01-01',
        validationRules: {
          maximumAmount: 1000 // Maximum $1000
        }
      };

      (service as any).earningsConfigurations.set('config-max', configWithMaxAmount);

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
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const request: EarningsCalculationRequest = {
        employeeId: 'emp-001',
        periodStart: '2024-02-01',
        periodEnd: '2024-02-29',
        customInputs: {
          salesAmount: 5000 // $5,000 in sales - would normally be $2,500 commission
        }
      };

      const result = await service.calculateEarnings(request);

      const commissionComponent = result.find(c => c.componentType === 'Commission');
      expect(commissionComponent).toBeDefined();
      expect(commissionComponent?.amount).toBe(1000); // Should be capped at maximum
      expect(commissionComponent?.amount).toBeLessThanOrEqual(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing employee', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'payroll_employees') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: null,
                  error: { message: 'Employee not found' }
                }))
              }))
            }))
          };
        }
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const request: EarningsCalculationRequest = {
        employeeId: 'non-existent-emp',
        periodStart: '2024-02-01',
        periodEnd: '2024-02-29'
      };

      await expect(service.calculateEarnings(request)).rejects.toThrow('Employee not found: non-existent-emp');
    });

    it('should handle invalid formula', async () => {
      const mockSupabase = require('../../lib/supabase').supabase;
      
      // Create a configuration with invalid formula
      const configWithInvalidFormula: EarningsConfiguration = {
        id: 'config-invalid-formula',
        name: 'Invalid Formula Commission',
        description: 'Commission with invalid formula',
        componentType: 'Commission',
        calculationMethod: 'Formula',
        rate: 0,
        formula: 'invalid formula syntax', // Invalid formula
        taxTreatment: 'Taxable',
        stpCategory: 'COM',
        isActive: true,
        effectiveFrom: '2024-01-01'
      };

      (service as any).earningsConfigurations.set('config-invalid-formula', configWithInvalidFormula);

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
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })) })) };
      });

      const request: EarningsCalculationRequest = {
        employeeId: 'emp-001',
        periodStart: '2024-02-01',
        periodEnd: '2024-02-29',
        customInputs: {
          salesAmount: 10000
        }
      };

      const result = await service.calculateEarnings(request);

      // Should not include the commission component with invalid formula
      const commissionComponent = result.find(c => c.componentType === 'Commission' && c.description.includes('Invalid Formula'));
      expect(commissionComponent).toBeUndefined();
    });
  });
});