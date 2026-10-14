import { describe, it, expect, vi, beforeEach } from 'vitest'

const selectMock = vi.fn()
const eqMock = vi.fn()
const ilikeMock = vi.fn()
const lteMock = vi.fn()
const getSessionMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: (...args: any[]) => selectMock(...args),
      eq: (...args: any[]) => eqMock(...args),
      ilike: (...args: any[]) => ilikeMock(...args),
      lte: (...args: any[]) => lteMock(...args),
    })),
    auth: {
      getSession: (...args: any[]) => getSessionMock(...args),
    },
  },
}))

vi.mock('../auditService', () => ({ auditService: { logAction: vi.fn() } }))
vi.mock('../timesheetService', () => ({ timesheetService: {} }))
vi.mock('../statutoryTablesService', () => ({ statutoryTablesService: {} }))
vi.mock('../awardInterpretationEngine', () => ({ awardInterpretationEngine: {} }))
vi.mock('../attendanceService', () => ({ attendanceService: {} }))

import { payrollProcessingEngine } from '../payrollProcessingEngine'

describe('payrollProcessingEngine.getTimesheetsForPeriod', () => {
  beforeEach(() => {
    selectMock.mockReset()
    eqMock.mockReset()
    ilikeMock.mockReset()
    lteMock.mockReset()
    getSessionMock.mockReset()
  })

  it('queries approved status case-insensitively', async () => {
    lteMock.mockResolvedValue({ data: [], error: null })
    ilikeMock.mockReturnValue({ lte: lteMock })
    eqMock.mockReturnValue({ ilike: ilikeMock })
    selectMock.mockReturnValue({ eq: eqMock })

    await payrollProcessingEngine.getTimesheetsForPeriod('emp-1', '2026-03-01', '2026-03-31')

    expect(eqMock).toHaveBeenCalledWith('employee_id', 'emp-1')
    expect(ilikeMock).toHaveBeenCalledWith('status', 'approved')
    expect(lteMock).toHaveBeenCalledWith('week_start_date', '2026-03-31')
  })

  it('falls back to admin API when direct query fails', async () => {
    lteMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    ilikeMock.mockReturnValue({ lte: lteMock })
    eqMock.mockReturnValue({ ilike: ilikeMock })
    selectMock.mockReturnValue({ eq: eqMock })

    getSessionMock.mockResolvedValue({ data: { session: { access_token: 't' } } })

    ;(globalThis as any).window = {} as any
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          rows: [
            {
              id: 'ts1',
              employee_id: 'emp-1',
              week_start_date: '2026-03-03',
              status: 'Approved',
              total_hours: 0,
              approved_hours: 40,
            },
          ],
        }),
    })
    ;(globalThis as any).fetch = fetchMock

    const res = await payrollProcessingEngine.getTimesheetsForPeriod('emp-1', '2026-03-01', '2026-03-31')
    expect(fetchMock).toHaveBeenCalled()
    expect(res.length).toBe(1)
    expect((res[0] as any).total_hours).toBe(40)
  })
})
