import { supabase } from '@/lib/supabase';
import { EmployeeRequest } from '@/types';

const mapRequestFromDb = (dbRecord: any): EmployeeRequest => {
  return {
    id: dbRecord.id,
    employeeId: dbRecord.employee_id,
    type: dbRecord.type as any,
    description: dbRecord.description,
    date: dbRecord.request_date,
    status: dbRecord.status as any
  };
};

export const employeeRequestService = {
  async getAll(): Promise<EmployeeRequest[]> {
    const { data, error } = await supabase
      .from('employee_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ? data.map(mapRequestFromDb) : [];
  },

  async create(input: { employeeId: string; type: EmployeeRequest['type']; description: string }): Promise<EmployeeRequest> {
    const { data, error } = await supabase
      .from('employee_requests')
      .insert({
        employee_id: input.employeeId,
        type: input.type,
        description: input.description,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapRequestFromDb(data);
  },

  async updateStatus(id: string, status: 'Approved' | 'Rejected'): Promise<void> {
    const { error } = await supabase
      .from('employee_requests')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  }
};
