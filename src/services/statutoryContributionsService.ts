import { supabase } from '../lib/supabase';
import { 
  StatutoryContribution,
  StatutoryContributionType,
  StatutoryRate,
  ContributionCalculationResult 
} from '../types/statutory';
import { PayrollEmployee, PayrollCalculationResult } from '../types/payroll';
import { auditService } from './auditService';
import { notificationService } from './notificationService';

export class StatutoryContributionsService {
  /**
   * Calculate all statutory contributions for an employee
   */
  async calculateEmployeeContributions(
    employee: PayrollEmployee,
    grossPay: number,
    taxableIncome: number,
    payPeriod: { startDate: Date; endDate: Date; frequency: string },
    companyId: string
  ): Promise<ContributionCalculationResult> {
    // Type assertion for extended employee properties
    const emp = employee as any;
    try {
      // Get all applicable statutory rates for the pay period
      const statutoryRates = await this.getApplicableStatutoryRates(
        payPeriod.startDate,
        companyId,
        emp.state || 'NSW'
      );
      
      const contributions: StatutoryContribution[] = [];
      let totalEmployerContributions = 0;
      let totalEmployeeWithholdings = 0;
      
      // Calculate PAYG Withholding
      const paygContribution = await this.calculatePAYGWithholding(
        employee,
        taxableIncome,
        payPeriod,
        statutoryRates
      );
      if (paygContribution) {
        contributions.push(paygContribution);
        totalEmployeeWithholdings += paygContribution.employeeAmount;
      }
      
      // Calculate Superannuation Guarantee
      const superContribution = await this.calculateSuperannuationGuarantee(
        employee,
        grossPay,
        payPeriod,
        statutoryRates
      );
      if (superContribution) {
        contributions.push(superContribution);
        totalEmployerContributions += superContribution.employerAmount;
      }
      
      // Calculate Payroll Tax
      const payrollTaxContribution = await this.calculatePayrollTax(
        employee,
        grossPay,
        payPeriod,
        statutoryRates,
        companyId
      );
      if (payrollTaxContribution) {
        contributions.push(payrollTaxContribution);
        totalEmployerContributions += payrollTaxContribution.employerAmount;
      }
      
      // Calculate Workers Compensation
      const workersCompContribution = await this.calculateWorkersCompensation(
        employee,
        grossPay,
        payPeriod,
        statutoryRates
      );
      if (workersCompContribution) {
        contributions.push(workersCompContribution);
        totalEmployerContributions += workersCompContribution.employerAmount;
      }
      
      // Calculate other statutory contributions
      const otherContributions = await this.calculateOtherContributions(
        employee,
        grossPay,
        taxableIncome,
        payPeriod,
        statutoryRates
      );
      
      for (const contribution of otherContributions) {
        contributions.push(contribution);
        if (contribution.employerAmount > 0) {
          totalEmployerContributions += contribution.employerAmount;
        }
        if (contribution.employeeAmount > 0) {
          totalEmployeeWithholdings += contribution.employeeAmount;
        }
      }
      
      return {
        contributions,
        totalEmployerContributions,
        totalEmployeeWithholdings,
        netPay: grossPay - totalEmployeeWithholdings,
        totalCostToEmployer: grossPay + totalEmployerContributions
      };
      
    } catch (error) {
      console.error('Error calculating statutory contributions:', error);
      throw new Error(`Failed to calculate statutory contributions: ${error.message}`);
    }
  }
  
