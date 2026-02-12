import { supabase } from '../lib/supabase';
import { PayComponent, PayrollEmployee, PayrollCalculationResult } from '../types/payroll';
import { addDays, format, parseISO, differenceInDays, isWithinInterval } from 'date-fns';

export interface EarningsConfiguration {
  id: string;
  name: string;
  description: string;
  componentType: 'BaseSalary' | 'Overtime' | 'Allowance' | 'Bonus' | 'Commission' | 'LeaveLoading' | 'Other';
  calculationMethod: 'Fixed' | 'Hourly' | 'Daily' | 'Percentage' | 'Formula';
  rate: number;
  percentage?: number; // For percentage-based calculations
  formula?: string; // For formula-based calculations
  taxTreatment: 'Taxable' | 'NonTaxable' | 'Reportable' | 'SalarySacrifice';
  stpCategory: 'SAW' | 'OVT' | 'ALW' | 'BON' | 'COM' | 'LVE' | 'SUP' | 'OTH';
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  conditions?: {
    minimumHours?: number;
    maximumHours?: number;
    employmentTypes?: ('FullTime' | 'PartTime' | 'Casual')[];
    classifications?: string[];
    awards?: string[];
    dayOfWeek?: number[];
    timeRanges?: { start: string; end: string }[];
  };
  validationRules?: {
    minimumAmount?: number;
    maximumAmount?: number;
    requiresApproval?: boolean;
    approvalThreshold?: number;
  };
}

export interface EarningsCalculationRequest {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  hoursWorked?: number;
  daysWorked?: number;
  baseHourlyRate?: number;
  timesheetEntries?: Array<{
    date: string;
    hours: number;
    type: 'Regular' | 'Overtime' | 'PublicHoliday' | 'Weekend';
  }>;
  customInputs?: Record<string, any>;
}

export class EarningsManagementService {
  private earningsConfigurations: Map<string, EarningsConfiguration> = new Map();

  constructor() {
    this.loadEarningsConfigurations();
  }

