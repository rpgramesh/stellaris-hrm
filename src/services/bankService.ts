import { supabase } from '@/lib/supabase';
import { Bank } from '@/types';


export const bankService = {
  async getAll(): Promise<Bank[]> {
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data ? data.map(b => ({
        id: b.id,
        name: b.name,
        swiftCode: b.swift_code
    })) : [];
  },

  async create(bank: Omit<Bank, 'id'>): Promise<Bank> {
    const { data, error } = await supabase
      .from('banks')
      .insert([{
          name: bank.name,
          swift_code: bank.swiftCode
      }])
      .select()
      .single();
      
    if (error) throw error;
    return {
        id: data.id,
        name: data.name,
        swiftCode: data.swift_code
    };
  },

  async update(id: string, updates: Partial<Bank>): Promise<Bank> {
    const dbUpdates: any = { ...updates };
    if (updates.swiftCode) {
        dbUpdates.swift_code = updates.swiftCode;
        delete dbUpdates.swiftCode;
    }

    const { data, error } = await supabase
      .from('banks')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return {
        id: data.id,
        name: data.name,
        swiftCode: data.swift_code
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('banks')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
