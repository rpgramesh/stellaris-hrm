                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
import { PayrollRun, Payslip, PayComponent, PayrollCalculationResult, PayrollEmployee, TaxTable, Deduction, SuperannuationContribution, TimesheetEntry as PayrollTimesheetEntry, SalaryAdjustment } from '@/types/payroll';
import { auditService } from './auditService';
import { timesheetService } from './timesheetService';
import { statutoryTablesService } from './statutoryTablesService';
import { awardInterpretationEngine } from './awardInterpretationEngine';
import { attendanceService } from './attendanceService';
import { Timesheet } from '@/types';
import { supabase } from '@/lib/supabase';

const formatProcessingError = (e: any) => {
  if (!e) return 'Unknown error';
  const msg = typeof e?.message === 'string' && e.message ? e.message : typeof e === 'string' ? e : 'Unknown error';
  const parts = [
    msg,
    e?.code ? `code=${e.code}` : null,
    e?.hint ? `hint=${e.hint}` : null,
    e?.details ? `details=${e.details}` : null,
  ].filter(Boolean);
  return parts.join(' | ');
};

export const payrollProcessingEngine = {
  async processPayrollRun(payrollRunId: string, processedBy: string, selectedEmployeeIds?: string[]): Promise<PayrollCalculationResult[]> {
    const payrollRun = await this.getPayrollRun(payrollRunId);
    if (!payrollRun) throw new Error('Payroll run not found');
    if (payrollRun.status === 'Paid') {
      await auditService.logAction(
        'payroll_runs',
        payrollRunId,
        'SYSTEM_ACTION',
        { status: payrollRun.status },
        { attempt: 'PROCESS_ALREADY_PAID_RUN' },
        processedBy
      );
      throw new Error('Payroll run is already paid and cannot be modified');
    }
    // Allow 'processing' status as well since we set it when creating the run
    if (payrollRun.status !== 'Approved' && payrollRun.status !== 'Processing') {
        // Auto-approve if it's draft for this flow
        if (payrollRun.status === 'Draft') {
             await this.updatePayrollRunStatus(payrollRunId, 'Approved', processedBy);
        } else {
             // throw new Error(`Payroll run must be approved before processing (Current status: ${payrollRun.status})`);
        }
    }

    if (!Array.isArray(selectedEmployeeIds) || selectedEmployeeIds.length === 0) {
      throw new Error('No employees selected for processing');
    }

    // Get all employees for this payroll run
    const employees = await this.getEmployeesForPayroll(payrollRun, selectedEmployeeIds);
    if (employees.length === 0) {
      throw new Error(`No active employees found with ${payrollRun.payFrequency} pay frequency matching the selected criteria.`);
    }
    const results: PayrollCalculationResult[] = [];

    await this.assertEmployeesNotAlreadyPaid(payrollRunId, payrollRun, employees, processedBy);

    // Update payroll run status
    await this.updatePayrollRunStatus(payrollRunId, 'Processing', processedBy);

    try {
      for (const employee of employees) {
        try {
          const result = await this.calculateEmployeePayroll(employee, payrollRun);
          results.push(result);
          
          // Create payslip
          await this.createPayslipFromCalculation(result, payrollRunId);
        } catch (calcError) {
          console.error(`Error calculating payroll for employee ${employee.employeeId}:`, formatProcessingError(calcError));
          // Add to errors table
          await this.logPayrollError(
            payrollRunId,
            employee.employeeId,
            'Calculation',
            'CALC_ERR',
            `Failed to calculate payroll: ${formatProcessingError(calcError)}`,
            { error: typeof calcError === 'object' ? calcError : { value: calcError } }
          );
          throw calcError;
        }
      }

      // Update payroll run totals
      await this.updatePayrollRunTotals(payrollRunId, results);

      // Create audit log
      await auditService.logAction(
        'payroll_runs',
        payrollRunId,
        'UPDATE',
        { status: 'Processing' },
        { status: 'Processing' },
        processedBy
      );

      console.log(`Payroll processing completed. Successfully calculated ${results.length} of ${employees.length} employees.`);
      return results;
    } catch (error) {
      console.error('Error in processPayrollRun:', formatProcessingError(error));
      await this.updatePayrollRunStatus(payrollRunId, 'Draft', processedBy);
      throw error;
    }
  },

  async assertEmployeesNotAlreadyPaid(payrollRunId: string, payrollRun: PayrollRun, employees: PayrollEmployee[], processedBy: string): Promise<void> {
    const employeeIds = Array.from(new Set(employees.map(e => e.employeeId))).filter(Boolean);
    if (employeeIds.length === 0) return;
    const paidEmployeeIds = await this.getPaidEmployeeIdsForPeriod(payrollRun.payPeriodStart, payrollRun.payPeriodEnd, employeeIds);
    if (paidEmployeeIds.size === 0) return;
    const blocked = employeeIds.filter((id) => paidEmployeeIds.has(id));
    if (blocked.length === 0) return;

    await auditService.logAction(
      'payroll_runs',
      payrollRunId,
      'SYSTEM_ACTION',
      null,
      { attempt: 'PROCESS_PAID_EMPLOYEE', employeeIds: blocked, periodStart: payrollRun.payPeriodStart, periodEnd: payrollRun.payPeriodEnd },
      processedBy
    );
    throw new Error(`Cannot process payroll: employee(s) already processed and paid for this period`);
  },

  async getPaidEmployeeIdsForPeriod(periodStart: string, periodEnd: string, employeeIds: string[]): Promise<Set<string>> {
    try {
      const { data: paidRuns } = await supabase
        .from('payroll_runs')
        .select('id')
        .eq('pay_period_start', periodStart)
        .eq('pay_period_end', periodEnd)
        .eq('status', 'Paid');

      const paidRunIds = (paidRuns || []).map((r: any) => r.id).filter(Boolean);
      if (paidRunIds.length === 0) return new Set();

      const { data: payslips } = await supabase
        .from('payslips')
        .select('employee_id, payroll_run_id')
        .in('payroll_run_id', paidRunIds)
        .in('employee_id', employeeIds);

      return new Set((payslips || []).map((p: any) => p.employee_id).filter(Boolean));
    } catch {
      return new Set();
    }
  },

  async calculateEmployeePayroll(employee: PayrollEmployee, payrollRun: PayrollRun): Promise<PayrollCalculationResult> {
    const result: PayrollCalculationResult = {
      employeeId: employee.employeeId,
      periodStart: payrollRun.payPeriodStart,
      periodEnd: payrollRun.payPeriodEnd,
      components: {
        earnings: [],
        deductions: [],
        superContributions: []
      },
      totals: {
        grossPay: 0,
        taxableIncome: 0,
        totalDeductions: 0,
        taxWithheld: 0,
        netPay: 0,
        superContributions: 0
      },
      validationErrors: [],
      warnings: []
    };

    try {
      // 1. Process timesheet data for hourly employees or validate salary employees
      const timesheetComponents = await this.processTimesheetData(employee, payrollRun);
      result.components.earnings.push(...timesheetComponents.earnings);
      result.components.superContributions.push(...timesheetComponents.superContributions);
      
      // Calculate total units from timesheets so far
      const totalHoursFromTimesheets = timesheetComponents.earnings.reduce((sum, c) => sum + (c.units || 0), 0);

      // 2. Calculate base salary (for salaried employees) when timesheet-based earnings are not present
      const normalizedType = employee.employmentType.replace('-', '').toLowerCase();
      if (normalizedType === 'fulltime' || normalizedType === 'parttime') {
        // If we have hours from timesheets, we shouldn't add the default period salary 
        // IF those hours already represent the base ordinary time earnings.
        const hasHoursBasedBase = result.components.earnings.some(
          (e) => e.componentType === 'BaseSalary'
        );

        if (!hasHoursBasedBase) {
          const baseSalaryComponent = await this.calculateBaseSalary(employee, payrollRun, totalHoursFromTimesheets || 0);
          result.components.earnings.push(baseSalaryComponent);
        } else if (totalHoursFromTimesheets > 0) {
          // If we have hours but they were added with description "Hours Worked" etc.,
          // Ensure they are correctly categorized as BaseSalary for OTE/Super calculation
          // (Already done in processTimesheetData)
        }
      }

      // 3. Apply salary adjustments
      const adjustments = await this.getSalaryAdjustments(employee.employeeId, payrollRun);
      for (const adjustment of adjustments) {
        if (adjustment.adjustmentType === 'Deduction') {
          result.components.deductions.push({
            id: adjustment.id,
            employeeId: adjustment.employeeId,
            deductionType: 'PostTax',
            category: 'Other',
            description: `Salary Adjustment - ${adjustment.adjustmentReason}`,
            amount: Math.abs(Number(adjustment.amount || 0)),
            isFixed: true,
            isPercentage: false,
            priority: 100,
            effectiveFrom: adjustment.effectiveDate,
            effectiveTo: adjustment.endDate,
            isActive: true,
            createdAt: adjustment.createdAt,
            updatedAt: adjustment.updatedAt
          });
          continue;
        }

        const adjustmentComponent = this.createAdjustmentComponent(adjustment, payrollRun);
        result.components.earnings.push(adjustmentComponent);
      }

      // 4. Calculate gross pay
      result.totals.grossPay = result.components.earnings.reduce((sum, comp) => sum + comp.amount, 0);

      // 4. Apply deductions (pre-tax)
      const preTaxDeductions = await this.getPreTaxDeductions(employee.employeeId, payrollRun);
      for (const deduction of preTaxDeductions) {
        const deductionAmount = this.calculateDeductionAmount(deduction, result.totals.grossPay);
        result.components.deductions.push({
          ...deduction,
          amount: deductionAmount
        });
      }

      // 5. Calculate taxable income
      const preTaxDeductionsTotal = result.components.deductions
        .filter(d => d.deductionType === 'PreTax')
        .reduce((sum, d) => sum + d.amount, 0);
      
      result.totals.taxableIncome = result.totals.grossPay - preTaxDeductionsTotal;

      // 6. Calculate tax
      const taxAmount = await this.calculateTaxWithholding(employee, result.totals.taxableIncome, payrollRun);
      result.totals.taxWithheld = taxAmount;

      // 7. Calculate superannuation (on OTE - Ordinary Time Earnings)
      // In a real scenario, this would filter out non-OTE components like overtime
      const superContribution = await this.calculateSuperannuation(employee, result.totals.grossPay);
      if (superContribution > 0) {
        result.components.superContributions.push({
          id: crypto.randomUUID(),
          employeeId: employee.employeeId,
          fundId: employee.superFundId || '',
          contributionType: 'SuperGuarantee',
          amount: superContribution,
          periodStart: payrollRun.payPeriodStart,
          periodEnd: payrollRun.payPeriodEnd,
          paymentDate: payrollRun.paymentDate,
          isPaid: false,
          createdAt: new Date().toISOString()
        });
      }

      // 8. Apply post-tax deductions
      const postTaxDeductions = await this.getPostTaxDeductions(employee.employeeId, payrollRun);
      for (const deduction of postTaxDeductions) {
        const deductionAmount = this.calculateDeductionAmount(deduction, result.totals.taxableIncome - result.totals.taxWithheld);
        result.components.deductions.push({
          ...deduction,
          amount: deductionAmount
        });
      }

      // 9. Calculate final totals
      const postTaxDeductionsTotal = result.components.deductions
        .filter(d => d.deductionType === 'PostTax')
        .reduce((sum, d) => sum + d.amount, 0);

      result.totals.totalDeductions = preTaxDeductionsTotal + postTaxDeductionsTotal;
      result.totals.netPay = result.totals.taxableIncome - result.totals.taxWithheld - postTaxDeductionsTotal;
      result.totals.superContributions = result.components.superContributions.reduce((sum, s) => sum + s.amount, 0);

      // 10. Validation
      await this.validateCalculation(result, employee);

      return result;
    } catch (error) {
      result.validationErrors.push(`Error calculating payroll: ${error.message}`);
      return result;
    }
  },

  calculateBaseSalary(employee: PayrollEmployee, payrollRun: PayrollRun, overrideUnits?: number): PayComponent {
    const payPeriodsPerYear = this.getPayPeriodsPerYear(employee.payFrequency);
    const amount = Number(employee.baseSalary || 0) / payPeriodsPerYear;
    
    // Determine units: use override units (from timesheet) or standard hours for frequency
    let units = overrideUnits && overrideUnits > 0 ? overrideUnits : 1;
    if (units === 1) {
       // Optional: Set default standard hours if units is 1 and no override provided
       if (employee.payFrequency === 'Weekly') units = 38;
       else if (employee.payFrequency === 'Fortnightly') units = 76;
       else if (employee.payFrequency === 'Monthly') units = 164.67;
    }

    return {
      id: crypto.randomUUID(),
      payslipId: '',
      componentType: 'BaseSalary',
      description: 'Base Salary (Period)',
      units: units,
      rate: amount / units,
      amount: amount,
      taxTreatment: 'Taxable',
      stpCategory: 'SAW',
      isYtd: false,
      createdAt: new Date().toISOString()
    };
  },

  async getSalaryAdjustments(employeeId: string, payrollRun: PayrollRun): Promise<SalaryAdjustment[]> {
    try {
      const { data, error } = await supabase
        .from('salary_adjustments')
        .select('*')
        .eq('employee_id', employeeId)
        .in('status', ['Approved', 'Processed'])
        .lte('effective_date', payrollRun.payPeriodEnd)
        .or(`end_date.is.null,end_date.gte.${payrollRun.payPeriodStart}`);

      if (error) throw error;
      return (data || []).map((row: any) => this.mapSalaryAdjustmentFromDb(row));
    } catch (error) {
      console.error('Error fetching salary adjustments:', error);
      return [];
    }
  },

  createAdjustmentComponent(adjustment: SalaryAdjustment, payrollRun: PayrollRun): PayComponent {
    const componentType =
      adjustment.adjustmentType === 'Bonus'
        ? 'Bonus'
        : adjustment.adjustmentType === 'Allowance'
          ? 'Allowance'
          : 'BaseSalary';

    return {
      id: crypto.randomUUID(),
      payslipId: '',
      componentType,
      description: `Salary Adjustment - ${adjustment.adjustmentReason}`,
      units: 1,
      rate: adjustment.amount,
      amount: adjustment.amount,
      taxTreatment: 'Taxable',
      stpCategory: this.getSTPCategoryForAdjustment(adjustment.adjustmentType),
      isYtd: false,
      createdAt: new Date().toISOString()
    };
  },

  mapSalaryAdjustmentFromDb(row: any): SalaryAdjustment {
    return {
      id: row.id,
      employeeId: row.employee_id,
      adjustmentType: row.adjustment_type,
      amount: Number(row.amount || 0),
      adjustmentReason: row.adjustment_reason,
      effectiveDate: row.effective_date,
      endDate: row.end_date || undefined,
      isPermanent: Boolean(row.is_permanent),
      isProcessed: Boolean(row.is_processed),
      status: row.status,
      requestedBy: row.requested_by,
      approvedBy: row.approved_by || undefined,
      approvedAt: row.approved_at || undefined,
      rejectionReason: row.rejection_reason || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  },

  mapDeductionFromDb(row: any): Deduction {
    return {
      id: row.id,
      employeeId: row.employee_id,
      deductionType: row.deduction_type,
      category: row.category,
      description: row.description,
      amount: Number(row.amount || 0),
      isFixed: Boolean(row.is_fixed),
      isPercentage: Boolean(row.is_percentage),
      percentage: row.percentage != null ? Number(row.percentage) : undefined,
      priority: Number(row.priority || 100),
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to || undefined,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  },

  async calculateTaxWithholding(employee: PayrollEmployee, taxableIncome: number, payrollRun: PayrollRun): Promise<number> {
    try {
      const payPeriodsPerYear = this.getPayPeriodsPerYear(employee.payFrequency);
      const annualTaxableIncome = taxableIncome * payPeriodsPerYear;
      const periodDate = new Date(payrollRun.payPeriodStart);
      
      // Try to get actual tax tables from statutory service
      const taxRates = await statutoryTablesService.getStatutoryRates('payg-withholding', periodDate);
      
      if (taxRates && taxRates.length > 0) {
        // Sort rates by threshold
        const sortedRates = [...taxRates].sort((a, b) => (a.threshold || 0) - (b.threshold || 0));
        
        let totalAnnualTax = 0;
        for (let i = 0; i < sortedRates.length; i++) {
          const currentRate = sortedRates[i];
          const nextRate = sortedRates[i + 1];
          const threshold = currentRate.threshold || 0;
          const nextThreshold = nextRate ? nextRate.threshold : Infinity;
          
          if (annualTaxableIncome > threshold) {
            const taxableInThisBracket = Math.min(annualTaxableIncome - threshold, (nextThreshold as number) - threshold);
            totalAnnualTax += taxableInThisBracket * (currentRate.rate / 100);
          }
        }
        
        // Add Medicare Levy (2%)
        if (annualTaxableIncome > 26000) { // Simple threshold for Medicare Levy
           totalAnnualTax += annualTaxableIncome * 0.02;
        }

        return totalAnnualTax / payPeriodsPerYear;
      }

      // Fallback with Stage 3 Tax Rates (2024-25 and 2025-26)
      let totalAnnualTax = 0;
      if (annualTaxableIncome <= 18200) {
        totalAnnualTax = 0;
      } else if (annualTaxableIncome <= 45000) {
        totalAnnualTax = (annualTaxableIncome - 18200) * 0.16;
      } else if (annualTaxableIncome <= 135000) {
        totalAnnualTax = 4288 + (annualTaxableIncome - 45000) * 0.30;
      } else if (annualTaxableIncome <= 190000) {
        totalAnnualTax = 31288 + (annualTaxableIncome - 135000) * 0.37;
      } else {
        totalAnnualTax = 51638 + (annualTaxableIncome - 190000) * 0.45;
      }

      // Add Medicare Levy (2%) - Sample result $1,868 matches approx Stage 3 + 2% Medicare
      if (annualTaxableIncome > 26000) {
        totalAnnualTax += annualTaxableIncome * 0.02;
      }

      return totalAnnualTax / payPeriodsPerYear;
    } catch (error) {
      console.error('Error calculating tax withholding:', error);
      return 0;
    }
  },

  async calculateSuperannuation(employee: PayrollEmployee, grossPay: number): Promise<number> {
    try {
      // Get current superannuation guarantee rate from statutory service
      const rates = await statutoryTablesService.getStatutoryRates('superannuation-guarantee', new Date());
      let superRate = (rates && rates.length > 0) ? (rates[0].rate / 100) : 0.115;
      
      // Fallback/Override based on sample date (Feb 2026 is in 2025-26 FY where SG rate is 12%)
      const now = new Date();
      if (now >= new Date('2025-07-01')) {
        superRate = Math.max(superRate, 0.12);
      }
      
      return grossPay * superRate;
    } catch (error) {
      console.error('Error calculating superannuation:', error);
      const now = new Date();
      return grossPay * (now >= new Date('2025-07-01') ? 0.12 : 0.115);
    }
  },

  async logPayrollError(
    payrollRunId: string,
    employeeId: string,
    errorType: 'Validation' | 'Calculation' | 'Data' | 'System' | 'Compliance',
    errorCode: string,
    message: string,
    details: any = {}
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('payroll_errors')
        .insert({
          payroll_run_id: payrollRunId,
          employee_id: employeeId,
          error_type: errorType,
          error_code: errorCode,
          message,
          details,
          severity: this.getSeverityFromType(errorType),
          status: 'Open'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error logging payroll error:', err);
    }
  },

  getSeverityFromType(type: string): 'Low' | 'Medium' | 'High' | 'Critical' {
    switch (type) {
      case 'System': return 'Critical';
      case 'Calculation': return 'High';
      case 'Compliance': return 'High';
      case 'Validation': return 'Medium';
      case 'Data': return 'Medium';
      default: return 'Low';
    }
  },

  getFinancialYear(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    if (month >= 6) { // July or later
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  },

  getTaxTable(residencyStatus: string, payFrequency: string): TaxTable | null {
    // Default tax table for demonstration - updated with 2024-25 Stage 3 tax rates
    return {
      id: 'default',
      financialYear: '2024-25',
      taxScale: 'Resident',
      residencyStatus: residencyStatus as 'Resident' | 'NonResident' | 'WorkingHoliday',
      payFrequency: payFrequency as 'Weekly' | 'Fortnightly' | 'Monthly',
      incomeThresholds: [
        { from: 0, to: 18200, baseTax: 0, taxRate: 0 },
        { from: 18201, to: 45000, baseTax: 0, taxRate: 16 },
        { from: 45001, to: 135000, baseTax: 4288, taxRate: 30 },
        { from: 135001, to: 190000, baseTax: 31288, taxRate: 37 },
        { from: 190001, to: Infinity, baseTax: 51638, taxRate: 45 }
      ],
      effectiveFrom: '2024-07-01',
      effectiveTo: '2025-06-30',
      isActive: true
    };
  },

  async getPreTaxDeductions(employeeId: string, payrollRun: PayrollRun): Promise<Deduction[]> {
    try {
      const { data, error } = await supabase
        .from('deductions')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('deduction_type', 'PreTax')
        .eq('is_active', true)
        .lte('effective_from', payrollRun.payPeriodEnd)
        .or(`effective_to.is.null,effective_to.gte.${payrollRun.payPeriodStart}`)
        .order('priority', { ascending: true });

      if (error) throw error;
      return (data || []).map((row: any) => this.mapDeductionFromDb(row));
    } catch (error) {
      console.error('Error fetching pre-tax deductions:', error);
      return [];
    }
  },

  async getPostTaxDeductions(employeeId: string, payrollRun: PayrollRun): Promise<Deduction[]> {
    try {
      const { data, error } = await supabase
        .from('deductions')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('deduction_type', 'PostTax')
        .eq('is_active', true)
        .lte('effective_from', payrollRun.payPeriodEnd)
        .or(`effective_to.is.null,effective_to.gte.${payrollRun.payPeriodStart}`)
        .order('priority', { ascending: true });

      if (error) throw error;
      return (data || []).map((row: any) => this.mapDeductionFromDb(row));
    } catch (error) {
      console.error('Error fetching post-tax deductions:', error);
      return [];
    }
  },

  calculateDeductionAmount(deduction: Deduction, baseAmount: number): number {
    if (deduction.isPercentage && deduction.percentage) {
      return baseAmount * (deduction.percentage / 100);
    }
    return deduction.amount;
  },

  getPayPeriodsPerYear(frequency: string): number {
    switch (frequency) {
      case 'Weekly': return 52;
      case 'Fortnightly': return 26;
      case 'Monthly': return 12;
      default: return 26;
    }
  },

  getSTPCategoryForAdjustment(type: string): string {
    switch (type) {
      case 'Bonus': return 'BON';
      case 'Allowance': return 'ALW';
      default: return 'SAW';
    }
  },

  validateCalculation(result: PayrollCalculationResult, employee: PayrollEmployee): void {
    // Validate minimum wage
    if (result.totals.grossPay < 0) {
      result.validationErrors.push('Gross pay cannot be negative');
    }

    // Validate tax calculation
    if (result.totals.taxWithheld < 0) {
      result.validationErrors.push('Tax withheld cannot be negative');
    }

    // Validate net pay
    if (result.totals.netPay < 0) {
      result.validationErrors.push('Net pay cannot be negative');
    }

    // Validate superannuation
    const minSuper = result.totals.grossPay * 0.115; // Minimum 11.5%
    if (result.totals.superContributions < minSuper) {
      result.warnings.push('Superannuation contributions below minimum guarantee rate');
    }
  },

  // Helper methods
  async getPayrollRun(payrollRunId: string): Promise<PayrollRun | null> {
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('id', payrollRunId)
      .single();
    
    if (error) {
      console.error('Error fetching payroll run:', error);
      return null;
    }
    
    return this.mapPayrollRunFromDb(data);
  },

  async getEmployeesForPayroll(payrollRun: PayrollRun, selectedEmployeeIds?: string[]): Promise<PayrollEmployee[]> {
    // In a real scenario, we might filter by pay frequency matching the run
    // For now, we'll fetch all active payroll employees
    let query = supabase
      .from('payroll_employees')
      .select(`
        *,
        employees:employee_id (
          first_name,
          last_name,
          salary,
          pay_cycle,
          employment_status
        )
      `)
      .eq('is_active', true)
      .eq('pay_frequency', payrollRun.payFrequency);

    if (selectedEmployeeIds && selectedEmployeeIds.length > 0) {
      query = query.in('id', selectedEmployeeIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching employees for payroll:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('No employees found in database matching criteria:', {
        payFrequency: payrollRun.payFrequency,
        selectedEmployeeIds,
        activeOnly: true
      });
    }

    return data.map(item => this.mapPayrollEmployeeFromDb(item));
  },

  async createPayslipFromCalculation(result: PayrollCalculationResult, payrollRunId: string): Promise<void> {
    try {
      // 1. Create Payslip
      const { data: runRow } = await supabase
        .from('payroll_runs')
        .select('pay_frequency, payment_date, status')
        .eq('id', payrollRunId)
        .maybeSingle();

      const allowancesTotal = result.components.earnings
        .filter((c) => c.componentType === 'Allowance')
        .reduce((sum, c) => sum + Number(c.amount || 0), 0);

      const overtimeTotal = result.components.earnings
        .filter((c) => c.componentType === 'Overtime')
        .reduce((sum, c) => sum + Number(c.amount || 0), 0);

      const hoursWorked = result.components.earnings.reduce((sum, c) => sum + Number(c.units || 0), 0);

      const paymentDate = runRow?.payment_date || new Date().toISOString().split('T')[0];
      const payFrequency = runRow?.pay_frequency || 'Monthly';
      const payslipStatus = runRow?.status === 'Paid' ? 'Paid' : 'Draft';

      const { data: payslip, error: payslipError } = await supabase
        .from('payslips')
        .insert({
          payroll_run_id: payrollRunId,
          employee_id: result.employeeId,
          payslip_number: `PS-${Date.now()}-${result.employeeId.slice(0, 4)}`, // Simple generation
          period_start: result.periodStart,
          period_end: result.periodEnd,
          payment_date: paymentDate,
          gross_pay: result.totals.grossPay,
          allowances: allowancesTotal,
          overtime: overtimeTotal,
          taxable_income: result.totals.taxableIncome,
          tax_withheld: result.totals.taxWithheld,
          payg_tax: result.totals.taxWithheld,
          superannuation: result.totals.superContributions,
          net_pay: result.totals.netPay,
          pay_frequency: payFrequency,
          hours_worked: hoursWorked,
          status: payslipStatus
        })
        .select()
        .single();

      if (payslipError) throw payslipError;

      await auditService.logAction('payslips', payslip.id, 'INSERT', null, {
        payroll_run_id: payrollRunId,
        employee_id: result.employeeId,
        period_start: result.periodStart,
        period_end: result.periodEnd,
        payment_date: paymentDate,
        gross_pay: result.totals.grossPay,
        tax_withheld: result.totals.taxWithheld,
        net_pay: result.totals.netPay,
      });

      const year = new Date(paymentDate).getFullYear();
      const yearStart = `${year}-01-01`;
      const { data: ytdRows } = await supabase
        .from('payslips')
        .select('gross_pay, tax_withheld, payg_tax, superannuation')
        .eq('employee_id', result.employeeId)
        .gte('payment_date', yearStart)
        .lte('payment_date', paymentDate);

      const ytd = ((ytdRows as any[]) || []).reduce(
        (acc, r) => ({
          gross: acc.gross + Number(r.gross_pay || 0),
          tax: acc.tax + Number(r.tax_withheld ?? r.payg_tax ?? 0),
          super: acc.super + Number(r.superannuation || 0),
        }),
        { gross: 0, tax: 0, super: 0 }
      );

      await supabase
        .from('payslips')
        .update({ ytd_gross: ytd.gross, ytd_tax: ytd.tax, ytd_super: ytd.super })
        .eq('id', payslip.id);

      // 2. Create Pay Components
      if (result.components.earnings.length > 0) {
        const componentsToInsert = result.components.earnings.map(comp => ({
          payslip_id: payslip.id,
          component_type: comp.componentType,
          description: comp.description,
          units: comp.units,
          rate: comp.rate,
          amount: comp.amount,
          tax_treatment: comp.taxTreatment,
          stp_category: comp.stpCategory,
          is_ytd: comp.isYtd
        }));

        const { error: componentsError } = await supabase
          .from('pay_components')
          .insert(componentsToInsert);

        if (componentsError) throw componentsError;
      }

      // 3. Create Super Contributions
      if (result.components.superContributions.length > 0) {
        const superToInsert = result.components.superContributions.map(cont => ({
          employee_id: result.employeeId,
          fund_id: cont.fundId || null, // Handle optional fund
          payslip_id: payslip.id,
          contribution_type: cont.contributionType,
          amount: cont.amount,
          period_start: cont.periodStart,
          period_end: cont.periodEnd,
          payment_date: cont.paymentDate,
          is_paid: false
        }));

        const { error: superError } = await supabase
          .from('superannuation_contributions')
          .insert(superToInsert);

        if (superError) throw superError;
      }

      // 4. Create Deductions (Deduction Applications)
      if (result.components.deductions.length > 0) {
         // Assuming we have a deduction_applications table or similar, 
         // but based on schema provided, we have 'deduction_applications' table.
         // However, the result.components.deductions contains Deduction objects (definitions),
         // we need to map them to applications.
         
         const applicationsToInsert = result.components.deductions.map(ded => ({
           payslip_id: payslip.id,
           deduction_id: ded.id,
           amount: ded.amount
         }));

         const { error: dedError } = await supabase
           .from('deduction_applications')
           .insert(applicationsToInsert);

         if (dedError) throw dedError;
      }

    } catch (error) {
      console.error('Error creating payslip records:', formatProcessingError(error));
      const wrapped = error instanceof Error ? error : new Error(formatProcessingError(error));
      throw wrapped;
    }
  },

  async updatePayrollRunTotals(payrollRunId: string, results: PayrollCalculationResult[]): Promise<void> {
    const totals = {
      total_gross_pay: results.reduce((sum, r) => sum + r.totals.grossPay, 0),
      total_tax: results.reduce((sum, r) => sum + r.totals.taxWithheld, 0),
      total_net_pay: results.reduce((sum, r) => sum + r.totals.netPay, 0),
      total_super: results.reduce((sum, r) => sum + r.totals.superContributions, 0),
      employee_count: results.length,
      processed_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('payroll_runs')
      .update(totals)
      .eq('id', payrollRunId);

    if (error) {
      console.error('Error updating payroll run totals:', error);
      throw error;
    }
  },

  async updatePayrollRunStatus(payrollRunId: string, status: string, updatedBy: string): Promise<void> {
    const { error } = await supabase
      .from('payroll_runs')
      .update({ 
        status,
        processed_by: updatedBy 
      })
      .eq('id', payrollRunId);

    if (error) {
      console.error('Error updating payroll run status:', error);
      throw error;
    }
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

  mapPayrollEmployeeFromDb(data: any): PayrollEmployee {
    return {
      id: data.id,
      employeeId: data.employee_id,
      firstName: data.employees?.first_name,
      lastName: data.employees?.last_name,
      baseSalary: Number(data.base_salary || data.employees?.salary) || 0,
      hourlyRate: Number(data.hourly_rate || data.employees?.hourly_rate) || 0,
      payFrequency: data.pay_frequency || data.employees?.pay_cycle || 'Monthly',
      taxFileNumber: data.tax_file_number,
      taxScale: data.tax_scale,
      residencyStatus: data.residency_status,
      employmentType: data.employment_type || data.employees?.employment_type || 'FullTime',
      superFundId: data.super_fund_id || data.employees?.super_fund_id,
      superMemberNumber: data.super_member_number,
      awardClassification: data.award_classification,
      isSalarySacrifice: data.is_salary_sacrifice,
      effectiveFrom: data.effective_from,
      effectiveTo: data.effective_to,
      companyId: data.company_id || '',
      industryCode: data.industry_code,
      state: data.state,
      hasHELPDebt: data.has_help_debt,
      hasSFSSDebt: data.has_sfss_debt,
      hasPrivateHealthInsurance: data.has_private_health_insurance,
      isExemptFromPayrollTax: data.is_exempt_from_payroll_tax,
      jobClassification: data.job_classification
    };
  },

  async processTimesheetData(employee: PayrollEmployee, payrollRun: PayrollRun): Promise<{
    earnings: PayComponent[];
    superContributions: SuperannuationContribution[];
  }> {
    const earnings: PayComponent[] = [];
    const superContributions: SuperannuationContribution[] = [];

    try {
      // 1. Get approved timesheets to verify the period is approved
      const timesheets = await this.getTimesheetsForPeriod(employee.employeeId, payrollRun.payPeriodStart, payrollRun.payPeriodEnd);
      
      if (timesheets.length === 0) {
        // Fallback to attendance if no approved timesheet found - this prevents 0 pay for worked hours
        await this.logPayrollError(
          payrollRun.id,
          employee.employeeId,
          'Validation',
          'MISSING_APPROVED_TIMESHEET',
          'No approved timesheets found for the period, falling back to attendance records.',
          { periodStart: payrollRun.payPeriodStart, periodEnd: payrollRun.payPeriodEnd }
        );
      }

      // 2. Fetch detailed attendance records for the period to calculate penalty rates
      const attendanceRecords = await attendanceService.getAll(
        payrollRun.payPeriodStart,
        payrollRun.payPeriodEnd,
        employee.employeeId
      );

      if (attendanceRecords.length === 0 && timesheets.length === 0) {
        return { earnings, superContributions };
      }

      // 3. Map AttendanceRecord to TimesheetEntry for the award engine
      const baseHourlyRate = await this.getHourlyRate(employee);
      const timesheetEntries: PayrollTimesheetEntry[] = attendanceRecords
        .filter(record => record.clockIn && record.clockOut)
        .map(record => ({
          id: record.id,
          employeeId: employee.employeeId,
          startTime: record.clockIn,
          endTime: record.clockOut!,
          hourlyRate: baseHourlyRate,
          isBillable: true,
          status: 'Approved',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

      // 4. Use AwardInterpretationEngine if employee has an award
      if (employee.awardId) {
        const interpretationResult = await awardInterpretationEngine.interpretTimesheet(
          employee.employeeId,
          timesheetEntries,
          employee.awardId,
          employee.awardClassification || 'Level 1',
          employee.employmentType.toLowerCase()
        );

        // Map interpretation results to PayComponents
        // Penalty Rates
        interpretationResult.penaltyRates.forEach(penalty => {
          earnings.push({
            id: crypto.randomUUID(),
            payslipId: '',
            componentType: 'Allowance',
            description: penalty.description,
            units: penalty.applicableHours,
            rate: penalty.penaltyRate,
            amount: penalty.amount,
            taxTreatment: 'Taxable',
            stpCategory: 'ALW',
            isYtd: false,
            createdAt: new Date().toISOString()
          });
        });

        // Overtime
        interpretationResult.overtime.forEach(ot => {
          earnings.push({
            id: crypto.randomUUID(),
            payslipId: '',
            componentType: 'Overtime',
            description: `Overtime (${ot.type})`,
            units: ot.hours,
            rate: ot.rate,
            amount: ot.amount,
            taxTreatment: 'Taxable',
            stpCategory: 'OVT',
            isYtd: false,
            createdAt: new Date().toISOString()
          });
        });

        // Allowances
        interpretationResult.allowances.forEach(allowance => {
          earnings.push({
            id: crypto.randomUUID(),
            payslipId: '',
            componentType: 'Allowance',
            description: allowance.description,
            units: allowance.applicableHours,
            rate: allowance.amount / (allowance.applicableHours || 1),
            amount: allowance.amount,
            taxTreatment: allowance.taxTreatment === 'taxable' ? 'Taxable' : 'NonTaxable',
            stpCategory: 'ALW',
            isYtd: false,
            createdAt: new Date().toISOString()
          });
        });

        // Base Pay (for hours covered by interpretation)
        const totalInterpretedHours = timesheetEntries.reduce((sum, entry) => {
          const start = new Date(entry.startTime);
          const end = new Date(entry.endTime);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }, 0);

        if (totalInterpretedHours > 0) {
          earnings.push({
            id: crypto.randomUUID(),
            payslipId: '',
            componentType: 'BaseSalary',
            description: 'Ordinary Hours',
            units: totalInterpretedHours,
            rate: baseHourlyRate,
            amount: totalInterpretedHours * baseHourlyRate,
            taxTreatment: 'Taxable',
            stpCategory: 'SAW',
            isYtd: false,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        // Fallback to simple calculation if no award
        let totalHours = 0;

        for (const record of attendanceRecords) {
          if (!record.clockIn || !record.clockOut) continue;
          
          const start = new Date(record.clockIn);
          const end = new Date(record.clockOut);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          
          if (hours > 0) {
            totalHours += hours;
            earnings.push({
              id: crypto.randomUUID(),
              payslipId: '',
              componentType: 'BaseSalary',
              description: `Hours Worked - ${record.date}`,
              units: hours,
              rate: baseHourlyRate,
              amount: hours * baseHourlyRate,
              taxTreatment: 'Taxable',
              stpCategory: 'SAW',
              isYtd: false,
              createdAt: new Date().toISOString()
            });
          }
        }

        // If no attendance records found but timesheets exist (e.g. manual entry), fallback to timesheet total
        if (totalHours === 0 && timesheets.length > 0) {
          timesheets.forEach(ts => {
            const { regularHours, overtimeHours } = this.calculateHoursFromTimesheet(ts, payrollRun.payPeriodStart, payrollRun.payPeriodEnd);
            if (regularHours > 0) {
              earnings.push({
                id: crypto.randomUUID(),
                payslipId: '',
                componentType: 'BaseSalary',
                description: `Regular Hours (Timesheet ${ts.weekStartDate})`,
                units: regularHours,
                rate: baseHourlyRate,
                amount: regularHours * baseHourlyRate,
                taxTreatment: 'Taxable',
                stpCategory: 'SAW',
                isYtd: false,
                createdAt: new Date().toISOString()
              });
            }
            if (overtimeHours > 0) {
              earnings.push({
                id: crypto.randomUUID(),
                payslipId: '',
                componentType: 'Overtime',
                description: `Overtime (Timesheet ${ts.weekStartDate})`,
                units: overtimeHours,
                rate: baseHourlyRate * 1.5, // Simple 1.5x assumption
                amount: overtimeHours * baseHourlyRate * 1.5,
                taxTreatment: 'Taxable',
                stpCategory: 'OVT',
                isYtd: false,
                createdAt: new Date().toISOString()
              });
            }
          });
        }
      }

      return { earnings, superContributions };
    } catch (error) {
      console.error('Error processing timesheet data:', error);
      throw error;
    }
  },

  async getTimesheetsForPeriod(employeeId: string, periodStart: string, periodEnd: string): Promise<Timesheet[]> {
    const timesheets: Timesheet[] = [];
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    
    // Get timesheets for each week in the period
    let currentWeekStart = new Date(startDate);
    const day = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart.setDate(diff);
    
    while (currentWeekStart <= endDate) {
      const weekStartStr = currentWeekStart.toISOString().split('T')[0];
      const timesheet = await timesheetService.getByWeek(employeeId, weekStartStr);
      
      if (timesheet && timesheet.status === 'Approved') {
        timesheets.push(timesheet);
      }
      
      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return timesheets;
  },

  calculateHoursFromTimesheet(timesheet: Timesheet, periodStart?: string, periodEnd?: string): { regularHours: number; overtimeHours: number; totalHours: number } {
    let totalHours = 0;
    const start = typeof periodStart === 'string' ? periodStart.slice(0, 10) : '';
    const end = typeof periodEnd === 'string' ? periodEnd.slice(0, 10) : '';
    
    timesheet.rows?.forEach((row: any) => {
      row.entries?.forEach((entry: any) => {
        const date = String(entry?.date || '').slice(0, 10);
        if (start && end && date) {
          if (date < start || date > end) return;
        }
        totalHours += entry?.hours || 0;
      });
    });
    
    // Standard 38-hour work week (Australia)
    const regularHours = Math.min(totalHours, 38);
    const overtimeHours = Math.max(0, totalHours - 38);
    
    return { regularHours, overtimeHours, totalHours };
  },

  async getHourlyRate(employee: PayrollEmployee): Promise<number> {
    // 1. Priortize the explicit hourly rate if set and valid (> $10/h as a sanity check)
    if (employee.hourlyRate && employee.hourlyRate > 10) {
      return Number(employee.hourlyRate);
    }
    
    // 2. If no hourly rate, convert annual salary
    // Australian Standard for Weekly/Salaried: (Annual / 52) / 38
    if (employee.baseSalary && employee.baseSalary > 0) {
      const weeklySalary = Number(employee.baseSalary) / 52;
      const hourlyRateFromSalary = weeklySalary / 38;
      
      // Ensure we don't return an illegally low rate compared to minimum wage (approx $23)
      // but only if the salary was clearly meant to be a full annual salary
      if (employee.baseSalary > 20000) {
         return Math.max(hourlyRateFromSalary, 23.23);
      }
      return hourlyRateFromSalary;
    }
    
    // 3. Fallback to current Australian minimum wage
    return 23.23;
  },

  async applyAwardInterpretations(employee: PayrollEmployee, timesheet: Timesheet, baseHourlyRate: number): Promise<{
    earnings: PayComponent[];
    superContributions: SuperannuationContribution[];
  }> {
    const earnings: PayComponent[] = [];
    const superContributions: SuperannuationContribution[] = [];
    
    try {
      // This would integrate with the award interpretation engine
      // For now, implement basic penalty rate calculations
      
      timesheet.rows?.forEach((row: any) => {
         row.entries?.forEach((entry: any) => {
           const entryDate = new Date(entry.date);
           const dayOfWeek = entryDate.getDay();
          
          // Weekend penalty rates (Saturday and Sunday)
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            const penaltyRate = dayOfWeek === 0 ? 2.0 : 1.5; // Sunday 200%, Saturday 150%
            const penaltyAmount = (entry.hours * baseHourlyRate * penaltyRate) - (entry.hours * baseHourlyRate);
            
            if (penaltyAmount > 0) {
              earnings.push({
                id: crypto.randomUUID(),
                payslipId: '',
                componentType: 'Allowance',
                description: `${dayOfWeek === 0 ? 'Sunday' : 'Saturday'} Penalty Rate`,
                units: entry.hours,
                rate: baseHourlyRate * (penaltyRate - 1),
                amount: penaltyAmount,
                taxTreatment: 'Taxable',
                stpCategory: 'ALW',
                isYtd: false,
                createdAt: new Date().toISOString()
              });
            }
          }
          
          // Public holiday penalty (would need to check against public holidays table)
          // This is a simplified implementation
        });
      });
      
      return { earnings, superContributions };
    } catch (error) {
      console.error('Error applying award interpretations:', error);
      return { earnings, superContributions };
    }
  },

  calculateMinimumWage(hours: number, weekStartDate: string): number {
    // Australian minimum wage as of 2024: $23.23 per hour
    const minimumHourlyRate = 23.23;
    return hours * minimumHourlyRate;
  }
};
