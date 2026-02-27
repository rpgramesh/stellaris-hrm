import { supabase } from '@/lib/supabase';
import { payrollProcessingEngine } from './payrollProcessingEngine';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { payrollValidationService } from './payrollValidationService';
import { PayrollRun, PayrollEmployee, PayrollCalculationResult, Payslip } from '@/types/payroll';

export interface PayrollProcessingOptions {
  validateTimesheets?: boolean;
  requireManagerApproval?: boolean;
  generatePayslips?: boolean;
  sendNotifications?: boolean;
  selectedEmployeeIds?: string[];
}

export interface PayrollValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingTimesheets: string[];
  unapprovedTimesheets: string[];
}

export interface PayrollReport {
  payrollRunId: string;
  periodStart: string;
  periodEnd: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalTax: number;
  totalNetPay: number;
  totalSuper: number;
  employeeBreakdown: {
    employeeId: string;
    employeeName: string;
    grossPay: number;
    tax: number;
    netPay: number;
    super: number;
    hoursWorked: number;
    status: 'Processed' | 'Error' | 'Warning';
    errors: string[];
    warnings: string[];
  }[];
  complianceStatus: {
    minimumWageCompliant: boolean;
    superCompliant: boolean;
    taxCompliant: boolean;
    issues: string[];
  };
}

