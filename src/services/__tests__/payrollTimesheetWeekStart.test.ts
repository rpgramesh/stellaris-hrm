import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../awardInterpretationEngine', () => ({ awardInterpretationEngine: {} }));
vi.mock('../statutoryTablesService', () => ({ statutoryTablesService: {} }));
vi.mock('../attendanceService', () => ({ attendanceService: {} }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('../auditService', () => ({ auditService: { logAction: vi.fn() } }));

const getByWeekMock = vi.fn();
vi.mock('../timesheetService', () => ({ timesheetService: { getByWeek: (...args: any[]) => getByWeekMock(...args) } }));

import { payrollProcessingEngine } from '../payrollProcessingEngine';

describe('payrollProcessingEngine.getTimesheetsForPeriod', () => {
  beforeEach(() => {
    getByWeekMock.mockReset();
    getByWeekMock.mockResolvedValue(null);
  });

  it('queries week_start_date using Monday-based weeks (matches timesheet schema)', async () => {
    await payrollProcessingEngine.getTimesheetsForPeriod('emp1', '2026-02-01', '2026-02-28');

    const calls = getByWeekMock.mock.calls.map((c) => c[1]);
    expect(calls).toEqual(['2026-01-26', '2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23']);
  });
});

