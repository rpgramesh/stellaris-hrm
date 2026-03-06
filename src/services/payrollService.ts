import { supabase } from '@/lib/supabase';
import { Employee, Department, Designation } from '@/types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface SalaryStructure {
  id: string;
  name: string;
  description: string;
  basicPay: number;
  daAllowance: number;
  hra: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  isActive: boolean;
}

export interface EmployeeSalary {
  id: string;
  employeeId: string;
  salaryStructureId: string;
  basicSalary: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isCurrent: boolean;
}

export interface PayrollRun {
  id: string;
  monthYear: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: 'draft' | 'processed' | 'finalized' | 'paid';
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  processedBy?: string;
  processedAt?: string;
  finalizedAt?: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeSalaryId: string;
  payslipNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  basicSalary: number;
  daAllowance: number;
  hra: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  grossSalary: number;
  pfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  incomeTax: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  workingDays: number;
  paidDays: number;
  overtimeHours: number;
  overtimeAmount: number;
  loanDeductions: number;
  arrears: number;
  isFinalized: boolean;
  createdAt: string;
  updatedAt: string;
  employee: Employee & { departments: Department | null, designations: Designation | null };
}

export interface PFRate {
  id: string;
  effectiveFrom: string;
  employeeContribution: number;
  employerContribution: number;
  isActive: boolean;
}

export interface ESIRate {
  id: string;
  effectiveFrom: string;
  employeeContribution: number;
  employerContribution: number;
  salaryLimit: number;
  isActive: string;
}

export interface ProfessionalTaxSlab {
  id: string;
  state: string;
  minSalary: number;
  maxSalary: number;
  taxAmount: number;
  isActive: boolean;
}

export interface EmployeeLoan {
  id: string;
  employeeId: string;
  loanType: 'salary_advance' | 'personal' | 'housing' | 'vehicle';
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  monthlyDeduction: number;
  remainingPrincipal: number;
  status: 'active' | 'closed' | 'defaulted';
  startDate: string;
  endDate?: string;
  purpose: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface LoanRepayment {
  id: string;
  employeeLoanId: string;
  payrollRunId: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  repaymentDate: string;
}

export interface SalaryArrear {
  id: string;
  employeeId: string;
  payrollRunId: string;
  periodStart: string;
  periodEnd: string;
  basicSalary: number;
  daAllowance: number;
  hra: number;
  otherAllowances: number;
  totalArrear: number;
  reason: string;
  status: 'pending' | 'processed' | 'paid';
  createdAt: string;
}

export interface PayrollAuditLog {
  id: string;
  payrollRunId: string;
  employeeId: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  performedBy: string;
  performedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalPF: number;
  totalESI: number;
  totalProfessionalTax: number;
  totalIncomeTax: number;
}

export class PayrollService {
  private mapToSalaryStructure(s: any): SalaryStructure {
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      basicPay: s.basic_pay,
      daAllowance: s.da_allowance,
      hra: s.hra,
      conveyance: s.conveyance,
      medical: s.medical,
      specialAllowance: s.special_allowance,
      isActive: s.is_active
    };
  }

  private mapToEmployeeSalary(s: any): EmployeeSalary {
    return {
      id: s.id,
      employeeId: s.employee_id,
      salaryStructureId: s.salary_structure_id,
      basicSalary: s.basic_salary,
      effectiveFrom: s.effective_from,
      effectiveTo: s.effective_to,
      isCurrent: s.is_current
    };
  }

  private mapToPayrollRun(run: any): PayrollRun {
    return {
      id: run.id,
      monthYear: run.month_year,
      payPeriodStart: run.pay_period_start,
      payPeriodEnd: run.pay_period_end,
      status: run.status,
      totalEmployees: run.total_employees,
      totalGrossPay: run.total_gross_pay,
      totalDeductions: run.total_deductions,
      totalNetPay: run.total_net_pay,
      processedBy: run.processed_by,
      processedAt: run.processed_at,
      finalizedAt: run.finalized_at
    };
  }

  private mapToPFRate(r: any): PFRate {
    return {
      id: r.id,
      effectiveFrom: r.effective_from,
      employeeContribution: r.employee_rate,
      employerContribution: r.employer_rate,
      isActive: r.is_active
    };
  }

