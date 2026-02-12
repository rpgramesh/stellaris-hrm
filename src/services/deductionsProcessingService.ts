import { supabase } from '../lib/supabase';
import { 
  Deduction, 
  DeductionCalculationResult, 
  DeductionType, 
  DeductionCategory
} from '../types/deductions';
import { PayrollEmployee } from '../types/payroll';
import { auditService } from './auditService';
import { notificationService } from './notificationService';

export class DeductionsProcessingService {
  /**
   * Calculate all deductions for an employee in the correct priority order
   */
  async calculateEmployeeDeductions(
    employee: PayrollEmployee,
    grossPay: number,
    taxableIncome: number,
    payPeriod: { startDate: Date; endDate: Date; frequency: string }
  ): Promise<DeductionCalculationResult> {
    try {
      // Get all active deductions for the employee
      const deductions = await this.getEmployeeDeductions(employee.id, payPeriod.startDate);
      
      // Sort deductions by priority (higher priority first)
      const sortedDeductions = deductions.sort((a, b) => b.priority - a.priority);
      
      const preTaxDeductions: Deduction[] = [];
      const postTaxDeductions: Deduction[] = [];
      let totalPreTaxDeductions = 0;
      let totalPostTaxDeductions = 0;
      let currentTaxableIncome = taxableIncome;
      
      // Process pre-tax deductions first
      for (const deduction of sortedDeductions.filter(d => d.deductionType === 'pre-tax')) {
        const calculation = await this.calculateSingleDeduction(
          deduction,
          employee,
          grossPay,
          currentTaxableIncome,
          payPeriod
        );
        
        if (calculation.amount > 0) {
          preTaxDeductions.push({
            ...deduction,
            currentAmount: calculation.amount,
            ytdAmount: calculation.ytdAmount
          });
          totalPreTaxDeductions += calculation.amount;
          currentTaxableIncome -= calculation.amount;
        }
      }
      
      // Process post-tax deductions
      for (const deduction of sortedDeductions.filter(d => d.deductionType === 'post-tax')) {
        const calculation = await this.calculateSingleDeduction(
          deduction,
          employee,
          grossPay,
          currentTaxableIncome,
          payPeriod
        );
        
        if (calculation.amount > 0) {
          postTaxDeductions.push({
            ...deduction,
            currentAmount: calculation.amount,
            ytdAmount: calculation.ytdAmount
          });
          totalPostTaxDeductions += calculation.amount;
        }
      }
      
      return {
        preTaxDeductions,
        postTaxDeductions,
        totalPreTaxDeductions,
        totalPostTaxDeductions,
        taxableIncomeAfterDeductions: currentTaxableIncome,
        netPayReduction: totalPreTaxDeductions + totalPostTaxDeductions
      };
      
    } catch (error) {
      console.error('Error calculating employee deductions:', error);
      throw new Error(`Failed to calculate deductions: ${error.message}`);
    }
  }
  
  /**
   * Calculate a single deduction amount
   */
  private async calculateSingleDeduction(
    deduction: Deduction,
    employee: PayrollEmployee,
    grossPay: number,
    taxableIncome: number,
    payPeriod: { startDate: Date; endDate: Date; frequency: string }
  ): Promise<{ amount: number; ytdAmount: number }> {
    let amount = 0;
    
    switch (deduction.calculationMethod) {
      case 'fixed':
        amount = deduction.amount || 0;
        break;
        
      case 'percentage':
        const baseAmount = deduction.baseForPercentage === 'gross' ? grossPay : taxableIncome;
        amount = (baseAmount * (deduction.percentage || 0)) / 100;
        break;
        
      case 'formula':
        amount = await this.calculateFormulaDeduction(deduction, employee, grossPay, taxableIncome, payPeriod);
        break;
        
      case 'tiered':
        amount = this.calculateTieredDeduction(deduction, grossPay, taxableIncome);
        break;
        
      default:
        amount = deduction.amount || 0;
    }
    
    // Apply minimum and maximum limits
    if (deduction.minimumAmount && amount < deduction.minimumAmount) {
      amount = deduction.minimumAmount;
    }
    if (deduction.maximumAmount && amount > deduction.maximumAmount) {
      amount = deduction.maximumAmount;
    }
    
    // Apply cap if specified
    if (deduction.annualCap) {
      const ytdAmount = await this.getYTDDeductionAmount(employee.id, deduction.id, payPeriod.startDate);
      const remainingCap = Math.max(0, deduction.annualCap - ytdAmount);
      amount = Math.min(amount, remainingCap);
    }
    
    // Round based on deduction settings
    amount = this.roundDeduction(amount, deduction.roundingMethod);
    
    const newYTDAmount = await this.getYTDDeductionAmount(employee.id, deduction.id, payPeriod.startDate) + amount;
    
    return { amount, ytdAmount: newYTDAmount };
  }
  
