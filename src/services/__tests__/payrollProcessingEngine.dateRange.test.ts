import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn() })) })),
      auth: { getUser: vi.fn(), getSession: vi.fn() },
    },
  };
});

vi.mock('@/services/auditService', () => {
  return {
    auditService: { logAction: vi.fn() },
  };
});
import { payrollProcessingEngine } from '@/services/payrollProcessingEngine';
vi.mock('@/services/awardInterpretationEngine', () => {
  return {
    awardInterpretationEngine: {
      interpretAward: vi.fn(),
    },
  };
});




describe('payrollProcessingEngine.calculateHoursFromTimesheet', () => {
  it('excludes entry hours outside the provided period range', () => {
    const timesheet: any = {
      rows: [
        {
          entries: [
            { date: '2025-12-30', hours: 8 },
            { date: '2025-12-31', hours: 8 },
            { date: '2026-01-01', hours: 8 },
            { date: '2026-01-04', hours: 8 },
          ],
        },
      ],
    };

    const res = payrollProcessingEngine.calculateHoursFromTimesheet(timesheet as any, '2025-12-01', '2025-12-31');
    expect(res.totalHours).toBe(16);
  });

  it('includes hours across year boundary when range spans both years', () => {
    const timesheet: any = {
      rows: [
        {
          entries: [
            { date: '2025-12-31', hours: 8 },
            { date: '2026-01-01', hours: 8 },
          ],
        },
      ],
    };

    const res = payrollProcessingEngine.calculateHoursFromTimesheet(timesheet as any, '2025-12-29', '2026-01-04');
    expect(res.totalHours).toBe(16);
  });
});
