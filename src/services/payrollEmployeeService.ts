import { supabase } from '../lib/supabase';
import { PayrollEmployee } from '../types/payroll';

export const payrollEmployeeService = {
  async getAll(): Promise<any[]> {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        employee_code,
        employment_status,
        payroll_employees (
          id,
          base_salary,
          hourly_rate,
          pay_frequency,
          tax_scale,
          residency_status,
          employment_type,
          tax_file_number,
          super_fund_id,
          super_member_number,
          is_active
        )
      `)
      .eq('employment_status', 'Active');

    if (error) throw error;
    return data || [];
  },

  async getSuperFunds(): Promise<{ data: any[] | null; error: any }> {
    return await supabase
      .from('super_funds')
      .select('id, fund_name, fund_abn, usi')
      .eq('is_active', true)
      .order('fund_name');
  },

  async upsert(employeeId: string, payrollData: Partial<PayrollEmployee>): Promise<void> {
    try {
      // Get company ID first
      const { data: company } = await supabase
        .from('company_information')
        .select('id')
        .limit(1)
        .maybeSingle();

      const dbPayload: any = {
        employee_id: employeeId,
        base_salary: payrollData.baseSalary,
        hourly_rate: payrollData.hourlyRate,
        pay_frequency: payrollData.payFrequency,
        tax_scale: payrollData.taxScale || 'TaxFreeThreshold',
        residency_status: payrollData.residencyStatus || 'Resident',
        employment_type: payrollData.employmentType || 'FullTime',
        tax_file_number: payrollData.taxFileNumber,
        super_fund_id: payrollData.superFundId || null,
        super_member_number: payrollData.superMemberNumber,
        effective_from: payrollData.effectiveFrom || new Date().toISOString().split('T')[0],
        is_active: true
      };

      // Only add company_id if we found one
      if (company?.id) {
        dbPayload.company_id = company.id;
      }

      const { data: existing, error: fetchError } = await supabase
        .from('payroll_employees')
        .select('id')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const { error } = await supabase
          .from('payroll_employees')
          .update(dbPayload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payroll_employees')
          .insert(dbPayload);
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Error in payrollEmployeeService.upsert:', error);
      throw error;
    }
  }
};
