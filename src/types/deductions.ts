// Deduction Types
export interface Deduction {
  id: string;
  employeeId: string;
  name: string;
  description?: string;
  deductionType: 'pre-tax' | 'post-tax';
  category: DeductionCategory;
  calculationMethod: 'fixed' | 'percentage' | 'formula' | 'tiered';
  amount?: number;
  percentage?: number;
  baseForPercentage?: 'gross' | 'taxable';
  minimumAmount?: number;
  maximumAmount?: number;
  annualCap?: number;
  roundingMethod: 'nearest-cent' | 'nearest-dollar' | 'round-up-dollar' | 'round-down-dollar';
  priority: number;
  formula?: string;
  formulaParameters?: Record<string, any>;
  tiers?: DeductionTier[];
  startDate?: Date;
  endDate?: Date;
  status: 'active' | 'inactive' | 'pending';
  requiresApproval: boolean;
  glCode?: string;
  taxCode?: string;
  superannuationTreatment: 'reduce-super' | 'no-effect' | 'reportable';
  reportableFbt: boolean;
  currentAmount?: number;
  ytdAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeductionTier {
  threshold: number;
  rate: number;
  maxAmount?: number;
}

export interface DeductionCalculationResult {
  preTaxDeductions: Deduction[];
  postTaxDeductions: Deduction[];
  totalPreTaxDeductions: number;
  totalPostTaxDeductions: number;
  taxableIncomeAfterDeductions: number;
  netPayReduction: number;
}

export type DeductionCategory =
  | 'union-fees'
  | 'salary-packaging'
  | 'child-support'
  | 'voluntary'
  | 'insurance'
  | 'loan-repayment'
  | 'charity'
  | 'professional-membership'
  | 'equipment'
  | 'training'
  | 'other';

export type DeductionType = 'pre-tax' | 'post-tax';