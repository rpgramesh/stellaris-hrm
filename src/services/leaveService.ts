import { supabase } from '@/lib/supabase';
import { LeaveRequest, LeaveEntitlement } from '@/types';

const mapLeaveRequestFromDb = (dbRecord: any): LeaveRequest => {
  // Calculate days between start and end date
  const startDate = new Date(dbRecord.start_date);
  const endDate = new Date(dbRecord.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return {
    id: dbRecord.id,
    employeeId: dbRecord.employee_id,
    employeeName: '', // Will be populated later
    type: dbRecord.type,
    startDate: dbRecord.start_date,
    endDate: dbRecord.end_date,
    days: days,
    status: dbRecord.status as 'Pending' | 'Approved' | 'Rejected' | 'Manager Approved',
    reason: dbRecord.reason || '',
    createdAt: dbRecord.created_at,
  };
};

const mapEntitlementFromDb = (dbRecord: any): LeaveEntitlement => {
  return {
    id: dbRecord.id,
    employeeId: dbRecord.employee_id,
    year: dbRecord.year,
    leaveType: dbRecord.leave_type,
    totalDays: dbRecord.total_days,
    carriedOver: dbRecord.carried_over,
  };
};

export const leaveService = {
  async getAll(): Promise<LeaveRequest[]> {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ? data.map(mapLeaveRequestFromDb) : [];
  },

  async getByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ? data.map(mapLeaveRequestFromDb) : [];
  },

  async getEntitlements(employeeId: string, year: number): Promise<LeaveEntitlement[]> {
    const { data, error } = await supabase
      .from('leave_entitlements')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', year);

    if (error) {
       console.error("Error fetching entitlements:", error);
       return [];
    }
    return data ? data.map(mapEntitlementFromDb) : [];
  },

  async create(leaveRequest: Omit<LeaveRequest, 'id' | 'status' | 'employeeName' | 'days' | 'createdAt'>): Promise<LeaveRequest> {
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: leaveRequest.employeeId,
        type: leaveRequest.type,
        start_date: leaveRequest.startDate,
        end_date: leaveRequest.endDate,
        reason: leaveRequest.reason,
        status: 'Pending'
      })
      .select()
      .single();

    if (error) throw error;
    return mapLeaveRequestFromDb(data);
  },

  async updateStatus(id: string, status: 'Approved' | 'Rejected' | 'Manager Approved', approvedBy?: string): Promise<void> {
    const { error } = await supabase
      .from('leave_requests')
      .update({ 
        status,
        approved_by: approvedBy 
      })
      .eq('id', id);

    if (error) throw error;
  }
};
