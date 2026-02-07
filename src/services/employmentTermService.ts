import { supabase } from '@/lib/supabase';
import { EmploymentTerm } from '@/types';

const mapFromDb = (db: any): EmploymentTerm => ({
  id: db.id,
  employeeId: db.employee_id,
  employeeName: db.employees ? `${db.employees.first_name} ${db.employees.last_name}` : '',
  effectiveDate: db.effective_date,
  jobType: db.job_type,
  jobStatus: db.job_status,
  leaveWorkflow: db.leave_workflow,
  workday: db.workday,
  holiday: db.holiday,
  termStart: db.term_start,
  termEnd: db.term_end,
  remark: db.remark
});

export const employmentTermService = {
  async getAll(): Promise<EmploymentTerm[]> {
    const { data, error } = await supabase
      .from('employment_terms')
      .select('*, employees(first_name, last_name)')
      .order('effective_date', { ascending: false });
    if (error) throw error;
    return data ? data.map(mapFromDb) : [];
  },
  async create(item: Omit<EmploymentTerm, 'id' | 'employeeName'>): Promise<EmploymentTerm> {
    const { data, error } = await supabase.from('employment_terms').insert({
      employee_id: item.employeeId,
      effective_date: item.effectiveDate,
      job_type: item.jobType,
      job_status: item.jobStatus,
      leave_workflow: item.leaveWorkflow,
      workday: item.workday,
      holiday: item.holiday,
      term_start: item.termStart,
      term_end: item.termEnd,
      remark: item.remark
    }).select('*, employees(first_name, last_name)').single();
    if (error) throw error;
    return mapFromDb(data);
  },
  async update(id: string, item: Partial<EmploymentTerm>): Promise<EmploymentTerm> {
    const { data, error } = await supabase.from('employment_terms').update({
        effective_date: item.effectiveDate,
        job_type: item.jobType,
        job_status: item.jobStatus,
        leave_workflow: item.leaveWorkflow,
        workday: item.workday,
        holiday: item.holiday,
        term_start: item.termStart,
        term_end: item.termEnd,
        remark: item.remark
    }).eq('id', id).select('*, employees(first_name, last_name)').single();
    if (error) throw error;
    return mapFromDb(data);
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('employment_terms').delete().eq('id', id);
    if (error) throw error;
  }
};
