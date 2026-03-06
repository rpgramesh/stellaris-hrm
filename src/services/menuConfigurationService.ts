import { supabase } from '@/lib/supabase';

export interface MenuItemConfig {
  id: string;
  menu_key: string;
  display_name: string;
  updated_at: string;
  updated_by: string;
}

export const menuConfigurationService = {
  async getAll(): Promise<MenuItemConfig[]> {
    const { data, error } = await supabase
      .from('menu_item_configurations')
      .select('*');
    
    if (error) {
      console.error('Error fetching menu configurations:', error);
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
      console.error('Error updating menu configuration:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }
};
