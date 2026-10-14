import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('../auditService', () => ({ auditService: { logAction: vi.fn() } }))
vi.mock('../timesheetService', () => ({ timesheetService: {} }))
vi.mock('../statutoryTablesService', () => ({ statutoryTablesService: {} }))
vi.mock('../awardInterpretationEngine', () => ({ awardInterpretationEngine: {} }))
vi.mock('../attendanceService', () => ({ attendanceService: {} }))

import {
  isApprovedTimesheetStatus,
  normalizeTimesheetStatus,
  payrollProcessingEngine,
} from '../payrollProcessingEngine'

describe('payroll timesheet approval filtering', () => {
  it('normalizes status values consistently', () => {
    expect(normalizeTimesheetStatus(' Approved ')).toBe('approved')
    expect(normalizeTimesheetStatus('SUBMITTED')).toBe('submitted')
    expect(normalizeTimesheetStatus(null)).toBe('')
    expect(normalizeTimesheetStatus(undefined)).toBe('')
  })

  it('treats only approved status as approved', () => {
    expect(isApprovedTimesheetStatus('Approved')).toBe(true)
    expect(isApprovedTimesheetStatus('approved')).toBe(true)
    expect(isApprovedTimesheetStatus('Submitted')).toBe(false)
    expect(isApprovedTimesheetStatus('Pending')).toBe(false)
    expect(isApprovedTimesheetStatus('Rejected')).toBe(false)
    expect(isApprovedTimesheetStatus('Draft')).toBe(false)
  })

  it('excludes non-approved timesheets from hour calculations', () => {
    const submitted = payrollProcessingEngine.calculateHoursFromTimesheet({
      status: 'Submitted',
      total_hours: 10,
      rows: [],
    } as any)
    expect(submitted.totalHours).toBe(0)
    expect(submitted.regularHours).toBe(0)
    expect(submitted.overtimeHours).toBe(0)

    const approved = payrollProcessingEngine.calculateHoursFromTimesheet({
      status: 'Approved',
      total_hours: 40,
      rows: [],
    } as any)
    expect(approved.totalHours).toBe(40)
    expect(approved.regularHours).toBe(38)
    expect(approved.overtimeHours).toBe(2)
  })
})
