// Bonus Types
export interface BonusPayment {
  id: string;
  employeeId: string;
  bonusType: BonusType;
  grossAmount: number;
  taxMethod: BonusTaxMethod;
  taxWithheld: number;
  superannuationAmount: number;
  netAmount: number;
  paymentDate: Date;
  status: 'calculated' | 'approved' | 'paid' | 'cancelled';
  calculationDetails: {
    originalAmount?: number;
    proRataMultiplier?: number;
    taxCalculation: any;
    superannuationRate?: number;
    performancePeriod?: { start: Date; end: Date };
    commissionRate?: number;
    salesAmount?: number;
    performanceScore?: number;
    performanceMultiplier?: number;
  };
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  isReportable: boolean;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BonusCalculationResult {
  bonusPayment: Omit<BonusPayment, 'id' | 'createdAt' | 'updatedAt'>;
  taxCalculation: any;
  warnings: string[];
  validationErrors: string[];
}

export type BonusType =
  | 'performance'
  | 'retention'
  | 'sign-on'
  | 'commission'
  | 'referral'
  | 'profit-sharing'
  | 'annual'
  | 'quarterly'
  | 'spot'
  | 'milestone'
  | 'loyalty'
  | 'safety'
  | 'attendance'
  | 'productivity'
  | 'quality'
  | 'innovation'
  | 'team'
  | 'individual'
  | 'company'
  | 'department'
  | 'project'
  | 'completion'
  | 'overtime'
  | 'holiday'
  | 'emergency'
  | 'discretionary'
  | 'ex-gratia'
  | 'redundancy'
  | 'retirement'
  | 'severance'
  | 'allowance'
  | 'reimbursement';

export type BonusTaxMethod =
  | 'marginal-rates'      // Method A: Marginal tax rates
  | 'schedule-5'          // Method B(i): Tax tables (Schedule 5)
  | 'average-rates'       // Method B(ii): Average rates
  | 'fixed-rate'          // Fixed rate (commonly 47%)
  | 'etf';                // Employment Termination Payment method

export interface BonusConfiguration {
  id: string;
  companyId: string;
  bonusType: BonusType;
  name: string;
  description?: string;
  eligibilityCriteria: {
    minimumServiceMonths?: number;
    employmentTypes?: ('FullTime' | 'PartTime' | 'Casual')[];
    departments?: string[];
    jobLevels?: string[];
    performanceRating?: number;
  };
  calculationMethod: {
    type: 'fixed' | 'percentage' | 'formula' | 'tiered' | 'discretionary';
    fixedAmount?: number;
    percentage?: number;
    baseForPercentage?: 'salary' | 'revenue' | 'profit' | 'sales';
    formula?: string;
    tiers?: {
      threshold: number;
      rate: number;
      description?: string;
    }[];
  };
  taxTreatment: {
    method: BonusTaxMethod;
    includeSuperannuation: boolean;
    reportableForSTP: boolean;
  };
  paymentSchedule: {
    frequency: 'monthly' | 'quarterly' | 'semi-annually' | 'annually' | 'adhoc';
    paymentMonth?: number;
    paymentDay?: number;
  };
  approvalWorkflow: {
    requiresApproval: boolean;
    approverLevels: string[];
    autoApproveBelow?: number;
  };
  budgetControls: {
    annualBudget?: number;
    perEmployeeLimit?: number;
    departmentBudgets?: { [departmentId: string]: number };
  };
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BonusEligibilityCheck {
  employeeId: string;
  bonusType: BonusType;
  eligibilityStatus: 'eligible' | 'not-eligible' | 'conditional';
  reasons: string[];
  suggestedAmount?: number;
  performanceScore?: number;
  serviceMonths?: number;
  lastBonusDate?: Date;
  nextEligibleDate?: Date;
}