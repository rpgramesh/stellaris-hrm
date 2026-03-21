import { describe, expect, it } from 'vitest';
import { clampIsoDate, clampWeekEndToPeriod, isoWeekEnd, isIsoDateInRange } from '@/lib/payroll/periodClamp';

describe('periodClamp', () => {
  it('clamps week end to period end (Dec 31 should not show Jan 04)', () => {
    expect(isoWeekEnd('2025-12-29')).toBe('2026-01-04');
    expect(clampWeekEndToPeriod('2025-12-29', '2025-12-31')).toBe('2025-12-31');
  });

  it('keeps week end when within period', () => {
    expect(clampWeekEndToPeriod('2025-12-01', '2025-12-31')).toBe('2025-12-07');
  });

  it('clamps dates within boundaries', () => {
    expect(clampIsoDate('2025-11-30', '2025-12-01', '2025-12-31')).toBe('2025-12-01');
    expect(clampIsoDate('2026-01-04', '2025-12-01', '2025-12-31')).toBe('2025-12-31');
    expect(clampIsoDate('2025-12-15', '2025-12-01', '2025-12-31')).toBe('2025-12-15');
  });

  it('checks ISO date range across year boundary', () => {
    expect(isIsoDateInRange('2025-12-31', '2025-12-01', '2025-12-31')).toBe(true);
    expect(isIsoDateInRange('2026-01-01', '2025-12-01', '2025-12-31')).toBe(false);
    expect(isIsoDateInRange('2026-01-01', '2025-12-29', '2026-01-04')).toBe(true);
  });
});

