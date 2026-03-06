import { supabase } from '@/lib/supabase';
import { Timesheet, TimesheetRow, TimesheetEntry, TimesheetTemplate, TimesheetStatus } from '@/types';
import { employeeCache } from '../lib/cache/employeeCache';

const mapEntryFromDb = (db: any): TimesheetEntry => ({
  id: db.id,
  rowId: db.row_id,
  date: db.date,
  hours: Number(db.hours),
  notes: db.notes
});

const mapRowFromDb = (db: any): TimesheetRow => ({
  id: db.id,
  timesheetId: db.timesheet_id,
  projectId: db.project_id,
  project: db.projects ? {
    id: db.projects.id,
    name: db.projects.name,
    code: db.projects.code,
    color: db.projects.color,
    active: db.projects.active
  } : undefined,
  type: db.type,
  entries: db.timesheet_entries?.map(mapEntryFromDb) || []
});

const mapTimesheetFromDb = (db: any): Timesheet => ({
  id: db.id,
  employeeId: db.employee_id,
  weekStartDate: db.week_start_date,
  status: db.status as TimesheetStatus,
  totalHours: Number(db.total_hours),
  rows: db.timesheet_rows?.map(mapRowFromDb) || [],
  created_at: db.created_at,
  updated_at: db.updated_at
});

