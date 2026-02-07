
import { supabase } from '@/lib/supabase';
import { Department } from '@/types';

const mapDepartmentFromDb = (dbRecord: any): Department => {
  return {
    id: dbRecord.id,
    name: dbRecord.name,
    managerId: dbRecord.manager_id || '',
    location: dbRecord.location || '', 
  };
};

export const departmentService = {
  async getAll(): Promise<Department[]> {
    const { data, error } = await supabase
      .from('departments')
      .select('*');

    if (error) throw error;
    return data ? data.map(mapDepartmentFromDb) : [];
  },

  async create(department: Omit<Department, 'id'>): Promise<Department> {
    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: department.name,
        manager_id: department.managerId || null,
        location: department.location || null
      })
      .select()
      .single();
    
    if (error) throw error;
    return mapDepartmentFromDb(data);
  },

  async update(id: string, updates: Partial<Department>): Promise<Department> {
     const dbUpdates: any = {};
     if (updates.name) dbUpdates.name = updates.name;
     if (updates.managerId !== undefined) dbUpdates.manager_id = updates.managerId || null;
     if (updates.location !== undefined) dbUpdates.location = updates.location || null;
     
     const { data, error } = await supabase
       .from('departments')
       .update(dbUpdates)
       .eq('id', id)
       .select()
       .single();
       
     if (error) throw error;
     return mapDepartmentFromDb(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) throw error;
  }
};