  /**
   * Calculate PAYG Withholding
   */
  private async calculatePAYGWithholding(
    employee: PayrollEmployee,
    taxableIncome: number,
    payPeriod: { startDate: Date; endDate: Date; frequency: string },
    statutoryRates: StatutoryRate[]
  ): Promise<StatutoryContribution | null> {
    try {
      // Get PAYG withholding rates
      const paygRate = statutoryRates.find(rate => 
        rate.contributionType === 'payg-withholding' && rate.isActive
      );
      
      if (!paygRate) {
        throw new Error('PAYG withholding rates not found');
      }
      
      // Calculate withholding based on tax scales
      const withholdingAmount = await this.calculateTaxWithholding(
        employee,
        taxableIncome,
        payPeriod.frequency,
        payPeriod.startDate
      );
      
      return {
        id: '', // Will be set by database
        employeeId: employee.id,
        companyId: (employee as any).companyId,
        contributionType: 'payg-withholding',
        contributionName: 'PAYG Withholding',
        employerAmount: 0,
        employeeAmount: withholdingAmount,
        calculationBase: taxableIncome,
        rateApplied: 0, // Complex calculation, stored in details
        periodStart: payPeriod.startDate,
        periodEnd: payPeriod.endDate,
        paymentDueDate: this.getPAYGPaymentDueDate(payPeriod.endDate),
        liabilityAccount: '2-2000', // PAYG Withholding Payable
        expenseAccount: '', // No employer expense for PAYG
        status: 'calculated',
        calculationDetails: {
          taxableIncome,
          payPeriod: payPeriod.frequency,
          taxScaleUsed: this.getTaxScale(employee),
          medicareLevy: this.calculateMedicareLevy(taxableIncome, payPeriod.frequency),
          helpDebt: this.calculateHELPDebt(taxableIncome, employee),
          sfssDebt: this.calculateSFSSDebt(taxableIncome, employee)
        },
        isReportable: true,
        stpCategory: 'PAYG',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error calculating PAYG withholding:', error);
      throw new Error(`Failed to calculate PAYG withholding: ${error.message}`);
    }
  }
  
  /**
   * Calculate Superannuation Guarantee
   */
  private async calculateSuperannuationGuarantee(
    employee: PayrollEmployee,
    grossPay: number,
    payPeriod: { startDate: Date; endDate: Date; frequency: string },
    statutoryRates: StatutoryRate[]
  ): Promise<StatutoryContribution | null> {
    try {
      // Get superannuation guarantee rate
      const superRate = statutoryRates.find(rate => 
        rate.contributionType === 'superannuation-guarantee' && rate.isActive
      );
      
      if (!superRate) {
        throw new Error('Superannuation guarantee rate not found');
      }
      
      // Calculate ordinary time earnings (OTE)
      const ordinaryTimeEarnings = this.calculateOrdinaryTimeEarnings(employee, grossPay, payPeriod);
      
      // Calculate superannuation amount
      const superAmount = ordinaryTimeEarnings * superRate.rate;
      
      // Check for maximum contribution base
      const maxContributionBase = await this.getMaximumContributionBase(payPeriod.startDate);
      const quarterlyCap = maxContributionBase / 4; // Approximate quarterly cap
      
      let cappedAmount = superAmount;
      if (superAmount > quarterlyCap) {
        cappedAmount = quarterlyCap;
      }
      
      return {
        id: '',
        employeeId: employee.id,
        companyId: (employee as any).companyId,
        contributionType: 'superannuation-guarantee',
        contributionName: 'Superannuation Guarantee',
        employerAmount: cappedAmount,
        employeeAmount: 0,
        calculationBase: ordinaryTimeEarnings,
        rateApplied: superRate.rate,
        periodStart: payPeriod.startDate,
        periodEnd: payPeriod.endDate,
        paymentDueDate: this.getSuperPaymentDueDate(payPeriod.endDate),
        liabilityAccount: '2-3000', // Superannuation Payable
        expenseAccount: '6-5000', // Superannuation Expense
        status: 'calculated',
        calculationDetails: {
          ordinaryTimeEarnings,
          superRate: superRate.rate,
          originalAmount: superAmount,
          cappedAmount,
          quarterlyCap,
          maximumContributionBase: maxContributionBase,
          fundDetails: (employee as any).superFundDetails
        },
        isReportable: true,
        stpCategory: 'Superannuation',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error calculating superannuation guarantee:', error);
      throw new Error(`Failed to calculate superannuation guarantee: ${error.message}`);
    }
  }
  
  /**
   * Calculate Payroll Tax
   */
  private async calculatePayrollTax(
    employee: PayrollEmployee,
    grossPay: number,
    payPeriod: { startDate: Date; endDate: Date; frequency: string },
    statutoryRates: StatutoryRate[],
    companyId: string
  ): Promise<StatutoryContribution | null> {
    try {
      // Get payroll tax rates for the state
      const payrollTaxRates = statutoryRates.filter(rate => 
        rate.contributionType === 'payroll-tax' && 
        rate.isActive &&
        rate.applicableStates?.includes(employee.state)
      );
      
      if (!payrollTaxRates || payrollTaxRates.length === 0) {
        return null; // No payroll tax for this state
      }
      
      // Get company's payroll tax configuration
      const companyPayrollTaxConfig = await this.getCompanyPayrollTaxConfig(companyId);
      
      // Check if company is over the threshold
      const monthlyWages = await this.getMonthlyWages(companyId, payPeriod.startDate);
      const threshold = payrollTaxRates[0].threshold || 0;
      
      if (monthlyWages <= threshold) {
        return null; // Below threshold, no payroll tax
      }
      
      // Calculate taxable wages (varies by state)
      const taxableWages = this.calculateTaxableWages(employee, grossPay, payrollTaxRates[0]);
      
      // Calculate payroll tax amount
      const taxRate = payrollTaxRates[0].rate;
      const payrollTaxAmount = taxableWages * taxRate;
      
      return {
        id: '',
        employeeId: employee.id,
        companyId: employee.companyId,
        contributionType: 'payroll-tax',
        contributionName: `Payroll Tax - ${employee.state}`,
        employerAmount: payrollTaxAmount,
        employeeAmount: 0,
        calculationBase: taxableWages,
        rateApplied: taxRate,
        periodStart: payPeriod.startDate,
        periodEnd: payPeriod.endDate,
        paymentDueDate: this.getPayrollTaxPaymentDueDate(payPeriod.endDate, employee.state),
        liabilityAccount: '2-4000', // Payroll Tax Payable
        expenseAccount: '6-6000', // Payroll Tax Expense
        status: 'calculated',
        calculationDetails: {
          monthlyWages,
          threshold,
          taxableWages,
          taxRate,
          state: employee.state,
          exemptions: this.getPayrollTaxExemptions(employee),
          deductions: this.getPayrollTaxDeductions(employee)
        },
        isReportable: true,
        stpCategory: 'PayrollTax',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error calculating payroll tax:', error);
      throw new Error(`Failed to calculate payroll tax: ${error.message}`);
    }
  }
  
  /**
   * Calculate Workers Compensation
   */
  private async calculateWorkersCompensation(
    employee: PayrollEmployee,
    grossPay: number,
    payPeriod: { startDate: Date; endDate: Date; frequency: string },
    statutoryRates: StatutoryRate[]
  ): Promise<StatutoryContribution | null> {
    try {
      // Get workers compensation rates for the industry
      const workersCompRates = statutoryRates.filter(rate => 
        rate.contributionType === 'workers-compensation' && 
        rate.isActive &&
        rate.applicableIndustries?.includes(employee.industryCode)
      );
      
      if (!workersCompRates || workersCompRates.length === 0) {
        // Try to get default rate
        const defaultRate = statutoryRates.find(rate => 
          rate.contributionType === 'workers-compensation' && 
          rate.isActive &&
          !rate.applicableIndustries
        );
        
        if (!defaultRate) {
          return null; // No workers compensation rate available
        }
        workersCompRates.push(defaultRate);
      }
      
      // Calculate premium rate (usually per $100 of wages)
      const premiumRate = workersCompRates[0].rate;
      const premiumBase = workersCompRates[0].calculationBase || 100;
      
      // Calculate workers compensation premium
      const compensationAmount = (grossPay * premiumRate) / premiumBase;
      
      return {
        id: '',
        employeeId: employee.id,
        companyId: employee.companyId,
        contributionType: 'workers-compensation',
        contributionName: 'Workers Compensation',
        employerAmount: compensationAmount,
        employeeAmount: 0,
        calculationBase: grossPay,
        rateApplied: premiumRate,
        periodStart: payPeriod.startDate,
        periodEnd: payPeriod.endDate,
        paymentDueDate: this.getWorkersCompPaymentDueDate(payPeriod.endDate),
        liabilityAccount: '2-5000', // Workers Compensation Payable
        expenseAccount: '6-7000', // Workers Compensation Expense
        status: 'calculated',
        calculationDetails: {
          premiumRate,
          premiumBase,
          industryCode: employee.industryCode,
          state: employee.state,
          wageClassification: this.getWageClassification(employee)
        },
        isReportable: true,
        stpCategory: 'WorkersCompensation',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error calculating workers compensation:', error);
      throw new Error(`Failed to calculate workers compensation: ${error.message}`);
    }
  }
  
  /**
   * Calculate other statutory contributions
   */
  private async calculateOtherContributions(
    employee: PayrollEmployee,
    grossPay: number,
    taxableIncome: number,
    payPeriod: { startDate: Date; endDate: Date; frequency: string },
    statutoryRates: StatutoryRate[]
  ): Promise<StatutoryContribution[]> {
    const contributions: StatutoryContribution[] = [];
    
    // Calculate other contributions based on employee circumstances
    const otherRateTypes = [
      'help-debt',
      'sfss-debt',
      'medicare-levy',
      'medicare-levy-surcharge',
      'leave-loading-tax',
      'overtime-tax',
      'allowance-tax'
    ];
    
    for (const rateType of otherRateTypes) {
      const rates = statutoryRates.filter(rate => 
        rate.contributionType === rateType && rate.isActive
      );
      
      if (rates.length > 0) {
        const contribution = await this.calculateSpecificContribution(
          employee,
          grossPay,
          taxableIncome,
          payPeriod,
          rates[0]
        );
        
        if (contribution) {
          contributions.push(contribution);
        }
      }
    }
    
    return contributions;
  }
  
  /**
   * Calculate specific contribution type
   */
  private async calculateSpecificContribution(
    employee: PayrollEmployee,
    grossPay: number,
    taxableIncome: number,
    payPeriod: { startDate: Date; endDate: Date; frequency: string },
    rate: StatutoryRate
  ): Promise<StatutoryContribution | null> {
    try {
      let amount = 0;
      let calculationBase = 0;
      
      switch (rate.contributionType) {
        case 'help-debt':
          if (employee.hasHELPDebt) {
            calculationBase = taxableIncome;
            amount = this.calculateHELPDebt(taxableIncome, employee, rate.rate);
          }
          break;
          
        case 'sfss-debt':
          if (employee.hasSFSSDebt) {
            calculationBase = taxableIncome;
            amount = this.calculateSFSSDebt(taxableIncome, employee, rate.rate);
          }
          break;
          
        case 'medicare-levy':
          calculationBase = taxableIncome;
          amount = this.calculateMedicareLevy(taxableIncome, payPeriod.frequency);
          break;
          
        case 'medicare-levy-surcharge':
          if (this.isSubjectToMLS(employee, taxableIncome)) {
            calculationBase = taxableIncome;
            amount = this.calculateMedicareLevySurcharge(taxableIncome, employee, rate.rate);
          }
          break;
          
        default:
          return null;
      }
      
      if (amount === 0) {
        return null;
      }
      
      return {
        id: '',
        employeeId: employee.id,
        companyId: employee.companyId,
        contributionType: rate.contributionType,
        contributionName: rate.name,
        employerAmount: 0,
        employeeAmount: amount,
        calculationBase,
        rateApplied: rate.rate,
        periodStart: payPeriod.startDate,
        periodEnd: payPeriod.endDate,
        paymentDueDate: this.getContributionPaymentDueDate(rate.contributionType, payPeriod.endDate),
        liabilityAccount: rate.liabilityAccount,
        expenseAccount: rate.expenseAccount,
        status: 'calculated',
        calculationDetails: {
          rateType: rate.contributionType,
          originalRate: rate.rate,
          applicableThresholds: rate.thresholds,
          employeeCircumstances: this.getEmployeeCircumstances(employee)
        },
        isReportable: rate.isReportable,
        stpCategory: this.getSTPCategory(rate.contributionType),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error(`Error calculating ${rate.contributionType}:`, error);
      throw new Error(`Failed to calculate ${rate.contributionType}: ${error.message}`);
    }
  }
  
  /**
   * Helper methods for calculations
   */
  
  private async getApplicableStatutoryRates(
    effectiveDate: Date,
    companyId: string,
    state: string
  ): Promise<StatutoryRate[]> {
    const { data, error } = await supabase
      .from('statutory_rates')
      .select('*')
      .eq('is_active', true)
      .lte('effective_from', effectiveDate.toISOString())
      .or(`effective_to.is.null,effective_to.gte.${effectiveDate.toISOString()}`)
      .or(`applicable_states.cs.{${state}},applicable_states.is.null`)
      .order('effective_from', { ascending: false });
      
    if (error) {
      throw new Error(`Failed to fetch statutory rates: ${error.message}`);
    }
    
    return data || [];
  }
  
  private async calculateTaxWithholding(
    employee: PayrollEmployee,
    taxableIncome: number,
    payFrequency: string,
    paymentDate: Date
  ): Promise<number> {
    // Simplified tax calculation - in production, use proper tax tables
    const annualIncome = taxableIncome * this.getPayPeriodsPerYear(payFrequency);
    
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
    return Math.round((tax / payPeriodsPerYear) * 100) / 100;
  }
  
  private getPayPeriodsPerYear(frequency: string): number {
    switch (frequency.toLowerCase()) {
      case 'weekly': return 52;
      case 'fortnightly': return 26;
      case 'monthly': return 12;
      case 'quarterly': return 4;
      default: return 26;
    }
  }
  
  private calculateOrdinaryTimeEarnings(
    employee: PayrollEmployee,
    grossPay: number,
    payPeriod: { startDate: Date; endDate: Date; frequency: string }
  ): number {
    // OTE excludes overtime and some allowances
    // This is a simplified calculation
    return grossPay; // In production, exclude non-OTE components
  }
  
  private async getMaximumContributionBase(paymentDate: Date): Promise<number> {
    // Maximum contribution base changes annually
    const year = paymentDate.getFullYear();
    
    // 2023-24 maximum contribution base is $62,270 per quarter
    return 62270;
  }
  
  private async getCompanyPayrollTaxConfig(companyId: string): Promise<any> {
    // Get company-specific payroll tax configuration
    const { data, error } = await supabase
      .from('company_payroll_tax_config')
      .select('*')
      .eq('company_id', companyId)
      .single();
      
    if (error) {
      return null; // Use default configuration
    }
    
    return data;
  }
  
  private async getMonthlyWages(companyId: string, date: Date): Promise<number> {
    // Calculate total wages for the month
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const { data, error } = await supabase
      .from('payslips')
      .select('gross_pay')
      .eq('company_id', companyId)
      .gte('pay_period_start', startOfMonth.toISOString())
      .lte('pay_period_end', endOfMonth.toISOString())
      .eq('status', 'paid');
      
    if (error) {
      return 0;
    }
    
    return data.reduce((sum, record) => sum + record.gross_pay, 0);
  }
  
  private calculateTaxableWages(employee: PayrollEmployee, grossPay: number, rate: StatutoryRate): number {
    // Calculate wages subject to payroll tax
    // Varies by state and may include/exclude certain components
    return grossPay; // Simplified - adjust based on state requirements
  }
  
  private getPAYGPaymentDueDate(payPeriodEnd: Date): Date {
    // PAYG is due by the 21st of the following month
    return new Date(payPeriodEnd.getFullYear(), payPeriodEnd.getMonth() + 1, 21);
  }
  
  private getSuperPaymentDueDate(payPeriodEnd: Date): Date {
    // Super is due by the 28th of the following month
    return new Date(payPeriodEnd.getFullYear(), payPeriodEnd.getMonth() + 1, 28);
  }
  
  private getPayrollTaxPaymentDueDate(payPeriodEnd: Date, state: string): Date {
    // Varies by state - typically monthly or quarterly
    return new Date(payPeriodEnd.getFullYear(), payPeriodEnd.getMonth() + 1, 7);
  }
  
  private getWorkersCompPaymentDueDate(payPeriodEnd: Date): Date {
    // Usually annual or based on policy
    return new Date(payPeriodEnd.getFullYear() + 1, payPeriodEnd.getMonth(), payPeriodEnd.getDate());
  }
  
  private getContributionPaymentDueDate(contributionType: string, payPeriodEnd: Date): Date {
    // Default to following month
    return new Date(payPeriodEnd.getFullYear(), payPeriodEnd.getMonth() + 1, 21);
  }
  
  private getTaxScale(employee: PayrollEmployee): string {
    // Determine appropriate tax scale based on employee circumstances
    if (employee.hasHELPDebt) return 'TaxScale2';
    if (employee.hasSFSSDebt) return 'TaxScale3';
    return 'TaxScale1';
  }
  
  private calculateMedicareLevy(taxableIncome: number, payFrequency: string): number {
    const annualIncome = taxableIncome * this.getPayPeriodsPerYear(payFrequency);
    
    // Medicare levy is 2% of taxable income above threshold
    const threshold = 23226; // 2023-24 threshold for singles
    
    if (annualIncome <= threshold) {
      return 0;
    }
    
    const medicareLevy = (taxableIncome * 0.02);
    return Math.round(medicareLevy * 100) / 100;
  }
  
  private calculateHELPDebt(taxableIncome: number, employee: PayrollEmployee): number {
    if (!employee.hasHELPDebt) return 0;
    
    const annualIncome = taxableIncome * this.getPayPeriodsPerYear(employee.payFrequency || 'fortnightly');
    
    // HELP repayment rates vary by income level
    let repaymentRate = 0;
    if (annualIncome > 51550) repaymentRate = 0.01;
    if (annualIncome > 59421) repaymentRate = 0.02;
    if (annualIncome > 64420) repaymentRate = 0.025;
    if (annualIncome > 70455) repaymentRate = 0.03;
    if (annualIncome > 76050) repaymentRate = 0.035;
    if (annualIncome > 82434) repaymentRate = 0.04;
    if (annualIncome > 88547) repaymentRate = 0.045;
    if (annualIncome > 96377) repaymentRate = 0.05;
    if (annualIncome > 105438) repaymentRate = 0.055;
    if (annualIncome > 114694) repaymentRate = 0.06;
    if (annualIncome > 123966) repaymentRate = 0.065;
    if (annualIncome > 133264) repaymentRate = 0.07;
    if (annualIncome > 142583) repaymentRate = 0.075;
    if (annualIncome > 151947) repaymentRate = 0.08;
    if (annualIncome > 161311) repaymentRate = 0.085;
    if (annualIncome > 170677) repaymentRate = 0.09;
    if (annualIncome > 180044) repaymentRate = 0.095;
    if (annualIncome > 189414) repaymentRate = 0.10;
    
    const helpRepayment = taxableIncome * repaymentRate;
    return Math.round(helpRepayment * 100) / 100;
  }
  
  private calculateSFSSDebt(taxableIncome: number, employee: PayrollEmployee): number {
    if (!employee.hasSFSSDebt) return 0;
    
    // SFSS (Student Financial Supplement Scheme) repayment
    // Similar to HELP but different rates
    const annualIncome = taxableIncome * this.getPayPeriodsPerYear(employee.payFrequency || 'fortnightly');
    
    let repaymentRate = 0;
    if (annualIncome > 51550) repaymentRate = 0.02;
    if (annualIncome > 64420) repaymentRate = 0.03;
    if (annualIncome > 70455) repaymentRate = 0.04;
    if (annualIncome > 82434) repaymentRate = 0.05;
    
    const sfssRepayment = taxableIncome * repaymentRate;
    return Math.round(sfssRepayment * 100) / 100;
  }
  
  private isSubjectToMLS(employee: PayrollEmployee, taxableIncome: number): boolean {
    // Medicare Levy Surcharge applies to high-income earners without private health insurance
    const annualIncome = taxableIncome * this.getPayPeriodsPerYear(employee.payFrequency || 'fortnightly');
    
    const mlsThreshold = 90000; // Singles threshold for 2023-24
    
    return annualIncome > mlsThreshold && !employee.hasPrivateHealthInsurance;
  }
  
  private calculateMedicareLevySurcharge(taxableIncome: number, employee: PayrollEmployee, rate: number): number {
    const surcharge = taxableIncome * rate;
    return Math.round(surcharge * 100) / 100;
  }
  
  private getPayrollTaxExemptions(employee: PayrollEmployee): string[] {
    // Return applicable payroll tax exemptions based on employee type
    const exemptions: string[] = [];
    
    if (employee.employmentType === 'Apprentice') {
      exemptions.push('Apprentice Wages');
    }
    
    if (employee.isExemptFromPayrollTax) {
      exemptions.push('Exempt Employee');
    }
    
    return exemptions;
  }
  
  private getPayrollTaxDeductions(employee: PayrollEmployee): string[] {
    // Return applicable payroll tax deductions
    const deductions: string[] = [];
    
    if (employee.employmentType === 'Trainee') {
      deductions.push('Trainee Deduction');
    }
    
    return deductions;
  }
  
  private getWageClassification(employee: PayrollEmployee): string {
    // Classify wages for workers compensation purposes
    if (employee.jobClassification) {
      return employee.jobClassification;
    }
    
    return 'Clerical - Office Worker'; // Default classification
  }
  
  private getEmployeeCircumstances(employee: PayrollEmployee): any {
    return {
      employmentType: employee.employmentType,
      hasHELPDebt: employee.hasHELPDebt,
      hasSFSSDebt: employee.hasSFSSDebt,
      hasPrivateHealthInsurance: employee.hasPrivateHealthInsurance,
      isExemptFromPayrollTax: employee.isExemptFromPayrollTax,
      taxFileNumber: employee.taxFileNumber ? 'Provided' : 'Not Provided'
    };
  }
  
  private getSTPCategory(contributionType: string): string {
    const categoryMap: { [key: string]: string } = {
      'payg-withholding': 'PAYG',
      'superannuation-guarantee': 'Superannuation',
      'payroll-tax': 'PayrollTax',
      'workers-compensation': 'WorkersCompensation',
      'help-debt': 'HELP',
      'sfss-debt': 'SFSS',
      'medicare-levy': 'Medicare',
      'medicare-levy-surcharge': 'MedicareSurcharge'
    };
    
    return categoryMap[contributionType] || 'Other';
  }
  
  /**
   * Create statutory contribution record
   */
  async createContribution(contribution: Omit<StatutoryContribution, 'id' | 'createdAt' | 'updatedAt'>): Promise<StatutoryContribution> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('statutory_contributions')
        .insert([{
          ...contribution,
          created_at: now,
          updated_at: now,
          company_id: (contribution as any).companyId || contribution.company_id
        }])
        .select()
        .single();
        
      if (error) {
        throw new Error(`Failed to create statutory contribution: ${error.message}`);
      }
      
      await auditService.logAction(
        'statutory_contributions',
        data.id,
        'INSERT',
        {},
        contribution,
        'system'
      );
      
      return data;
      
    } catch (error) {
      console.error('Error creating statutory contribution:', error);
      throw error;
    }
  }
  
  /**
   * Get statutory contribution by ID
   */
  async getContributionById(id: string): Promise<StatutoryContribution | null> {
    const { data, error } = await supabase
      .from('statutory_contributions')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch statutory contribution: ${error.message}`);
    }
    
    return data;
  }
  
  /**
   * Get statutory contributions by employee
   */
  async getContributionsByEmployee(employeeId: string): Promise<StatutoryContribution[]> {
    const { data, error } = await supabase
      .from('statutory_contributions')
      .select('*')
      .eq('employee_id', employeeId)
      .order('period_start', { ascending: false });
      
    if (error) {
      throw new Error(`Failed to fetch employee statutory contributions: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Get statutory contributions by company and period
   */
  async getContributionsByCompanyAndPeriod(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StatutoryContribution[]> {
    const { data, error } = await supabase
      .from('statutory_contributions')
      .select('*')
      .eq('company_id', companyId)
      .gte('period_start', startDate.toISOString())
      .lte('period_end', endDate.toISOString())
      .order('period_start', { ascending: true });
      
    if (error) {
      throw new Error(`Failed to fetch company statutory contributions: ${error.message}`);
    }
    
    return data || [];
  }
}

export const statutoryContributionsService = new StatutoryContributionsService();