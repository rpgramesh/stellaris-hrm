import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('../payrollProcessingEngine', () => ({ payrollProcessingEngine: {} }));
vi.mock('../auditService', () => ({ auditService: { logAction: vi.fn() } }));
vi.mock('../notificationService', () => ({ notificationService: {} }));
vi.mock('../payrollValidationService', () => ({ payrollValidationService: {} }));

import { computeHoursWorkedForReport } from '../comprehensivePayrollService';

describe('computeHoursWorkedForReport', () => {
  it('does not count Base Salary pay-period unit=1 as hours', () => {
    const hours = computeHoursWorkedForReport([
      { componentType: 'BaseSalary', description: 'Base Salary', units: 1 } as any,
    ]);
    expect(hours).toBe(1);
  });

  it('counts BaseSalary time components and Overtime units', () => {
    const hours = computeHoursWorkedForReport([
      { componentType: 'BaseSalary', description: 'Regular Hours (Timesheet 2026-02-03)', units: 76 } as any,
      { componentType: 'Overtime', description: 'Overtime', units: 4 } as any,
      { componentType: 'Allowance', description: 'Site allowance', units: 2 } as any,
      { componentType: 'BaseSalary', description: 'Base Salary', units: 1 } as any,
    ]);
    expect(hours).toBe(80);
  });
});