  /**
   * Load earnings configurations from database
   */
  private async loadEarningsConfigurations(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('earnings_configurations')
        .select('*')
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to load earnings configurations: ${error.message}`);
      }

      this.earningsConfigurations.clear();
      data?.forEach(config => {
        this.earningsConfigurations.set(config.id, config);
      });
    } catch (error) {
      console.error('Error loading earnings configurations:', error);
      throw error;
    }
  }

  /**
   * Calculate earnings for an employee based on configuration
   */
  async calculateEarnings(request: EarningsCalculationRequest): Promise<PayComponent[]> {
    try {
      const { employeeId, periodStart, periodEnd } = request;
      
      // Get employee details
      const employee = await this.getEmployeeDetails(employeeId);
      if (!employee) {
        throw new Error(`Employee not found: ${employeeId}`);
      }

      // Get applicable earnings configurations
      const applicableConfigs = this.getApplicableConfigurations(employee, request);
      
      const payComponents: PayComponent[] = [];

      // Calculate each applicable earnings component
      for (const config of applicableConfigs) {
        const component = await this.calculateEarningsComponent(config, employee, request);
        if (component && component.amount > 0) {
          payComponents.push(component);
        }
      }

      return payComponents;
    } catch (error) {
      console.error('Error calculating earnings:', error);
      throw error;
    }
  }

  /**
   * Get employee details
   */
  private async getEmployeeDetails(employeeId: string): Promise<PayrollEmployee | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_employees')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch employee: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching employee details:', error);
      throw error;
    }
  }

  /**
   * Get applicable earnings configurations for employee
   */
  private getApplicableConfigurations(
    employee: PayrollEmployee,
    request: EarningsCalculationRequest
  ): EarningsConfiguration[] {
    const applicableConfigs: EarningsConfiguration[] = [];
    const currentDate = new Date();

    for (const config of this.earningsConfigurations.values()) {
      // Check if configuration is effective for the current period
      if (!this.isConfigurationEffective(config, request.periodStart, request.periodEnd)) {
        continue;
      }

      // Check employment type conditions
      if (config.conditions?.employmentTypes && 
          !config.conditions.employmentTypes.includes(employee.employmentType)) {
        continue;
      }

      // Check classification conditions
      if (config.conditions?.classifications && 
          !config.conditions.classifications.includes(employee.awardClassification || '')) {
        continue;
      }

      // Check award conditions
      if (config.conditions?.awards && employee.awardId) {
        // This would need to be implemented based on how awards are stored
        // For now, we'll skip this check
      }

      applicableConfigs.push(config);
    }

    return applicableConfigs;
  }

  /**
   * Check if configuration is effective for the given period
   */
  private isConfigurationEffective(
    config: EarningsConfiguration,
    periodStart: string,
    periodEnd: string
  ): boolean {
    const configStart = parseISO(config.effectiveFrom);
    const periodStartDate = parseISO(periodStart);
    const periodEndDate = parseISO(periodEnd);

    // Check if configuration start date is before or during the period
    if (configStart > periodEndDate) {
      return false;
    }

    // Check if configuration has an end date and if it's before the period
    if (config.effectiveTo) {
      const configEnd = parseISO(config.effectiveTo);
      if (configEnd < periodStartDate) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate individual earnings component
   */
  private async calculateEarningsComponent(
    config: EarningsConfiguration,
    employee: PayrollEmployee,
    request: EarningsCalculationRequest
  ): Promise<PayComponent | null> {
    try {
      let amount = 0;
      let units = 0;

      switch (config.calculationMethod) {
        case 'Fixed':
          amount = config.rate;
          units = 1;
          break;

        case 'Hourly':
          const hourlyRate = config.rate;
          const hoursWorked = request.hoursWorked || 0;
          amount = hourlyRate * hoursWorked;
          units = hoursWorked;
          break;

        case 'Daily':
          const dailyRate = config.rate;
          const daysWorked = request.daysWorked || 0;
          amount = dailyRate * daysWorked;
          units = daysWorked;
          break;

        case 'Percentage':
          const baseAmount = this.getBaseAmountForPercentage(config, employee, request);
          amount = baseAmount * (config.percentage || 0) / 100;
          units = 1;
          break;

        case 'Formula':
          amount = this.calculateFormulaAmount(config, employee, request);
          units = this.getFormulaUnits(config, request);
          break;
      }

      // Apply validation rules
      if (config.validationRules) {
        if (config.validationRules.minimumAmount && amount < config.validationRules.minimumAmount) {
          amount = config.validationRules.minimumAmount;
        }
        if (config.validationRules.maximumAmount && amount > config.validationRules.maximumAmount) {
          amount = config.validationRules.maximumAmount;
        }
      }

      // Round to 2 decimal places
      amount = Math.round(amount * 100) / 100;

      if (amount <= 0) {
        return null;
      }

      const payComponent: PayComponent = {
        id: `component-${config.id}-${Date.now()}`,
        payslipId: '', // Will be set when attached to payslip
        componentType: config.componentType,
        description: config.description,
        units,
        rate: config.rate,
        amount,
        taxTreatment: config.taxTreatment,
        stpCategory: config.stpCategory,
        isYtd: true,
        createdAt: new Date().toISOString()
      };

      return payComponent;
    } catch (error) {
      console.error(`Error calculating earnings component ${config.id}:`, error);
      return null;
    }
  }

  /**
   * Get base amount for percentage calculations
   */
  private getBaseAmountForPercentage(
    config: EarningsConfiguration,
    employee: PayrollEmployee,
    request: EarningsCalculationRequest
  ): number {
    // This would depend on the specific configuration
    // For example, percentage of base salary, or percentage of other earnings
    
    switch (config.componentType) {
      case 'LeaveLoading':
        // Typically calculated as percentage of base salary
        return employee.baseSalary / 52; // Weekly base salary
      
      case 'Bonus':
        // Could be percentage of base salary or other metrics
        return employee.baseSalary / 12; // Monthly base salary
      
      default:
        // Default to base salary
        return employee.baseSalary / 52; // Weekly base salary
    }
  }

  /**
   * Calculate amount using formula
   */
  private calculateFormulaAmount(
    config: EarningsConfiguration,
    employee: PayrollEmployee,
    request: EarningsCalculationRequest
  ): number {
    if (!config.formula) {
      return 0;
    }

    try {
      // Simple formula evaluation
      // In a real implementation, you might use a proper formula parser
      const variables = {
        baseSalary: employee.baseSalary,
        hoursWorked: request.hoursWorked || 0,
        daysWorked: request.daysWorked || 0,
        baseHourlyRate: request.baseHourlyRate || employee.baseSalary / (38 * 52), // Assuming 38 hour week
        ...request.customInputs
      };

      // Replace variables in formula
      let formula = config.formula;
      for (const [key, value] of Object.entries(variables)) {
        formula = formula.replace(new RegExp(`\\b${key}\\b`, 'g'), value.toString());
      }

      // Simple evaluation (be careful with security in production)
      // This is a simplified example - use a proper formula library in production
      const result = eval(formula);
      return isNaN(result) ? 0 : result;
    } catch (error) {
      console.error(`Error evaluating formula: ${config.formula}`, error);
      return 0;
    }
  }

  /**
   * Get units for formula calculations
   */
  private getFormulaUnits(config: EarningsConfiguration, request: EarningsCalculationRequest): number {
    // Determine units based on the formula and request data
    if (request.hoursWorked) {
      return request.hoursWorked;
    } else if (request.daysWorked) {
      return request.daysWorked;
    }
    return 1;
  }

  /**
   * Create new earnings configuration
   */
  async createEarningsConfiguration(
    config: Omit<EarningsConfiguration, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>
  ): Promise<EarningsConfiguration> {
    try {
      const newConfig = {
        ...config,
        id: `config-${Date.now()}`,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('earnings_configurations')
        .insert(newConfig)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create earnings configuration: ${error.message}`);
      }

      // Reload configurations
      await this.loadEarningsConfigurations();

      return data;
    } catch (error) {
      console.error('Error creating earnings configuration:', error);
      throw error;
    }
  }

  /**
   * Update earnings configuration
   */
  async updateEarningsConfiguration(
    configId: string,
    updates: Partial<EarningsConfiguration>
  ): Promise<EarningsConfiguration> {
    try {
      const { data, error } = await supabase
        .from('earnings_configurations')
        .update({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .eq('id', configId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update earnings configuration: ${error.message}`);
      }

      // Reload configurations
      await this.loadEarningsConfigurations();

      return data;
    } catch (error) {
      console.error('Error updating earnings configuration:', error);
      throw error;
    }
  }

  /**
   * Deactivate earnings configuration
   */
  async deactivateEarningsConfiguration(configId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('earnings_configurations')
        .update({
          isActive: false,
          effectiveTo: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', configId);

      if (error) {
        throw new Error(`Failed to deactivate earnings configuration: ${error.message}`);
      }

      // Reload configurations
      await this.loadEarningsConfigurations();
    } catch (error) {
      console.error('Error deactivating earnings configuration:', error);
      throw error;
    }
  }

  /**
   * Get earnings configuration by ID
   */
  async getEarningsConfiguration(configId: string): Promise<EarningsConfiguration | null> {
    try {
      const { data, error } = await supabase
        .from('earnings_configurations')
        .select('*')
        .eq('id', configId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch earnings configuration: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching earnings configuration:', error);
      throw error;
    }
  }

  /**
   * Get all active earnings configurations
   */
  async getActiveEarningsConfigurations(): Promise<EarningsConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('earnings_configurations')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch earnings configurations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching earnings configurations:', error);
      throw error;
    }
  }

  /**
   * Get earnings configurations by component type
   */
  async getEarningsConfigurationsByType(
    componentType: EarningsConfiguration['componentType']
  ): Promise<EarningsConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('earnings_configurations')
        .select('*')
        .eq('component_type', componentType)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch earnings configurations by type: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching earnings configurations by type:', error);
      throw error;
    }
  }

  /**
   * Validate earnings configuration
   */
  async validateEarningsConfiguration(config: EarningsConfiguration): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Configuration name is required');
    }

    if (!config.description || config.description.trim().length === 0) {
      warnings.push('Configuration description is recommended');
    }

    if (config.rate < 0) {
      errors.push('Rate cannot be negative');
    }

    if (config.calculationMethod === 'Percentage' && (!config.percentage || config.percentage <= 0)) {
      errors.push('Percentage is required for percentage-based calculations');
    }

    if (config.calculationMethod === 'Formula' && (!config.formula || config.formula.trim().length === 0)) {
      errors.push('Formula is required for formula-based calculations');
    }

    // Validate effective dates
    if (config.effectiveTo && parseISO(config.effectiveTo) <= parseISO(config.effectiveFrom)) {
      errors.push('Effective to date must be after effective from date');
    }

    // Validate conditions
    if (config.conditions) {
      if (config.conditions.minimumHours !== undefined && config.conditions.minimumHours < 0) {
        errors.push('Minimum hours cannot be negative');
      }

      if (config.conditions.maximumHours !== undefined && config.conditions.maximumHours < 0) {
        errors.push('Maximum hours cannot be negative');
      }

      if (config.conditions.minimumHours !== undefined && 
          config.conditions.maximumHours !== undefined &&
          config.conditions.minimumHours > config.conditions.maximumHours) {
        errors.push('Minimum hours cannot be greater than maximum hours');
      }
    }

    // Validate validation rules
    if (config.validationRules) {
      if (config.validationRules.minimumAmount !== undefined && config.validationRules.minimumAmount < 0) {
        errors.push('Minimum amount cannot be negative');
      }

      if (config.validationRules.maximumAmount !== undefined && config.validationRules.maximumAmount < 0) {
        errors.push('Maximum amount cannot be negative');
      }

      if (config.validationRules.minimumAmount !== undefined && 
          config.validationRules.maximumAmount !== undefined &&
          config.validationRules.minimumAmount > config.validationRules.maximumAmount) {
        errors.push('Minimum amount cannot be greater than maximum amount');
      }
    }

    // Check for potential conflicts with existing configurations
    const conflicts = await this.checkConfigurationConflicts(config);
    if (conflicts.length > 0) {
      warnings.push(`Potential conflicts with existing configurations: ${conflicts.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check for configuration conflicts
   */
  private async checkConfigurationConflicts(config: EarningsConfiguration): Promise<string[]> {
    try {
      const conflicts: string[] = [];

      // Get all active configurations of the same type
      const existingConfigs = await this.getEarningsConfigurationsByType(config.componentType);

      for (const existingConfig of existingConfigs) {
        if (existingConfig.id === config.id) continue;

        // Check for overlapping effective periods
        if (this.hasOverlappingPeriods(config, existingConfig)) {
          conflicts.push(`${existingConfig.name} (overlapping effective period)`);
        }

        // Check for similar conditions that might cause conflicts
        if (this.hasSimilarConditions(config, existingConfig)) {
          conflicts.push(`${existingConfig.name} (similar conditions)`);
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking configuration conflicts:', error);
      return [];
    }
  }

  /**
   * Check if two configurations have overlapping effective periods
   */
  private hasOverlappingPeriods(config1: EarningsConfiguration, config2: EarningsConfiguration): boolean {
    const start1 = parseISO(config1.effectiveFrom);
    const end1 = config1.effectiveTo ? parseISO(config1.effectiveTo) : new Date(9999, 11, 31);
    
    const start2 = parseISO(config2.effectiveFrom);
    const end2 = config2.effectiveTo ? parseISO(config2.effectiveTo) : new Date(9999, 11, 31);

    return start1 <= end2 && start2 <= end1;
  }

  /**
   * Check if two configurations have similar conditions
   */
  private hasSimilarConditions(config1: EarningsConfiguration, config2: EarningsConfiguration): boolean {
    // This is a simplified check - in practice, you might want more sophisticated logic
    const conditions1 = config1.conditions || {};
    const conditions2 = config2.conditions || {};

    // Check employment types
    if (JSON.stringify(conditions1.employmentTypes) === JSON.stringify(conditions2.employmentTypes)) {
      return true;
    }

    // Check classifications
    if (JSON.stringify(conditions1.classifications) === JSON.stringify(conditions2.classifications)) {
      return true;
    }

    return false;
  }

  /**
   * Reload earnings configurations
   */
  async reloadConfigurations(): Promise<void> {
    await this.loadEarningsConfigurations();
  }
}