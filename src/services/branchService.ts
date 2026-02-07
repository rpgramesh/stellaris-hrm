import { supabase } from '@/lib/supabase';
import { Branch } from '@/types';


export const branchService = {
  async getAll(): Promise<Branch[]> {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data ? data.map(b => ({
        id: b.id,
        name: b.name,
        address: b.address,
        contactNumber: b.contact_number
    })) : [];
  },

  async create(branch: Omit<Branch, 'id'>): Promise<Branch> {
    const { data, error } = await supabase
      .from('branches')
      .insert([{
          name: branch.name,
          address: branch.address,
          contact_number: branch.contactNumber
      }])
      .select()
      .single();
      
    if (error) throw error;
    return {
        id: data.id,
        name: data.name,
        address: data.address,
        contactNumber: data.contact_number
    };
  },

  async update(id: string, updates: Partial<Branch>): Promise<Branch> {
    const dbUpdates: any = { ...updates };
    if (updates.contactNumber) {
        dbUpdates.contact_number = updates.contactNumber;
        delete dbUpdates.contactNumber;
    }

    const { data, error } = await supabase
      .from('branches')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return {
        id: data.id,
        name: data.name,
        address: data.address,
        contactNumber: data.contact_number
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
