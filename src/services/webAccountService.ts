import { supabase } from '@/lib/supabase';
import { WebAccount } from '@/types';

// Fallback data
const DEFAULT_WEB_ACCOUNTS: WebAccount[] = [
  { id: '1', employeeId: '1', platform: 'GitHub', username: 'johndoe', status: 'Active', lastLogin: '2024-01-01 10:00:00' },
  { id: '2', employeeId: '1', platform: 'Slack', username: 'john.doe', status: 'Active', lastLogin: '2024-01-02 09:00:00' },
  { id: '3', employeeId: '2', platform: 'Jira', username: 'janedoe', status: 'Active', lastLogin: '2024-01-03 11:00:00' }
];

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
      console.warn('Error fetching web accounts (using fallback):', error.message);
      return DEFAULT_WEB_ACCOUNTS;
    }
    return data ? data.map(mapWebAccountFromDb) : [];
  },

  async getByEmployeeId(employeeId: string): Promise<WebAccount[]> {
    const { data, error } = await supabase
      .from('web_accounts')
      .select('*')
      .eq('employee_id', employeeId);

    if (error) {
      console.warn(`Error fetching web accounts for ${employeeId} (using fallback):`, error.message);
      return DEFAULT_WEB_ACCOUNTS.filter(acc => acc.employeeId === employeeId);
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
