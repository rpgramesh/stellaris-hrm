import { supabase } from '@/lib/supabase';
import { SalaryAdjustment, PayrollEmployee } from '@/types/payroll';
import { auditService } from './auditService';
import { notificationService } from './notificationService';

export const salaryAdjustmentService = {
  async createAdjustment(adjustment: Omit<SalaryAdjustment, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<SalaryAdjustment> {
    const { data, error } = await supabase
      .from('salary_adjustments')
      .insert({
        employee_id: adjustment.employeeId,
        adjustment_type: adjustment.adjustmentType,
        amount: adjustment.amount,
        adjustment_reason: adjustment.adjustmentReason,
        effective_date: adjustment.effectiveDate,
        end_date: adjustment.endDate,
        is_permanent: adjustment.isPermanent,
        requested_by: adjustment.requestedBy,
        status: 'PendingApproval'
      })
      .select()
      .single();

    if (error) throw error;

    // Create audit log
    await auditService.logAction(
      'salary_adjustments',
      data.id,
      'INSERT',
      null,
      data,
      adjustment.requestedBy
    );

    // Send notification to approvers
    await notificationService.createNotification(
      'HR_ADMIN',
      'Salary Adjustment Request',
      `New salary adjustment request for employee ${adjustment.employeeId}`,
      'info'
    );

    return this.mapFromDb(data);
  },

  async approveAdjustment(id: string, approvedBy: string, rejectionReason?: string): Promise<SalaryAdjustment> {
    const status = rejectionReason ? 'Rejected' : 'Approved';
    
    const { data, error } = await supabase
      .from('salary_adjustments')
      .update({
        status,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectionReason
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Create audit log
    await auditService.logAction(
      'salary_adjustments',
      id,
      'UPDATE',
      { status: 'PendingApproval' },
      { status, approved_by: approvedBy, approved_at: data.approved_at },
      approvedBy
    );

    // Send notification to employee
    await notificationService.createNotification(
      data.employee_id,
      'Salary Adjustment Status Update',
      `Your salary adjustment has been ${status.toLowerCase()}${rejectionReason ? ': ' + rejectionReason : ''}`,
      status === 'Approved' ? 'success' : 'error'
    );

    return this.mapFromDb(data);
  },

  async processAdjustment(id: string, processedBy: string): Promise<SalaryAdjustment> {
    // Get the adjustment to calculate back pay if needed
    const adjustment = await this.getAdjustmentById(id);
    if (!adjustment) throw new Error('Adjustment not found');

    // Calculate back pay if effective date is in the past
    let backPayAmount = 0;
    let backPayCalculated = false;
    
    if (new Date(adjustment.effectiveDate) < new Date()) {
      const daysDiff = Math.ceil((new Date().getTime() - new Date(adjustment.effectiveDate).getTime()) / (1000 * 60 * 60 * 24));
      backPayAmount = (adjustment.amount / 365) * daysDiff; // Pro-rata calculation
      backPayCalculated = true;
    }

    const { data, error } = await supabase
      .from('salary_adjustments')
      .update({
        status: 'Processed',
        is_processed: true,
        back_pay_calculated: backPayCalculated,
        back_pay_amount: backPayAmount
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update employee's base salary if it's a permanent base salary adjustment
    if (adjustment.adjustmentType === 'BaseSalary' && adjustment.isPermanent) {
      await this.updateEmployeeBaseSalary(adjustment.employeeId, adjustment.amount);
    }

    // Create audit log
    await auditService.logAction(
      'salary_adjustments',
      id,
      'UPDATE',
      { status: 'Approved' },
      { status: 'Processed', back_pay_amount: backPayAmount },
      processedBy
    );

    return this.mapFromDb(data);
  },

  async getAdjustmentById(id: string): Promise<SalaryAdjustment | null> {
    const { data, error } = await supabase
      .from('salary_adjustments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return this.mapFromDb(data);
  },

  async getAdjustmentsByEmployee(employeeId: string): Promise<SalaryAdjustment[]> {
    const { data, error } = await supabase
      .from('salary_adjustments')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data?.map(this.mapFromDb) || [];
  },

  async getPendingApprovals(): Promise<SalaryAdjustment[]> {
    const { data, error } = await supabase
      .from('salary_adjustments')
      .select('*')
      .eq('status', 'PendingApproval')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data?.map(this.mapFromDb) || [];
  },

  async getHistoricalAdjustments(employeeId: string, fromDate: string, toDate: string): Promise<SalaryAdjustment[]> {
    const { data, error } = await supabase
      .from('salary_adjustments')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('effective_date', fromDate)
      .lte('effective_date', toDate)
      .order('effective_date', { ascending: true });

    if (error) throw error;
    return data?.map(this.mapFromDb) || [];
  },

  async updateEmployeeBaseSalary(employeeId: string, newAmount: number): Promise<void> {
    // Update the payroll_employees table
    const { error } = await supabase
      .from('payroll_employees')
      .update({ base_salary: newAmount })
      .eq('employee_id', employeeId);

    if (error) throw error;
  },

  mapFromDb(data: any): SalaryAdjustment {
    return {
      id: data.id,
      employeeId: data.employee_id,
      adjustmentType: data.adjustment_type,
      amount: Number(data.amount),
      adjustmentReason: data.adjustment_reason,
      effectiveDate: data.effective_date,
      endDate: data.end_date,
      isPermanent: data.is_permanent,
      isProcessed: data.is_processed,
      status: data.status,
      requestedBy: data.requested_by,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      rejectionReason: data.rejection_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
};

// Helper functions for salary calculations
export const salaryCalculationHelper = {
  calculateProRataAmount(amount: number, startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = amount / 365;
    return dailyRate * daysDiff;
  },

  calculateBackPay(adjustmentAmount: number, effectiveDate: string, processingDate: string): number {
    const effective = new Date(effectiveDate);
    const processing = new Date(processingDate);
    const daysDiff = Math.ceil((processing.getTime() - effective.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = adjustmentAmount / 365;
    return dailyRate * daysDiff;
  },

  validateAdjustment(adjustment: Omit<SalaryAdjustment, 'id' | 'createdAt' | 'updatedAt'>): string[] {
    const errors: string[] = [];

    if (adjustment.amount <= 0) {
      errors.push('Adjustment amount must be greater than zero');
    }

    if (new Date(adjustment.effectiveDate) < new Date()) {
      errors.push('Effective date cannot be in the past');
    }

    if (adjustment.endDate && new Date(adjustment.endDate) <= new Date(adjustment.effectiveDate)) {
      errors.push('End date must be after effective date');
    }

    if (!adjustment.isPermanent && !adjustment.endDate) {
      errors.push('Temporary adjustments must have an end date');
    }

    return errors;
  }
};