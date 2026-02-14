import { supabase } from '@/lib/supabase';
import { Training } from '@/types';

const mapFromDb = (t: any): Training => {
  let attachment: string[] = [];
  
  if (t.attachment) {
    if (Array.isArray(t.attachment)) {
      attachment = t.attachment;
    } else if (typeof t.attachment === 'string') {
      // Handle legacy single string or JSON stringified array
      const val = t.attachment.trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            attachment = parsed;
          } else {
            attachment = [val];
          }
        } catch {
          attachment = [val];
        }
      } else {
        attachment = [val];
      }
    }
  }

  return {
    id: t.id,
    employeeId: t.employee_id,
    employeeName: t.employee ? `${t.employee.first_name} ${t.employee.last_name}` : 'Unknown',
    date: t.date,
    course: t.courses ? t.courses.name : t.course,
    courseId: t.course_id,
    trainer: t.trainers ? t.trainers.name : t.trainer,
    trainerId: t.trainer_id,
    result: t.result,
    attachment,
    remark: t.remark
  };
};

export const trainingService = {
  async uploadAttachments(files: File[]): Promise<string[]> {
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `training-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return data.publicUrl;
    });

    return Promise.all(uploadPromises);
  },

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
    const payload = {
      employee_id: training.employeeId,
      date: training.date,
      course: training.course,
      course_id: training.courseId || null,
      trainer: training.trainer,
      trainer_id: training.trainerId || null,
      result: training.result,
      attachment: training.attachment,
      remark: training.remark
    };

    const { data, error } = await supabase
      .from('training_records')
      .insert([payload])
      .select(`
        *,
        employee:employees(first_name, last_name),
        courses(name),
        trainers(name)
      `)
      .single();

    if (error) {
      // Fallback: If array insert fails (likely due to missing migration for text[]), try as JSON string
      if (Array.isArray(payload.attachment)) {
        const { data: retryData, error: retryError } = await supabase
          .from('training_records')
          .insert([{
            ...payload,
            attachment: JSON.stringify(payload.attachment)
          }])
          .select(`
            *,
            employee:employees(first_name, last_name),
            courses(name),
            trainers(name)
          `)
          .single();
          
        if (retryError) throw error; // Throw original error if retry also fails
        return mapFromDb(retryData);
      }
      throw error;
    }

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

    if (error) {
      // Fallback: If array update fails, try as JSON string
      if (Array.isArray(dbUpdates.attachment)) {
        const { data: retryData, error: retryError } = await supabase
          .from('training_records')
          .update({
            ...dbUpdates,
            attachment: JSON.stringify(dbUpdates.attachment)
          })
          .eq('id', id)
          .select(`
            *,
            employee:employees(first_name, last_name),
            courses(name),
            trainers(name)
          `)
          .single();
          
        if (retryError) throw error; // Throw original error if retry also fails
        return mapFromDb(retryData);
      }
      throw error;
    }

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
