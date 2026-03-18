import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../awardInterpretationEngine', () => ({ awardInterpretationEngine: {} }));
vi.mock('../timesheetService', () => ({ timesheetService: {} }));
vi.mock('../statutoryTablesService', () => ({ statutoryTablesService: {} }));
vi.mock('../attendanceService', () => ({ attendanceService: {} }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('../auditService', () => ({ auditService: { logAction: vi.fn() } }));

import { payrollProcessingEngine } from '../payrollProcessingEngine';

describe('payrollProcessingEngine paid-lock validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects processing when payroll run is already Paid', async () => {
    vi.spyOn(payrollProcessingEngine, 'getPayrollRun' as any).mockResolvedValue({
      id: 'run1',
      payPeriodStart: '2026-02-01',
      payPeriodEnd: '2026-02-28',
      payFrequency: 'Fortnightly',
      status: 'Paid',
    });

    await expect(payrollProcessingEngine.processPayrollRun('run1', 'processor')).rejects.toThrow(/already paid/i);
  });

  it('rejects processing when selected employees are already paid for the same period', async () => {
    const updateSpy = vi.spyOn(payrollProcessingEngine, 'updatePayrollRunStatus' as any).mockResolvedValue(undefined);

    vi.spyOn(payrollProcessingEngine, 'getPayrollRun' as any).mockResolvedValue({
      id: 'run1',
      payPeriodStart: '2026-02-01',
      payPeriodEnd: '2026-02-28',
      payFrequency: 'Fortnightly',
      status: 'Approved',
    });

    vi.spyOn(payrollProcessingEngine, 'getEmployeesForPayroll' as any).mockResolvedValue([
      { id: 'pe1', employeeId: 'e1', payFrequency: 'Fortnightly', employmentType: 'FullTime' },
    ]);

    vi.spyOn(payrollProcessingEngine, 'getPaidEmployeeIdsForPeriod' as any).mockResolvedValue(new Set(['e1']));

    await expect(payrollProcessingEngine.processPayrollRun('run1', 'processor', ['pe1'])).rejects.toThrow(/already processed and paid/i);
    expect(updateSpy).not.toHaveBeenCalledWith('run1', 'Processing', 'processor');
  });
});

