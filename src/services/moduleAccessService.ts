import { supabase } from '@/lib/supabase';
import { Module } from '../types';

export const moduleAccessService = {
  async getAll(): Promise<Module[]> {
    const { data, error } = await supabase
      .from('module_access')
      .select('*')
      .order('name');

    if (error) throw error;
    
    return data ? data.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      enabled: m.enabled
    })) : [];
  },

  async updateStatus(id: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('module_access')
      .update({ enabled })
      .eq('id', id);

    if (error) throw error;
  }
};
