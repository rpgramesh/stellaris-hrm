import { describe, it, expect, beforeEach, vi } from 'vitest';
import { comprehensivePayrollService } from '../comprehensivePayrollService';
import { payrollErrorHandlingService } from '../payrollErrorHandlingService';
import { payrollReportingService } from '../payrollReportingService';
import { supabase } from '@/lib/supabase';

// Helper to create a chainable mock
const createChainableMock = (data: any = null, error: any = null) => {
  const mock: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data, error })),
    // This allows the mock itself to be awaited
    then: vi.fn().mockImplementation((onFulfilled) => 
      Promise.resolve({ data, error }).then(onFulfilled)
    )
  };
  return mock;
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

// Mock related services
vi.mock('../payrollProcessingEngine', () => ({
  payrollProcessingEngine: {
    processPayrollRun: vi.fn().mockResolvedValue([]),
    mapPayslipFromDb: vi.fn().mockImplementation(data => data)
  }
}));

vi.mock('../auditService', () => ({
  auditService: {
    logAction: vi.fn().mockResolvedValue(null)
  }
}));

vi.mock('../notificationService', () => ({
  notificationService: {
    createNotification: vi.fn().mockResolvedValue(null)
  }
}));

describe('ComprehensivePayrollModule Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPayrollRunId = 'run-123';
  const mockPayrollRun = {
    id: mockPayrollRunId,
    pay_period_start: '2024-01-01',
    pay_period_end: '2024-01-14',
    pay_frequency: 'Fortnightly',
    status: 'Draft',
    total_gross_pay: 0,
    total_tax: 0,
    total_super: 0,
    total_net_pay: 0,
    employee_count: 0
  };

  const mockEmployees = [
    { 
      id: 'emp-1', 
      first_name: 'John', 
      last_name: 'Doe', 
      employment_type: 'FullTime', 
      pay_frequency: 'Fortnightly', 
      annual_salary: 75000,
      hourly_rate: null,
      tax_file_number: '123456789',
      super_fund_id: 'super-1',
      company_id: 'comp-1'
    },
    { 
      id: 'emp-2', 
      first_name: 'Jane', 
      last_name: 'Smith', 
      employment_type: 'Casual', 
      pay_frequency: 'Fortnightly', 
      annual_salary: null,
      hourly_rate: 35.50,
      tax_file_number: '987654321',
      super_fund_id: 'super-1',
      company_id: 'comp-1'
    }
  ];

  describe('Validation Engine', () => {
    it('should correctly flag missing timesheets for casual employees', async () => {
      // Setup mock responses for this test
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'payroll_runs') return createChainableMock(mockPayrollRun);
        if (table === 'employees') return createChainableMock(mockEmployees);
        if (table === 'timesheets') return createChainableMock([]); // No timesheets
        return createChainableMock();
      });

      const validation = await comprehensivePayrollService.validatePayrollRun(mockPayrollRunId);
      
      expect(validation.isValid).toBe(false);
      expect(validation.missingTimesheets).toContain('emp-2');
    });
  });

  describe('Processing Workflow', () => {
    it('should complete processing successfully', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'payroll_runs') return createChainableMock(mockPayrollRun);
        if (table === 'employees') return createChainableMock(mockEmployees);
        if (table === 'timesheets') return createChainableMock([{ id: 'ts-1', status: 'Approved' }]);
        return createChainableMock();
      });

      const result = await comprehensivePayrollService.processPayrollRun(mockPayrollRunId, 'admin-id', {
        generatePayslips: true
      });

      expect(result.payrollRunId).toBe(mockPayrollRunId);
      expect(result.employeeBreakdown).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should classify and record calculation errors', async () => {
      vi.mocked(supabase.from).mockImplementation(() => createChainableMock({ id: 'err-1' }));
      
      const mockError = new Error('Division by zero');
      const errorRecord = await payrollErrorHandlingService.handlePayrollError(mockError, {
        payrollRunId: 'run-1',
        employeeId: 'emp-1',
        operation: 'calculate_tax'
      });

      expect(errorRecord.errorType).toBe('Calculation');
      expect(errorRecord.severity).toBe('High');
      expect(errorRecord.message).toContain('Division by zero');
    });
  });

  describe('Reporting & Analytics', () => {
    it('should aggregate payslip data into summary totals', async () => {
      const mockPayslips = [
        { gross_pay: 5000, tax_withheld: 1000, net_pay: 4000, superannuation: 575, period_start: '2024-01-01', period_end: '2024-01-15' },
        { gross_pay: 6000, tax_withheld: 1200, net_pay: 4800, superannuation: 690, period_start: '2024-01-16', period_end: '2024-01-31' }
      ];

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'payslips') return createChainableMock(mockPayslips);
        return createChainableMock();
      });

      const report = await payrollReportingService.generatePayrollSummaryReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(report.totals.grossPay).toBe(11000);
      expect(report.totals.tax).toBe(2200);
      expect(report.totals.netPay).toBe(8800);
      expect(report.totals.superannuation).toBe(1265);
    });
  });
});
