import { supabase } from '@/lib/supabase';
import { Experience } from '@/types';

const mapFromDb = (db: any): Experience => ({
  id: db.id,
  employeeId: db.employee_id,
  employeeName: db.employees ? `${db.employees.first_name} ${db.employees.last_name}` : '',
  employer: db.employer,
  jobTitle: db.job_title,
  fromDate: db.from_date,
  toDate: db.to_date,
  salary: db.salary,
  currency: db.currency,
  country: db.country,
  remark: db.remark
});

export const experienceService = {
  async getAll(): Promise<Experience[]> {
    const { data, error } = await supabase
      .from('experiences')
      .select('*, employees(first_name, last_name)')
      .order('from_date', { ascending: false });
    if (error) throw error;
    return data ? data.map(mapFromDb) : [];
  },
  async create(item: Omit<Experience, 'id' | 'employeeName'>): Promise<Experience> {
    const { data, error } = await supabase.from('experiences').insert({
      employee_id: item.employeeId,
      employer: item.employer,
      job_title: item.jobTitle,
      from_date: item.fromDate,
      to_date: item.toDate,
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
    if (item.employer !== undefined) updateData.employer = item.employer;
    if (item.jobTitle !== undefined) updateData.job_title = item.jobTitle;
    if (item.fromDate !== undefined) updateData.from_date = item.fromDate;
    if (item.toDate !== undefined) updateData.to_date = item.toDate;
    if (item.salary !== undefined) updateData.salary = item.salary;
    if (item.currency !== undefined) updateData.currency = item.currency;
    if (item.country !== undefined) updateData.country = item.country;
    if (item.remark !== undefined) updateData.remark = item.remark;

    const { data, error } = await supabase.from('experiences')
      .update(updateData)
      .eq('id', id)
      .select('*, employees(first_name, last_name)')
      .single();
    
    if (error) throw error;
    return mapFromDb(data);
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('experiences').delete().eq('id', id);
    if (error) throw error;
  }
};
