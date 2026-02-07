import { supabase } from '@/lib/supabase';
import { Trainer } from '@/types';

export const trainerService = {
  async getAll(): Promise<Trainer[]> {
    const { data, error } = await supabase
      .from('trainers')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data || [];
  },

  async create(trainer: Omit<Trainer, 'id'>): Promise<Trainer> {
    const { data, error } = await supabase
      .from('trainers')
      .insert([trainer])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Trainer>): Promise<Trainer> {
    const { data, error } = await supabase
      .from('trainers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('trainers')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
