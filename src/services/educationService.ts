import { supabase } from '@/lib/supabase';
import { Education } from '@/types';

const mapFromDb = (db: any): Education => ({
  id: db.id,
  employeeId: db.employee_id,
  employeeName: db.employees ? `${db.employees.first_name} ${db.employees.last_name}` : '',
  school: db.school,
  fieldOfStudy: db.field_of_study,
  degree: db.degree,
  grade: db.grade,
  fromYear: db.from_year,
  toYear: db.to_year,
  remark: db.remark
});

export const educationService = {
  async getAll(): Promise<Education[]> {
    const { data, error } = await supabase
      .from('educations')
      .select('*, employees(first_name, last_name)')
      .order('from_year', { ascending: false });
    if (error) throw error;
    return data ? data.map(mapFromDb) : [];
  },
  async create(item: Omit<Education, 'id' | 'employeeName'>): Promise<Education> {
    const { data, error } = await supabase.from('educations').insert({
      employee_id: item.employeeId,
      school: item.school,
      field_of_study: item.fieldOfStudy,
      degree: item.degree,
      grade: item.grade,
      from_year: item.fromYear,
      to_year: item.toYear,
      remark: item.remark
    }).select('*, employees(first_name, last_name)').single();
    if (error) throw error;
    return mapFromDb(data);
  },
  async update(id: string, item: Partial<Education>): Promise<Education> {
    const updateData: any = {};
    if (item.employeeId !== undefined) updateData.employee_id = item.employeeId;
    if (item.school !== undefined) updateData.school = item.school;
    if (item.fieldOfStudy !== undefined) updateData.field_of_study = item.fieldOfStudy;
    if (item.degree !== undefined) updateData.degree = item.degree;
    if (item.grade !== undefined) updateData.grade = item.grade;
    if (item.fromYear !== undefined) updateData.from_year = item.fromYear;
    if (item.toYear !== undefined) updateData.to_year = item.toYear;
    if (item.remark !== undefined) updateData.remark = item.remark;

    const { data, error } = await supabase.from('educations')
      .update(updateData)
      .eq('id', id)
      .select('*, employees(first_name, last_name)')
      .single();
    
    if (error) throw error;
    return mapFromDb(data);
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('educations').delete().eq('id', id);
    if (error) throw error;
  }
};
