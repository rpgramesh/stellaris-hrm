import { supabase } from '@/lib/supabase';
import { Payslip } from '@/types';

export const payrollService = {
  async getAllPayslips() {
    try {
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching payslips:', error);
        return [];
      }

      return data.map(mapToPayslip);
    } catch (error) {
      console.error('Unexpected error fetching payslips:', error);
      return [];
    }
  },

  async getPayslipsByEmployee(employeeId: string) {
    try {
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .eq('employee_id', employeeId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching employee payslips:', JSON.stringify(error, null, 2));
        return [];
      }

      return data.map(mapToPayslip);
    } catch (error) {
      console.error('Unexpected error fetching employee payslips:', error);
      return [];
    }
  },

  async createPayslip(payslip: Omit<Payslip, 'id'>) {
    try {
      const { data, error } = await supabase
        .from('payslips')
        .insert([mapToDB(payslip)])
        .select()
        .single();

      if (error) {
        console.error('Error creating payslip:', error);
        throw error;
      }

      return mapToPayslip(data);
    } catch (error) {
      console.error('Unexpected error creating payslip:', error);
      throw error;
    }
  },

  async updatePayslip(id: string, updates: Partial<Payslip>) {
    try {
      const { data, error } = await supabase
        .from('payslips')
        .update(mapToDB(updates))
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating payslip:', error);
        throw error;
      }

      return mapToPayslip(data);
    } catch (error) {
      console.error('Unexpected error updating payslip:', error);
      throw error;
    }
  }
};

function mapToPayslip(data: any): Payslip {
  return {
    id: data.id,
    employeeId: data.employee_id,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    grossPay: Number(data.gross_pay) || 0,
    allowances: Number(data.allowances) || 0,
    overtime: Number(data.overtime) || 0,
    paygTax: Number(data.payg_tax) || 0,
    netPay: Number(data.net_pay) || 0,
    superannuation: Number(data.superannuation) || 0,
    paymentDate: data.payment_date,
    status: data.status || 'Draft',
  };
}

function mapToDB(data: Partial<Payslip>): any {
  const dbData: any = {};
  if (data.employeeId !== undefined) dbData.employee_id = data.employeeId;
  if (data.periodStart !== undefined) dbData.period_start = data.periodStart;
  if (data.periodEnd !== undefined) dbData.period_end = data.periodEnd;
  if (data.grossPay !== undefined) dbData.gross_pay = data.grossPay;
  if (data.allowances !== undefined) dbData.allowances = data.allowances;
  if (data.overtime !== undefined) dbData.overtime = data.overtime;
  if (data.paygTax !== undefined) dbData.payg_tax = data.paygTax;
  if (data.netPay !== undefined) dbData.net_pay = data.netPay;
  if (data.superannuation !== undefined) dbData.superannuation = data.superannuation;
  if (data.paymentDate !== undefined) dbData.payment_date = data.paymentDate;
  if (data.status !== undefined) dbData.status = data.status;
  return dbData;
}
