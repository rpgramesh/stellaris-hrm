import { supabase } from '@/lib/supabase'
import { employeeCache } from '../lib/cache/employeeCache'

export type EmployeeSummary = {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  start_date?: string
  employment_status?: string
  department?: { name?: string } | null
  position?: { title?: string } | null
}

export async function getNamesByIds(ids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (unique.length === 0) return {}
  const cached = employeeCache.getMany(unique)
  const missing = unique.filter((id) => !cached[id])
  if (missing.length > 0) {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .in('id', missing)
    employeeCache.setMany((data || []) as any)
    for (const row of data || []) {
      cached[row.id] = row
    }
  }
  const result: Record<string, string> = {}
  for (const id of unique) {
    const e: any = cached[id]
    result[id] = e ? [e.first_name, e.last_name].filter(Boolean).join(' ').trim() || id : id
  }
  return result
}

export async function getSummariesByIds(ids: string[]): Promise<Record<string, EmployeeSummary>> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (unique.length === 0) return {}
  const cached = employeeCache.getMany(unique)
  const missing = unique.filter((id) => !cached[id])
  if (missing.length > 0) {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, phone, start_date, employment_status, department:departments(name), position:job_positions(title)')
      .in('id', missing)
    employeeCache.setMany((data || []) as any)
    for (const row of data || []) {
      cached[row.id] = row as any
    }
  }
  const map: Record<string, EmployeeSummary> = {}
  for (const id of unique) {
    if (cached[id]) map[id] = cached[id] as any
  }
  return map
}

