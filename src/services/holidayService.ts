import { supabase } from '@/lib/supabase';

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  type: 'Public' | 'Company' | 'Optional';
  is_recurring: boolean;
  created_at?: string;
}

export type PublicHoliday = Holiday;

export const holidayService = {
  async getAll() {
    const { data, error } = await supabase
      .from('public_holidays')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;
    return data as Holiday[];
  },

  async getHolidays(start: string, end: string) {
    const { data, error } = await supabase
      .from('public_holidays')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });

    if (error) throw error;
    return data as Holiday[];
  },

  async getByYear(year: number) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    
    const { data, error } = await supabase
      .from('public_holidays')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });

    if (error) throw error;
    return data as Holiday[];
  },

  async create(holiday: Omit<Holiday, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('public_holidays')
      .insert(holiday)
      .select()
      .single();

    if (error) throw error;
    return data as Holiday;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('public_holidays')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
