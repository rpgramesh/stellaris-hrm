type EmployeeSummary = {
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

const store = new Map<string, { value: EmployeeSummary; expires: number }>()
const TTL_MS = 60 * 1000

export const employeeCache = {
  get(id: string): EmployeeSummary | null {
    const hit = store.get(id)
    if (!hit) return null
    if (Date.now() > hit.expires) {
      store.delete(id)
      return null
    }
    return hit.value
  },
  set(record: EmployeeSummary) {
    store.set(record.id, { value: record, expires: Date.now() + TTL_MS })
  },
  getMany(ids: string[]): Record<string, EmployeeSummary> {
    const out: Record<string, EmployeeSummary> = {}
    for (const id of ids) {
      const v = this.get(id)
      if (v) out[id] = v
    }
    return out
  },
  setMany(records: EmployeeSummary[]) {
    for (const r of records) this.set(r)
  },
}

