import { supabase } from '@/lib/supabase';
import { Training } from '@/types';

const mapFromDb = (t: any): Training => ({
  id: t.id,
  employeeId: t.employee_id,
  employeeName: t.employee ? `${t.employee.first_name} ${t.employee.last_name}` : 'Unknown',
  date: t.date,
  course: t.courses ? t.courses.name : t.course,
  courseId: t.course_id,
  trainer: t.trainers ? t.trainers.name : t.trainer,
  trainerId: t.trainer_id,
  result: t.result,
  attachment: t.attachment,
  remark: t.remark
});

export const trainingService = {
  async getAll(): Promise<Training[]> {
    const { data, error } = await supabase
      .from('training_records')
      .select(`
        *,
        employee:employees(first_name, last_name),
        courses(name),
        trainers(name)
      `)
      .order('date', { ascending: false });

    if (error) throw error;
    
    return data ? data.map(mapFromDb) : [];
  },

  async getByEmployeeId(employeeId: string): Promise<Training[]> {
    const { data, error } = await supabase
      .from('training_records')
      .select(`
        *,
        employee:employees(first_name, last_name),
        courses(name),
        trainers(name)
      `)
      .eq('employee_id', employeeId)
      .order('date', { ascending: false });

    if (error) throw error;
    
    return data ? data.map(mapFromDb) : [];
  },

  async create(training: Omit<Training, 'id' | 'employeeName'>): Promise<Training> {
    const { data, error } = await supabase
      .from('training_records')
      .insert([{
        employee_id: training.employeeId,
        date: training.date,
        course: training.course,
        course_id: training.courseId || null,
        trainer: training.trainer,
        trainer_id: training.trainerId || null,
        result: training.result,
        attachment: training.attachment,
        remark: training.remark
      }])
      .select(`
        *,
        employee:employees(first_name, last_name),
        courses(name),
        trainers(name)
      `)
      .single();

    if (error) throw error;

    return mapFromDb(data);
  },

  async update(id: string, updates: Partial<Training>): Promise<Training> {
    const dbUpdates: any = {};
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.course) dbUpdates.course = updates.course;
    if (updates.courseId !== undefined) dbUpdates.course_id = updates.courseId || null;
    if (updates.trainer) dbUpdates.trainer = updates.trainer;
    if (updates.trainerId !== undefined) dbUpdates.trainer_id = updates.trainerId || null;
    if (updates.result) dbUpdates.result = updates.result;
    if (updates.attachment) dbUpdates.attachment = updates.attachment;
    if (updates.remark) dbUpdates.remark = updates.remark;

    const { data, error } = await supabase
      .from('training_records')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        employee:employees(first_name, last_name),
        courses(name),
        trainers(name)
      `)
      .single();

    if (error) throw error;

    return mapFromDb(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('training_records')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
