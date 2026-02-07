import { supabase } from '@/lib/supabase';
import { Religion } from '@/types';

export const religionService = {
  async getAll(): Promise<Religion[]> {
    const { data, error } = await supabase
      .from('religions')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data || [];
  },

  async create(religion: Omit<Religion, 'id'>): Promise<Religion> {
    const { data, error } = await supabase
      .from('religions')
      .insert([religion])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Religion>): Promise<Religion> {
    const { data, error } = await supabase
      .from('religions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('religions')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
