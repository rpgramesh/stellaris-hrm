import { supabase } from '@/lib/supabase';
import { Ethnicity } from '@/types';

export const ethnicityService = {
  async getAll(): Promise<Ethnicity[]> {
    const { data, error } = await supabase
      .from('ethnicities')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data || [];
  },

  async create(ethnicity: Omit<Ethnicity, 'id'>): Promise<Ethnicity> {
    const { data, error } = await supabase
      .from('ethnicities')
      .insert([ethnicity])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Ethnicity>): Promise<Ethnicity> {
    const { data, error } = await supabase
      .from('ethnicities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('ethnicities')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
