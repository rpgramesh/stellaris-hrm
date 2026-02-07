import { supabase } from '@/lib/supabase';

export interface LeaveEntitlement {
  id: string;
  employeeId: string;
  leaveType: string;
  year: number;
  totalDays: number;
  carriedOver: number;
}

const mapEntitlementFromDb = (dbEntitlement: any): LeaveEntitlement => ({
  id: dbEntitlement.id,
  employeeId: dbEntitlement.employee_id,
  leaveType: dbEntitlement.leave_type,
  year: dbEntitlement.year,
  totalDays: dbEntitlement.total_days,
  carriedOver: dbEntitlement.carried_over,
});

export const leaveEntitlementService = {
  async getAll(year: number): Promise<LeaveEntitlement[]> {
    const { data, error } = await supabase
      .from('leave_entitlements')
      .select('*')
      .eq('year', year);
    
    if (error) throw error;
    return data ? data.map(mapEntitlementFromDb) : [];
  },

  async getByEmployeeId(employeeId: string, year: number): Promise<LeaveEntitlement[]> {
    const { data, error } = await supabase
      .from('leave_entitlements')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', year);
      
    if (error) throw error;
    return data ? data.map(mapEntitlementFromDb) : [];
  },

  async create(entitlement: Omit<LeaveEntitlement, 'id'>): Promise<LeaveEntitlement> {
    const { data, error } = await supabase
      .from('leave_entitlements')
      .insert([{
        employee_id: entitlement.employeeId,
        leave_type: entitlement.leaveType,
        year: entitlement.year,
        total_days: entitlement.totalDays,
        carried_over: entitlement.carriedOver,
      }])
      .select()
      .single();
      
    if (error) throw error;
    return mapEntitlementFromDb(data);
  },
  
  // Helper to initialize default entitlements if missing
  async ensureEntitlements(employeeId: string, year: number): Promise<void> {
    const existing = await this.getByEmployeeId(employeeId, year);
    if (existing.length === 0) {
      // Default entitlements
      await Promise.all([
        this.create({
          employeeId,
          leaveType: 'Annual',
          year,
          totalDays: 20,
          carriedOver: 0
        }),
        this.create({
          employeeId,
          leaveType: 'Sick',
          year,
          totalDays: 10,
          carriedOver: 0
        })
      ]);
    }
  }
};
