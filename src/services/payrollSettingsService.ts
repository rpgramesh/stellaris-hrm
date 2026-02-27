
import { supabase } from '../lib/supabase';
import { TaxTable } from '../types/payroll';

export interface PayrollSettings {
  id: string;
  companyName: string;
  abn: string;
  defaultPayFrequency: 'Weekly' | 'Fortnightly' | 'Monthly';
  financialYearStart: string;
  stpEnabled: boolean;
  superannuationGuaranteeRate: number;
  payrollTaxThreshold: number;
  workersCompensationRate: number;
}

export const payrollSettingsService = {
  async getSettings(): Promise<PayrollSettings | null> {
    const { data, error } = await supabase
      .from('payroll_settings')
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      id: data.id,
      companyName: data.company_name,
      abn: data.abn,
      defaultPayFrequency: data.default_pay_frequency,
      financialYearStart: data.financial_year_start,
      stpEnabled: data.stp_enabled,
      superannuationGuaranteeRate: data.superannuation_guarantee_rate,
      payrollTaxThreshold: data.payroll_tax_threshold,
      workersCompensationRate: data.workers_compensation_rate
    };
  },

  async updateSettings(settings: Partial<PayrollSettings>): Promise<void> {
    const dbData: any = {};
    if (settings.companyName !== undefined) dbData.company_name = settings.companyName;
    if (settings.abn !== undefined) dbData.abn = settings.abn;
    if (settings.defaultPayFrequency !== undefined) dbData.default_pay_frequency = settings.defaultPayFrequency;
    if (settings.financialYearStart !== undefined) dbData.financial_year_start = settings.financialYearStart;
    if (settings.stpEnabled !== undefined) dbData.stp_enabled = settings.stpEnabled;
    if (settings.superannuationGuaranteeRate !== undefined) dbData.superannuation_guarantee_rate = settings.superannuationGuaranteeRate;
    if (settings.payrollTaxThreshold !== undefined) dbData.payroll_tax_threshold = settings.payrollTaxThreshold;
    if (settings.workersCompensationRate !== undefined) dbData.workers_compensation_rate = settings.workersCompensationRate;

    const { error } = await supabase
      .from('payroll_settings')
      .update(dbData)
      .eq('id', settings.id);

    if (error) throw error;
  },

  async getTaxTables(): Promise<TaxTable[]> {
    const { data, error } = await supabase
      .from('tax_tables')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      financialYear: row.financial_year,
      taxScale: row.tax_scale,
      residencyStatus: row.residency_status,
      payFrequency: row.pay_frequency,
      incomeThresholds: (row.income_thresholds || []).map((t: any) => ({
        from: t.from ?? t.income_from ?? 0,
        to: t.to ?? t.income_to ?? null,
        baseTax: t.base_tax ?? 0,
        taxRate: t.tax_rate ?? 0
      })),
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      isActive: row.is_active
    }));
  },

  async updateTaxBracket(tableId: string, index: number, updates: { from?: number; to?: number | null; baseTax?: number; taxRate?: number }): Promise<void> {
    const { data, error } = await supabase
      .from('tax_tables')
      .select('income_thresholds')
      .eq('id', tableId)
      .single();

    if (error) throw error;
    const thresholds = Array.isArray(data?.income_thresholds) ? data.income_thresholds : [];
    const target = thresholds[index] || {};
    const updated = {
      ...target,
      from: updates.from ?? target.from ?? target.income_from,
      to: updates.to ?? (target.to ?? target.income_to ?? null),
      base_tax: updates.baseTax ?? target.base_tax ?? 0,
      tax_rate: updates.taxRate ?? target.tax_rate ?? 0
    };
    thresholds[index] = updated;

    const { error: updateError } = await supabase
      .from('tax_tables')
      .update({ income_thresholds: thresholds })
      .eq('id', tableId);

    if (updateError) throw updateError;
  }
};
