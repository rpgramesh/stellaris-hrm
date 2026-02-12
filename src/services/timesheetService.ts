import { supabase } from '@/lib/supabase';
import { Timesheet, TimesheetRow, TimesheetEntry, TimesheetTemplate, TimesheetStatus } from '@/types';

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