  private mapToESIRate(r: any): ESIRate {
    return {
      id: r.id,
      effectiveFrom: r.effective_from,
      employeeContribution: r.employee_rate,
      employerContribution: r.employer_rate,
      salaryLimit: r.salary_limit,
      isActive: r.is_active
    };
  }

  private mapToProfessionalTaxSlab(s: any): ProfessionalTaxSlab {
    return {
      id: s.id,
      state: s.state,
      minSalary: s.min_salary,
      maxSalary: s.max_salary,
      taxAmount: s.tax_amount,
      isActive: s.is_active
    };
  }

  private mapToEmployeeLoan(l: any): EmployeeLoan {
    return {
      id: l.id,
      employeeId: l.employee_id,
      loanType: l.loan_type,
      principalAmount: l.principal_amount,
      interestRate: l.interest_rate,
      tenureMonths: l.tenure_months,
      monthlyDeduction: l.monthly_deduction,
      remainingPrincipal: l.remaining_principal,
      status: l.status,
      startDate: l.start_date,
      endDate: l.end_date,
      purpose: l.purpose,
      approvedBy: l.approved_by,
      approvedAt: l.approved_at
    };
  }

  private mapToSalaryArrear(a: any): SalaryArrear {
    return {
      id: a.id,
      employeeId: a.employee_id,
      payrollRunId: a.payroll_run_id,
      periodStart: a.period_start,
      periodEnd: a.period_end,
      basicSalary: a.basic_salary,
      daAllowance: a.da_allowance,
      hra: a.hra,
      otherAllowances: a.other_allowances,
      totalArrear: a.total_arrear,
      reason: a.reason,
      status: a.status,
      createdAt: a.created_at
    };
  }

  private mapToPayslip(p: any): Payslip {
    return {
      id: p.id,
      payrollRunId: p.payroll_run_id,
      employeeId: p.employee_id,
      employeeSalaryId: p.employee_salary_id,
      payslipNumber: p.payslip_number,
      payPeriodStart: p.pay_period_start,
      payPeriodEnd: p.pay_period_end,
      basicSalary: p.basic_salary,
      daAllowance: p.da_allowance,
      hra: p.hra,
      conveyance: p.conveyance,
      medical: p.medical,
      specialAllowance: p.special_allowance,
      grossSalary: p.gross_salary,
      pfDeduction: p.pf_deduction,
      esiDeduction: p.esi_deduction,
      professionalTax: p.professional_tax,
      incomeTax: p.income_tax,
      otherDeductions: p.other_deductions,
      totalDeductions: p.total_deductions,
      netSalary: p.net_salary,
      workingDays: p.working_days,
      paidDays: p.paid_days,
      overtimeHours: p.overtime_hours,
      overtimeAmount: p.overtime_amount,
      loanDeductions: p.loan_deductions,
      arrears: p.arrears,
      isFinalized: p.is_finalized,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      employee: p.employee
    };
  }

  // Salary Structure Management
  async getSalaryStructures(): Promise<SalaryStructure[]> {
    const { data, error } = await supabase
      .from('salary_structures')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(s => this.mapToSalaryStructure(s));
  }

  async createSalaryStructure(structure: Omit<SalaryStructure, 'id'>): Promise<SalaryStructure> {
    const { data, error } = await supabase
      .from('salary_structures')
      .insert([{
        name: structure.name,
        description: structure.description,
        basic_pay: structure.basicPay,
        da_allowance: structure.daAllowance,
        hra: structure.hra,
        conveyance: structure.conveyance,
        medical: structure.medical,
        special_allowance: structure.specialAllowance,
        is_active: structure.isActive
      }])
      .select()
      .single();

    if (error) throw error;
    return this.mapToSalaryStructure(data);
  }

