// Statutory Contribution Types
export interface StatutoryContribution {
  id: string;
  employeeId: string;
  companyId: string;
  contributionType: StatutoryContributionType;
  contributionName: string;
  employerAmount: number;
  employeeAmount: number;
  calculationBase: number;
  rateApplied: number;
  periodStart: Date;
  periodEnd: Date;
  paymentDueDate: Date;
  liabilityAccount: string;
  expenseAccount: string;
  status: 'calculated' | 'pending' | 'paid' | 'cancelled' | 'overdue';
  calculationDetails: {
    [key: string]: any;
  };
  isReportable: boolean;
  stpCategory: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatutoryRate {
  id: string;
  contributionType: StatutoryContributionType;
  name: string;
  description?: string;
  rate: number;
  calculationBase?: number;
  threshold?: number;
  maximumAmount?: number;
  applicableStates?: string[];
  applicableIndustries?: string[];
  applicableEmploymentTypes?: ('FullTime' | 'PartTime' | 'Casual' | 'Contractor')[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  liabilityAccount: string;
  expenseAccount: string;
  isReportable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContributionCalculationResult {
  contributions: StatutoryContribution[];
  totalEmployerContributions: number;
  totalEmployeeWithholdings: number;
  netPay: number;
  totalCostToEmployer: number;
}

export type StatutoryContributionType =
  | 'payg-withholding'
  | 'superannuation-guarantee'
  | 'payroll-tax'
  | 'workers-compensation'
  | 'help-debt'
  | 'sfss-debt'
  | 'medicare-levy'
  | 'medicare-levy-surcharge'
  | 'leave-loading-tax'
  | 'overtime-tax'
  | 'allowance-tax'
  | 'fringe-benefits-tax'
  | 'payroll-tax-exemption'
  | 'superannuation-co-contribution'
  | 'low-income-super-contribution'
  | 'spouse-super-contribution'
  | 'government-super-contribution';

export interface StatutoryThreshold {
  id: string;
  contributionType: StatutoryContributionType;
  thresholdType: 'income' | 'wages' | 'age' | 'service' | 'hours';
  thresholdValue: number;
  comparisonOperator: '>' | '>=' | '<' | '<=' | '=' | '!=';
  applicableYear: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatutoryExemption {
  id: string;
  contributionType: StatutoryContributionType;
  exemptionType: 'employee-type' | 'age' | 'income' | 'service' | 'industry' | 'location' | 'disability' | 'veteran';
  exemptionCriteria: {
    employeeTypes?: ('FullTime' | 'PartTime' | 'Casual' | 'Contractor')[];
    ageRange?: { min?: number; max?: number };
    incomeRange?: { min?: number; max?: number };
    serviceMonths?: { min?: number; max?: number };
    industries?: string[];
    states?: string[];
    disabilities?: string[];
    veteranStatus?: boolean;
  };
  exemptionAmount?: number;
  exemptionPercentage?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatutoryComplianceCheck {
  id: string;
  companyId: string;
  contributionType: StatutoryContributionType;
  checkPeriod: { start: Date; end: Date };
  complianceStatus: 'compliant' | 'non-compliant' | 'warning' | 'pending';
  issues: {
    type: 'underpayment' | 'overpayment' | 'late-payment' | 'missing-payment' | 'incorrect-rate' | 'threshold-breach';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    amount?: number;
    affectedEmployees?: string[];
    dueDate?: Date;
    resolutionRequiredBy?: Date;
  }[];
  totalLiability?: number;
  penaltyRisk?: number;
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StatutoryPaymentSchedule {
  id: string;
  companyId: string;
  contributionType: StatutoryContributionType;
  paymentFrequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';
  paymentDay: number; // Day of month or week
  paymentMethod: 'direct-debit' | 'bank-transfer' | 'cheque' | 'online';
  bankAccountDetails?: {
    bsb: string;
    accountNumber: string;
    accountName: string;
  };
  contactDetails?: {
    phone: string;
    email: string;
    website?: string;
  };
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatutoryReportingRequirement {
  id: string;
  contributionType: StatutoryContributionType;
  reportName: string;
  reportingAuthority: string;
  reportingFrequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually' | 'adhoc';
  dueDate: number; // Day of month or relative days
  format: 'xml' | 'csv' | 'pdf' | 'online' | 'paper';
  method: 'online' | 'email' | 'post' | 'in-person';
  requiredData: string[];
  validationRules: {
    field: string;
    rule: 'required' | 'numeric' | 'date' | 'range' | 'format';
    parameters?: any;
  }[];
  penalties: {
    lateFee?: number;
    interestRate?: number;
    criminalPenalty?: boolean;
    civilPenalty?: boolean;
  };
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}