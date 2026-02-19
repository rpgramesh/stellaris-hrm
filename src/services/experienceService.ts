import { supabase } from '@/lib/supabase';
import { Experience } from '@/types';

const mapFromDb = (db: any): Experience => ({
  id: db.id,
  employeeId: db.employee_id,
  employeeName: db.employees ? `${db.employees.first_name} ${db.employees.last_name}` : '',
  employer: db.employer || db.company_name,
  jobTitle: db.job_title,
  fromDate: db.from_date || db.start_date,
  toDate: db.to_date || db.end_date,
  reasonForLeaving: db.reason_for_leaving,
  salary: db.salary,
  currency: db.currency,
  country: db.country,
  remark: db.remark
});

export const experienceService = {
  async getAll(): Promise<Experience[]> {
    const { data, error } = await supabase
      .from('employee_experience')
      .select('*, employees(first_name, last_name)')
      .order('start_date', { ascending: false });
    if (error) throw error;
    return data ? data.map(mapFromDb) : [];
  },
  async create(item: Omit<Experience, 'id' | 'employeeName'>): Promise<Experience> {
    const { data, error } = await supabase.from('employee_experience').insert({
      employee_id: item.employeeId,
      company_name: item.employer,
      job_title: item.jobTitle,
      start_date: item.fromDate,
      end_date: item.toDate,
      reason_for_leaving: item.reasonForLeaving,
      salary: item.salary,
      currency: item.currency,
      country: item.country,
      remark: item.remark
    }).select('*, employees(first_name, last_name)').single();
    if (error) throw error;
    return mapFromDb(data);
  },
  async update(id: string, item: Partial<Experience>): Promise<Experience> {
    const updateData: any = {};
    if (item.employeeId !== undefined) updateData.employee_id = item.employeeId;
    if (item.employer !== undefined) updateData.company_name = item.employer;
    if (item.jobTitle !== undefined) updateData.job_title = item.jobTitle;
    if (item.fromDate !== undefined) updateData.start_date = item.fromDate;
    if (item.toDate !== undefined) updateData.end_date = item.toDate;
    if (item.reasonForLeaving !== undefined) updateData.reason_for_leaving = item.reasonForLeaving;
    if (item.salary !== undefined) updateData.salary = item.salary;
    if (item.currency !== undefined) updateData.currency = item.currency;
    if (item.country !== undefined) updateData.country = item.country;
    if (item.remark !== undefined) updateData.remark = item.remark;

    const { data, error } = await supabase.from('employee_experience')
      .update(updateData)
      .eq('id', id)
      .select('*, employees(first_name, last_name)')
      .single();
    
    if (error) throw error;
    return mapFromDb(data);
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('employee_experience').delete().eq('id', id);
    if (error) throw error;
  }
};
