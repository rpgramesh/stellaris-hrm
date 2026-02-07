
import { supabase } from '@/lib/supabase';
import { JobPosition } from '@/types';

export const jobPositionService = {
  async getAll(): Promise<JobPosition[]> {
    const { data, error } = await supabase
      .from('job_positions')
      .select('*')
      .order('title');

    if (error) throw error;
    if (data) {
        return data.map((item: any) => ({
          id: item.id,
          title: item.title,
          department: item.department || '',
          level: item.level || '',
          description: item.description || '',
          active: item.active ?? true
        }));
    }
    return [];
  },

  async create(position: Omit<JobPosition, 'id'>): Promise<JobPosition> {
    const { data, error } = await supabase
      .from('job_positions')
      .insert({
        title: position.title,
        department: position.department || null,
        level: position.level || null,
        description: position.description,
        active: position.active ?? true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      title: data.title,
      department: data.department || '',
      level: data.level || '',
      description: data.description || '',
      active: data.active ?? true
    };
  },

  async update(id: string, updates: Partial<JobPosition>): Promise<JobPosition> {
     const dbUpdates: any = {};
     if (updates.title) dbUpdates.title = updates.title;
     if (updates.department !== undefined) dbUpdates.department = updates.department || null;
     if (updates.level !== undefined) dbUpdates.level = updates.level || null;
     if (updates.description !== undefined) dbUpdates.description = updates.description || null;
     if (updates.active !== undefined) dbUpdates.active = updates.active;
     
     const { data, error } = await supabase
       .from('job_positions')
       .update(dbUpdates)
       .eq('id', id)
       .select()
       .single();
       
     if (error) throw error;
     
     return {
        id: data.id,
        title: data.title,
        department: data.department || '',
        level: data.level || '',
        description: data.description || '',
        active: data.active ?? true
     };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('job_positions').delete().eq('id', id);
    if (error) throw error;
  }
};