  /**
   * Calculate formula-based deductions (e.g., child support)
   */
  private async calculateFormulaDeduction(
    deduction: Deduction,
    employee: PayrollEmployee,
    grossPay: number,
    taxableIncome: number,
    payPeriod: { startDate: Date; endDate: Date; frequency: string }
  ): Promise<number> {
    if (!deduction.formula) {
      return deduction.amount || 0;
    }
    
    // Child support formula example: (grossPay - tax) * 0.18
    if (deduction.category === 'child-support') {
      const estimatedTax = await this.estimateTax(taxableIncome, payPeriod.frequency);
      const disposableIncome = Math.max(0, grossPay - estimatedTax);
      
      // Apply child support percentage based on number of children
      const basePercentage = deduction.formulaParameters?.childrenCount === 1 ? 0.18 :
                            deduction.formulaParameters?.childrenCount === 2 ? 0.27 : 0.32;
      
      return disposableIncome * basePercentage;
    }
    
    // Union fees formula example: max(grossPay * 0.01, 10)
    if (deduction.category === 'union-fees') {
      const unionRate = deduction.formulaParameters?.unionRate || 0.01;
      const minimumFee = deduction.formulaParameters?.minimumFee || 10;
      return Math.max(grossPay * unionRate, minimumFee);
    }
    
    // Salary packaging formula
    if (deduction.category === 'salary-packaging') {
      const packageAmount = deduction.formulaParameters?.packageAmount || 0;
      const packageType = deduction.formulaParameters?.packageType || 'novated-lease';
      
      if (packageType === 'novated-lease') {
        // Novated lease: fixed amount per pay period
        return packageAmount;
      } else if (packageType === 'meal-entertainment') {
        // Meal entertainment: up to $2,650 annually, pro-rated
        const annualLimit = 2650;
        const ytdAmount = await this.getYTDDeductionAmount(employee.id, deduction.id, payPeriod.startDate);
        const remainingAnnualAmount = Math.max(0, annualLimit - ytdAmount);
        const payPeriodsRemaining = this.getPayPeriodsRemaining(payPeriod.startDate, payPeriod.frequency);
        
        return Math.min(packageAmount, remainingAnnualAmount / Math.max(1, payPeriodsRemaining));
      }
    }
    
    return deduction.amount || 0;
  }
  
  /**
   * Calculate tiered deductions
   */
  private calculateTieredDeduction(deduction: Deduction, grossPay: number, taxableIncome: number): number {
    if (!deduction.tiers || deduction.tiers.length === 0) {
      return deduction.amount || 0;
    }
    
    const baseAmount = deduction.baseForPercentage === 'gross' ? grossPay : taxableIncome;
    let totalAmount = 0;
    
    for (const tier of deduction.tiers) {
      if (baseAmount > tier.threshold) {
        const tierAmount = Math.min(baseAmount - tier.threshold, tier.maxAmount || Infinity);
        totalAmount += tierAmount * (tier.rate / 100);
      }
    }
    
    return totalAmount;
  }
  
  /**
   * Get all active deductions for an employee
   */
  private async getEmployeeDeductions(employeeId: string, effectiveDate: Date): Promise<Deduction[]> {
    const { data, error } = await supabase
      .from('deductions')
      .select(`
        *,
        deduction_config:deduction_configs(*)
      `)
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .lte('start_date', effectiveDate.toISOString())
      .or(`end_date.is.null,end_date.gte.${effectiveDate.toISOString()}`)
      .order('priority', { ascending: false });
      
    if (error) {
      throw new Error(`Failed to fetch employee deductions: ${error.message}`);
    }
    
    return data.map(record => this.mapToDeduction(record));
  }
  
