import { describe, it, expect, beforeEach, vi } from 'vitest';
import { payrollProcessingEngine } from '../payrollProcessingEngine';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
        }))
      }))
    }))
  }
}));

describe('PayrollProcessingEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateEmployeePayroll', () => {
    const mockEmployee = {
      id: 'emp-123',
      companyId: 'comp-456',
      annualSalary: 80000,
      hourlyRate: 40,
      payFrequency: 'fortnightly',
      employmentType: 'FullTime',
      taxFileNumber: '123456789',
      superannuationRate: 0.11,
      superFundDetails: {
        fundName: 'AustralianSuper',
        memberNumber: 'MEM123456'
      }
    };

    const mockPayPeriod = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-14'),
      frequency: 'fortnightly'
    };

    it('should calculate basic salary for full-time employee', async () => {
      const result = await payrollProcessingEngine.calculateEmployeePayroll(
        mockEmployee,
        mockPayPeriod
      );

      expect(result).toBeDefined();
      expect(result.grossPay).toBeGreaterThan(0);
      expect(result.netPay).toBeGreaterThan(0);
      expect(result.netPay).toBeLessThan(result.grossPay);
      expect(result.taxWithheld).toBeGreaterThan(0);
      expect(result.superannuationContribution).toBeGreaterThan(0);
    });

    it('should handle part-time employee calculations', async () => {
      const partTimeEmployee = {
        ...mockEmployee,
        employmentType: 'PartTime',
        annualSalary: 40000
      };

      const result = await payrollProcessingEngine.calculateEmployeePayroll(
        partTimeEmployee,
        mockPayPeriod
      );

      expect(result.grossPay).toBe(40000 / 26); // Half of full-time salary
      expect(result.netPay).toBeGreaterThan(0);
    });

    it('should calculate overtime correctly', async () => {
      const overtimeHours = 10;
      const overtimeRate = 1.5;
      
      const result = await payrollProcessingEngine.calculateEmployeePayroll(
        mockEmployee,
        mockPayPeriod,
        { overtimeHours, overtimeRate }
      );

      const expectedOvertime = overtimeHours * mockEmployee.hourlyRate * overtimeRate;
      expect(result.overtimePay).toBe(expectedOvertime);
      expect(result.grossPay).toBeGreaterThan(mockEmployee.annualSalary / 26);
    });

    it('should handle different pay frequencies', async () => {
      const weeklyPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        frequency: 'weekly'
      };

      const result = await payrollProcessingEngine.calculateEmployeePayroll(
        mockEmployee,
        weeklyPeriod
      );

      expect(result.grossPay).toBeCloseTo(mockEmployee.annualSalary / 52, 2);
    });

    it('should calculate tax correctly for different income levels', async () => {
      const highIncomeEmployee = {
        ...mockEmployee,
        annualSalary: 150000
      };

      const result = await payrollProcessingEngine.calculateEmployeePayroll(
        highIncomeEmployee,
        mockPayPeriod
      );

      // Higher income should result in higher tax rate
      const taxRate = result.taxWithheld / result.grossPay;
      expect(taxRate).toBeGreaterThan(0.2); // Should be more than 20%
    });

    it('should handle salary adjustments', async () => {
      const salaryAdjustments = [
        {
          id: 'adj-1',
          type: 'salary-increase',
          amount: 5000,
          effectiveDate: new Date('2024-01-01'),
          isProRated: true
        }
      ];

      const result = await payrollProcessingEngine.calculateEmployeePayroll(
        mockEmployee,
        mockPayPeriod,
        { salaryAdjustments }
      );

      expect(result.grossPay).toBeGreaterThan(mockEmployee.annualSalary / 26);
    });

    it('should validate minimum wage compliance', async () => {
      const lowWageEmployee = {
        ...mockEmployee,
        annualSalary: 20000 // Below minimum wage
      };

      await expect(
        payrollProcessingEngine.calculateEmployeePayroll(lowWageEmployee, mockPayPeriod)
      ).rejects.toThrow('Below minimum wage');
    });

    it('should handle allowances correctly', async () => {
      const allowances = [
        { type: 'travel', amount: 200, taxable: true },
        { type: 'meal', amount: 100, taxable: false }
      ];

      const result = await payrollProcessingEngine.calculateEmployeePayroll(
        mockEmployee,
        mockPayPeriod,
        { allowances }
      );

      expect(result.allowances).toBeDefined();
      expect(result.allowances.totalAllowances).toBe(300);
      expect(result.allowances.taxableAllowances).toBe(200);
    });

    it('should calculate leave loading correctly', async () => {
      const leaveLoading = {
        hours: 40,
        rate: 0.175 // 17.5% leave loading
      };

      const result = await payrollProcessingEngine.calculateEmployeePayroll(
        mockEmployee,
        mockPayPeriod,
        { leaveLoading }
      );

      const baseLeavePay = 40 * mockEmployee.hourlyRate;
      const expectedLeaveLoading = baseLeavePay * leaveLoading.rate;
      
      expect(result.leaveLoading).toBe(expectedLeaveLoading);
    });

    it('should handle deductions correctly', async () => {
      const deductions = [
        { type: 'pre-tax', amount: 100 },
        { type: 'post-tax', amount: 50 }
      ];

      const result = await payrollProcessingEngine.calculateEmployeePayroll(
        mockEmployee,
        mockPayPeriod,
        { deductions }
      );

      expect(result.deductions).toBeDefined();
      expect(result.deductions.totalDeductions).toBe(150);
    });

    it('should validate tax file number presence', async () => {
      const employeeWithoutTFN = {
        ...mockEmployee,
        taxFileNumber: null
      };

      const result = await payrollProcessingEngine.calculateEmployeePayroll(
        employeeWithoutTFN,
        mockPayPeriod
      );

      expect(result.warnings).toContain('No TFN provided');
    });

    it('should handle year-to-date calculations', async () => {
      const ytdGross = 40000;
      const ytdTax = 8000;

      const result = await payrollProcessingEngine.calculateEmployeePayroll(
        mockEmployee,
        mockPayPeriod,
        { ytdGross, ytdTax }
      );

      expect(result.ytdGross).toBeGreaterThan(ytdGross);
      expect(result.ytdTax).toBeGreaterThan(ytdTax);
    });

    it('should calculate superannuation guarantee correctly', async () => {
      const result = await payrollProcessingEngine.calculateEmployeePayroll(
        mockEmployee,
        mockPayPeriod
      );

      const expectedSuper = result.grossPay * 0.11;
      expect(result.superannuationContribution).toBeCloseTo(expectedSuper, 2);
    });

    it('should handle error conditions gracefully', async () => {
      const invalidEmployee = {
        ...mockEmployee,
        annualSalary: -1000
      };

      await expect(
        payrollProcessingEngine.calculateEmployeePayroll(invalidEmployee, mockPayPeriod)
      ).rejects.toThrow('Invalid salary');
    });
  });

  describe('validatePayrollData', () => {
    it('should validate employee data', () => {
      const validEmployee = {
        id: 'emp-123',
        companyId: 'comp-456',
        annualSalary: 60000,
        payFrequency: 'fortnightly'
      };

      const result = payrollProcessingEngine.validatePayrollData(validEmployee);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid employee data', () => {
      const invalidEmployee = {
        id: 'emp-123',
        companyId: '',
        annualSalary: 0,
        payFrequency: 'invalid'
      };

      const result = payrollProcessingEngine.validatePayrollData(invalidEmployee);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Company ID is required');
      expect(result.errors).toContain('Invalid salary');
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax for different income brackets', () => {
      const testCases = [
        { income: 10000, expectedRate: 0 },
        { income: 30000, expectedRate: 0.19 },
        { income: 60000, expectedRate: 0.325 },
        { income: 150000, expectedRate: 0.37 }
      ];

      testCases.forEach(({ income, expectedRate }) => {
        const tax = payrollProcessingEngine.calculateTax(income);
        const effectiveRate = tax / income;
        expect(effectiveRate).toBeCloseTo(expectedRate, 1);
      });
    });
  });

  describe('calculateSuperannuation', () => {
    it('should calculate superannuation correctly', () => {
      const grossPay = 3000;
      const superRate = 0.11;
      
      const superAmount = payrollProcessingEngine.calculateSuperannuation(grossPay, superRate);
      expect(superAmount).toBe(grossPay * superRate);
    });

    it('should handle super rate of 0', () => {
      const grossPay = 3000;
      const superRate = 0;
      
      const superAmount = payrollProcessingEngine.calculateSuperannuation(grossPay, superRate);
      expect(superAmount).toBe(0);
    });
  });

  describe('processPayrollBatch', () => {
    it('should process multiple employees', async () => {
      const employees = [
        { ...mockEmployee, id: 'emp-1' },
        { ...mockEmployee, id: 'emp-2' },
        { ...mockEmployee, id: 'emp-3' }
      ];

      const result = await payrollProcessingEngine.processPayrollBatch(
        employees,
        mockPayPeriod
      );

      expect(result).toBeDefined();
      expect(result.employeeResults).toHaveLength(3);
      expect(result.summary.totalGrossPay).toBeGreaterThan(0);
      expect(result.summary.totalTaxWithheld).toBeGreaterThan(0);
      expect(result.summary.totalSuperannuation).toBeGreaterThan(0);
    });

    it('should handle errors in batch processing', async () => {
      const employees = [
        { ...mockEmployee, id: 'emp-1' },
        { ...mockEmployee, id: 'emp-2', annualSalary: -1000 }, // Invalid
        { ...mockEmployee, id: 'emp-3' }
      ];

      const result = await payrollProcessingEngine.processPayrollBatch(
        employees,
        mockPayPeriod
      );

      expect(result.employeeResults).toHaveLength(2); // Only valid employees
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('emp-2');
    });
  });
});