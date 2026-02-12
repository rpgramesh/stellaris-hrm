import { supabase } from '../lib/supabase';
import { 
  BonusPayment, 
  BonusType, 
  BonusTaxMethod,
  BonusCalculationResult 
} from '../types/bonus';
import { PayrollEmployee } from '../types/payroll';
import { auditService } from './auditService';
import { notificationService } from './notificationService';

export class BonusCalculationsService {
  /**
   * Calculate bonus payment with appropriate tax treatment
   */
  async calculateBonus(
    employee: PayrollEmployee,
    bonusType: BonusType,
    grossAmount: number,
    paymentDate: Date,
    options: {
      taxMethod?: BonusTaxMethod;
      includeSuperannuation?: boolean;
      performancePeriod?: { start: Date; end: Date };
      commissionRate?: number;
      salesAmount?: number;
      proRataDays?: number;
      performanceScore?: number;
      performanceMultiplier?: number;
      teamPerformance?: number;
      companyPerformance?: number;
      performanceThresholds?: { threshold: number; multiplier: number }[];
    } = {}
  ): Promise<BonusCalculationResult> {
    try {
      // Validate bonus parameters
      this.validateBonusParameters(bonusType, grossAmount, options);
      
      // Calculate pro-rata amount if applicable
      const proRataAmount = this.calculateProRataAmount(bonusType, grossAmount, options);
      
      // Determine tax method if not specified
      const taxMethod = options.taxMethod || this.determineTaxMethod(bonusType);
      
      // Calculate tax based on method
      const taxCalculation = await this.calculateBonusTax(
        employee,
        proRataAmount,
        taxMethod,
        paymentDate,
        options
      );
      
      // Calculate superannuation if applicable
      const superannuationAmount = options.includeSuperannuation !== false 
        ? this.calculateSuperannuation(proRataAmount, employee)
        : 0;
      
      // Create bonus payment record
      const bonusPayment: Omit<BonusPayment, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeId: employee.id,
        bonusType,
        grossAmount: proRataAmount,
        taxMethod,
        taxWithheld: taxCalculation.taxWithheld,
        superannuationAmount,
        netAmount: proRataAmount - taxCalculation.taxWithheld,
        paymentDate,
        status: 'calculated',
        calculationDetails: {
          originalAmount: grossAmount,
          proRataMultiplier: proRataAmount / grossAmount,
          taxCalculation: taxCalculation.calculationDetails,
          superannuationRate: (employee as any).superannuationRate || 0.115,
          performancePeriod: options.performancePeriod,
          commissionRate: options.commissionRate,
          salesAmount: options.salesAmount
        },
        approvalStatus: 'pending',
        isReportable: this.isReportableForSTP(bonusType),
        payPeriodStart: options.performancePeriod?.start || paymentDate,
        payPeriodEnd: options.performancePeriod?.end || paymentDate
      };
      
      return {
        bonusPayment,
        taxCalculation: taxCalculation.calculationDetails,
        warnings: taxCalculation.warnings,
        validationErrors: []
      };
      
    } catch (error) {
      console.error('Error calculating bonus:', error);
      throw new Error(`Failed to calculate bonus: ${error.message}`);
    }
  }
  
  /**
   * Calculate tax on bonus using specified method
   */
  private async calculateBonusTax(
    employee: PayrollEmployee,
    grossAmount: number,
    taxMethod: BonusTaxMethod,
    paymentDate: Date,
    options: any
  ): Promise<{
    taxWithheld: number;
    calculationDetails: any;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let taxWithheld = 0;
    let calculationDetails: any = {};
    
    switch (taxMethod) {
      case 'marginal-rates':
        // Method A: Calculate tax using marginal rates
        const marginalResult = await this.calculateMarginalTax(employee, grossAmount, paymentDate);
        taxWithheld = marginalResult.taxWithheld;
        calculationDetails = marginalResult.details;
        break;
        
      case 'schedule-5':
        // Method B(i): Use tax tables (Schedule 5)
        const scheduleResult = await this.calculateSchedule5Tax(employee, grossAmount, paymentDate);
        taxWithheld = scheduleResult.taxWithheld;
        calculationDetails = scheduleResult.details;
        break;
        
      case 'average-rates':
        // Method B(ii): Use average rates
        const averageResult = await this.calculateAverageTax(employee, grossAmount, paymentDate);
        taxWithheld = averageResult.taxWithheld;
        calculationDetails = averageResult.details;
        break;
        
      case 'fixed-rate':
        // Fixed rate method (commonly 47% including Medicare)
        const fixedRate = 0.47; // 45% + 2% Medicare
        taxWithheld = Math.round(grossAmount * fixedRate * 100) / 100;
        calculationDetails = {
          method: 'Fixed Rate',
          rate: fixedRate,
          grossAmount,
          medicareLevy: grossAmount * 0.02
        };
        warnings.push('Fixed rate method used - ensure this is appropriate for the bonus type');
        break;
        
      case 'etf':
        // Employment Termination Payment (ETP) method
        const etpResult = await this.calculateETPTax(employee, grossAmount, paymentDate);
        taxWithheld = etpResult.taxWithheld;
        calculationDetails = etpResult.details;
        break;
        
      default:
        throw new Error(`Unsupported tax method: ${taxMethod}`);
    }
    
    // Apply Medicare Levy if applicable
    if (this.shouldApplyMedicareLevy(taxMethod)) {
      const medicareLevy = this.calculateMedicareLevy(grossAmount, employee);
      taxWithheld += medicareLevy;
      calculationDetails.medicareLevy = medicareLevy;
    }
    
    return { taxWithheld, calculationDetails, warnings };
  }
  
  /**
   * Calculate tax using marginal rates (Method A)
   */
  private async calculateMarginalTax(
    employee: PayrollEmployee,
    grossAmount: number,
    paymentDate: Date
  ): Promise<{
    taxWithheld: number;
    details: any;
  }> {
    // Get employee's regular gross pay (annualized)
    const regularGrossPay = employee.baseSalary || 0;
    
    // Calculate total taxable income including bonus
    const totalTaxableIncome = regularGrossPay + grossAmount;
    
    // Get tax on total income
    const taxOnTotalIncome = await this.calculateTaxOnIncome(totalTaxableIncome, paymentDate);
    
    // Get tax on regular income only
    const taxOnRegularIncome = await this.calculateTaxOnIncome(regularGrossPay, paymentDate);
    
    // Tax on bonus is the difference
    const taxOnBonus = taxOnTotalIncome - taxOnRegularIncome;
    
    return {
      taxWithheld: Math.max(0, taxOnBonus),
      details: {
        method: 'Marginal Rates (Method A)',
        regularGrossPay,
        bonusAmount: grossAmount,
        totalTaxableIncome,
        taxOnTotalIncome,
        taxOnRegularIncome,
        taxOnBonus
      }
    };
  }
  
  /**
   * Calculate tax using Schedule 5 (Method B(i))
   */
  private async calculateSchedule5Tax(
    employee: PayrollEmployee,
    grossAmount: number,
    paymentDate: Date
  ): Promise<{
    taxWithheld: number;
    details: any;
  }> {
    // This would use the ATO's Schedule 5 tax tables
    // For implementation, we would look up the appropriate tax amount
    // based on the employee's pay period and the bonus amount
    
    const payPeriod = employee.payFrequency || 'fortnightly';
    const grossPerPeriod = (employee.baseSalary || 0) / this.getPayPeriodsPerYear(payPeriod);
    
    // Simplified implementation - in production, use actual tax tables
    const combinedAmount = grossPerPeriod + grossAmount;
    const taxOnCombined = await this.calculateTaxOnPeriodicAmount(combinedAmount, payPeriod, paymentDate);
    const taxOnRegular = await this.calculateTaxOnPeriodicAmount(grossPerPeriod, payPeriod, paymentDate);
    
    const taxWithheld = Math.max(0, taxOnCombined - taxOnRegular);
    
    return {
      taxWithheld,
      details: {
        method: 'Schedule 5 (Method B(i))',
        payPeriod,
        grossPerPeriod,
        bonusAmount: grossAmount,
        combinedAmount,
        taxOnCombined,
        taxOnRegular,
        taxWithheld
      }
    };
  }
  
  /**
   * Calculate tax using average rates (Method B(ii))
   */
  private async calculateAverageTax(
    employee: PayrollEmployee,
    grossAmount: number,
    paymentDate: Date
  ): Promise<{
    taxWithheld: number;
    details: any;
  }> {
    // Calculate average tax rate on regular income
    const regularGrossPay = employee.baseSalary || 0;
    const taxOnRegularIncome = await this.calculateTaxOnIncome(regularGrossPay, paymentDate);
    const averageTaxRate = regularGrossPay > 0 ? taxOnRegularIncome / regularGrossPay : 0;
    
    // Apply average rate to bonus
    const taxWithheld = grossAmount * averageTaxRate;
    
    return {
      taxWithheld,
      details: {
        method: 'Average Rates (Method B(ii))',
        regularGrossPay,
        taxOnRegularIncome,
        averageTaxRate: (averageTaxRate * 100).toFixed(2) + '%',
        bonusAmount: grossAmount,
        taxWithheld
      }
    };
  }
  
  /**
   * Calculate ETP tax for employment termination payments
   */
  private async calculateETPTax(
    employee: PayrollEmployee,
    grossAmount: number,
    paymentDate: Date
  ): Promise<{
    taxWithheld: number;
    details: any;
  }> {
    const currentFy = this.getFinancialYear(paymentDate);
    const etpCap = await this.getETPCap(currentFy);
    
    // Calculate tax-free component and taxable component
    const taxFreeComponent = Math.min(grossAmount, etpCap.taxFree);
    const taxableComponent = Math.max(0, grossAmount - taxFreeComponent);
    
    // Apply different tax rates based on age and service period
    const employeeAge = this.calculateEmployeeAge((employee as any).dateOfBirth || new Date('1980-01-01'), paymentDate);
    const yearsOfService = this.calculateYearsOfService((employee as any).startDate || new Date('2020-01-01'), paymentDate);
    
    let taxRate = 0.32; // Default rate (32% including Medicare)
    
    if (employeeAge >= 55 && yearsOfService >= 12) {
      // Lower rate for employees over 55 with long service
      taxRate = 0.17; // 15% + 2% Medicare
    } else if (taxableComponent <= etpCap.lowerRate) {
      // Lower rate for amounts under cap
      taxRate = 0.17;
    }
    
    const taxWithheld = taxableComponent * taxRate;
    
    return {
      taxWithheld,
      details: {
        method: 'ETP (Employment Termination Payment)',
        employeeAge,
        yearsOfService,
        grossAmount,
        taxFreeComponent,
        taxableComponent,
        etpCap,
        taxRate: (taxRate * 100).toFixed(2) + '%',
        taxWithheld
      }
    };
  }
  
  /**
   * Calculate commission-based bonus
   */
  async calculateCommissionBonus(
    employee: PayrollEmployee,
    salesAmount: number,
    commissionRate: number,
    paymentDate: Date,
    options: {
      tieredRates?: { threshold: number; rate: number }[];
      minimumSales?: number;
      maximumCommission?: number;
    } = {}
  ): Promise<BonusCalculationResult> {
    try {
      // Validate minimum sales requirement
      if (options.minimumSales && salesAmount < options.minimumSales) {
        throw new Error(`Sales amount ${salesAmount} is below minimum requirement ${options.minimumSales}`);
      }
      
      // Calculate commission using tiered rates if provided
      let commissionAmount = 0;
      
      if (options.tieredRates && options.tieredRates.length > 0) {
        commissionAmount = this.calculateTieredCommission(salesAmount, options.tieredRates);
      } else {
        commissionAmount = salesAmount * commissionRate;
      }
      
      // Apply maximum commission cap
      if (options.maximumCommission && commissionAmount > options.maximumCommission) {
        commissionAmount = options.maximumCommission;
      }
      
      // Calculate the bonus using standard bonus calculation
      return await this.calculateBonus(
        employee,
        'commission',
        commissionAmount,
        paymentDate,
        {
          taxMethod: 'marginal-rates',
          includeSuperannuation: true,
          commissionRate,
          salesAmount
        }
      );
      
    } catch (error) {
      console.error('Error calculating commission bonus:', error);
      throw new Error(`Failed to calculate commission bonus: ${error.message}`);
    }
  }
  
  /**
   * Calculate performance-based bonus with KPI metrics
   */
  async calculatePerformanceBonus(
    employee: PayrollEmployee,
    baseBonusAmount: number,
    performanceScore: number, // 0-100
    paymentDate: Date,
    options: {
      kpiWeights?: { [key: string]: number };
      performanceThresholds?: { threshold: number; multiplier: number }[];
      teamPerformance?: number;
      companyPerformance?: number;
    } = {}
  ): Promise<BonusCalculationResult> {
    try {
      // Validate performance score
      if (performanceScore < 0 || performanceScore > 100) {
        throw new Error('Performance score must be between 0 and 100');
      }
      
      // Calculate performance multiplier
      let performanceMultiplier = this.calculatePerformanceMultiplier(
        performanceScore,
        options.performanceThresholds
      );
      
      // Apply team and company performance factors
      if (options.teamPerformance !== undefined) {
        performanceMultiplier *= (0.7 + 0.3 * (options.teamPerformance / 100));
      }
      
      if (options.companyPerformance !== undefined) {
        performanceMultiplier *= (0.8 + 0.2 * (options.companyPerformance / 100));
      }
      
      // Calculate final bonus amount
      const finalBonusAmount = baseBonusAmount * performanceMultiplier;
      
      // Calculate the bonus using standard bonus calculation
      return await this.calculateBonus(
        employee,
        'performance',
        finalBonusAmount,
        paymentDate,
        {
          taxMethod: 'marginal-rates',
          includeSuperannuation: true,
          performanceScore,
          performanceMultiplier
        }
      );
      
    } catch (error) {
      console.error('Error calculating performance bonus:', error);
      throw new Error(`Failed to calculate performance bonus: ${error.message}`);
    }
  }
  
  /**
   * Process bonus payment (create record and trigger approval workflow)
   */
  async processBonusPayment(bonusResult: BonusCalculationResult): Promise<BonusPayment> {
    try {
      const bonusPayment = bonusResult.bonusPayment;
      
      // Map to DB columns
      const dbPayload = {
        employee_id: bonusPayment.employeeId,
        bonus_type: bonusPayment.bonusType,
        amount: bonusPayment.grossAmount, // Map grossAmount to amount
        tax_method: bonusPayment.taxMethod,
        tax_withheld: bonusPayment.taxWithheld,
        superannuation_amount: bonusPayment.superannuationAmount,
        net_amount: bonusPayment.netAmount,
        payment_date: bonusPayment.paymentDate,
        status: bonusPayment.status,
        calculation_details: bonusPayment.calculationDetails,
        approval_status: bonusPayment.approvalStatus,
        is_reportable: bonusPayment.isReportable,
        pay_period_start: bonusPayment.payPeriodStart,
        pay_period_end: bonusPayment.payPeriodEnd,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create bonus payment record
      const { data, error } = await supabase
        .from('bonus_payments')
        .insert([dbPayload])
        .select()
        .single();
        
      if (error) {
        throw new Error(`Failed to create bonus payment: ${error.message}`);
      }
      
      // Log audit trail
      await auditService.logAction(
        'bonus_payments',
        data.id,
        'INSERT',
        {},
        dbPayload,
        'system' // Or pass user ID if available
      );
      
      // Send notifications
      // await notificationService.notifyBonusCreated(data);
      
      return this.mapToBonusPayment(data);
      
    } catch (error) {
      console.error('Error processing bonus payment:', error);
      throw new Error(`Failed to process bonus payment: ${error.message || error}`);
    }
  }
  
  /**
   * Get bonus payment by ID
   */
  async getBonusPaymentById(id: string): Promise<BonusPayment | null> {
    const { data, error } = await supabase
      .from('bonus_payments')
      .select(`
        *,
        employee:payroll_employees(*)
      `)
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch bonus payment: ${error.message}`);
    }
    
    return this.mapToBonusPayment(data);
  }
  
  /**
   * Get bonus payments by employee
   */
  async getBonusPaymentsByEmployee(employeeId: string): Promise<BonusPayment[]> {
    const { data, error } = await supabase
      .from('bonus_payments')
      .select(`
        *,
        employee:payroll_employees(*)
      `)
      .eq('employee_id', employeeId)
      .order('payment_date', { ascending: false });
      
    if (error) {
      throw new Error(`Failed to fetch employee bonus payments: ${error.message}`);
    }
    
    return data.map(record => this.mapToBonusPayment(record));
  }
  
  /**
   * Approve bonus payment
   */
  async approveBonusPayment(id: string, approverId: string): Promise<BonusPayment> {
    try {
      const bonusPayment = await this.getBonusPaymentById(id);
      if (!bonusPayment) {
        throw new Error('Bonus payment not found');
      }
      
      if (bonusPayment.approvalStatus !== 'pending') {
        throw new Error('Bonus payment is not in pending status');
      }
      
      const { data, error } = await supabase
        .from('bonus_payments')
        .update({
          approval_status: 'approved',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        throw new Error(`Failed to approve bonus payment: ${error.message}`);
      }
      
      await auditService.logAction(
        'bonus_payments',
        id,
        'UPDATE',
        { status: bonusPayment.status, approvalStatus: bonusPayment.approvalStatus },
        { status: data.status, approvalStatus: data.approval_status },
        approverId
      );
      
      await notificationService.createNotification(
        data.employee_id,
        'Bonus Approved',
        `Your ${data.bonus_type} bonus of $${data.amount} has been approved.`,
        'success'
      );
      
      return this.mapToBonusPayment(data);
      
    } catch (error) {
      console.error('Error approving bonus payment:', error);
      throw error;
    }
  }
  
  /**
   * Helper methods
   */
  
  private validateBonusParameters(
    bonusType: BonusType,
    grossAmount: number,
    options: any
  ): void {
    if (grossAmount <= 0) {
      throw new Error('Bonus amount must be greater than zero');
    }
    
    if (bonusType === 'commission') {
      if (!options.salesAmount || options.salesAmount <= 0) {
        throw new Error('Sales amount is required for commission bonuses');
      }
      if (!options.commissionRate || options.commissionRate <= 0) {
        throw new Error('Commission rate is required for commission bonuses');
      }
    }
    
    if (bonusType === 'performance' && options.performanceScore !== undefined) {
      if (options.performanceScore < 0 || options.performanceScore > 100) {
        throw new Error('Performance score must be between 0 and 100');
      }
    }
  }
  
  private calculateProRataAmount(
    bonusType: BonusType,
    grossAmount: number,
    options: any
  ): number {
    if (!options.proRataDays || options.proRataDays <= 0) {
      return grossAmount;
    }
    
    // Calculate pro-rata based on employment period
    const employmentDays = options.proRataDays;
    const fullPeriodDays = this.getFullPeriodDays(bonusType);
    
    const proRataMultiplier = Math.min(1, employmentDays / fullPeriodDays);
    
    return grossAmount * proRataMultiplier;
  }
  
  private getFullPeriodDays(bonusType: BonusType): number {
    switch (bonusType) {
      case 'performance':
        return 365; // Annual performance bonus
      case 'retention':
        return 365; // Annual retention bonus
      case 'sign-on':
        return 365; // Annual sign-on bonus
      case 'commission':
        return 91; // Quarterly commission period
      case 'referral':
        return 365; // Annual referral bonus
      case 'profit-sharing':
        return 365; // Annual profit sharing
      default:
        return 365;
    }
  }
  
  private determineTaxMethod(bonusType: BonusType): BonusTaxMethod {
    switch (bonusType) {
      case 'performance':
      case 'retention':
      case 'sign-on':
        return 'marginal-rates';
      case 'commission':
        return 'schedule-5';
      case 'referral':
        return 'fixed-rate';
      case 'profit-sharing':
        return 'average-rates';
      default:
        return 'marginal-rates';
    }
  }
  
  private async calculateTaxOnIncome(annualIncome: number, paymentDate: Date): Promise<number> {
    // Simplified tax calculation - in production, use proper tax tables
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
    
    return tax;
  }
  
  private async calculateTaxOnPeriodicAmount(amount: number, payPeriod: string, paymentDate: Date): Promise<number> {
    // Convert to annual amount
    const periodsPerYear = this.getPayPeriodsPerYear(payPeriod);
    const annualAmount = amount * periodsPerYear;
    
    // Calculate annual tax
    const annualTax = await this.calculateTaxOnIncome(annualAmount, paymentDate);
    
    // Convert back to periodic amount
    return annualTax / periodsPerYear;
  }
  
  private getPayPeriodsPerYear(payPeriod: string): number {
    switch (payPeriod.toLowerCase()) {
      case 'weekly': return 52;
      case 'fortnightly': return 26;
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'annually': return 1;
      default: return 26;
    }
  }
  
  private calculateSuperannuation(grossAmount: number, employee: PayrollEmployee): number {
    const superRate = (employee as any).superannuationRate || 0.115;
    return grossAmount * superRate;
  }
  
  private shouldApplyMedicareLevy(taxMethod: BonusTaxMethod): boolean {
    return ['marginal-rates', 'average-rates', 'fixed-rate'].includes(taxMethod);
  }
  
  private calculateMedicareLevy(amount: number, employee: PayrollEmployee): number {
    // Simplified Medicare calculation - in production, consider thresholds
    return amount * 0.02;
  }
  
  private calculateTieredCommission(salesAmount: number, tieredRates: { threshold: number; rate: number }[]): number {
    let totalCommission = 0;
    let remainingSales = salesAmount;
    
    // Sort tiers by threshold (ascending)
    const sortedTiers = [...tieredRates].sort((a, b) => a.threshold - b.threshold);
    
    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];
      const nextThreshold = sortedTiers[i + 1]?.threshold || Infinity;
      
      if (remainingSales > tier.threshold) {
        const tierSales = Math.min(remainingSales, nextThreshold) - tier.threshold;
        totalCommission += tierSales * tier.rate;
      }
    }
    
    return totalCommission;
  }
  
  private calculatePerformanceMultiplier(
    performanceScore: number,
    thresholds?: { threshold: number; multiplier: number }[]
  ): number {
    if (!thresholds || thresholds.length === 0) {
      // Default performance multipliers
      if (performanceScore >= 90) return 1.2;
      if (performanceScore >= 80) return 1.1;
      if (performanceScore >= 70) return 1.0;
      if (performanceScore >= 60) return 0.8;
      return 0.5;
    }
    
    // Use custom thresholds
    const sortedThresholds = [...thresholds].sort((a, b) => b.threshold - a.threshold);
    
    for (const threshold of sortedThresholds) {
      if (performanceScore >= threshold.threshold) {
        return threshold.multiplier;
      }
    }
    
    return 0;
  }
  
  private async getETPCap(financialYear: string): Promise<{
    taxFree: number;
    lowerRate: number;
  }> {
    // ETP caps change annually - in production, fetch from ATO data
    return {
      taxFree: 11850, // 2023-24 tax-free amount
      lowerRate: 235000 // 2023-24 lower rate cap
    };
  }
  
  private getFinancialYear(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Australian financial year runs from July 1 to June 30
    return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }
  
  private calculateEmployeeAge(dateOfBirth: string | Date, paymentDate: Date): number {
    const birthDate = new Date(dateOfBirth);
    let age = paymentDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = paymentDate.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && paymentDate.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
  
  private calculateYearsOfService(startDate: string | Date, paymentDate: Date): number {
    const start = new Date(startDate);
    const years = paymentDate.getFullYear() - start.getFullYear();
    const monthDiff = paymentDate.getMonth() - start.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && paymentDate.getDate() < start.getDate())) {
      return years - 1;
    }
    
    return years;
  }
  
  private isReportableForSTP(bonusType: BonusType): boolean {
    // Most bonus types are reportable for STP
    return !['reimbursement', 'allowance'].includes(bonusType);
  }
  
  private mapToBonusPayment(record: any): BonusPayment {
    return {
      id: record.id,
      employeeId: record.employee_id,
      bonusType: record.bonus_type,
      grossAmount: Number(record.amount), // Map amount to grossAmount
      taxMethod: record.tax_method,
      taxWithheld: Number(record.tax_withheld),
      superannuationAmount: Number(record.superannuation_amount),
      netAmount: Number(record.net_amount),
      paymentDate: new Date(record.payment_date),
      status: record.status,
      calculationDetails: record.calculation_details,
      approvalStatus: record.approval_status,
      approvedBy: record.approved_by,
      approvedAt: record.approved_at ? new Date(record.approved_at) : undefined,
      isReportable: record.is_reportable,
      payPeriodStart: new Date(record.pay_period_start),
      payPeriodEnd: new Date(record.pay_period_end),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at)
    };
  }
}

export const bonusCalculationsService = new BonusCalculationsService();