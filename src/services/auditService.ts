
import { supabase } from '@/lib/supabase';

export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: string;
  oldData?: any;
  newData?: any;
  performedBy?: string;
  performedAt: string;
}

export const auditService = {
  logAction: async (
    tableName: string, 
    recordId: string, 
    action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SYSTEM_ACTION', 
    oldData: any, 
    newData: any,
    userId?: string
  ) => {
    // If userId is not provided, try to get current user
    let performedBy = userId;
    if (!performedBy) {
        const { data: { user } } = await supabase.auth.getUser();
        performedBy = user?.id;
    }

    const { error } = await supabase.from('audit_logs').insert({
      table_name: tableName,
      record_id: recordId,
      action,
      old_data: oldData,
      new_data: newData,
      performed_by: performedBy
    });

    if (error) console.error('Error logging audit action:', JSON.stringify(error, null, 2));
  },

  getAuditLogs: async (filters?: { tableName?: string; action?: string; limit?: number }) => {
     // Reusing the logic from organizationService but generic
     // ... (implementation can be added if needed for UI, but logging is priority)
     return [];
  }
};