  /**
   * Get YTD deduction amount
   */
  private async getYTDDeductionAmount(employeeId: string, deductionId: string, asOfDate: Date): Promise<number> {
    const startOfYear = new Date(asOfDate.getFullYear(), 0, 1);
    
    const { data, error } = await supabase
      .from('payslip_deductions')
      .select('amount')
      .eq('employee_id', employeeId)
      .eq('deduction_id', deductionId)
      .gte('pay_period_start', startOfYear.toISOString())
      .lte('pay_period_end', asOfDate.toISOString());
      
    if (error) {
      console.error('Error fetching YTD deduction amount:', error);
      return 0;
    }
    
    return data.reduce((sum, record) => sum + record.amount, 0);
  }
  
  /**
   * Estimate tax for formula calculations
   */
  private async estimateTax(taxableIncome: number, payFrequency: string): Promise<number> {
    // Simplified tax estimation - in production, this would use proper tax tables
    const annualIncome = taxableIncome * this.getPayPeriodsPerYear(payFrequency);
    
    // Basic Australian tax calculation (simplified)
    let tax = 0;
    if (annualIncome <= 18200) {
      tax = 0;
    } else if (annualIncome <= 45000) {
      tax = (annualIncome - 18200) * 0.19;
    } else if (annualIncome <= 120000) {
      tax = 5092 + (annualIncome - 45000) * 0.325;
    } else if (annualIncome <= 180000) {
      tax = 29467 + (annualIncome - 120000) * 0.37;
    } else {
      tax = 51667 + (annualIncome - 180000) * 0.45;
    }
    
    const payPeriodsPerYear = this.getPayPeriodsPerYear(payFrequency);
    return tax / payPeriodsPerYear;
  }
  
  /**
   * Get pay periods per year based on frequency
   */
  private getPayPeriodsPerYear(frequency: string): number {
    switch (frequency.toLowerCase()) {
      case 'weekly': return 52;
      case 'fortnightly': return 26;
      case 'monthly': return 12;
      default: return 26;
    }
  }
  
  /**
   * Get remaining pay periods in the year
   */
  private getPayPeriodsRemaining(fromDate: Date, frequency: string): number {
    const payPeriodsPerYear = this.getPayPeriodsPerYear(frequency);
    const startOfYear = new Date(fromDate.getFullYear(), 0, 1);
    const periodsPassed = this.getPayPeriodsBetween(startOfYear, fromDate, frequency);
    return Math.max(0, payPeriodsPerYear - periodsPassed);
  }
  
  /**
   * Calculate pay periods between two dates
   */
  private getPayPeriodsBetween(startDate: Date, endDate: Date, frequency: string): number {
    const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksDiff = Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerWeek);
    
