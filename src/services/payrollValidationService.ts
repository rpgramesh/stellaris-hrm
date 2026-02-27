
import { supabase } from '@/lib/supabase';
import { PayrollEmployee, PayrollRun, PayrollValidationError } from '@/types/payroll';

export interface ValidationRule {
  id: string;
  ruleName: string;
  ruleType: 'Data' | 'Calculation' | 'Compliance' | 'Business';
  description: string;
  validationLogic: any;
  errorMessage: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  isActive: boolean;
}

export const payrollValidationService = {
  async getActiveRules(): Promise<ValidationRule[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_validation_rules')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      
      return (data || []).map(d => ({
        id: d.id,
        ruleName: d.rule_name,
        ruleType: d.rule_type,
        description: d.description,
        validationLogic: d.validation_logic,
        errorMessage: d.error_message,
        severity: d.severity,
        isActive: d.is_active
      }));
    } catch (error) {
      console.error('Error fetching validation rules:', error);
      return [];
    }
  },

  async validateEmployee(employee: PayrollEmployee, payrollRun: PayrollRun): Promise<PayrollValidationError[]> {
    const errors: PayrollValidationError[] = [];
    const rules = await this.getActiveRules();

    for (const rule of rules) {
      try {
        const result = await this.executeRule(rule, employee, payrollRun);
        if (!result.isValid) {
          errors.push({
            type: rule.severity === 'Critical' || rule.severity === 'High' ? 'Error' : 'Warning',
            code: rule.ruleName,
            message: rule.errorMessage,
            employeeId: employee.employeeId,
            details: result.details
          });
        }
      } catch (error) {
        console.error(`Error executing rule ${rule.ruleName}:`, error);
      }
    }

    return errors;
  },

  async executeRule(rule: ValidationRule, employee: PayrollEmployee, payrollRun: PayrollRun): Promise<{ isValid: boolean; details?: any }> {
    const { validationLogic } = rule;

    switch (validationLogic.type) {
      case 'required_field':
        const value = (employee as any)[validationLogic.field];
        const isRequired = !validationLogic.employment_types || validationLogic.employment_types.includes(employee.employmentType);
        if (isRequired && (!value || value === '')) {
          return { isValid: false };
        }
        break;

      case 'minimum_wage':
        const minRate = validationLogic.minimum_hourly_rate || 23.23;
        const currentRate = employee.hourlyRate || (employee.baseSalary / 52 / 38);
        if (currentRate < minRate) {
          return { isValid: false, details: { currentRate, minRate } };
        }
        break;

      // Add more rule types as needed
    }

    return { isValid: true };
  }
};
