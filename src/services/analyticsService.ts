import { supabase } from '@/lib/supabase'

export type HeadcountPoint = { month: string; employees: number }
export type DepartmentSalary = { department: string; actual: number }
export type GenderSlice = { name: string; value: number }

const fmtMonth = (d: Date) =>
  d.toLocaleString('en-AU', { month: 'short' })

export const analyticsService = {
  async getHeadcountTrend(months = 6): Promise<HeadcountPoint[]> {
    const points: HeadcountPoint[] = []
    const now = new Date()
    for (let i = months - 1; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i + 1, 0) // end of month
      const endIso = dt.toISOString().slice(0, 10)
      // Query employees up to this month (exclude terminated if status exists)
      const { data, error } = await supabase
        .from('employees')
        .select('id, status, join_date')
        .lte('join_date', endIso)
        .limit(10000)
      if (error) {
        console.warn('Headcount query failed:', error.message)
        points.push({ month: fmtMonth(dt), employees: 0 })
        continue
      }
      const count = (data || []).filter((e: any) => e.status !== 'Terminated').length
      points.push({ month: fmtMonth(dt), employees: count })
    }
    return points
  },

  async getGenderDistribution(): Promise<GenderSlice[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('gender')
      .limit(10000)
    if (error) {
      console.warn('Gender distribution query failed:', error.message)
      return []
    }
    const counts: Record<string, number> = {}
    for (const row of data || []) {
      const g = row.gender || 'Unspecified'
      counts[g] = (counts[g] || 0) + 1
    }
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] }))
  },

  async getDepartmentSalaryActuals(): Promise<DepartmentSalary[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('department, salary')
      .limit(10000)
    if (error) {
      console.warn('Department salary query failed:', error.message)
      return []
    }
    const map: Record<string, number> = {}
    for (const row of data || []) {
      const d = row.department || 'Unspecified'
      map[d] = (map[d] || 0) + (Number(row.salary) || 0)
    }
    return Object.keys(map).map(k => ({ department: k, actual: map[k] }))
  }
}

