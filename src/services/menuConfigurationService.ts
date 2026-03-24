import { supabase } from '@/lib/supabase';

export interface MenuItemConfig {
  id: string;
  menu_key: string;
  display_name: string;
  updated_at: string;
  updated_by: string;
}

const formatSupabaseError = (e: any) => {
  if (!e) return 'Unknown error';
  const msg = typeof e?.message === 'string' && e.message ? e.message : typeof e === 'string' ? e : 'Unknown error';
  const parts = [
    msg,
    e?.code ? `code=${e.code}` : null,
    e?.hint ? `hint=${e.hint}` : null,
    e?.details ? `details=${e.details}` : null,
  ].filter(Boolean);
  return parts.join(' | ');
};

export const menuConfigurationService = {
  async getAll(): Promise<MenuItemConfig[]> {
    const { data, error } = await supabase
      .from('menu_item_configurations')
      .select('*');
    
    if (error) {
      const msg = formatSupabaseError(error);
      const lower = msg.toLowerCase();
      if (lower.includes('could not find the table') || lower.includes('does not exist') || String((error as any)?.code || '').toLowerCase() === '42p01') {
        console.warn('Menu configuration table missing:', msg);
        return [];
      }
      if (String((error as any)?.code || '').toLowerCase() === '42501') {
        try {
          const { data: session } = await supabase.auth.getSession();
          if (!session?.session) return [];
        } catch {
        }
      }
      console.error('Error fetching menu configurations:', msg);
      return [];
    }
    return data || [];
  },

  async update(menuKey: string, displayName: string): Promise<{ success: boolean; error?: string }> {
    // Validation
    if (displayName.length > 50) {
      return { success: false, error: 'Display name must be max 50 characters' };
    }
    if (!/^[a-zA-Z0-9 -]+$/.test(displayName)) {
      return { success: false, error: 'Special characters are not allowed except spaces and hyphens' };
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const { error } = await supabase
      .from('menu_item_configurations')
      .upsert({
        menu_key: menuKey,
        display_name: displayName,
        updated_by: userId
      }, { onConflict: 'menu_key' });

    if (error) {
      const msg = formatSupabaseError(error);
      console.error('Error updating menu configuration:', msg);
      return { success: false, error: msg };
    }

    return { success: true };
  }
};
