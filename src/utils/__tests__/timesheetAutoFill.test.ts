import { describe, it, expect } from 'vitest';
import { detectAutoFillCandidates } from '@/utils/timesheetAutoFill';

describe('detectAutoFillCandidates', () => {
  it('detects public holidays and assigns default hours', () => {
    const days = [new Date('2026-01-01T00:00:00.000Z')];
    const holidays: any[] = [{ date: '2026-01-01', name: "New Year's Day" }];
    const leaves: any[] = [];

    const res = detectAutoFillCandidates({ days, holidays, leaves, defaultHours: 8 });
    expect(res).toEqual([{ date: '2026-01-01', hours: 8, reason: 'HOLIDAY', label: "New Year's Day" }]);
  });

  it('uses holiday hour override when present (partial/company holiday)', () => {
    const days = [new Date('2026-12-24T00:00:00.000Z')];
    const holidays: any[] = [{ date: '2026-12-24', name: 'Company Half Day', hours: 4 }];
    const leaves: any[] = [];

    const res = detectAutoFillCandidates({ days, holidays, leaves, defaultHours: 8 });
    expect(res[0].hours).toBe(4);
    expect(res[0].reason).toBe('HOLIDAY');
  });

  it('detects full-day leave and assigns default hours', () => {
    const days = [new Date('2026-03-05T00:00:00.000Z')];
    const holidays: any[] = [];
    const leaves: any[] = [{ startDate: '2026-03-05', endDate: '2026-03-05', type: 'Annual Leave', totalHours: 8 }];

    const res = detectAutoFillCandidates({ days, holidays, leaves, defaultHours: 8 });
    expect(res).toEqual([{ date: '2026-03-05', hours: 8, reason: 'LEAVE', label: 'Annual Leave' }]);
  });

  it('detects partial leave and assigns leave hours', () => {
    const days = [new Date('2026-03-06T00:00:00.000Z')];
    const holidays: any[] = [];
    const leaves: any[] = [{ startDate: '2026-03-06', endDate: '2026-03-06', type: 'Personal Leave', totalHours: 3.5 }];

    const res = detectAutoFillCandidates({ days, holidays, leaves, defaultHours: 8 });
    expect(res).toEqual([{ date: '2026-03-06', hours: 3.5, reason: 'PARTIAL_LEAVE', label: 'Personal Leave' }]);
  });

  it('does not auto-fill weekends', () => {
    const days = [new Date('2026-01-03T00:00:00.000Z')];
    const holidays: any[] = [{ date: '2026-01-03', name: 'Weekend Holiday' }];
    const leaves: any[] = [{ startDate: '2026-01-03', endDate: '2026-01-03', type: 'Annual Leave', totalHours: 8 }];

    const res = detectAutoFillCandidates({ days, holidays, leaves, defaultHours: 8 });
    expect(res).toEqual([]);
  });
});

