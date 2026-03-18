import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('../auditService', () => ({ auditService: { logAction: vi.fn() } }));
vi.mock('../comprehensivePayrollService', () => ({ comprehensivePayrollService: { calculatePayrollPreview: vi.fn() } }));

import { normalizePayrollRunStatusCandidates } from '../payrollReportingService';

describe('normalizePayrollRunStatusCandidates', () => {
  it('returns case variants for status comparisons', () => {
    const res = normalizePayrollRunStatusCandidates('Paid');
    expect(res).toContain('Paid');
    expect(res).toContain('paid');
  });

  it('handles empty input', () => {
    expect(normalizePayrollRunStatusCandidates('')).toEqual([]);
  });
});

