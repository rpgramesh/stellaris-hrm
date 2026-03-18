import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../payrollValidationService', () => {
  return {
    payrollValidationService: {
      validateEmployee: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.mock('../payrollProcessingEngine', () => {
  return {
    payrollProcessingEngine: {},
  };
});

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 't' } } }),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { remark: null }, error: null }),
      })),
    },
  };
});

import { comprehensivePayrollService } from '@/services/comprehensivePayrollService';

describe('comprehensivePayrollService.validateEmployeePayroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not report missing timesheets when preloaded approved timesheets exist', async () => {
    const employee: any = {
      employeeId: 'e-employee',
      firstName: 'Ramesh',
      lastName: 'P',
    };
    const payrollRun: any = {
      payPeriodStart: '2026-02-01',
      payPeriodEnd: '2026-02-28',
    };

    const res = await comprehensivePayrollService.validateEmployeePayroll(employee, payrollRun, {
      timesheetsForPeriod: [{ status: 'Approved', week_start_date: '2026-02-02' }],
    });

    expect(res.missingTimesheets).toEqual([]);
    expect(res.errors).toEqual([]);
  });

  it('does not treat zero-hour draft timesheets as unapproved blockers', async () => {
    const employee: any = {
      employeeId: 'e-employee',
      firstName: 'Ramesh',
      lastName: 'P',
    };
    const payrollRun: any = {
      payPeriodStart: '2026-02-01',
      payPeriodEnd: '2026-02-28',
    };

    const res = await comprehensivePayrollService.validateEmployeePayroll(employee, payrollRun, {
      timesheetsForPeriod: [
        { status: 'Draft', week_start_date: '2026-01-26', total_hours: 0 },
        { status: 'Approved', week_start_date: '2026-02-02', total_hours: 40 },
      ],
    });

    expect(res.unapprovedTimesheets).toEqual([]);
    expect(res.errors).toEqual([]);
  });

  it('reports unapproved timesheets when any timesheet is not Approved', async () => {
    const employee: any = {
      employeeId: 'e-employee',
      firstName: 'Ramesh',
      lastName: 'P',
    };
    const payrollRun: any = {
      payPeriodStart: '2026-02-01',
      payPeriodEnd: '2026-02-28',
    };

    const res = await comprehensivePayrollService.validateEmployeePayroll(employee, payrollRun, {
      timesheetsForPeriod: [{ status: 'Submitted', week_start_date: '2026-02-02', total_hours: 8 }],
    });

    expect(res.unapprovedTimesheets).toEqual(['e-employee']);
    expect(res.errors.join(' ')).toContain('unapproved timesheets');
  });

  it('reports unapproved timesheets only when they have hours', async () => {
    const employee: any = {
      employeeId: 'e-employee',
      firstName: 'Ramesh',
      lastName: 'P',
    };
    const payrollRun: any = {
      payPeriodStart: '2026-02-01',
      payPeriodEnd: '2026-02-28',
    };

    const res = await comprehensivePayrollService.validateEmployeePayroll(employee, payrollRun, {
      timesheetsForPeriod: [
        { status: 'Draft', week_start_date: '2026-02-09', total_hours: 5 },
        { status: 'Approved', week_start_date: '2026-02-02', total_hours: 40 },
      ],
    });

    expect(res.unapprovedTimesheets).toEqual(['e-employee']);
    expect(res.errors.join(' ')).toContain('2026-02-09');
  });

  it('calculatePayrollPreview returns run totals when no employees are selected', async () => {
    vi.spyOn(comprehensivePayrollService, 'getPayrollRun' as any).mockResolvedValue({
      id: 'run1',
      payPeriodStart: '2026-02-01',
      payPeriodEnd: '2026-02-28',
      status: 'Approved',
      employeeCount: 2,
      totalGrossPay: 1000,
      totalTax: 200,
      totalNetPay: 800,
      totalSuper: 100,
    });

    const report = await comprehensivePayrollService.calculatePayrollPreview('run1', []);
    expect(report.totalEmployees).toBe(2);
    expect(report.totalGrossPay).toBe(1000);
    expect(report.totalTax).toBe(200);
    expect(report.totalNetPay).toBe(800);
    expect(report.totalSuper).toBe(100);
  });
});