    switch (frequency.toLowerCase()) {
      case 'weekly': return weeksDiff;
      case 'fortnightly': return Math.floor(weeksDiff / 2);
      case 'monthly': return Math.floor(weeksDiff / 4.33); // Average weeks per month
      default: return Math.floor(weeksDiff / 2);
    }
  }
  
  /**
   * Round deduction amount based on method
   */
  private roundDeduction(amount: number, method: string): number {
    switch (method) {
      case 'nearest-dollar':
        return Math.round(amount);
      case 'nearest-cent':
        return Math.round(amount * 100) / 100;
      case 'round-up-dollar':
        return Math.ceil(amount);
      case 'round-down-dollar':
        return Math.floor(amount);
      default:
        return Math.round(amount * 100) / 100;
    }
  }
  
  /**
   * Create a new deduction
   */
  async createDeduction(deduction: Omit<Deduction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deduction> {
    try {
      // Validate deduction
      this.validateDeduction(deduction);
      
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('deductions')
        .insert([{
          ...deduction,
          created_at: now,
          updated_at: now
        }])
        .select()
        .single();
        
      if (error) {
        throw new Error(`Failed to create deduction: ${error.message}`);
      }
      
      await auditService.logAction(
        'deductions',
        data.id,
        'INSERT',
        {},
        deduction,
        'system'
      );
      
      await notificationService.createNotification(
        data.employee_id,
        'Deduction Created',
        `A new ${deduction.category} deduction has been added to your profile.`,
        'info'
      );
      
      return this.mapToDeduction(data);
    } catch (error) {
      console.error('Error creating deduction:', error);
      throw error;
    }
  }
  
  /**
   * Update a deduction
   */
  async updateDeduction(id: string, updates: Partial<Deduction>): Promise<Deduction> {
    try {
      const existingDeduction = await this.getDeductionById(id);
      if (!existingDeduction) {
        throw new Error('Deduction not found');
      }
      
      // Validate updates
      this.validateDeduction({ ...existingDeduction, ...updates });
      
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('deductions')
        .update({
          ...updates,
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        throw new Error(`Failed to update deduction: ${error.message}`);
      }
      
      await auditService.logAction(
        'deductions',
        id,
        'UPDATE',
        existingDeduction,
        updates,
        'system'
      );
      
      return this.mapToDeduction(data);
    } catch (error) {
      console.error('Error updating deduction:', error);
      throw error;
    }
  }
  
  /**
   * Get deduction by ID
   */
  async getDeductionById(id: string): Promise<Deduction | null> {
    const { data, error } = await supabase
      .from('deductions')
      .select(`
        *,
        deduction_config:deduction_configs(*)
      `)
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch deduction: ${error.message}`);
    }
    
    return this.mapToDeduction(data);
  }
  
  /**
   * Get deductions by employee
   */
  async getDeductionsByEmployee(employeeId: string): Promise<Deduction[]> {
    const { data, error } = await supabase
      .from('deductions')
      .select(`
        *,
        deduction_config:deduction_configs(*)
      `)
      .eq('employee_id', employeeId)
      .order('priority', { ascending: false });
      
    if (error) {
      throw new Error(`Failed to fetch employee deductions: ${error.message}`);
    }
    
    return data.map(record => this.mapToDeduction(record));
  }
  
  /**
   * Validate deduction data
   */
  private validateDeduction(deduction: any): void {
    if (!deduction.employee_id) {
      throw new Error('Employee ID is required');
    }
    
    if (!deduction.name) {
      throw new Error('Deduction name is required');
    }
    
    if (!deduction.deduction_type || !['pre-tax', 'post-tax'].includes(deduction.deduction_type)) {
      throw new Error('Valid deduction type (pre-tax or post-tax) is required');
    }
    
    if (!deduction.calculation_method) {
      throw new Error('Calculation method is required');
    }
    
    if (deduction.calculation_method === 'percentage' && !deduction.percentage) {
      throw new Error('Percentage is required for percentage-based deductions');
    }
    
    if (deduction.calculation_method === 'fixed' && !deduction.amount) {
      throw new Error('Amount is required for fixed deductions');
    }
    
    if (deduction.start_date && deduction.end_date && new Date(deduction.start_date) > new Date(deduction.end_date)) {
      throw new Error('Start date must be before end date');
    }
    
    if (deduction.minimum_amount && deduction.maximum_amount && deduction.minimum_amount > deduction.maximum_amount) {
      throw new Error('Minimum amount must be less than or equal to maximum amount');
    }
  }
  
  /**
   * Map database record to Deduction object
   */
  private mapToDeduction(record: any): Deduction {
    return {
      id: record.id,
      employeeId: record.employee_id,
      name: record.name,
      description: record.description,
      deductionType: record.deduction_type,
      category: record.category,
      calculationMethod: record.calculation_method,
      amount: record.amount,
      percentage: record.percentage,
      baseForPercentage: record.base_for_percentage,
      minimumAmount: record.minimum_amount,
      maximumAmount: record.maximum_amount,
      annualCap: record.annual_cap,
      roundingMethod: record.rounding_method,
      priority: record.priority,
      formula: record.formula,
      formulaParameters: record.formula_parameters,
      tiers: record.tiers,
      startDate: record.start_date ? new Date(record.start_date) : undefined,
      endDate: record.end_date ? new Date(record.end_date) : undefined,
      status: record.status,
      requiresApproval: record.requires_approval,
      glCode: record.gl_code,
      taxCode: record.tax_code,
      superannuationTreatment: record.superannuation_treatment,
      reportableFbt: record.reportable_fbt,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at)
    };
  }
}

export const deductionsProcessingService = new DeductionsProcessingService();