export const comprehensivePayrollService = {
  async createPayrollRun(
    payPeriodStart: string,
    payPeriodEnd: string,
    paymentDate: string,
    payFrequency: 'Weekly' | 'Fortnightly' | 'Monthly',
    createdBy: string,
    options: PayrollProcessingOptions = {}
  ): Promise<PayrollRun> {
    let userId = createdBy;
    
    try {
      // Resolve current user if needed
      if (createdBy === 'current-user') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      }

      // Validate inputs
      this.validatePayrollInputs(payPeriodStart, payPeriodEnd, paymentDate);
      
      // Create payroll run
      const { data: payrollRun, error: runError } = await supabase
        .from('payroll_runs')
        .insert({
          pay_period_start: payPeriodStart,
          pay_period_end: payPeriodEnd,
          payment_date: paymentDate,
          pay_frequency: payFrequency,
          status: 'Draft',
          total_gross_pay: 0,
          total_tax: 0,
          total_super: 0,
          total_net_pay: 0,
          employee_count: 0
        })
        .select()
        .single();

      if (runError) throw runError;

      // Log the action
      await auditService.logAction(
        'payroll_runs',
        payrollRun.id,
        'INSERT',
        null,
        { payrollRun, options },
        userId
      );

      return this.mapPayrollRunFromDb(payrollRun);
    } catch (error) {
      console.error('Error creating payroll run:', error);
      throw error;
    }
  },

  async validatePayrollRun(payrollRunId: string): Promise<PayrollValidationResult> {
    try {
      const payrollRun = await this.getPayrollRun(payrollRunId);
      if (!payrollRun) {
        throw new Error('Payroll run not found');
      }

      const result: PayrollValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        missingTimesheets: [],
        unapprovedTimesheets: []
      };

      // Get employees for this payroll run
      const employees = await this.getEmployeesForPayroll(payrollRun);
      
      for (const employee of employees) {
        const employeeValidation = await this.validateEmployeePayroll(employee, payrollRun);
        
        result.errors.push(...employeeValidation.errors);
        result.warnings.push(...employeeValidation.warnings);
        result.missingTimesheets.push(...employeeValidation.missingTimesheets);
        result.unapprovedTimesheets.push(...employeeValidation.unapprovedTimesheets);
      }

      // Set overall validity
      result.isValid = result.errors.length === 0;

      // Log the validation action
      await auditService.logAction(
        'payroll_runs',
        payrollRunId,
        'SYSTEM_ACTION',
        null,
        result
      );

      return result;
    } catch (error) {
      console.error('Error validating payroll run:', error);
      throw error;
    }
  },

  async processPayrollRun(
    payrollRunId: string,
    processedBy: string,
    options: PayrollProcessingOptions = {}
  ): Promise<PayrollReport> {
    let employeeId = processedBy;
    let userId: string | undefined = undefined;
    
    try {
      // Resolve current user and employee ID if needed
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        if (processedBy === 'current-user') {
          const { data: employee } = await supabase
            .from('employees')
            .select('id')
            .eq('user_id', user.id)
            .single();
          
          if (employee) {
            employeeId = employee.id;
          }
        }
      }

      // Validate payroll run first
      const validation = await this.validatePayrollRun(payrollRunId);
      if (!validation.isValid) {
        throw new Error(`Payroll validation failed: ${validation.errors.join(', ')}`);
      }

      // Get payroll run
      const payrollRun = await this.getPayrollRun(payrollRunId);
      if (!payrollRun) {
        throw new Error('Payroll run not found');
      }

      // Update status to processing
      await this.updatePayrollRunStatus(payrollRunId, 'Processing', employeeId);

      // Process payroll using the enhanced processing engine
      const calculationResults = await payrollProcessingEngine.processPayrollRun(
        payrollRunId,
        employeeId,
        options.selectedEmployeeIds
      );

      // Generate comprehensive report
      const report = await this.generatePayrollReport(payrollRun, calculationResults);

      // Send notifications if requested
      if (options.sendNotifications) {
        await this.sendPayrollNotifications(payrollRun, report);
      }

      // Create audit log
      await auditService.logAction(
        'payroll_runs',
        payrollRunId,
        'UPDATE',
        { status: 'Processing' },
        { status: 'Paid' },
        userId // Pass the USER ID for audit logging
      );

      return report;
    } catch (error) {
      console.error('Error processing payroll run:', error);
      
      // Revert status to draft on error
      try {
        await this.updatePayrollRunStatus(payrollRunId, 'Draft', employeeId);
      } catch (revertError) {
        console.error('Error reverting payroll run status:', revertError);
      }
      
      throw error;
    }
  },

  async generatePayslipPDF(payslipId: string): Promise<Buffer> {
    try {
      // Get payslip with all related data
      const payslip = await this.getPayslipWithDetails(payslipId);
      if (!payslip) {
        throw new Error('Payslip not found');
      }

      // Get employee details
      const { data: employee } = await supabase
        .from('employees')
        .select('first_name, last_name, email')
        .eq('id', payslip.employeeId)
        .single();

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Generate PDF content (simplified implementation)
      // In a real implementation, you would use a PDF library like Puppeteer or PDFKit
      const pdfContent = this.generatePayslipContent(payslip, employee);
      
      // Create audit log
      await auditService.logAction(
        'payslips',
        payslipId,
        'SYSTEM_ACTION',
        null,
        { action: 'generate_pdf' }
      );

      return Buffer.from(pdfContent);
    } catch (error) {
      console.error('Error generating payslip PDF:', error);
      throw error;
    }
  },

  async getPayrollSummary(periodStart: string, periodEnd: string): Promise<{
    totalGrossPay: number;
    totalTax: number;
    totalNetPay: number;
    totalSuper: number;
    employeeCount: number;
    averagePay: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('total_gross_pay, total_tax, total_net_pay, total_super, employee_count')
        .gte('pay_period_start', periodStart)
        .lte('pay_period_end', periodEnd)
        .eq('status', 'Paid');

      if (error) throw error;

      const totals = data.reduce(
        (acc, run) => ({
          totalGrossPay: acc.totalGrossPay + (Number(run.total_gross_pay) || 0),
          totalTax: acc.totalTax + (Number(run.total_tax) || 0),
          totalNetPay: acc.totalNetPay + (Number(run.total_net_pay) || 0),
          totalSuper: acc.totalSuper + (Number(run.total_super) || 0),
          employeeCount: acc.employeeCount + (Number(run.employee_count) || 0)
        }),
        { totalGrossPay: 0, totalTax: 0, totalNetPay: 0, totalSuper: 0, employeeCount: 0 }
      );

      return {
        ...totals,
        averagePay: totals.employeeCount > 0 ? totals.totalNetPay / totals.employeeCount : 0
      };
    } catch (error) {
      console.error('Error getting payroll summary:', error);
      throw error;
    }
  },

  // Public helper methods
  validatePayrollInputs(payPeriodStart: string, payPeriodEnd: string, paymentDate: string): void {
    const start = new Date(payPeriodStart);
    const end = new Date(payPeriodEnd);
    const payment = new Date(paymentDate);

    if (start >= end) {
      throw new Error('Pay period start date must be before end date');
    }

    if (payment < end) {
      throw new Error('Payment date must be after or equal to pay period end date');
    }
  },

  async validateEmployeePayroll(employee: PayrollEmployee, payrollRun: PayrollRun): Promise<{
    errors: string[];
    warnings: string[];
    missingTimesheets: string[];
    unapprovedTimesheets: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingTimesheets: string[] = [];
    const unapprovedTimesheets: string[] = [];

    try {
      const employeeName = employee.firstName && employee.lastName 
        ? `${employee.firstName} ${employee.lastName}`
        : employee.employeeId;
      
      // 1. Existing manual validations
      // Check for required timesheets (for ALL employees as per user request)
      const timesheets = await this.getEmployeeTimesheetsForPeriod(
        employee.employeeId,
        payrollRun.payPeriodStart,
        payrollRun.payPeriodEnd
      );

      if (timesheets.length === 0) {
        missingTimesheets.push(employee.employeeId);
        errors.push(`Employee ${employeeName} has no timesheets for the pay period`);
      } else {
        // Check for approved timesheets
        const unapproved = timesheets.filter(t => t.status !== 'Approved');
        if (unapproved.length > 0) {
          unapprovedTimesheets.push(employee.employeeId);
          errors.push(`Employee ${employeeName} has unapproved timesheets`);
        }
      }

      // 2. Rule-based validations from database
      const ruleErrors = await payrollValidationService.validateEmployee(employee, payrollRun);
      ruleErrors.forEach(err => {
        const formattedMessage = err.message.includes(employeeName) 
          ? err.message 
          : `${employeeName}: ${err.message}`;

        if (err.type === 'Error') {
          errors.push(formattedMessage);
        } else {
          warnings.push(formattedMessage);
        }
      });

    } catch (error) {
      const employeeName = employee.firstName && employee.lastName 
        ? `${employee.firstName} ${employee.lastName}`
        : employee.employeeId;
      errors.push(`Error validating employee ${employeeName}: ${error.message}`);
    }

    return { errors, warnings, missingTimesheets, unapprovedTimesheets };
  },

  async getEmployeeTimesheetsForPeriod(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Calculate the Monday of the first week
      const firstMonday = new Date(start);
      const day = firstMonday.getDay();
      const diff = firstMonday.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      firstMonday.setDate(diff);
      const firstMondayStr = firstMonday.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('week_start_date', firstMondayStr)
        .lte('week_start_date', endDate);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting employee timesheets:', error);
      throw error;
    }
  },

  async generatePayrollReport(
    payrollRun: PayrollRun,
    calculationResults: PayrollCalculationResult[]
  ): Promise<PayrollReport> {
    const employeeBreakdown: any[] = [];
    let totalGrossPay = 0;
    let totalTax = 0;
    let totalNetPay = 0;
    let totalSuper = 0;

    for (const result of calculationResults) {
      // Get employee details
      const { data: employee } = await supabase
        .from('employees')
        .select('first_name, last_name')
        .eq('id', result.employeeId)
        .single();

      const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
      const hoursWorked = result.components.earnings
        .filter(e => e.componentType === 'BaseSalary' || e.componentType === 'Overtime')
        .reduce((sum, e) => sum + e.units, 0);

      employeeBreakdown.push({
        employeeId: result.employeeId,
        employeeName,
        grossPay: result.totals.grossPay,
        tax: result.totals.taxWithheld,
        netPay: result.totals.netPay,
        super: result.totals.superContributions,
        hoursWorked,
        status: result.validationErrors.length > 0 ? 'Error' : 
                result.warnings.length > 0 ? 'Warning' : 'Processed',
        errors: result.validationErrors,
        warnings: result.warnings
      });

      totalGrossPay += result.totals.grossPay;
      totalTax += result.totals.taxWithheld;
      totalNetPay += result.totals.netPay;
      totalSuper += result.totals.superContributions;
    }

    return {
      payrollRunId: payrollRun.id,
      periodStart: payrollRun.payPeriodStart,
      periodEnd: payrollRun.payPeriodEnd,
      totalEmployees: calculationResults.length,
      totalGrossPay,
      totalTax,
      totalNetPay,
      totalSuper,
      employeeBreakdown,
      complianceStatus: {
        minimumWageCompliant: true, // Would need proper validation
        superCompliant: true,
        taxCompliant: true,
        issues: []
      }
    };
  },

  async sendPayrollNotifications(payrollRun: PayrollRun, report: PayrollReport): Promise<void> {
    try {
      // Send notifications to HR/Admin
      // Note: We'd normally get the HR admin's user ID here
      const { data: hrAdmins } = await supabase
        .from('employees')
        .select('user_id')
        .eq('role', 'HR')
        .limit(1);
      
      const recipientId = hrAdmins?.[0]?.user_id;

      if (recipientId) {
        await notificationService.createNotification(
          recipientId,
          'Payroll Processed Successfully',
          `Payroll for period ${payrollRun.payPeriodStart} to ${payrollRun.payPeriodEnd} has been processed. Total: $${report.totalNetPay.toFixed(2)}`,
          'success'
        );
      } else {
        console.warn('No HR admin found to receive payroll processing notification');
      }

      // Log the action
      await auditService.logAction(
        'payroll_runs',
        payrollRun.id,
        'SYSTEM_ACTION',
        null,
        { notification: 'success', reportSummary: { totalNetPay: report.totalNetPay } }
      );

      // Send notifications to employees (in a real implementation)
      // This would be done asynchronously to avoid blocking the main process
    } catch (error) {
      console.error('Error sending payroll notifications:', error);
      // Don't throw - notifications are not critical to the payroll process
    }
  },

  async getPayrollRun(payrollRunId: string): Promise<PayrollRun | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('id', payrollRunId)
        .single();

      if (error) return null;
      return this.mapPayrollRunFromDb(data);
    } catch (error) {
      console.error('Error getting payroll run:', error);
      return null;
    }
  },

  async getEmployeesForPayroll(payrollRun: PayrollRun): Promise<PayrollEmployee[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_employees')
        .select(`
          *,
          employees!inner(
            id,
            first_name,
            last_name,
            department_id,
            employment_status
          )
        `)
        .eq('employees.employment_status', 'Active')
        .eq('pay_frequency', payrollRun.payFrequency)
        .eq('is_active', true);

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn(`No active employees found for pay frequency: ${payrollRun.payFrequency}`);
      }

      return (data || []).map(pe => ({
        id: pe.id,
        employeeId: pe.employee_id,
        companyId: pe.employees.department_id, // Using department_id as proxy
        firstName: pe.employees.first_name,
        lastName: pe.employees.last_name,
        baseSalary: pe.base_salary || 0,
        annualSalary: pe.base_salary,
        hourlyRate: pe.hourly_rate || 0,
        payFrequency: pe.pay_frequency,
        employmentType: pe.employment_type,
        taxFileNumber: pe.tax_file_number,
        superFundId: pe.super_fund_id,
        superMemberNumber: pe.super_member_number,
        taxScale: pe.tax_scale || 'TaxFreeThreshold',
        residencyStatus: pe.residency_status || 'Resident',
        isSalarySacrifice: pe.is_salary_sacrifice || false,
        effectiveFrom: pe.effective_from
      }));
    } catch (error) {
      console.error('Error getting employees for payroll:', error);
      throw error;
    }
  },

  async updatePayrollRunStatus(payrollRunId: string, status: string, updatedBy: string): Promise<void> {
    const { error } = await supabase
      .from('payroll_runs')
      .update({ 
        status,
        processed_by: updatedBy,
        processed_at: status === 'Paid' ? new Date().toISOString() : null
      })
      .eq('id', payrollRunId);

    if (error) {
      console.error('Error updating payroll run status:', error);
      throw error;
    }
  },

  async getPayslipWithDetails(payslipId: string): Promise<Payslip | null> {
    const { data, error } = await supabase
      .from('payslips')
      .select(`
        *,
        pay_components(*),
        deduction_applications(*)
      `)
      .eq('id', payslipId)
      .single();

    if (error) {
      console.error('Error fetching payslip details:', error);
      return null;
    }

    return payrollProcessingEngine.mapPayslipFromDb(data);
  },

  generatePayslipContent(payslip: Payslip, employee: any): string {
    // Simplified payslip content generation
    // In a real implementation, this would generate proper HTML/PDF content
    return `
      PAYSLIP
      
      Employee: ${employee.first_name} ${employee.last_name}
      Period: ${payslip.periodStart} to ${payslip.periodEnd}
      Payment Date: ${payslip.paymentDate}
      
      EARNINGS
      Gross Pay: $${payslip.grossPay.toFixed(2)}
      
      DEDUCTIONS
      Tax: $${payslip.taxWithheld.toFixed(2)}
      
      NET PAY: $${payslip.netPay.toFixed(2)}
      
      SUPERANNUATION: $${payslip.superannuation.toFixed(2)}
    `;
  },

  mapPayslipFromDb(data: any): Payslip {
    return {
      id: data.id,
      employeeId: data.employee_id,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      grossPay: Number(data.gross_pay) || 0,
      netPay: Number(data.net_pay) || 0,
      taxWithheld: Number(data.tax_withheld) || 0,
      superannuation: Number(data.superannuation) || 0,
      deductions: Number(data.deductions) || 0,
      allowances: Number(data.allowances) || 0,
      bonuses: Number(data.bonuses) || 0,
      reimbursements: Number(data.reimbursements) || 0,
      overtime: Number(data.overtime) || 0,
      paymentDate: data.payment_date,
      status: data.status,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString()
    };
  },

  mapPayrollRunFromDb(data: any): PayrollRun {
    return {
      id: data.id,
      payPeriodStart: data.pay_period_start,
      payPeriodEnd: data.pay_period_end,
      paymentDate: data.payment_date,
      payFrequency: data.pay_frequency,
      status: data.status,
      totalGrossPay: Number(data.total_gross_pay) || 0,
      totalTax: Number(data.total_tax) || 0,
      totalSuper: Number(data.total_super) || 0,
      totalNetPay: Number(data.total_net_pay) || 0,
      employeeCount: data.employee_count || 0,
      processedBy: data.processed_by,
      processedAt: data.processed_at,
      stpSubmissionId: data.stp_submission_id,
      stpStatus: data.stp_status,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString()
    };
  }
};