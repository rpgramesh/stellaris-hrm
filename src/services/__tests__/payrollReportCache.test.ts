import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {} as any,
}));

vi.mock('../payrollProcessingEngine', () => ({
  payrollProcessingEngine: {} as any,
}));

vi.mock('../auditService', () => ({
  auditService: { logAction: vi.fn() } as any,
}));

vi.mock('../notificationService', () => ({
  notificationService: {} as any,
}));

vi.mock('../payrollValidationService', () => ({
  payrollValidationService: {} as any,
}));

const {
  computePayrollReportChecksum,
  filterPayrollReportByEmployeeIds,
  validateCachedPayrollReportRow,
  validatePayrollReportIntegrity,
} = await import('../comprehensivePayrollService');

const makeReport = () => ({
  payrollRunId: 'run-1',
  periodStart: '2026-03-01',
  periodEnd: '2026-03-31',
  totalEmployees: 2,
  totalGrossPay: 1000,
  totalTax: 200,
  totalNetPay: 800,
  totalSuper: 100,
  employeeBreakdown: [
    {
      employeeId: 'e-1',
      employeeName: 'Alice',
      grossPay: 400,
      tax: 80,
      netPay: 320,
      super: 40,
      hoursWorked: 10,
      status: 'Processed' as const,
      errors: [],
      warnings: [],
    },
    {
      employeeId: 'e-2',
      employeeName: 'Bob',
      grossPay: 600,
      tax: 120,
      netPay: 480,
      super: 60,
      hoursWorked: 15,
      status: 'Processed' as const,
      errors: [],
      warnings: [],
    },
  ],
  complianceStatus: { minimumWageCompliant: true, superCompliant: true, taxCompliant: true, issues: [] },
});

describe('payroll report cache helpers', () => {
  it('computes a stable checksum independent of employee order', () => {
    const r1 = makeReport();
    const r2 = {
      ...makeReport(),
      employeeBreakdown: [...makeReport().employeeBreakdown].reverse(),
    };

    expect(computePayrollReportChecksum(r1 as any)).toEqual(computePayrollReportChecksum(r2 as any));
  });

  it('validates integrity based on totals and breakdown sums', () => {
    const ok = makeReport();
    expect(validatePayrollReportIntegrity(ok as any).isValid).toBe(true);

    const bad = { ...makeReport(), totalNetPay: 999 };
    expect(validatePayrollReportIntegrity(bad as any).isValid).toBe(false);
  });

  it('filters a report by employee ids and recomputes totals', () => {
    const report = makeReport();
    const filtered = filterPayrollReportByEmployeeIds(report as any, ['e-2']);
    expect(filtered.totalEmployees).toBe(1);
    expect(filtered.totalGrossPay).toBe(600);
    expect(filtered.totalTax).toBe(120);
    expect(filtered.totalNetPay).toBe(480);
    expect(filtered.totalSuper).toBe(60);
    expect(filtered.employeeBreakdown).toHaveLength(1);
    expect(filtered.employeeBreakdown[0].employeeId).toBe('e-2');
  });

  it('rejects cached rows marked invalid or with checksum mismatch', () => {
    const report = makeReport();
    const checksum = computePayrollReportChecksum(report as any);

    const ok = validateCachedPayrollReportRow({ report, checksum, is_valid: true }, { employeeCount: 2 });
    expect(ok.report).toBeTruthy();

    const markedInvalid = validateCachedPayrollReportRow({ report, checksum, is_valid: false }, { employeeCount: 2 });
    expect(markedInvalid.report).toBeNull();

    const badChecksum = validateCachedPayrollReportRow({ report, checksum: 'deadbeef', is_valid: true }, { employeeCount: 2 });
    expect(badChecksum.report).toBeNull();
  });
});
