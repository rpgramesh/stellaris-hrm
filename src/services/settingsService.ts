import { supabase } from '@/lib/supabase';
import { SystemSettings } from '../types';

export const settingsService = {
  async get(): Promise<SystemSettings | null> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    
    return data ? {
      id: data.id,
      dateFormat: data.date_format,
      timeZone: data.time_zone,
      currency: data.currency,
      emailNotifications: data.email_notifications,
      pushNotifications: data.push_notifications,
      twoFactorAuth: data.two_factor_auth,
      sessionTimeout: data.session_timeout
    } : null;
  },

  async update(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    // Map camelCase to snake_case for DB
    const dbData: any = {};
    if (settings.dateFormat) dbData.date_format = settings.dateFormat;
    if (settings.timeZone) dbData.time_zone = settings.timeZone;
    if (settings.currency) dbData.currency = settings.currency;
    if (settings.emailNotifications !== undefined) dbData.email_notifications = settings.emailNotifications;
    if (settings.pushNotifications !== undefined) dbData.push_notifications = settings.pushNotifications;
    if (settings.twoFactorAuth !== undefined) dbData.two_factor_auth = settings.twoFactorAuth;
    if (settings.sessionTimeout) dbData.session_timeout = settings.sessionTimeout;

    // Check if record exists
    const existing = await this.get();

    let data, error;
    
    if (existing) {
      const result = await supabase
        .from('system_settings')
        .update(dbData)
        .eq('id', existing.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from('system_settings')
        .insert([dbData])
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    
    return {
      id: data.id,
      dateFormat: data.date_format,
      timeZone: data.time_zone,
      currency: data.currency,
      emailNotifications: data.email_notifications,
      pushNotifications: data.push_notifications,
      twoFactorAuth: data.two_factor_auth,
      sessionTimeout: data.session_timeout
    };
  }
};
