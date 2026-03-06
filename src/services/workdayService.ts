
import { supabase } from '@/lib/supabase';

export interface WorkdayConfig {
  id: string;
  day_name: string;
  is_active: boolean;
  hours: number;
}

export const workdayService = {
  async getAll(): Promise<WorkdayConfig[]> {
    const { data, error } = await supabase
      .from('workday_configurations')
      .select('*')
      .order('id'); // Or order by custom order if needed

    if (error) {
      console.error('Error fetching workdays:', error);
      throw error;
    }
    
    // Sort manually to ensure Monday-Sunday order
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return (data || []).sort((a, b) => {
      return dayOrder.indexOf(a.day_name) - dayOrder.indexOf(b.day_name);
    });
  },

  async update(id: string, updates: Partial<WorkdayConfig>): Promise<void> {
    const { error } = await supabase
      .from('workday_configurations')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating workday:', error);
      throw error;
    }
  },

  async updateAll(configs: WorkdayConfig[]): Promise<void> {
    const updates = configs.map(config => ({
      id: config.id,
      day_name: config.day_name,
      is_active: config.is_active,
      hours: config.hours,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('workday_configurations')
      .upsert(updates);

    if (error) {
      console.error('Error batch updating workdays:', error);
      throw error;
    }
  }
};
