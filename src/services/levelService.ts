import { supabase } from '@/lib/supabase';
import { Level } from '@/types';


export const levelService = {
  async getAll(): Promise<Level[]> {
    const { data, error } = await supabase
      .from('job_levels')
      .select('*')
      .order('grade');
      
    if (error) throw error;
    return data || [];
  },

  async create(level: Omit<Level, 'id'>): Promise<Level> {
    const { data, error } = await supabase
      .from('job_levels')
      .insert([level])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Level>): Promise<Level> {
    const { data, error } = await supabase
      .from('job_levels')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('job_levels')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
