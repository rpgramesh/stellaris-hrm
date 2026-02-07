import { supabase } from '@/lib/supabase';
import { Placement } from '@/types';

const mapFromDb = (db: any): Placement => ({
  id: db.id,
  employeeId: db.employee_id,
  employeeName: db.employees ? `${db.employees.first_name} ${db.employees.last_name}` : '',
  effectiveDate: db.effective_date,
  jobPosition: db.job_positions?.title || '',
  jobPositionId: db.job_position_id,
  department: db.departments?.name || '',
  departmentId: db.department_id,
  branch: db.branches?.name,
  branchId: db.branch_id,
  level: db.job_levels?.name,
  levelId: db.level_id,
  lineManager: db.manager ? `${db.manager.first_name} ${db.manager.last_name}` : undefined,
  lineManagerId: db.line_manager_id,
  remark: db.remark
});

export const placementService = {
  async getAll(): Promise<Placement[]> {
    const { data, error } = await supabase
      .from('placements')
      .select(`
        *,
        employees!employee_id(first_name, last_name),
        job_positions(title),
        departments(name),
        branches(name),
        job_levels(name),
        manager:employees!line_manager_id(first_name, last_name)
      `)
      .order('effective_date', { ascending: false });
    if (error) throw error;
    return data ? data.map(mapFromDb) : [];
  },
  async create(item: any): Promise<Placement> { 
    const { data, error } = await supabase.from('placements').insert({
      employee_id: item.employeeId || null,
      effective_date: item.effectiveDate,
      job_position_id: item.jobPositionId || null,
      department_id: item.departmentId || null,
      branch_id: item.branchId || null,
      level_id: item.levelId || null,
      line_manager_id: item.lineManagerId || null,
      remark: item.remark
    }).select(`
        *,
        employees!employee_id(first_name, last_name),
        job_positions(title),
        departments(name),
        branches(name),
        job_levels(name),
        manager:employees!line_manager_id(first_name, last_name)
      `).single();
    if (error) throw error;
    return mapFromDb(data);
  },
  async update(id: string, item: any): Promise<Placement> {
    const updates: any = {};
    if (item.effectiveDate) updates.effective_date = item.effectiveDate;
    if (item.jobPositionId !== undefined) updates.job_position_id = item.jobPositionId || null;
    if (item.departmentId !== undefined) updates.department_id = item.departmentId || null;
    if (item.branchId !== undefined) updates.branch_id = item.branchId || null;
    if (item.levelId !== undefined) updates.level_id = item.levelId || null;
    if (item.lineManagerId !== undefined) updates.line_manager_id = item.lineManagerId || null;
    if (item.remark !== undefined) updates.remark = item.remark;

    const { data, error } = await supabase.from('placements').update(updates).eq('id', id).select(`
        *,
        employees!employee_id(first_name, last_name),
        job_positions(title),
        departments(name),
        branches(name),
        job_levels(name),
        manager:employees!line_manager_id(first_name, last_name)
      `).single();
    if (error) throw error;
    return mapFromDb(data);
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('placements').delete().eq('id', id);
    if (error) throw error;
  }
};
