import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import { timesheetService } from '../timesheetService'

describe('Employee name mapping in timesheetService.listSubmissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps GUIDs to human-readable names and fields', async () => {
    const guid = '70546403-78f4-426a-98de-f34320fdfe2a'
    ;(supabase.from as any).mockImplementation((table: string) => {
      if (table === 'employees') {
        return {
          select: () => ({
            in: (_: string, __: string[]) => Promise.resolve({
              data: [{
                id: guid,
                first_name: 'Ada',
                last_name: 'Lovelace',
                email: 'ada@example.com',
                phone: '0400 000 000',
                start_date: '2024-01-01',
                employment_status: 'Active',
                department: { name: 'Engineering' },
                position: { title: 'Software Engineer' },
              }],
              error: null,
            }),
          }),
        }
      }
      if (table === 'timesheets') {
        return {
          select: () => ({
            order: () => ({
              range: () => Promise.resolve({
                data: [{
                  id: 't1',
                  employee_id: guid,
                  week_start_date: '2026-03-02',
                  status: 'Draft',
                  total_hours: 0,
                }],
                count: 1,
                error: null,
              }),
            }),
          }),
        }
      }
      return { select: () => ({}) }
    })

    const { rows, total } = await timesheetService.listSubmissions({ page: 1, pageSize: 10 })
    expect(total).toBe(1)
    expect(rows[0].employeeName).toBe('Ada Lovelace')
    expect(rows[0].department).toBe('Engineering')
    expect(rows[0].jobTitle).toBe('Software Engineer')
    expect(rows[0].email).toBe('ada@example.com')
    expect(rows[0].phone).toBe('0400 000 000')
    expect(rows[0].hireDate).toBe('2024-01-01')
    expect(rows[0].empStatus).toBe('Active')
  })

  it('handles missing employee records gracefully', async () => {
    const guid = 'missing-emp'
    ;(supabase.from as any).mockImplementation((table: string) => {
      if (table === 'employees') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        }
      }
      if (table === 'timesheets') {
        return {
          select: () => ({
            order: () => ({
              range: () => Promise.resolve({
                data: [{
                  id: 't1',
                  employee_id: guid,
                  week_start_date: '2026-03-02',
                  status: 'Draft',
                  total_hours: 0,
                }],
                count: 1,
                error: null,
              }),
            }),
          }),
        }
      }
      return { select: () => ({}) }
    })

    const { rows } = await timesheetService.listSubmissions({ page: 1, pageSize: 10 })
    expect(rows[0].employeeName).toBe(guid)
    expect(rows[0].department).toBe('N/A')
  })

  it('derives approved hours from timesheet_entries when status is Approved', async () => {
    ;(supabase.from as any).mockImplementation((table: string) => {
      if (table === 'employees') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        }
      }
      if (table === 'timesheets') {
        return {
          select: () => ({
            order: () => ({
              range: () => Promise.resolve({
                data: [{
                  id: 't-approved',
                  employee_id: 'e1',
                  week_start_date: '2026-03-02',
                  status: 'Approved',
                  total_hours: 999,
                }],
                count: 1,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'timesheet_rows') {
        return {
          select: () => ({
            in: () => Promise.resolve({
              data: [
                { timesheet_id: 't-approved', timesheet_entries: [{ hours: 2 }, { hours: 3.5 }] },
                { timesheet_id: 't-approved', timesheet_entries: [{ hours: 1 }] },
              ],
              error: null,
            }),
          }),
        }
      }
      return { select: () => ({}) }
    })

    const { rows } = await timesheetService.listSubmissions({ page: 1, pageSize: 10 })
    expect(rows[0].status).toBe('Approved')
    expect(rows[0].hoursLogged).toBe(6.5)
  })

  it('searches employees by tokenized full name and does not ilike UUID ids', async () => {
    const orSpy = vi.fn().mockReturnThis()
    const limitSpy = vi.fn().mockResolvedValue({ data: [{ id: 'e1' }], error: null })
    const eqSpy = vi.fn().mockReturnThis()

    ;(supabase.from as any).mockImplementation((table: string) => {
      if (table === 'departments') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'employees') {
        return {
          select: () => ({
            or: orSpy,
            eq: eqSpy,
            limit: limitSpy,
          }),
        }
      }
      if (table === 'timesheets') {
        const q: any = {}
        q.eq = vi.fn(() => q)
        q.in = vi.fn(() => q)
        q.gte = vi.fn(() => q)
        q.lte = vi.fn(() => q)
        q.order = vi.fn(() => q)
        q.range = vi.fn(() => Promise.resolve({ data: [], count: 0, error: null }))
        return {
          select: () => ({
            ...q,
          }),
        }
      }
      return { select: () => ({}) }
    })

    await timesheetService.listSubmissions({ search: 'Ramesh P', status: 'Approved', page: 1, pageSize: 10 })
    expect(orSpy).toHaveBeenCalled()
    const call = String(orSpy.mock.calls[0][0])
    expect(call).toContain('first_name.ilike.%Ramesh%')
    expect(call).toContain('last_name.ilike.%P%')
    expect(call).not.toContain('id.ilike')
  })
})
