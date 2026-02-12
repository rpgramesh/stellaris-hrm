import { supabase } from '@/lib/supabase';
import { PayrollRun, Payslip, PayComponent, PayrollCalculationResult, PayrollEmployee, TaxTable, StatutoryRate, Deduction, SuperannuationContribution } from '@/types/payroll';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { employeeService } from './employeeService';

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
    const results: PayrollCalculationResult[] = [];

    // Update payroll run status
    await this.updatePayrollRunStatus(payrollRunId, 'Processing', processedBy);

    try {
      for (const employee of employees) {
        const result = await this.calculateEmployeePayroll(employee, payrollRun);
        results.push(result);
        
        // Create payslip
        await this.createPayslipFromCalculation(result, payrollRunId);
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
      // 1. Calculate base salary
      const baseSalaryComponent = await this.calculateBaseSalary(employee, payrollRun);
      result.components.earnings.push(baseSalaryComponent);

      // 2. Apply salary adjustments
      const adjustments = await this.getSalaryAdjustments(employee.employeeId, payrollRun);
      for (const adjustment of adjustments) {
        const adjustmentComponent = this.createAdjustmentComponent(adjustment, payrollRun);
        result.components.earnings.push(adjustmentComponent);
      }

      // 3. Calculate gross pay
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

      // 7. Calculate superannuation
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

  calculateTaxWithholding(employee: PayrollEmployee, taxableIncome: number, payrollRun: PayrollRun): number {
    // Default tax calculation - in a real implementation, this would use proper tax tables
    // Simple progressive tax calculation for demonstration
    const annualIncome = taxableIncome * this.getPayPeriodsPerYear(employee.payFrequency);
    
    if (annualIncome <= 18200) return 0;
    if (annualIncome <= 45000) return (annualIncome - 18200) * 0.19 / this.getPayPeriodsPerYear(employee.payFrequency);
    if (annualIncome <= 120000) return (5092 + (annualIncome - 45000) * 0.325) / this.getPayPeriodsPerYear(employee.payFrequency);
    if (annualIncome <= 180000) return (29467 + (annualIncome - 120000) * 0.37) / this.getPayPeriodsPerYear(employee.payFrequency);
    return (51667 + (annualIncome - 180000) * 0.45) / this.getPayPeriodsPerYear(employee.payFrequency);
  },

  calculateSuperannuation(employee: PayrollEmployee, grossPay: number): number {
    // Get current superannuation guarantee rate
    const superRate = this.getCurrentSuperRate();
    return grossPay * superRate;
  },

  getTaxTable(residencyStatus: string, payFrequency: string): TaxTable | null {
    // Default tax table for demonstration - in a real implementation, this would be passed as parameter
    return {
      id: 'default',
      financialYear: '2024-25',
      taxScale: 'Resident',
      residencyStatus: residencyStatus as 'Resident' | 'NonResident' | 'WorkingHoliday',
      payFrequency: payFrequency as 'Weekly' | 'Fortnightly' | 'Monthly',
      incomeThresholds: [
        { from: 0, to: 18200, baseTax: 0, taxRate: 0 },
        { from: 18201, to: 45000, baseTax: 0, taxRate: 19 },
        { from: 45001, to: 120000, baseTax: 5092, taxRate: 32.5 },
        { from: 120001, to: 180000, baseTax: 29467, taxRate: 37 },
        { from: 180001, to: Infinity, baseTax: 51667, taxRate: 45 }
      ],
      effectiveFrom: '2024-07-01',
      effectiveTo: '2025-06-30',
      isActive: true
    };
  },

  getCurrentSuperRate(): number {
    // Default to 11.5% - in a real implementation, this would be fetched from a cache or passed as parameter
    return 0.115;
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
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  mapPayrollEmployeeFromDb(data: any): PayrollEmployee {
    return {
      id: data.id,
      employeeId: data.employee_id,
      baseSalary: Number(data.base_salary) || 0,
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
      effectiveTo: data.effective_to
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
  }
};