  async updateSalaryStructure(id: string, updates: Partial<SalaryStructure>): Promise<SalaryStructure> {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.basicPay !== undefined) dbUpdates.basic_pay = updates.basicPay;
    if (updates.daAllowance !== undefined) dbUpdates.da_allowance = updates.daAllowance;
    if (updates.hra !== undefined) dbUpdates.hra = updates.hra;
    if (updates.conveyance !== undefined) dbUpdates.conveyance = updates.conveyance;
    if (updates.medical !== undefined) dbUpdates.medical = updates.medical;
    if (updates.specialAllowance !== undefined) dbUpdates.special_allowance = updates.specialAllowance;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('salary_structures')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToSalaryStructure(data);
  }

  // Employee Salary Management
  async getEmployeeSalaries(employeeId?: string): Promise<EmployeeSalary[]> {
    let query = supabase.from('employee_salaries').select('*');
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    const { data, error } = await query.order('effective_from', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(s => this.mapToEmployeeSalary(s));
  }

  async assignSalaryToEmployee(employeeId: string, salaryData: Omit<EmployeeSalary, 'id'>): Promise<EmployeeSalary> {
    // Deactivate current salary if exists
    await supabase
      .from('employee_salaries')
      .update({ is_current: false, effective_to: new Date().toISOString() })
      .eq('employee_id', employeeId)
      .eq('is_current', true);

    const { data, error } = await supabase
      .from('employee_salaries')
      .insert([{ 
        employee_id: salaryData.employeeId,
        salary_structure_id: salaryData.salaryStructureId,
        basic_salary: salaryData.basicSalary,
        effective_from: salaryData.effectiveFrom,
        is_current: true 
      }])
      .select()
      .single();

    if (error) throw error;
    return this.mapToEmployeeSalary(data);
  }

  // Statutory Rates Management
  async getCurrentPFRate(): Promise<PFRate | null> {
    const { data, error } = await supabase
      .from('pf_rates')
      .select('*')
      .eq('is_active', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapToPFRate(data) : null;
  }

  async getCurrentESIRate(): Promise<ESIRate | null> {
    const { data, error } = await supabase
      .from('esi_rates')
      .select('*')
      .eq('is_active', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.mapToESIRate(data) : null;
  }

  async getProfessionalTaxSlabs(state: string): Promise<ProfessionalTaxSlab[]> {
    const { data, error } = await supabase
      .from('professional_tax_slabs')
      .select('*')
      .eq('state', state)
      .eq('is_active', true)
      .order('min_salary');

    if (error) throw error;
    return (data || []).map(s => this.mapToProfessionalTaxSlab(s));
  }

  // Payroll Calculation
  async calculatePayroll(employeeId: string, monthYear: string): Promise<{
    earnings: { [key: string]: number };
    deductions: { [key: string]: number };
    netPay: number;
  }> {
    // Get employee salary
    const employeeSalaries = await this.getEmployeeSalaries(employeeId);
    const currentSalary = employeeSalaries.find(s => s.isCurrent);
    
    if (!currentSalary) {
      throw new Error('No active salary found for employee');
    }

    // Get salary structure
    const { data: salaryStructure } = await supabase
      .from('salary_structures')
      .select('*')
      .eq('id', currentSalary.salaryStructureId)
      .single();

    if (!salaryStructure) {
      throw new Error('Salary structure not found');
    }

    // Get statutory rates
    const pfRate = await this.getCurrentPFRate();
    const esiRate = await this.getCurrentESIRate();
    
    // Calculate earnings
    const basicSalary = currentSalary.basicSalary;
    const daAllowance = (basicSalary * salaryStructure.da_allowance) / 100;
    const hra = (basicSalary * salaryStructure.hra) / 100;
    const conveyance = salaryStructure.conveyance;
    const medical = salaryStructure.medical;
    const specialAllowance = salaryStructure.special_allowance;
    
    const grossSalary = basicSalary + daAllowance + hra + conveyance + medical + specialAllowance;

    // Calculate deductions
    let pfDeduction = 0;
    let esiDeduction = 0;
    let professionalTax = 0;

    // PF Calculation
    if (pfRate && basicSalary + daAllowance <= 15000) {
      pfDeduction = (basicSalary + daAllowance) * (pfRate.employeeContribution / 100);
    }

    // ESI Calculation
    if (esiRate && grossSalary <= esiRate.salaryLimit) {
      esiDeduction = grossSalary * (esiRate.employeeContribution / 100);
    }

    // Professional Tax (example for Maharashtra)
    const ptSlabs = await this.getProfessionalTaxSlabs('Maharashtra');
    for (const slab of ptSlabs) {
      if (grossSalary >= slab.minSalary && grossSalary <= slab.maxSalary) {
        professionalTax = slab.taxAmount;
        break;
      }
    }

    // Income Tax (simplified calculation)
    const incomeTax = this.calculateIncomeTax(grossSalary);

    const totalDeductions = pfDeduction + esiDeduction + professionalTax + incomeTax;
    const netPay = grossSalary - totalDeductions;

    return {
      earnings: {
        basicSalary,
        daAllowance,
        hra,
        conveyance,
        medical,
        specialAllowance,
        grossSalary
      },
      deductions: {
        pfDeduction,
        esiDeduction,
        professionalTax,
        incomeTax,
        totalDeductions
      },
      netPay
    };
  }

  private calculateIncomeTax(grossSalary: number): number {
    // Simplified income tax calculation for FY 2023-24
    const annualSalary = grossSalary * 12;
    let tax = 0;

    // Old tax regime calculation
    if (annualSalary <= 250000) {
      tax = 0;
    } else if (annualSalary <= 500000) {
      tax = (annualSalary - 250000) * 0.05;
    } else if (annualSalary <= 1000000) {
      tax = 12500 + (annualSalary - 500000) * 0.20;
    } else {
      tax = 112500 + (annualSalary - 1000000) * 0.30;
    }

    // Add cess
    tax = tax * 1.04;

    return Math.round(tax / 12); // Monthly tax
  }

  // Payroll Run Management
  async createPayrollRun(monthYear: string, processedBy?: string): Promise<PayrollRun> {
    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('status', 'Active');

    if (!employees || employees.length === 0) {
      throw new Error('No active employees found');
    }

    const payPeriodStart = format(new Date(monthYear + '-01'), 'yyyy-MM-dd');
    const payPeriodEnd = format(new Date(new Date(monthYear + '-01').getFullYear(), new Date(monthYear + '-01').getMonth() + 1, 0), 'yyyy-MM-dd');

    const payrollRun: any = {
      month_year: monthYear,
      pay_period_start: payPeriodStart,
      pay_period_end: payPeriodEnd,
      status: 'draft',
      total_employees: employees.length,
      total_gross_pay: 0,
      total_deductions: 0,
      total_net_pay: 0,
      processed_by: processedBy,
      processed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('payroll_runs')
      .insert([payrollRun])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async processPayrollRun(payrollRunId: string, processedBy?: string): Promise<void> {
    const { data: payrollRun } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('id', payrollRunId)
      .single();

    if (!payrollRun) {
      throw new Error('Payroll run not found');
    }

    if (payrollRun.status !== 'draft') {
      throw new Error('Payroll run is not in draft status');
    }

    // Get active employees
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'Active');

    if (!employees || employees.length === 0) {
      throw new Error('No active employees found');
    }

    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;

    // Process each employee
    for (const employee of employees) {
      try {
        const calculation = await this.calculatePayroll(employee.id, payrollRun.month_year);
        
        // Get employee salary
        const { data: employeeSalary } = await supabase
          .from('employee_salaries')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('is_current', true)
          .single();

        if (!employeeSalary) continue;

        // Create payslip
        const payslipNumber = `PSL${format(new Date(), 'yyyyMM')}${String(employees.indexOf(employee) + 1).padStart(4, '0')}`;
        
        const payslip: any = {
          payroll_run_id: payrollRunId,
          employee_id: employee.id,
          employee_salary_id: employeeSalary.id,
          payslip_number: payslipNumber,
          pay_period_start: payrollRun.pay_period_start,
          pay_period_end: payrollRun.pay_period_end,
          basic_salary: calculation.earnings.basicSalary,
          da_allowance: calculation.earnings.daAllowance,
          hra: calculation.earnings.hra,
          conveyance: calculation.earnings.conveyance,
          medical: calculation.earnings.medical,
          special_allowance: calculation.earnings.specialAllowance,
          gross_salary: calculation.earnings.grossSalary,
          pf_deduction: calculation.deductions.pfDeduction,
          esi_deduction: calculation.deductions.esiDeduction,
          professional_tax: calculation.deductions.professionalTax,
          income_tax: calculation.deductions.incomeTax,
          other_deductions: 0,
          total_deductions: calculation.deductions.totalDeductions,
          net_salary: calculation.netPay,
          working_days: 30, // Should be calculated based on attendance
          paid_days: 30,
          overtime_hours: 0,
          overtime_amount: 0,
          loan_deductions: 0,
          arrears: 0,
          is_finalized: false
        };

        await supabase.from('payslips').insert([payslip]);

        totalGrossPay += calculation.earnings.grossSalary;
        totalDeductions += calculation.deductions.totalDeductions;
        totalNetPay += calculation.netPay;

      } catch (error) {
        console.error(`Error processing payroll for employee ${employee.id}:`, error);
      }
    }

    // Update payroll run totals
    await supabase
      .from('payroll_runs')
      .update({
        status: 'processed',
        total_gross_pay: totalGrossPay,
        total_deductions: totalDeductions,
        total_net_pay: totalNetPay,
        processed_by: processedBy,
        processed_at: new Date().toISOString()
      })
      .eq('id', payrollRunId);
  }

  async getPayrollRuns(): Promise<PayrollRun[]> {
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .order('month_year', { ascending: false });

    if (error) throw error;
    
    // Map snake_case from DB to camelCase for the frontend
    return (data || []).map(run => this.mapToPayrollRun(run));
  }

  // Loan Management
  async getEmployeeLoans(employeeId: string): Promise<EmployeeLoan[]> {
    const { data, error } = await supabase
      .from('employee_loans')
      .select('*')
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(l => this.mapToEmployeeLoan(l));
  }

  async createEmployeeLoan(loan: Omit<EmployeeLoan, 'id'>): Promise<EmployeeLoan> {
    const { data, error } = await supabase
      .from('employee_loans')
      .insert([{
        employee_id: loan.employeeId,
        loan_type: loan.loanType,
        principal_amount: loan.principalAmount,
        interest_rate: loan.interestRate,
        tenure_months: loan.tenureMonths,
        monthly_deduction: loan.monthlyDeduction,
        remaining_principal: loan.remainingPrincipal,
        status: loan.status,
        start_date: loan.startDate,
        end_date: loan.endDate,
        purpose: loan.purpose,
        approved_by: loan.approvedBy,
        approved_at: loan.approvedAt
      }])
      .select()
      .single();

    if (error) throw error;
    return this.mapToEmployeeLoan(data);
  }

  // Arrear Management
  async createSalaryArrear(arrear: Omit<SalaryArrear, 'id' | 'createdAt'>): Promise<SalaryArrear> {
    const { data, error } = await supabase
      .from('salary_arrears')
      .insert([{ 
        employee_id: arrear.employeeId,
        payroll_run_id: arrear.payrollRunId,
        period_start: arrear.periodStart,
        period_end: arrear.periodEnd,
        basic_salary: arrear.basicSalary,
        da_allowance: arrear.daAllowance,
        hra: arrear.hra,
        other_allowances: arrear.otherAllowances,
        total_arrear: arrear.totalArrear,
        reason: arrear.reason,
        status: arrear.status,
        created_at: new Date().toISOString() 
      }])
      .select()
      .single();

    if (error) throw error;
    return this.mapToSalaryArrear(data);
  }

  // Payslip Generation
  async generatePayslipPDF(payslipId: string): Promise<Buffer> {
    const { data: payslip } = await supabase
      .from('payslips')
      .select(`*, employee:employees(*)`)
      .eq('id', payslipId)
      .single();

    if (!payslip) {
      throw new Error('Payslip not found');
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('PAYSLIP', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Company Name: Stellaris HRM`, 20, 35);
    doc.text(`Payslip Number: ${payslip.payslip_number}`, 20, 45);
    doc.text(`Pay Period: ${format(new Date(payslip.pay_period_start), 'dd MMM yyyy')} - ${format(new Date(payslip.pay_period_end), 'dd MMM yyyy')}`, 20, 55);
    
    // Employee Details
    doc.text(`Employee Name: ${payslip.employee.first_name} ${payslip.employee.last_name}`, 20, 70);
    doc.text(`Employee ID: ${payslip.employee.employee_code || payslip.employee.id}`, 20, 80);
    doc.text(`Department: ${payslip.employee.department || 'N/A'}`, 20, 90);
    doc.text(`Designation: ${payslip.employee.position || 'N/A'}`, 20, 100);
    
    // Earnings Table
    doc.text('EARNINGS', 20, 120);
    (doc as any).autoTable({
      startY: 125,
      head: [['Component', 'Amount (₹)']],
      body: [
        ['Basic Salary', payslip.basic_salary.toFixed(2)],
        ['DA Allowance', payslip.da_allowance.toFixed(2)],
        ['HRA', payslip.hra.toFixed(2)],
        ['Conveyance', payslip.conveyance.toFixed(2)],
        ['Medical', payslip.medical.toFixed(2)],
        ['Special Allowance', payslip.special_allowance.toFixed(2)],
        ['Gross Salary', payslip.gross_salary.toFixed(2)]
      ],
      theme: 'grid',
      styles: { fontSize: 10 }
    });
    
    // Deductions Table
    const startY = (doc as any).lastAutoTable.finalY + 10;
    doc.text('DEDUCTIONS', 20, startY);
    (doc as any).autoTable({
      startY: startY + 5,
      head: [['Component', 'Amount (₹)']],
      body: [
        ['PF Contribution', payslip.pf_deduction.toFixed(2)],
        ['ESI Contribution', payslip.esi_deduction.toFixed(2)],
        ['Professional Tax', payslip.professional_tax.toFixed(2)],
        ['Income Tax', payslip.income_tax.toFixed(2)],
        ['Other Deductions', payslip.other_deductions.toFixed(2)],
        ['Total Deductions', payslip.total_deductions.toFixed(2)]
      ],
      theme: 'grid',
      styles: { fontSize: 10 }
    });
    
    // Summary
    const summaryY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Net Pay: ₹${payslip.net_salary.toFixed(2)}`, 20, summaryY);
    doc.text(`Working Days: ${payslip.working_days}`, 20, summaryY + 10);
    doc.text(`Paid Days: ${payslip.paid_days}`, 20, summaryY + 20);
    
    // Footer
    doc.setFontSize(10);
    doc.text('This is a computer-generated document.', 20, 280);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 20, 290);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  // Reporting
  async getPayrollSummary(monthYear: string): Promise<PayrollSummary> {
    const { data: payslips } = await supabase
      .from('payslips')
      .select('*')
      .eq('pay_period_start', format(new Date(monthYear + '-01'), 'yyyy-MM-dd'));

    if (!payslips || payslips.length === 0) {
      return {
        totalEmployees: 0,
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalPF: 0,
        totalESI: 0,
        totalProfessionalTax: 0,
        totalIncomeTax: 0
      };
    }

    return {
      totalEmployees: payslips.length,
      totalGrossPay: payslips.reduce((sum, p) => sum + p.gross_salary, 0),
      totalDeductions: payslips.reduce((sum, p) => sum + p.total_deductions, 0),
      totalNetPay: payslips.reduce((sum, p) => sum + p.net_salary, 0),
      totalPF: payslips.reduce((sum, p) => sum + p.pf_deduction, 0),
      totalESI: payslips.reduce((sum, p) => sum + p.esi_deduction, 0),
      totalProfessionalTax: payslips.reduce((sum, p) => sum + p.professional_tax, 0),
      totalIncomeTax: payslips.reduce((sum, p) => sum + p.income_tax, 0)
    };
  }

  async getPayslipsByMonthYear(monthYear: string): Promise<Payslip[]> {
    const { data, error } = await supabase
      .from('payslips')
      .select('*, employee:employees(*)')
      .ilike('pay_period_start', `${monthYear}%`); // Assuming pay_period_start is 'YYYY-MM-DD'

    if (error) throw error;
    return (data || []).map(p => this.mapToPayslip(p));
  }

  async getPayslipsByEmployeeId(employeeId: string): Promise<Payslip[]> {
    const { data, error } = await supabase
      .from('payslips')
      .select('*, employee:employees(*)')
      .eq('employee_id', employeeId)
      .order('pay_period_end', { ascending: false });

    if (error) throw error;
    return (data || []).map(p => this.mapToPayslip(p));
  }

  async getMyPayslips(): Promise<Payslip[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('payslips')
      .select(`*, employee:employees(*, departments(*), designations(*))`)
      .eq('employee_id', userData.user.id)
      .order('pay_period_start', { ascending: false });

    if (error) throw error;
    return (data || []).map(p => this.mapToPayslip(p));
  }

  // Form 16 Generation
  async generateForm16(employeeId: string, financialYear: string): Promise<Buffer> {
    const { data: payslips } = await supabase
      .from('payslips')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('pay_period_start', `${financialYear}-04-01`)
      .lte('pay_period_end', `${parseInt(financialYear) + 1}-03-31`)
      .order('pay_period_start');

    if (!payslips || payslips.length === 0) {
      throw new Error('No payslips found for the financial year');
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (!employee) {
      throw new Error('Employee not found');
    }

    const doc = new jsPDF();
    
    // Form 16 Header
    doc.setFontSize(16);
    doc.text('FORM 16', 105, 20, { align: 'center' });
    doc.text('[See rule 31(1)(a)]', 105, 30, { align: 'center' });
    doc.text('PART A', 105, 40, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary', 20, 55);
    doc.text(`Financial Year: ${financialYear}-${parseInt(financialYear) + 1}`, 20, 65);
    
    // Employee Details
    doc.text('Employee Details:', 20, 80);
    doc.text(`Name: ${employee.first_name} ${employee.last_name}`, 20, 90);
    doc.text(`PAN: ${employee.pan || 'N/A'}`, 20, 100);
    doc.text(`Employee ID: ${employee.employee_code || employee.id}`, 20, 110);
    
    // Salary Summary
    const totalGross = payslips.reduce((sum, p) => sum + p.gross_salary, 0);
    const totalTax = payslips.reduce((sum, p) => sum + p.income_tax, 0);
    const totalPF = payslips.reduce((sum, p) => sum + p.pf_deduction, 0);
    
    doc.text('Salary Summary:', 20, 130);
    doc.text(`Total Gross Salary: ₹${totalGross.toFixed(2)}`, 20, 140);
    doc.text(`Total Income Tax Deducted: ₹${totalTax.toFixed(2)}`, 20, 150);
    doc.text(`Total PF Contribution: ₹${totalPF.toFixed(2)}`, 20, 160);
    
    // Monthly Breakdown
    doc.text('Monthly Salary Details:', 20, 180);
    (doc as any).autoTable({
      startY: 185,
      head: [['Month', 'Gross Salary (₹)', 'Income Tax (₹)', 'Net Pay (₹)']],
      body: payslips.map(p => [
        format(new Date(p.pay_period_start), 'MMM yyyy'),
        p.gross_salary.toFixed(2),
        p.income_tax.toFixed(2),
        p.net_salary.toFixed(2)
      ]),
      theme: 'grid',
      styles: { fontSize: 10 }
    });
    
    // Footer
    doc.setFontSize(10);
    doc.text('This is a computer-generated Form 16.', 20, 280);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 20, 290);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  // Audit Logging
  async logPayrollAction(payrollRunId: string, employeeId: string, action: string, oldValue?: any, newValue?: any, userId?: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const authUid = userId || userData.user?.id;
    
    if (!authUid) return;

    // Resolve employee_id from auth.uid()
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', authUid)
      .single();

    if (!employee) {
      console.error('Could not find employee for auth user:', authUid);
      return;
    }

    const { error } = await supabase
      .from('payroll_audit_log')
      .insert([{
        table_name: 'payroll_runs',
        record_id: payrollRunId,
        action,
        old_data: oldValue,
        new_data: newValue,
        changed_by: employee.id,
        changed_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error logging payroll action:', error);
    }
  }
}

export const payrollService = new PayrollService();