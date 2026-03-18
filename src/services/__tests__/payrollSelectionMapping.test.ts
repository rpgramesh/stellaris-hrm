import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('../payrollProcessingEngine', () => ({ payrollProcessingEngine: {} }));
vi.mock('../auditService', () => ({ auditService: { logAction: vi.fn() } }));
vi.mock('../notificationService', () => ({ notificationService: {} }));
vi.mock('../payrollValidationService', () => ({ payrollValidationService: {} }));

import { resolveSelectedPayrollEmployees } from '../comprehensivePayrollService';

describe('resolveSelectedPayrollEmployees', () => {
  it('resolves employees by payroll_employees.id', () => {
    const allEmployees: any[] = [
      { id: 'pe1', employeeId: 'e1' },
      { id: 'pe2', employeeId: 'e2' },
    ];

    const res = resolveSelectedPayrollEmployees(allEmployees as any, ['pe2']);
    expect(res.map((r: any) => r.id)).toEqual(['pe2']);
  });

  it('resolves employees by employees.id (employeeId) when payroll id is not provided', () => {
    const allEmployees: any[] = [
      { id: 'pe1', employeeId: 'e1' },
      { id: 'pe2', employeeId: 'e2' },
    ];

    const res = resolveSelectedPayrollEmployees(allEmployees as any, ['e1']);
    expect(res.map((r: any) => r.id)).toEqual(['pe1']);
  });

  it('dedupes when selection contains both payroll id and employee id for the same person', () => {
    const allEmployees: any[] = [
      { id: 'pe1', employeeId: 'e1' },
      { id: 'pe2', employeeId: 'e2' },
    ];

    const res = resolveSelectedPayrollEmployees(allEmployees as any, ['pe1', 'e1']);
    expect(res.map((r: any) => r.id)).toEqual(['pe1']);
  });

  it('returns empty when no selection is provided', () => {
    const allEmployees: any[] = [{ id: 'pe1', employeeId: 'e1' }];
    const res = resolveSelectedPayrollEmployees(allEmployees as any, []);
    expect(res).toEqual([]);
  });
});