export const timesheetService = {
  async listSubmissions(options?: {
    page?: number;
    pageSize?: number;
    status?: TimesheetStatus | 'All';
    department?: string | 'All';
    search?: string;
    sortBy?: 'week_start_date' | 'status' | 'total_hours';
    sortDir?: 'asc' | 'desc';
  }): Promise<{ rows: Array<{ id: string; employeeId: string; employeeName: string; department: string; jobTitle?: string; email?: string; phone?: string; hireDate?: string; empStatus?: string; status: any; submittedAt?: string; payPeriod: string; hoursLogged: number }>; total: number }> {
    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.min(100, Math.max(1, options?.pageSize || 20));
    const allowedSorts = ['week_start_date', 'status', 'total_hours'] as const;
    const sortCandidate = options?.sortBy;
    const sortBy = (sortCandidate && (allowedSorts as readonly string[]).includes(sortCandidate as string))
      ? (sortCandidate as typeof allowedSorts[number])
      : 'week_start_date';
    const ascending = (options?.sortDir || 'desc') === 'asc';

    let employeeIds: string[] | null = null;
    if ((options?.department && options.department !== 'All') || (options?.search && options.search.trim() !== '')) {
      let empQuery = supabase.from('employees').select('id');
      if (options?.department && options.department !== 'All') {
        empQuery = empQuery.eq('department', options.department);
      }
      if (options?.search && options.search.trim() !== '') {
        const s = options.search.trim();
        empQuery = empQuery.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,id.ilike.%${s}%`);
      }
      const { data: emps, error: empErr } = await empQuery.limit(1000);
      if (empErr) throw empErr;
      employeeIds = (emps || []).map((e: any) => e.id);
      if (employeeIds.length === 0) {
        return { rows: [], total: 0 };
      }
    }

    let base = supabase.from('timesheets').select('id, employee_id, week_start_date, status, total_hours', { count: 'exact' });
    if (options?.status && options.status !== 'All') {
      base = base.eq('status', options.status);
    }
    if (employeeIds) {
      base = base.in('employee_id', employeeIds);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await base.order(sortBy, { ascending }).range(from, to);
    if (error) throw error;
    const rows = data || [];
    const ids = Array.from(new Set(rows.map((t: any) => t.employee_id))).filter(Boolean);
    let employeesById: Record<string, any> = {};
    if (ids.length > 0) {
      const cached = employeeCache.getMany(ids);
      employeesById = { ...cached };
      const missing = ids.filter((id) => !employeesById[id]);
      if (missing.length > 0) {
        const { data: emps } = await supabase
          .from('employees')
          .select('id, first_name, last_name, email, phone, start_date, employment_status, department:departments(name), position:job_positions(title)')
          .in('id', missing);
        for (const e of emps || []) {
          employeesById[e.id] = e;
        }
        employeeCache.setMany((emps || []) as any);
      }
    }
    const mapped = rows.map((t: any) => {
      const e = employeesById[t.employee_id] || {};
      const name = [e.first_name, e.last_name].filter(Boolean).join(' ') || t.employee_id;
      const startDate = new Date(t.week_start_date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      const payPeriod = `${startDate.toISOString().slice(0, 10)} - ${endDate.toISOString().slice(0, 10)}`;
      return {
        id: t.id,
        employeeId: t.employee_id,
        employeeName: name,
        department: e?.department?.name || 'N/A',
        jobTitle: e?.position?.title,
        email: e?.email,
        phone: e?.phone,
        hireDate: e?.start_date,
        empStatus: e?.employment_status,
        status: t.status,
        submittedAt: undefined,
        payPeriod,
        hoursLogged: Number(t.total_hours || 0),
      };
    });
    return { rows: mapped, total: count || 0 };
  },

  async getEmployeeTimesheetDetail(employeeId: string): Promise<{ employee: any; timesheets: Timesheet[] }> {
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, phone, start_date, employment_status, department:departments(name), position:job_positions(title)')
      .eq('id', employeeId)
      .single();
    if (empErr) throw empErr;

    const { data: tdata, error: tErr } = await supabase
      .from('timesheets')
      .select(`*, timesheet_rows (*, projects (*), timesheet_entries (*))`)
      .eq('employee_id', employeeId)
      .order('week_start_date', { ascending: false })
      .limit(5);
    if (tErr) throw tErr;
    const ts = (tdata || []).map(mapTimesheetFromDb);
    return { employee, timesheets: ts };
  },

  async updateSubmission(id: string, updates: Partial<{ status: TimesheetStatus; hoursLogged: number }>): Promise<void> {
    const { data: current, error: curErr } = await supabase.from('timesheets').select('*').eq('id', id).single();
    if (curErr) throw curErr;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id || null;
    const { data, error } = await supabase.rpc('timesheets_update_submission', {
      p_id: id,
      p_status: updates.status ?? null,
      p_hours: updates.hoursLogged ?? null,
      p_prev_updated_at: current.updated_at,
      p_user: userId
    });
    if (error) throw error;
  },

  async getByWeek(employeeId: string, weekStartDate: string): Promise<Timesheet | null> {
    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        timesheet_rows (
          *,
          projects (*),
          timesheet_entries (*)
        )
      `)
      .eq('employee_id', employeeId)
      .eq('week_start_date', weekStartDate)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return mapTimesheetFromDb(data);
  },

  async create(employeeId: string, weekStartDate: string): Promise<Timesheet> {
    const { data, error } = await supabase
      .from('timesheets')
      .insert({
        employee_id: employeeId,
        week_start_date: weekStartDate,
        status: 'Draft',
        total_hours: 0
      })
      .select()
      .single();

    if (error) throw error;
    return mapTimesheetFromDb(data);
  },

  async addRow(timesheetId: string, projectId: string | null, type: 'Project' | 'Break' = 'Project'): Promise<TimesheetRow> {
    const { data, error } = await supabase
      .from('timesheet_rows')
      .insert({
        timesheet_id: timesheetId,
        project_id: projectId,
        type: type
      })
      .select(`*, projects (*)`)
      .single();

    if (error) throw error;
    return mapRowFromDb(data);
  },

  async deleteRow(rowId: string): Promise<void> {
    const { error } = await supabase
      .from('timesheet_rows')
      .delete()
      .eq('id', rowId);

    if (error) throw error;
  },

  async saveEntry(rowId: string, date: string, hours: number): Promise<void> {
    // Check if entry exists
    const { data: existing } = await supabase
      .from('timesheet_entries')
      .select('id')
      .eq('row_id', rowId)
      .eq('date', date)
      .single();

    if (hours === 0) {
      if (existing) {
        await supabase.from('timesheet_entries').delete().eq('id', existing.id);
      }
    } else {
      const { error } = await supabase
        .from('timesheet_entries')
        .upsert({
          id: existing?.id,
          row_id: rowId,
          date: date,
          hours: hours
        });
      
      if (error) throw error;
    }
  },

  async updateStatus(timesheetId: string, status: TimesheetStatus): Promise<void> {
    const { error } = await supabase
      .from('timesheets')
      .update({ status })
      .eq('id', timesheetId);

    if (error) throw error;
  },

  async saveTemplate(employeeId: string, name: string, projectIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('timesheet_templates')
      .insert({
        employee_id: employeeId,
        name,
        project_ids: projectIds
      });

    if (error) throw error;
  },

  async getTemplates(employeeId: string): Promise<TimesheetTemplate[]> {
    const { data, error } = await supabase
      .from('timesheet_templates')
      .select('*')
      .eq('employee_id', employeeId);

    if (error) throw error;
    return data?.map(d => ({
      id: d.id,
      employeeId: d.employee_id,
      name: d.name,
      projectIds: d.project_ids
    })) || [];
  },

  async copyLastWeek(currentTimesheetId: string, lastWeekTimesheetId: string): Promise<void> {
    // 1. Get last week's rows
    const { data: lastRows } = await supabase
      .from('timesheet_rows')
      .select('*, timesheet_entries(*)')
      .eq('timesheet_id', lastWeekTimesheetId);

    if (!lastRows || lastRows.length === 0) return;

    // 2. Insert rows into current timesheet
    for (const row of lastRows) {
        const { data: newRow, error: rowError } = await supabase
            .from('timesheet_rows')
            .insert({
                timesheet_id: currentTimesheetId,
                project_id: row.project_id,
                type: row.type
            })
            .select()
            .single();
        
        if (rowError) throw rowError;

        // 3. Copy entries (adjusting dates)
        // Logic: Calculate date difference between weeks (7 days usually)
        // But simply mapping entries to corresponding weekday of new week is safer
        // However, user usually just wants the PROJECTS (rows) copied, not necessarily the hours.
        // "Copy last week" often implies copying the structure.
        // If they want hours, we'd need to shift dates by +7 days.
        // Let's assume we copy entries too (hours) as that's often useful for repeating weeks.
        
        if (row.timesheet_entries && row.timesheet_entries.length > 0) {
            const entriesToInsert = row.timesheet_entries.map((entry: any) => {
                const oldDate = new Date(entry.date);
                const newDate = new Date(oldDate);
                newDate.setDate(oldDate.getDate() + 7);
                return {
                    row_id: newRow.id,
                    date: newDate.toISOString().split('T')[0],
                    hours: entry.hours,
                    notes: entry.notes
                };
            });

            const { error: entriesError } = await supabase
                .from('timesheet_entries')
                .insert(entriesToInsert);
            
            if (entriesError) throw entriesError;
        }
    }
  }
};
