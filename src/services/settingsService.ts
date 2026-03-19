import { supabase } from '@/lib/supabase';
import { SystemSettings } from '../types';

export const settingsService = {
  async get(): Promise<SystemSettings | null> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid error if 0 rows

      if (error) {
        console.error('Error fetching system settings:', error);
        throw error;
      }
      
      return data ? {
        id: data.id,
        companyName: data.company_name || '',
        taxId: data.tax_id || '',
        companyAddress: data.company_address || '',
        dateFormat: data.date_format,
        timeZone: data.time_zone,
        currency: data.currency,
        emailNotifications: data.email_notifications,
        pushNotifications: data.push_notifications,
        twoFactorAuth: data.two_factor_auth,
        sessionTimeout: data.session_timeout,
        defaultHolidayHours: data.default_holiday_hours !== null && data.default_holiday_hours !== undefined
          ? Number(data.default_holiday_hours)
          : undefined,
      } : null;
    } catch (error) {
      console.error('Unexpected error in settingsService.get:', error);
      throw error;
    }
  },

  async update(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    try {
      // Map camelCase to snake_case for DB
      const dbData: any = {};
      if (settings.companyName !== undefined) dbData.company_name = settings.companyName;
      if (settings.taxId !== undefined) dbData.tax_id = settings.taxId;
      if (settings.companyAddress !== undefined) dbData.company_address = settings.companyAddress;
      if (settings.dateFormat) dbData.date_format = settings.dateFormat;
      if (settings.timeZone) dbData.time_zone = settings.timeZone;
      if (settings.currency) dbData.currency = settings.currency;
      if (settings.emailNotifications !== undefined) dbData.email_notifications = settings.emailNotifications;
      if (settings.pushNotifications !== undefined) dbData.push_notifications = settings.pushNotifications;
      if (settings.twoFactorAuth !== undefined) dbData.two_factor_auth = settings.twoFactorAuth;
      if (settings.sessionTimeout) dbData.session_timeout = settings.sessionTimeout;
      if (settings.defaultHolidayHours !== undefined) dbData.default_holiday_hours = settings.defaultHolidayHours;

      // Check if record exists
      const existing = await this.get();

      let data, error;
      
      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from('system_settings')
          .update(dbData)
          .eq('id', existing.id)
          .select()
          .single();
        data = updated;
        error = updateError;
      } else {
        // If inserting, ensure we have at least one field or default
        if (Object.keys(dbData).length === 0) {
            // Minimal default if creating empty
            dbData.company_name = 'My Company'; 
        }
        const { data: inserted, error: insertError } = await supabase
          .from('system_settings')
          .insert([dbData])
          .select()
          .single();
        data = inserted;
        error = insertError;
      }

      if (error) {
        console.error('Database error in settingsService.update:', error);
        throw error;
      }
      
      return {
        id: data.id,
        companyName: data.company_name || '',
        taxId: data.tax_id || '',
        companyAddress: data.company_address || '',
        dateFormat: data.date_format,
        timeZone: data.time_zone,
        currency: data.currency,
        emailNotifications: data.email_notifications,
        pushNotifications: data.push_notifications,
        twoFactorAuth: data.two_factor_auth,
        sessionTimeout: data.session_timeout,
        defaultHolidayHours: data.default_holiday_hours !== null && data.default_holiday_hours !== undefined
          ? Number(data.default_holiday_hours)
          : undefined,
      };
    } catch (error) {
      console.error('Unexpected error in settingsService.update:', error);
      throw error;
    }
  }
};
