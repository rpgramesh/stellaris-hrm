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

export const PAYROLL_REPORT_CACHE_VERSION = 1;

const roundMoney = (n: unknown) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
};

const djb2 = (s: string) => {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

export const computePayrollReportChecksum = (report: PayrollReport) => {
  const normalized = {
    payrollRunId: String(report.payrollRunId || ''),
    periodStart: String(report.periodStart || ''),
    periodEnd: String(report.periodEnd || ''),
    totalEmployees: Number(report.totalEmployees || 0),
    totalGrossPay: roundMoney(report.totalGrossPay),
    totalTax: roundMoney(report.totalTax),
    totalNetPay: roundMoney(report.totalNetPay),
    totalSuper: roundMoney(report.totalSuper),
    employeeBreakdown: (report.employeeBreakdown || [])
      .map((e) => ({
        employeeId: String(e.employeeId || ''),
        employeeName: String(e.employeeName || ''),
        grossPay: roundMoney(e.grossPay),
        tax: roundMoney(e.tax),
        netPay: roundMoney(e.netPay),
        super: roundMoney(e.super),
        hoursWorked: roundMoney(e.hoursWorked),
        status: String(e.status || ''),
      }))
      .sort((a, b) => a.employeeId.localeCompare(b.employeeId)),
  };
  return djb2(JSON.stringify(normalized));
};

export const validatePayrollReportIntegrity = (
  report: PayrollReport,
  expected?: {
    totalGrossPay?: number;
    totalTax?: number;
    totalNetPay?: number;
    totalSuper?: number;
    employeeCount?: number;
  }
) => {
  if (!report || typeof report !== 'object') return { isValid: false, reason: 'missing_report' as const };
  if (!report.payrollRunId) return { isValid: false, reason: 'missing_payrollRunId' as const };

  const breakdown = Array.isArray(report.employeeBreakdown) ? report.employeeBreakdown : [];
  if (breakdown.length === 0) {
    const totalsZero =
      roundMoney(report.totalGrossPay) === 0 &&
      roundMoney(report.totalTax) === 0 &&
      roundMoney(report.totalNetPay) === 0 &&
      roundMoney(report.totalSuper) === 0;
    if (Number(report.totalEmployees || 0) === 0 && totalsZero) {
      return { isValid: true as const };
    }
    return { isValid: false as const, reason: 'empty_breakdown' as const };
  }

  const sums = breakdown.reduce(
    (acc, e) => ({
      gross: acc.gross + roundMoney((e as any).grossPay),
      tax: acc.tax + roundMoney((e as any).tax),
      net: acc.net + roundMoney((e as any).netPay),
      super: acc.super + roundMoney((e as any).super),
    }),
    { gross: 0, tax: 0, net: 0, super: 0 }
  );

  const uniqueEmployees = new Set(breakdown.map((e: any) => String(e.employeeId || ''))).size;
  const within = (a: number, b: number, tol = 0.02) => Math.abs(roundMoney(a) - roundMoney(b)) <= tol;

  if (!within(sums.gross, report.totalGrossPay)) return { isValid: false as const, reason: 'gross_mismatch' as const };
  if (!within(sums.tax, report.totalTax)) return { isValid: false as const, reason: 'tax_mismatch' as const };
  if (!within(sums.net, report.totalNetPay)) return { isValid: false as const, reason: 'net_mismatch' as const };
  if (!within(sums.super, report.totalSuper)) return { isValid: false as const, reason: 'super_mismatch' as const };
  if (Number(report.totalEmployees || 0) !== uniqueEmployees) return { isValid: false as const, reason: 'employee_count_mismatch' as const };

  if (expected) {
    if (expected.employeeCount != null && Number(expected.employeeCount) > 0 && uniqueEmployees !== Number(expected.employeeCount)) {
      return { isValid: false as const, reason: 'expected_employee_count_mismatch' as const };
    }
    if (expected.totalGrossPay != null && !within(expected.totalGrossPay, report.totalGrossPay)) {
      return { isValid: false as const, reason: 'expected_gross_mismatch' as const };
    }
    if (expected.totalTax != null && !within(expected.totalTax, report.totalTax)) {
      return { isValid: false as const, reason: 'expected_tax_mismatch' as const };
    }
    if (expected.totalNetPay != null && !within(expected.totalNetPay, report.totalNetPay)) {
      return { isValid: false as const, reason: 'expected_net_mismatch' as const };
    }
    if (expected.totalSuper != null && !within(expected.totalSuper, report.totalSuper)) {
      return { isValid: false as const, reason: 'expected_super_mismatch' as const };
    }
  }

  return { isValid: true as const };
};

export const filterPayrollReportByEmployeeIds = (report: PayrollReport, employeeIds: string[]) => {
  const ids = new Set((employeeIds || []).map((id) => String(id)));
  if (ids.size === 0) return report;

  const filtered = (report.employeeBreakdown || []).filter((e) => ids.has(String((e as any).employeeId)));
  const totals = filtered.reduce(
    (acc, e) => ({
      gross: acc.gross + Number((e as any).grossPay || 0),
      tax: acc.tax + Number((e as any).tax || 0),
      net: acc.net + Number((e as any).netPay || 0),
      super: acc.super + Number((e as any).super || 0),
    }),
    { gross: 0, tax: 0, net: 0, super: 0 }
  );

  return {
    ...report,
    totalEmployees: new Set(filtered.map((e) => String((e as any).employeeId || ''))).size,
    totalGrossPay: totals.gross,
    totalTax: totals.tax,
    totalNetPay: totals.net,
    totalSuper: totals.super,
    employeeBreakdown: filtered,
  };
};

export const validateCachedPayrollReportRow = (
  row: {
    report?: unknown;
    checksum?: string | null;
    is_valid?: boolean | null;
  },
  expected?: {
    totalGrossPay?: number;
    totalTax?: number;
    totalNetPay?: number;
    totalSuper?: number;
    employeeCount?: number;
  }
) => {
  const report = row?.report as PayrollReport | undefined;
  if (!report) return { report: null as PayrollReport | null, reason: 'missing_report' as const };
  if (row?.is_valid === false) return { report: null as PayrollReport | null, reason: 'marked_invalid' as const };

  const integrity = validatePayrollReportIntegrity(report, expected);
  if (!integrity.isValid) return { report: null as PayrollReport | null, reason: integrity.reason };

  if (row?.checksum) {
    const checksum = computePayrollReportChecksum(report);
    if (checksum !== row.checksum) return { report: null as PayrollReport | null, reason: 'checksum_mismatch' as const };
  }

  return { report };
};

export const resolveSelectedPayrollEmployees = (
  allEmployees: PayrollEmployee[],
  selectedIds: string[]
): PayrollEmployee[] => {
  const byPayrollEmployeeId = new Map<string, PayrollEmployee>();
  const byEmployeeId = new Map<string, PayrollEmployee>();

  for (const emp of allEmployees) {
    if (emp.id) byPayrollEmployeeId.set(emp.id, emp);
    if (emp.employeeId) byEmployeeId.set(emp.employeeId, emp);
  }

  const unique = new Map<string, PayrollEmployee>();
  for (const id of selectedIds) {
    const resolved = byPayrollEmployeeId.get(id) || byEmployeeId.get(id);
    if (resolved && !unique.has(resolved.id)) unique.set(resolved.id, resolved);
  }

  return Array.from(unique.values());
};

export const computeHoursWorkedForReport = (earnings: PayrollCalculationResult['components']['earnings']): number => {
  const sum = (earnings || [])
    .filter((e) => {
      if (e.componentType === 'Overtime') return true;
      if (e.componentType !== 'BaseSalary') return false;
      return String(e.description || '') !== 'Base Salary';
    })
    .reduce((acc, e) => acc + Number(e.units || 0), 0);

  if (sum > 0) return sum;

  const basePeriod = (earnings || []).find(
    (e) => e.componentType === 'BaseSalary' && String(e.description || '') === 'Base Salary'
  );
  if (basePeriod) {
    const units = Number(basePeriod.units || 1);
    return units > 0 ? units : 1;
  }

  return 0;
};

export const comprehensivePayrollService = {
  async getCachedPayrollReport(
    payrollRunId: string,
    expected?: {
      totalGrossPay?: number;
      totalTax?: number;
      totalNetPay?: number;
      totalSuper?: number;
      employeeCount?: number;
    }
  ): Promise<PayrollReport | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_run_calculation_cache')
        .select('report, checksum, is_valid')
        .eq('payroll_run_id', payrollRunId)
        .maybeSingle();

      if (error || !data) return null;
      const { report, reason } = validateCachedPayrollReportRow(data as any, expected);
      if (report) return report;

      await supabase
        .from('payroll_run_calculation_cache')
        .update({ is_valid: false, invalid_reason: String(reason || 'invalid'), validated_at: new Date().toISOString() } as any)
        .eq('payroll_run_id', payrollRunId);

      return null;
    } catch {
      return null;
    }
  },

  async upsertCachedPayrollReport(payrollRunId: string, report: PayrollReport): Promise<void> {
    const integrity = validatePayrollReportIntegrity(report);
    if (!integrity.isValid) throw new Error(`Refusing to cache invalid payroll report (${integrity.reason || 'invalid'})`);

    const checksum = computePayrollReportChecksum(report);
    const payload = {
      payroll_run_id: payrollRunId,
      report: report as any,
      report_version: PAYROLL_REPORT_CACHE_VERSION,
      checksum,
      is_valid: true,
      invalid_reason: null,
      validated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('payroll_run_calculation_cache').upsert(payload as any);
    if (error) throw error;
  },

  async getTimesheetsForEmployeesInPeriod(
    employeeIds: string[],
    startDate: string,
    endDate: string
  ): Promise<Record<string, any[]>> {
    const map: Record<string, any[]> = {};
    for (const id of employeeIds) map[id] = [];

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return map;

      const res = await fetch('/api/payroll/timesheets/for-period', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ employeeIds, startDate, endDate }),
      });

      if (!res.ok) return map;
      const body = await res.json().catch(() => null);
      const rows: any[] = body?.rows || [];
      for (const ts of rows) {
        const eid = ts.employee_id;
        if (!eid) continue;
        if (!map[eid]) map[eid] = [];
        map[eid].push(ts);
      }
      return map;
    } catch {
      return map;
    }
  },

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

      const timesheetsByEmployeeId = await this.getTimesheetsForEmployeesInPeriod(
        employees.map(e => e.employeeId),
        payrollRun.payPeriodStart,
        payrollRun.payPeriodEnd
      );
      
      for (const employee of employees) {
        const employeeValidation = await this.validateEmployeePayroll(employee, payrollRun, {
          timesheetsForPeriod: timesheetsByEmployeeId[employee.employeeId] || []
        });
        
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

      try {
        await this.upsertCachedPayrollReport(payrollRunId, report);
      } catch (e: any) {
        console.error('[payroll-cache] failed to store cached payroll report', e?.message || e);
      }

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

  async validateEmployeePayroll(employee: PayrollEmployee, payrollRun: PayrollRun, ctx?: {
    timesheetsForPeriod?: any[];
  }): Promise<{
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
      // Check timesheet exemption marker on employee record
      let isTimesheetExempt = false;
      let exemptionReason: string | null = null;
      try {
        const { data: empMeta } = await supabase
          .from('employees')
          .select('remark')
          .eq('id', employee.employeeId)
          .maybeSingle();
        const remark: string | undefined = empMeta?.remark;
        if (remark && remark.includes('NO_TIMESHEET:')) {
          isTimesheetExempt = true;
          const idx = remark.indexOf('NO_TIMESHEET:');
          exemptionReason = remark.slice(idx + 'NO_TIMESHEET:'.length).trim();
        }
      } catch {
        // Ignore metadata fetch errors for exemption check
      }

      // 1. Existing manual validations
      // Check for required timesheets unless exempt
      if (!isTimesheetExempt) {
        const timesheets = ctx?.timesheetsForPeriod ?? await this.getEmployeeTimesheetsForPeriod(
          employee.employeeId,
          payrollRun.payPeriodStart,
          payrollRun.payPeriodEnd
        );

        if (timesheets.length === 0) {
          missingTimesheets.push(employee.employeeId);
          errors.push(`Employee ${employeeName} has no timesheets for the pay period`);
        } else {
          const timesheetsWithHours = timesheets.filter(t => Number((t as any).total_hours ?? (t as any).totalHours ?? 0) > 0);
          if (timesheetsWithHours.length > 0) {
            const unapproved = timesheetsWithHours.filter(t => String((t as any).status || '').toLowerCase() !== 'approved');
            if (unapproved.length > 0) {
              const detail = unapproved
                .slice(0, 5)
                .map(t => `${(t as any).week_start_date || (t as any).weekStartDate || 'unknown'} (${(t as any).status || 'Unknown'})`)
                .join(', ');
              unapprovedTimesheets.push(employee.employeeId);
              errors.push(`Employee ${employeeName} has unapproved timesheets${detail ? `: ${detail}` : ''}`);
            }
          }
        }
      } else {
        warnings.push(`${employeeName}: Timesheet exemption applied${exemptionReason ? ` (${exemptionReason})` : ''}`);
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
      const map = await this.getTimesheetsForEmployeesInPeriod([employeeId], startDate, endDate);
      const rows = map[employeeId];
      if (rows && rows.length > 0) return rows;

      const start = new Date(startDate);
      const firstMonday = new Date(start);
      const day = firstMonday.getDay();
      const diff = firstMonday.getDate() - day + (day === 0 ? -6 : 1);
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

  async calculatePayrollPreview(
    payrollRunId: string,
    selectedEmployeeIds: string[]
  ): Promise<PayrollReport> {
    try {
      const payrollRun = await this.getPayrollRun(payrollRunId);
      if (!payrollRun) throw new Error('Payroll run not found');

      if (selectedEmployeeIds.length === 0) {
        if (String((payrollRun as any).status || '').toLowerCase() === 'paid') {
          try {
            const { data: payslips, error: payslipErr } = await supabase
              .from('payslips')
              .select('*, employees:employee_id(first_name, last_name)')
              .eq('payroll_run_id', payrollRun.id);

            if (payslipErr) throw payslipErr;

            const mapPayslipRows = (rows: any[]) =>
              (rows || []).map((p: any) => {
                const employeeName = [p.employees?.first_name, p.employees?.last_name].filter(Boolean).join(' ') || p.employee_id;
                const gross = Number(p.gross_earnings ?? p.gross_pay ?? 0);
                const tax = Number(p.income_tax ?? p.tax_withheld ?? 0);
                return {
                  employeeId: p.employee_id,
                  employeeName,
                  grossPay: gross,
                  tax,
                  netPay: Number(p.net_pay || 0),
                  super: Number(p.superannuation || 0),
                  hoursWorked: Number(p.hours_logged || 0),
                  status: 'Processed' as const,
                  errors: [],
                  warnings: []
                };
              });

            let employeeBreakdown = mapPayslipRows(payslips || []);

            if (employeeBreakdown.length === 0 && Number((payrollRun as any).employeeCount || 0) > 0) {
              const { data: session } = await supabase.auth.getSession();
              const token = session.session?.access_token;
              if (token) {
                const res = await fetch(`/api/payroll/payslips/for-run?payrollRunId=${encodeURIComponent(payrollRun.id)}`, {
                  headers: { Authorization: `Bearer ${token}` },
                  cache: 'no-store'
                });
                if (res.ok) {
                  const json = await res.json();
                  employeeBreakdown = mapPayslipRows(json?.payslips || []);
                }
              }
            }

            if (employeeBreakdown.length > 0) {
              const totals = employeeBreakdown.reduce(
                (acc, e) => ({
                  gross: acc.gross + e.grossPay,
                  tax: acc.tax + e.tax,
                  net: acc.net + e.netPay,
                  super: acc.super + e.super,
                }),
                { gross: 0, tax: 0, net: 0, super: 0 }
              );
              return {
                payrollRunId: payrollRun.id,
                periodStart: payrollRun.payPeriodStart,
                periodEnd: payrollRun.payPeriodEnd,
                totalEmployees: new Set(employeeBreakdown.map((e) => e.employeeId)).size,
                totalGrossPay: totals.gross,
                totalTax: totals.tax,
                totalNetPay: totals.net,
                totalSuper: totals.super,
                employeeBreakdown,
                complianceStatus: { minimumWageCompliant: true, superCompliant: true, taxCompliant: true, issues: [] }
              };
            }
          } catch {
          }
        }

        return {
          payrollRunId: payrollRun.id,
          periodStart: payrollRun.payPeriodStart,
          periodEnd: payrollRun.payPeriodEnd,
          totalEmployees: Number((payrollRun as any).employeeCount || 0),
          totalGrossPay: Number((payrollRun as any).totalGrossPay || 0),
          totalTax: Number((payrollRun as any).totalTax || 0),
          totalNetPay: Number((payrollRun as any).totalNetPay || 0),
          totalSuper: Number((payrollRun as any).totalSuper || 0),
          employeeBreakdown: [],
          complianceStatus: { minimumWageCompliant: true, superCompliant: true, taxCompliant: true, issues: [] }
        };
      }

      const allEmployees = await this.getEmployeesForPayroll(payrollRun);
      
      const targetEmployees = resolveSelectedPayrollEmployees(allEmployees, selectedEmployeeIds);

      const calculationResults: PayrollCalculationResult[] = [];
      for (const employee of targetEmployees) {
        try {
          const result = await payrollProcessingEngine.calculateEmployeePayroll(employee, payrollRun);
          calculationResults.push(result);
        } catch (error) {
          console.error(`Error calculating preview for employee ${employee.employeeId}:`, error);
        }
      }

      return this.generatePayrollReport(payrollRun, calculationResults);
    } catch (error) {
      console.error('Error calculating payroll preview:', error);
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
      let hoursWorked = computeHoursWorkedForReport(result.components.earnings);
      try {
        const timesheets = await payrollProcessingEngine.getTimesheetsForPeriod(
          result.employeeId,
          payrollRun.payPeriodStart,
          payrollRun.payPeriodEnd
        );
        let approvedHours = 0;
        for (const ts of timesheets) {
          const h = payrollProcessingEngine.calculateHoursFromTimesheet(ts);
          approvedHours += Number(h.totalHours || 0);
        }
        if (approvedHours > 0) {
          hoursWorked = approvedHours;
        }
      } catch {
      }

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
            employment_status,
            tfn,
            superannuation_fund_name,
            superannuation_member_number,
            employee_salaries(
              basic_salary,
              is_current
            )
          )
        `)
        .eq('employees.employment_status', 'Active')
        .eq('pay_frequency', payrollRun.payFrequency)
        .eq('is_active', true);

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn(`No active employees found for pay frequency: ${payrollRun.payFrequency}`);
      }

      return (data || []).map(pe => {
        const activeSalary = pe.employees.employee_salaries?.find((s: any) => s.is_current);
        const salary = activeSalary ? activeSalary.basic_salary : (pe.base_salary || 0);

        return {
          id: pe.id,
          employeeId: pe.employee_id,
          companyId: pe.employees.department_id, // Using department_id as proxy
          firstName: pe.employees.first_name,
          lastName: pe.employees.last_name,
          baseSalary: salary,
          annualSalary: salary,
          hourlyRate: pe.hourly_rate || (salary / 52 / 38), // Estimate hourly if missing
          payFrequency: pe.pay_frequency,
          employmentType: pe.employment_type,
          taxFileNumber: pe.employees.tfn || pe.tax_file_number,
          superFundId: pe.employees.superannuation_fund_name || pe.super_fund_id, // Use name as ID for validation if ID is missing
          superMemberNumber: pe.employees.superannuation_member_number || pe.super_member_number,
          taxScale: pe.tax_scale || 'TaxFreeThreshold',
          residencyStatus: pe.residency_status || 'Resident',
          isSalarySacrifice: pe.is_salary_sacrifice || false,
          effectiveFrom: pe.effective_from
        };
      });
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
