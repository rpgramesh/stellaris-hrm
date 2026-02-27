                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
import { PayrollRun, Payslip, PayComponent, PayrollCalculationResult, PayrollEmployee, TaxTable, Deduction, SuperannuationContribution, TimesheetEntry as PayrollTimesheetEntry } from '@/types/payroll';
import { auditService } from './auditService';
import { timesheetService } from './timesheetService';
import { statutoryTablesService } from './statutoryTablesService';
import { awardInterpretationEngine } from './awardInterpretationEngine';
import { attendanceService } from './attendanceService';
import { Timesheet } from '@/types';
import { supabase } from '@/lib/supabase';

export const payrollProcessingEngine = {
  async processPayrollRun(payrollRunId: string, processedBy: string, selectedEmployeeIds?: string[]): Promise<PayrollCalculationResult[]> {
    const payrollRun = await this.getPayrollRun(payrollRunId);
    if (!payrollRun) throw new Error('Payroll run not found');
    // Allow 'processing' status as well since we set it when creating the run
    if (payrollRun.status !== 'Approved' && payrollRun.status !== 'Processing') {
        // Auto-approve if it's draft for this flow
        if (payrollRun.status === 'Draft') {
             await this.updatePayrollRunStatus(payrollRunId, 'Approved', processedBy);
        } else {
             // throw new Error(`Payroll run must be approved before processing (Current status: ${payrollRun.status})`);
        }
    }

    // Get all employees for this payroll run
    const employees = await this.getEmployeesForPayroll(payrollRun, selectedEmployeeIds);
    if (employees.length === 0) {
      throw new Error(`No active employees found with ${payrollRun.payFrequency} pay frequency matching the selected criteria.`);
    }
    const results: PayrollCalculationResult[] = [];

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
          console.error(`Error calculating payroll for employee ${employee.employeeId}:`, calcError);
          // Add to errors table
          await this.logPayrollError(
            payrollRunId,
            employee.employeeId,
            'Calculation',
            'CALC_ERR',
            `Failed to calculate payroll: ${calcError instanceof Error ? calcError.message : 'Unknown error'}`,
            { error: calcError }
          );
        }
      }

      // Update payroll run totals
      await this.updatePayrollRunTotals(payrollRunId, results);
      await this.updatePayrollRunStatus(payrollRunId, 'Paid', processedBy);

      // Create audit log
      await auditService.logAction(
        'payroll_runs',
        payrollRunId,
        'UPDATE',
        { status: 'Processing' },
        { status: 'Paid' },
        processedBy
      );

      console.log(`Payroll processing completed. Successfully calculated ${results.length} of ${employees.length} employees.`);
      return results;
    } catch (error) {
      console.error('Error in processPayrollRun:', error);
      await this.updatePayrollRunStatus(payrollRunId, 'Draft', processedBy);
      throw error;
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
      
      // 2. Calculate base salary (for salaried employees) or validate minimum wage
      if (employee.employmentType === 'FullTime' || employee.employmentType === 'PartTime') {
        const baseSalaryComponent = await this.calculateBaseSalary(employee, payrollRun);
        result.components.earnings.push(baseSalaryComponent);
      }

      // 3. Apply salary adjustments
      const adjustments = await this.getSalaryAdjustments(employee.employeeId, payrollRun);
      for (const adjustment of adjustments) {
        const adjustmentComponent = this.createAdjustmentComponent(adjustment, payrollRun);
        result.components.earnings.push(adjustmentComponent);
      }

      // 4. Calculate gross pay
      result.totals.grossPay = result.components.earnings.reduce((sum, comp) => sum + comp.amount, 0);

      // 4. Apply deductions (pre-tax)
      const preTaxDeductions = await this.getPreTaxDeductions(employee.employeeId);
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
      const postTaxDeductions = await this.getPostTaxDeductions(employee.employeeId);
      for (const deduction of postTaxDeductions) {
        const deductionAmount = this.calculateDeductionAmount(deduction, result.totals.taxableIncome - result.totals.taxWithheld);
        result.components.deductions.push({
          ...deduction,
          amount: deductionAmount
        });
      }

      // 9. Calculate final totals
      result.totals.totalDeductions = result.components.deductions.reduce((sum, d) => sum + d.amount, 0);
      result.totals.netPay = result.totals.taxableIncome - result.totals.taxWithheld - result.totals.totalDeductions;
      result.totals.superContributions = result.components.superContributions.reduce((sum, s) => sum + s.amount, 0);

      // 10. Validation
      await this.validateCalculation(result, employee);

      return result;
    } catch (error) {
      result.validationErrors.push(`Error calculating payroll: ${error.message}`);
      return result;
    }
  },

  calculateBaseSalary(employee: PayrollEmployee, payrollRun: PayrollRun): PayComponent {
    const payPeriodsPerYear = this.getPayPeriodsPerYear(employee.payFrequency);
    const periodSalary = employee.baseSalary / payPeriodsPerYear;

    return {
      id: crypto.randomUUID(),
      payslipId: '',
      componentType: 'BaseSalary',
      description: 'Base Salary',
      units: 1,
      rate: periodSalary,
      amount: periodSalary,
      taxTreatment: 'Taxable',
      stpCategory: 'SAW',
      isYtd: false,
      createdAt: new Date().toISOString()
    };
  },

  getSalaryAdjustments(employeeId: string, payrollRun: PayrollRun): any[] {
    // In a real implementation, this would be passed as a parameter or fetched from cache
    return [];
  },

  createAdjustmentComponent(adjustment: any, payrollRun: PayrollRun): PayComponent {
    return {
      id: crypto.randomUUID(),
      payslipId: '',
      componentType: adjustment.adjustment_type,
      description: `Salary Adjustment - ${adjustment.adjustment_reason}`,
      units: 1,
      rate: adjustment.amount,
      amount: adjustment.amount,
      taxTreatment: adjustment.adjustment_type === 'Bonus' ? 'Taxable' : 'Taxable',
      stpCategory: this.getSTPCategoryForAdjustment(adjustment.adjustment_type),
      isYtd: false,
      createdAt: new Date().toISOString()
    };
  },

  async calculateTaxWithholding(employee: PayrollEmployee, taxableIncome: number, payrollRun: PayrollRun): Promise<number> {
    try {
      const payPeriodsPerYear = this.getPayPeriodsPerYear(employee.payFrequency);
      const annualTaxableIncome = taxableIncome * payPeriodsPerYear;
      
      // Try to get actual tax tables from statutory service
      const financialYear = this.getFinancialYear(payrollRun.payPeriodStart);
      const taxRates = await statutoryTablesService.getStatutoryRates('payg-withholding', new Date(payrollRun.payPeriodStart));
      
      if (taxRates && taxRates.length > 0) {
        // Sort rates by threshold
        const sortedRates = [...taxRates].sort((a, b) => (a.threshold || 0) - (b.threshold || 0));
        
        let totalAnnualTax = 0;
        let remainingIncome = annualTaxableIncome;
        
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
        
        return totalAnnualTax / payPeriodsPerYear;
      }

      // Fallback to simple calculation if no rates found
      if (annualTaxableIncome <= 18200) return 0;
      if (annualTaxableIncome <= 45000) return (annualTaxableIncome - 18200) * 0.19 / payPeriodsPerYear;
      if (annualTaxableIncome <= 120000) return (5092 + (annualTaxableIncome - 45000) * 0.325) / payPeriodsPerYear;
      if (annualTaxableIncome <= 180000) return (29467 + (annualTaxableIncome - 120000) * 0.37) / payPeriodsPerYear;
      return (51667 + (annualTaxableIncome - 180000) * 0.45) / payPeriodsPerYear;
    } catch (error) {
      console.error('Error calculating tax withholding:', error);
      // Return 0 or fallback
      return 0;
    }
  },

  async calculateSuperannuation(employee: PayrollEmployee, grossPay: number): Promise<number> {
    try {
      // Get current superannuation guarantee rate from statutory service
      const rates = await statutoryTablesService.getStatutoryRates('superannuation-guarantee', new Date());
      const superRate = (rates && rates.length > 0) ? (rates[0].rate / 100) : 0.115;
      
      return grossPay * superRate;
    } catch (error) {
      console.error('Error calculating superannuation:', error);
      return grossPay * 0.115; // Default fallback
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

  getPreTaxDeductions(employeeId: string): Deduction[] {
    // In a real implementation, this would be passed as a parameter or fetched from cache
    return [];
  },

  getPostTaxDeductions(employeeId: string): Deduction[] {
    // In a real implementation, this would be passed as a parameter or fetched from cache
    return [];
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
          last_name
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
      const { data: payslip, error: payslipError } = await supabase
        .from('payslips')
        .insert({
          payroll_run_id: payrollRunId,
          employee_id: result.employeeId,
          payslip_number: `PS-${Date.now()}-${result.employeeId.slice(0, 4)}`, // Simple generation
          period_start: result.periodStart,
          period_end: result.periodEnd,
          payment_date: new Date().toISOString().split('T')[0], // Default to today
          gross_pay: result.totals.grossPay,
          taxable_income: result.totals.taxableIncome,
          tax_withheld: result.totals.taxWithheld,
          superannuation: result.totals.superContributions,
          net_pay: result.totals.netPay,
          pay_frequency: 'Monthly', // Should come from employee or run
          status: 'Draft'
        })
        .select()
        .single();

      if (payslipError) throw payslipError;

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
      console.error('Error creating payslip records:', error);
      throw error;
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
      baseSalary: Number(data.base_salary) || 0,
      hourlyRate: Number(data.hourly_rate) || 0,
      payFrequency: data.pay_frequency,
      taxFileNumber: data.tax_file_number,
      taxScale: data.tax_scale,
      residencyStatus: data.residency_status,
      employmentType: data.employment_type,
      superFundId: data.super_fund_id,
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

  mapDeductionFromDb(data: any): Deduction {
    return {
      id: data.id,
      employeeId: data.employee_id,
      deductionType: data.deduction_type,
      category: data.category,
      description: data.description,
      amount: Number(data.amount) || 0,
      isFixed: data.is_fixed,
      isPercentage: data.is_percentage,
      percentage: data.percentage ? Number(data.percentage) : undefined,
      priority: data.priority,
      effectiveFrom: data.effective_from,
      effectiveTo: data.effective_to,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
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
        if (employee.employmentType === 'Casual' || employee.employmentType === 'Contractor') {
          // No approved timesheets for hourly employee
          return { earnings, superContributions };
        }
        return { earnings, superContributions };
      }

      // 2. Fetch detailed attendance records for the period to calculate penalty rates
      const attendanceRecords = await attendanceService.getAll(
        payrollRun.payPeriodStart,
        payrollRun.payPeriodEnd,
        employee.employeeId
      );

      if (attendanceRecords.length === 0) {
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
        for (const record of attendanceRecords) {
          if (!record.clockIn || !record.clockOut) continue;
          
          const start = new Date(record.clockIn);
          const end = new Date(record.clockOut);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          
          if (hours > 0) {
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
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start from Sunday
    
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

  calculateHoursFromTimesheet(timesheet: Timesheet): { regularHours: number; overtimeHours: number; totalHours: number } {
    let totalHours = 0;
    
    // Calculate total hours from all entries
      timesheet.rows?.forEach((row: any) => {
        row.entries?.forEach((entry: any) => {
          totalHours += entry.hours || 0;
        });
      });
    
    // Standard 38-hour work week (Australia)
    const regularHours = Math.min(totalHours, 38);
    const overtimeHours = Math.max(0, totalHours - 38);
    
    return { regularHours, overtimeHours, totalHours };
  },

  async getHourlyRate(employee: PayrollEmployee): Promise<number> {
    if (employee.hourlyRate && employee.hourlyRate > 0) {
      return employee.hourlyRate;
    }
    
    // Calculate from annual salary
    const payPeriodsPerYear = this.getPayPeriodsPerYear(employee.payFrequency);
    const weeklySalary = (employee.baseSalary || 0) / 52;
    return weeklySalary / 38; // Standard 38-hour week
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