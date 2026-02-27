import { supabase } from '../lib/supabase';
import { 
  StatutoryRate,
  StatutoryThreshold,
  StatutoryExemption,
  StatutoryPaymentSchedule,
  StatutoryReportingRequirement,
  StatutoryContributionType
} from '../types/statutory';
import { auditService } from './auditService';

export class StatutoryTablesService {
  /**
   * Get all statutory rates for a specific contribution type and date
   */
  async getStatutoryRates(
    rateType: StatutoryContributionType,
    effectiveDate: Date,
    filters?: {
      state?: string;
      industry?: string;
      employmentType?: string;
      isActive?: boolean;
    }
  ): Promise<StatutoryRate[]> {
    try {
      let query = supabase
        .from('statutory_rates')
        .select('*')
        .eq('rate_type', rateType)
        .lte('effective_from', effectiveDate.toISOString())
        .or(`effective_to.is.null,effective_to.gte.${effectiveDate.toISOString()}`);

      // Apply additional filters
      if (filters?.state) {
        query = query.contains('applicable_states', [filters.state]);
      }
      if (filters?.industry) {
        query = query.contains('applicable_industries', [filters.industry]);
      }
      if (filters?.employmentType) {
        query = query.contains('applicable_employment_types', [filters.employmentType]);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query.order('effective_from', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch statutory rates: ${error.message}`);
      }

      return (data || []).map(this.mapFromDb);
    } catch (error) {
      console.error('Error fetching statutory rates:', error);
      throw error;
    }
  }

  /**
   * Get a specific statutory rate by ID
   */
  async getStatutoryRateById(id: string): Promise<StatutoryRate | null> {
    try {
      const { data, error } = await supabase
        .from('statutory_rates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch statutory rate: ${error.message}`);
      }

      return this.mapFromDb(data);
    } catch (error) {
      console.error('Error fetching statutory rate by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new statutory rate
   */
  async createStatutoryRate(rate: Omit<StatutoryRate, 'id' | 'createdAt' | 'updatedAt'>): Promise<StatutoryRate> {
    try {
      // Validate the rate data
      this.validateStatutoryRate(rate);

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('statutory_rates')
        .insert([{
          ...this.mapToDb(rate),
          created_at: now,
          updated_at: now
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create statutory rate: ${error.message}`);
      }

      await auditService.logAction(
        'statutory_rates',
        data.id,
        'INSERT',
        {},
        rate,
        'system'
      );

      return this.mapFromDb(data);
    } catch (error) {
      console.error('Error creating statutory rate:', error);
      throw error;
    }
  }

  /**
   * Update an existing statutory rate
   */
  async updateStatutoryRate(id: string, updates: Partial<StatutoryRate>): Promise<StatutoryRate> {
    try {
      const existingRate = await this.getStatutoryRateById(id);
      if (!existingRate) {
        throw new Error('Statutory rate not found');
      }

      // Validate the updates
      this.validateStatutoryRate({ ...existingRate, ...updates });

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('statutory_rates')
        .update({
          ...this.mapToDb(updates),
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update statutory rate: ${error.message}`);
      }

      await auditService.logAction(
        'statutory_rates',
        id,
        'UPDATE',
        existingRate,
        updates,
        'system'
      );

      return this.mapFromDb(data);
    } catch (error) {
      console.error('Error updating statutory rate:', error);
      throw error;
    }
  }

  /**
   * Get statutory thresholds
   */
  async getStatutoryThresholds(
    contributionType: StatutoryContributionType,
    applicableYear: string
  ): Promise<StatutoryThreshold[]> {
    try {
      const { data, error } = await supabase
        .from('statutory_thresholds')
        .select('*')
        .eq('contribution_type', contributionType)
        .eq('applicable_year', applicableYear)
        .order('threshold_value', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch statutory thresholds: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching statutory thresholds:', error);
      throw error;
    }
  }

  /**
   * Create a new statutory threshold
   */
  async createStatutoryThreshold(
    threshold: Omit<StatutoryThreshold, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<StatutoryThreshold> {
    try {
      this.validateStatutoryThreshold(threshold);

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('statutory_thresholds')
        .insert([{
          ...threshold,
          created_at: now,
          updated_at: now
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create statutory threshold: ${error.message}`);
      }

      await auditService.logAction(
        'statutory_thresholds',
        data.id,
        'INSERT',
        {},
        threshold,
        'system'
      );

      return data;
    } catch (error) {
      console.error('Error creating statutory threshold:', error);
      throw error;
    }
  }

  /**
   * Get statutory exemptions
   */
  async getStatutoryExemptions(
    contributionType: StatutoryContributionType,
    effectiveDate: Date
  ): Promise<StatutoryExemption[]> {
    try {
      const { data, error } = await supabase
        .from('statutory_exemptions')
        .select('*')
        .eq('contribution_type', contributionType)
        .lte('effective_from', effectiveDate.toISOString())
        .or(`effective_to.is.null,effective_to.gte.${effectiveDate.toISOString()}`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch statutory exemptions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching statutory exemptions:', error);
      throw error;
    }
  }

  /**
   * Create a new statutory exemption
   */
  async createStatutoryExemption(
    exemption: Omit<StatutoryExemption, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<StatutoryExemption> {
    try {
      this.validateStatutoryExemption(exemption);

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('statutory_exemptions')
        .insert([{
          ...exemption,
          created_at: now,
          updated_at: now
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create statutory exemption: ${error.message}`);
      }

      await auditService.logAction(
        'statutory_exemptions',
        data.id,
        'INSERT',
        {},
        exemption,
        'system'
      );

      return data;
    } catch (error) {
      console.error('Error creating statutory exemption:', error);
      throw error;
    }
  }

  /**
   * Get payment schedules for a company
   */
  async getPaymentSchedules(companyId: string): Promise<StatutoryPaymentSchedule[]> {
    try {
      const { data, error } = await supabase
        .from('statutory_payment_schedules')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('contribution_type', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch payment schedules: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching payment schedules:', error);
      throw error;
    }
  }

  /**
   * Create a new payment schedule
   */
  async createPaymentSchedule(
    schedule: Omit<StatutoryPaymentSchedule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<StatutoryPaymentSchedule> {
    try {
      this.validatePaymentSchedule(schedule);

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('statutory_payment_schedules')
        .insert([{
          ...schedule,
          created_at: now,
          updated_at: now
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create payment schedule: ${error.message}`);
      }

      await auditService.logAction(
        'statutory_payment_schedules',
        data.id,
        'INSERT',
        {},
        schedule,
        'system'
      );

      return data;
    } catch (error) {
      console.error('Error creating payment schedule:', error);
      throw error;
    }
  }

  /**
   * Get reporting requirements
   */
  async getReportingRequirements(
    contributionType?: StatutoryContributionType
  ): Promise<StatutoryReportingRequirement[]> {
    try {
      let query = supabase
        .from('statutory_reporting_requirements')
        .select('*')
        .eq('is_active', true);

      if (contributionType) {
        query = query.eq('contribution_type', contributionType);
      }

      const { data, error } = await query.order('report_name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch reporting requirements: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching reporting requirements:', error);
      throw error;
    }
  }

  /**
   * Create a new reporting requirement
   */
  async createReportingRequirement(
    requirement: Omit<StatutoryReportingRequirement, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<StatutoryReportingRequirement> {
    try {
      this.validateReportingRequirement(requirement);

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('statutory_reporting_requirements')
        .insert([{
          ...requirement,
          created_at: now,
          updated_at: now
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create reporting requirement: ${error.message}`);
      }

      await auditService.logAction(
        'statutory_reporting_requirements',
        data.id,
        'INSERT',
        {},
        requirement,
        'system'
      );

      return data;
    } catch (error) {
      console.error('Error creating reporting requirement:', error);
      throw error;
    }
  }

  /**
   * Get current tax rates for a specific state and financial year
   */
  async getCurrentTaxRates(
    state: string,
    financialYear: string,
    employmentType?: string
  ): Promise<{
    payg: StatutoryRate[];
    superannuation: StatutoryRate[];
    payrollTax: StatutoryRate[];
    workersComp: StatutoryRate[];
  }> {
    try {
      const effectiveDate = this.getFinancialYearStart(financialYear);

      const [payg, superannuation, payrollTax, workersComp] = await Promise.all([
        this.getStatutoryRates('payg-withholding', effectiveDate, {
          state,
          employmentType,
          isActive: true
        }),
        this.getStatutoryRates('superannuation-guarantee', effectiveDate, {
          isActive: true
        }),
        this.getStatutoryRates('payroll-tax', effectiveDate, {
          state,
          isActive: true
        }),
        this.getStatutoryRates('workers-compensation', effectiveDate, {
          state,
          employmentType,
          isActive: true
        })
      ]);

      return {
        payg,
        superannuation,
        payrollTax,
        workersComp
      };
    } catch (error) {
      console.error('Error fetching current tax rates:', error);
      throw error;
    }
  }

  /**
   * Get ATO tax tables for the current financial year
   */
  async getATOTaxTables(financialYear: string): Promise<{
    weekly: any[];
    fortnightly: any[];
    monthly: any[];
  }> {
    try {
      const effectiveDate = this.getFinancialYearStart(financialYear);

      // Get PAYG withholding rates and convert to tax table format
      const paygRates = await this.getStatutoryRates('payg-withholding', effectiveDate, {
        isActive: true
      });

      // Convert statutory rates to tax table format
      const weeklyTable = this.convertToTaxTable(paygRates, 'weekly');
      const fortnightlyTable = this.convertToTaxTable(paygRates, 'fortnightly');
      const monthlyTable = this.convertToTaxTable(paygRates, 'monthly');

      return {
        weekly: weeklyTable,
        fortnightly: fortnightlyTable,
        monthly: monthlyTable
      };
    } catch (error) {
      console.error('Error fetching ATO tax tables:', error);
      throw error;
    }
  }

  /**
   * Update statutory rates in bulk (for annual updates)
   */
  async updateStatutoryRatesBulk(
    updates: Array<{
      contributionType: StatutoryContributionType;
      rates: Omit<StatutoryRate, 'id' | 'createdAt' | 'updatedAt'>[];
      effectiveFrom: Date;
      effectiveTo?: Date;
    }>
  ): Promise<{ success: number; errors: string[] }> {
    const results = { success: 0, errors: [] as string[] };

    try {
      for (const update of updates) {
        try {
          // Deactivate existing rates for the same period
          await this.deactivateExistingRates(
            update.contributionType,
            update.effectiveFrom,
            update.effectiveTo
          );

          // Create new rates
          for (const rate of update.rates) {
            await this.createStatutoryRate({
              ...rate,
              effectiveFrom: update.effectiveFrom,
              effectiveTo: update.effectiveTo
            });
            results.success++;
          }
        } catch (error) {
          results.errors.push(`Error updating ${update.contributionType}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error in bulk update:', error);
      results.errors.push(`Bulk update failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Validate statutory rate data
   */
  private validateStatutoryRate(rate: any): void {
    if (!rate.rateType) {
      throw new Error('Rate type is required');
    }
    if (!rate.name) {
      throw new Error('Rate name is required');
    }
    if (rate.rate === undefined || rate.rate === null) {
      throw new Error('Rate is required');
    }
    if (rate.rate < 0) {
      throw new Error('Rate cannot be negative');
    }
    if (!rate.effectiveFrom) {
      throw new Error('Effective from date is required');
    }
    if (!rate.liabilityAccount) {
      throw new Error('Liability account is required');
    }
    if (!rate.expenseAccount) {
      throw new Error('Expense account is required');
    }
  }

  /**
   * Validate statutory threshold data
   */
  private validateStatutoryThreshold(threshold: any): void {
    if (!threshold.contributionType) {
      throw new Error('Contribution type is required');
    }
    if (!threshold.thresholdType) {
      throw new Error('Threshold type is required');
    }
    if (threshold.thresholdValue === undefined || threshold.thresholdValue === null) {
      throw new Error('Threshold value is required');
    }
    if (!threshold.comparisonOperator) {
      throw new Error('Comparison operator is required');
    }
    if (!threshold.applicableYear) {
      throw new Error('Applicable year is required');
    }
    if (!threshold.effectiveFrom) {
      throw new Error('Effective from date is required');
    }
  }

  /**
   * Validate statutory exemption data
   */
  private validateStatutoryExemption(exemption: any): void {
    if (!exemption.contributionType) {
      throw new Error('Contribution type is required');
    }
    if (!exemption.exemptionType) {
      throw new Error('Exemption type is required');
    }
    if (!exemption.exemptionCriteria) {
      throw new Error('Exemption criteria is required');
    }
    if (!exemption.effectiveFrom) {
      throw new Error('Effective from date is required');
    }
  }

  /**
   * Validate payment schedule data
   */
  private validatePaymentSchedule(schedule: any): void {
    if (!schedule.companyId) {
      throw new Error('Company ID is required');
    }
    if (!schedule.contributionType) {
      throw new Error('Contribution type is required');
    }
    if (!schedule.paymentFrequency) {
      throw new Error('Payment frequency is required');
    }
    if (schedule.paymentDay === undefined || schedule.paymentDay === null) {
      throw new Error('Payment day is required');
    }
    if (!schedule.paymentMethod) {
      throw new Error('Payment method is required');
    }
    if (!schedule.effectiveFrom) {
      throw new Error('Effective from date is required');
    }
  }

  /**
   * Validate reporting requirement data
   */
  private validateReportingRequirement(requirement: any): void {
    if (!requirement.contributionType) {
      throw new Error('Contribution type is required');
    }
    if (!requirement.reportName) {
      throw new Error('Report name is required');
    }
    if (!requirement.reportingAuthority) {
      throw new Error('Reporting authority is required');
    }
    if (!requirement.reportingFrequency) {
      throw new Error('Reporting frequency is required');
    }
    if (requirement.dueDate === undefined || requirement.dueDate === null) {
      throw new Error('Due date is required');
    }
    if (!requirement.format) {
      throw new Error('Format is required');
    }
    if (!requirement.method) {
      throw new Error('Method is required');
    }
    if (!requirement.effectiveFrom) {
      throw new Error('Effective from date is required');
    }
  }

  /**
   * Deactivate existing rates for the same period
   */
  private async deactivateExistingRates(
    rateType: StatutoryContributionType,
    effectiveFrom: Date,
    effectiveTo?: Date
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('statutory_rates')
        .update({ is_active: false })
        .eq('rate_type', rateType)
        .eq('is_active', true)
        .gte('effective_from', effectiveFrom.toISOString())
        .or(`effective_to.is.null,effective_to.lte.${effectiveTo?.toISOString() || effectiveFrom.toISOString()}`);

      if (error) {
        console.warn('Warning: Failed to deactivate existing rates:', error.message);
      }
    } catch (error) {
      console.warn('Warning: Error deactivating existing rates:', error);
    }
  }

  /**
   * Convert statutory rates to tax table format
   */
  private convertToTaxTable(rates: StatutoryRate[], payFrequency: string): any[] {
    // This is a simplified conversion - in production, this would be more complex
    return rates.map(rate => ({
      incomeFrom: rate.threshold || 0,
      incomeTo: rate.maximumAmount || 999999999,
      taxRate: rate.rate,
      payFrequency: payFrequency,
      description: rate.description || rate.name
    }));
  }

  /**
   * Map database record to StatutoryRate interface
   */
  private mapFromDb(record: any): StatutoryRate {
    return {
      id: record.id,
      rateType: record.rate_type,
      name: record.name,
      description: record.description,
      rate: Number(record.rate),
      calculationBase: record.calculation_base,
      threshold: record.threshold,
      maximumAmount: record.maximum_amount,
      applicableStates: record.applicable_states,
      applicableIndustries: record.applicable_industries,
      applicableEmploymentTypes: record.applicable_employment_types,
      effectiveFrom: new Date(record.effective_from),
      effectiveTo: record.effective_to ? new Date(record.effective_to) : undefined,
      isActive: record.is_active,
      liabilityAccount: record.liability_account,
      expenseAccount: record.expense_account,
      isReportable: record.is_reportable,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at)
    };
  }

  /**
   * Map StatutoryRate interface to database record
   */
  private mapToDb(rate: Partial<StatutoryRate>): any {
    const record: any = {};
    if (rate.rateType) record.rate_type = rate.rateType;
    if (rate.name) record.name = rate.name;
    if (rate.description !== undefined) record.description = rate.description;
    if (rate.rate !== undefined) record.rate = rate.rate;
    if (rate.calculationBase !== undefined) record.calculation_base = rate.calculationBase;
    if (rate.threshold !== undefined) record.threshold = rate.threshold;
    if (rate.maximumAmount !== undefined) record.maximum_amount = rate.maximumAmount;
    if (rate.applicableStates) record.applicable_states = rate.applicableStates;
    if (rate.applicableIndustries) record.applicable_industries = rate.applicableIndustries;
    if (rate.applicableEmploymentTypes) record.applicable_employment_types = rate.applicableEmploymentTypes;
    if (rate.effectiveFrom) record.effective_from = rate.effectiveFrom.toISOString();
    if (rate.effectiveTo) record.effective_to = rate.effectiveTo.toISOString();
    if (rate.isActive !== undefined) record.is_active = rate.isActive;
    if (rate.liabilityAccount) record.liability_account = rate.liabilityAccount;
    if (rate.expenseAccount) record.expense_account = rate.expenseAccount;
    if (rate.isReportable !== undefined) record.is_reportable = rate.isReportable;
    return record;
  }

  /**
   * Get financial year start date
   */
  private getFinancialYearStart(financialYear: string): Date {
    // Australian financial year runs from July 1 to June 30
    const [startYear] = financialYear.split('-');
    return new Date(parseInt(startYear), 6, 1); // July 1
  }
}

export const statutoryTablesService = new StatutoryTablesService();