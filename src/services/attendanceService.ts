import { supabase } from '@/lib/supabase';
import { AttendanceRecord, BreakRecord } from '@/types';

const mapFromDb = (db: any): AttendanceRecord => ({
  id: db.id,
  employeeId: db.employee_id,
  date: db.date,
  clockIn: db.clock_in,
  clockOut: db.clock_out,
  location: db.location,
  status: db.status as any,
  workerType: db.worker_type as any,
  projectCode: db.project_code,
  notes: db.notes,
  breaks: db.breaks,
  totalBreakMinutes: db.total_break_minutes,
  overtimeMinutes: db.overtime_minutes,
  isFieldWork: db.is_field_work
});

export const attendanceService = {
  async getAll(startDate?: string, endDate?: string, employeeId?: string): Promise<AttendanceRecord[]> {
    let query = supabase
      .from('attendance_records')
      .select('*')
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (employeeId && employeeId !== 'All') {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ? data.map(mapFromDb) : [];
  },

  async create(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        employee_id: record.employeeId,
        date: record.date,
        clock_in: record.clockIn,
        clock_out: record.clockOut,
        location: record.location,
        status: record.status,
        worker_type: record.workerType,
        project_code: record.projectCode,
        notes: record.notes,
        breaks: record.breaks,
        total_break_minutes: record.totalBreakMinutes,
        overtime_minutes: record.overtimeMinutes,
        is_field_work: record.isFieldWork
      })
      .select()
      .single();

    if (error) throw error;
    return mapFromDb(data);
  },

  async update(id: string, record: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    const updateData: any = {};
    if (record.employeeId) updateData.employee_id = record.employeeId;
    if (record.date) updateData.date = record.date;
    if (record.clockIn) updateData.clock_in = record.clockIn;
    if (record.clockOut) updateData.clock_out = record.clockOut;
    if (record.location) updateData.location = record.location;
    if (record.status) updateData.status = record.status;
    if (record.workerType) updateData.worker_type = record.workerType;
    if (record.projectCode) updateData.project_code = record.projectCode;
    if (record.notes) updateData.notes = record.notes;
    if (record.breaks) updateData.breaks = record.breaks;
    if (record.totalBreakMinutes !== undefined) updateData.total_break_minutes = record.totalBreakMinutes;
    if (record.overtimeMinutes !== undefined) updateData.overtime_minutes = record.overtimeMinutes;
    if (record.isFieldWork !== undefined) updateData.is_field_work = record.isFieldWork;

    const { data, error } = await supabase
      .from('attendance_records')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapFromDb(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
