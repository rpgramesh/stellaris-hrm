import { supabase } from '@/lib/supabase';
import { WebAccount } from '@/types';

const mapWebAccountFromDb = (dbRecord: any): WebAccount => {
  return {
    id: dbRecord.id,
    employeeId: dbRecord.employee_id,
    platform: dbRecord.platform,
    username: dbRecord.username,
    status: dbRecord.status as 'Active' | 'Suspended',
    lastLogin: dbRecord.last_login
      ? new Date(dbRecord.last_login).toLocaleString()
      : 'Never'
  };
};

export const webAccountService = {
  async getAll(): Promise<WebAccount[]> {
    const { data, error } = await supabase
      .from('web_accounts')
      .select('*');

    if (error) {
      console.warn('Error fetching web accounts:', error.message);
      return [];
    }
    return data ? data.map(mapWebAccountFromDb) : [];
  },

  async getByEmployeeId(employeeId: string): Promise<WebAccount[]> {
    const { data, error } = await supabase
      .from('web_accounts')
      .select('*')
      .eq('employee_id', employeeId);

    if (error) {
      console.warn(`Error fetching web accounts for ${employeeId}:`, error.message);
      return [];
    }
    return data ? data.map(mapWebAccountFromDb) : [];
  },

  async create(account: Omit<WebAccount, 'id' | 'lastLogin'>): Promise<WebAccount> {
    const { data, error } = await supabase
      .from('web_accounts')
      .insert({
        employee_id: account.employeeId,
        platform: account.platform,
        username: account.username,
        status: account.status
      })
      .select()
      .single();

    if (error) throw error;
    return mapWebAccountFromDb(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('web_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
