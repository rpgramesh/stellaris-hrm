// Core Payroll Types
export interface PayrollEmployee {
  id: string;
  employeeId: string;
  baseSalary: number;
  payFrequency: 'Weekly' | 'Fortnightly' | 'Monthly';
  taxFileNumber?: string;
  taxScale: string;
  residencyStatus: 'Resident' | 'NonResident' | 'WorkingHoliday';
  employmentType: 'FullTime' | 'PartTime' | 'Casual';
  superFundId?: string;
  superMemberNumber?: string;
  awardId?: string;
  awardClassification?: string;
  isSalarySacrifice: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface SalaryAdjustment {
  id: string;
  employeeId: string;
  adjustmentType: 'BaseSalary' | 'Allowance' | 'Bonus' | 'Deduction';
  amount: number;
  adjustmentReason: 'AnnualReview' | 'Promotion' | 'MarketAdjustment' | 'Performance' | 'Other';
  effectiveDate: string;
  endDate?: string; // For temporary adjustments
  isPermanent: boolean;
  isProcessed: boolean;
  status: 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Processed';
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payslip {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  gross_pay: number;
  net_pay: number;
  tax_withheld: number;
  superannuation: number;
  deductions: number;
  allowances: number;
  bonuses: number;
  reimbursements: number;
  payment_date: string;
  status: 'Draft' | 'Published' | 'Paid';
  created_at: string;
  updated_at: string;
}

export interface PayrollRun {
  id: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate: string;
  payFrequency: 'Weekly' | 'Fortnightly' | 'Monthly';
  status: 'Draft' | 'Approved' | 'Processing' | 'Paid' | 'STPSubmitted';
  totalGrossPay: number;
  totalTax: number;
  totalSuper: number;
  totalNetPay: number;
  employeeCount: number;
  processedBy?: string;
  processedAt?: string;
  stpSubmissionId?: string;
  stpStatus?: 'Pending' | 'Submitted' | 'Accepted' | 'Rejected';
  createdAt: string;
  updatedAt: string;
}

export interface PayComponent {
  id: string;
  payslipId: string;
  componentType: 'BaseSalary' | 'Overtime' | 'Allowance' | 'Bonus' | 'Commission' | 'LeaveLoading' | 'Super' | 'Other';
  description: string;
  units: number; // hours, days, or count
  rate: number;
  amount: number;
  taxTreatment: 'Taxable' | 'NonTaxable' | 'Reportable' | 'SalarySacrifice';
  stpCategory: 'SAW' | 'OVT' | 'ALW' | 'BON' | 'COM' | 'LVE' | 'SUP' | 'OTH';
  isYtd: boolean;
  createdAt: string;
}

export interface Deduction {
  id: string;
  employeeId: string;
  deductionType: 'PreTax' | 'PostTax';
  category: 'UnionFees' | 'SalaryPackaging' | 'ChildSupport' | 'Voluntary' | 'Other';
  description: string;
  amount: number;
  isFixed: boolean;
  isPercentage: boolean;
  percentage?: number;
  priority: number; // Processing order
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SuperannuationContribution {
  id: string;
  employeeId: string;
  fundId: string;
  contributionType: 'SuperGuarantee' | 'SalarySacrifice' | 'Voluntary' | 'Award';
  amount: number;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  isPaid: boolean;
  paymentReference?: string;
  createdAt: string;
}

export interface SuperFund {
  id: string;
  name: string;
  abn: string;
  usi: string;
  contactDetails: {
    address: string;
    phone: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
}

export interface SuperannuationPayment {
  id: string;
  paymentReference: string;
  paymentDate: string;
  totalAmount: number;
  contributionIds: string[];
  status: 'Pending' | 'Processed' | 'Failed' | 'ComplianceFailed';
  superStreamCompliant: boolean;
  complianceChecked: boolean;
  complianceNotes?: string[];
  processedAt?: string;
  createdAt: string;
}

export interface SuperChoiceRequest {
  id: string;
  employeeId: string;
  chosenFundId: string;
  memberNumber: string;
  stapledFund: boolean;
  status: 'Pending' | 'Approved' | 'Rejected';
  complianceChecked: boolean;
  complianceNotes?: string[];
  processedAt?: string;
  createdAt: string;
}

export interface SuperComplianceReport {
  reportPeriod: { start: string; end: string };
  generatedAt: string;
  totalContributions: number;
  totalContributionAmount: number;
  paidContributions: number;
  overdueContributions: number;
  totalPayments: number;
  compliantPayments: number;
  complianceRate: number;
  issues: string[];
  recommendations: string[];
}

export interface Payslip {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  grossPay: number;
  allowances: number;
  overtime: number;
  paygTax: number;
  netPay: number;
  superannuation: number;
  paymentDate: string;
  status: 'Draft' | 'Published' | 'Paid';
}

// STP Phase 2 Types
export interface STPSubmission {
  id: string;
  payrollRunId: string | null;
  submissionType: 'PayEvent' | 'UpdateEvent' | 'FullFileReplacement' | 'PaygWithholdingAnnualReport';
  submissionId: string; // ATO assigned ID
  status: 'Draft' | 'Submitted' | 'Accepted' | 'Rejected' | 'Corrected';
  submissionDate: string;
  employeeCount: number;
  totalGross: number;
  totalTax: number;
  totalSuper: number;
  responseMessage?: string;
  errorDetails?: string;
  createdAt: string;
  updatedAt: string;
}

export interface STPPayeeData {
  id: string;
  stpSubmissionId: string;
  employeeId: string;
  incomeType: 'SAW' | 'WHM' | 'IAA' | 'SWP' | 'JSP' | 'FEI' | 'CDP' | 'SIP' | 'RAP';
  countryCode?: string;
  taxTreatmentCode: string;
  grossAmount: number;
  taxAmount: number;
  superAmount: number;
  ytdGross: number;
  ytdTax: number;
  ytdSuper: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate: string;
}

// Award Interpretation Types
export interface Award {
  id: string;
  code: string; // e.g., 'MA000002'
  name: string;
  industry?: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AwardRule {
  id: string;
  awardId: string;
  ruleType: 'PenaltyRate' | 'Overtime' | 'Allowance' | 'ShiftLoading' | 'PublicHoliday';
  name: string;
  description: string;
  conditions: {
    dayOfWeek?: number[]; // 0-6, Sunday-Saturday
    timeRange?: { start: string; end: string }; // HH:MM format
    hoursThreshold?: number;
    isPublicHoliday?: boolean;
    employmentType?: ('FullTime' | 'PartTime' | 'Casual')[];
  };
  calculation: {
    type: 'Multiplier' | 'FlatAmount' | 'HourlyRate';
    multiplier?: number;
    flatAmount?: number;
    hourlyRate?: number;
  };
  priority: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  // Additional properties for Award Interpretation Engine compatibility
  rule_type?: string;
  classification?: string;
  dayType?: 'weekday' | 'weekend' | 'saturday' | 'sunday';
  timeFrom?: string;
  timeTo?: string;
  publicHolidayOnly?: boolean;
  penalty_percentage?: number;
  calculation_method?: 'percentage' | 'fixed' | 'hourly' | 'daily';
  fixed_amount?: number;
  hourly_rate?: number;
  daily_amount?: number;
  allowance_type?: string;
  tax_treatment?: string;
  shift_type?: string;
  shift_loading_percentage?: number;
  overtime_type?: 'daily' | 'weekly';
  notes?: string;
}

// Tax and Statutory Types
export interface TaxTable {
  id: string;
  financialYear: string; // e.g., '2024-2025'
  taxScale: string; // e.g., 'TaxFreeThreshold', 'NoTaxFreeThreshold'
  residencyStatus: 'Resident' | 'NonResident' | 'WorkingHoliday';
  payFrequency: 'Weekly' | 'Fortnightly' | 'Monthly';
  incomeThresholds: {
    from: number;
    to: number;
    baseTax: number;
    taxRate: number; // percentage
  }[];
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
}

export interface StatutoryRate {
  id: string;
  rateType: 'SuperannuationGuarantee' | 'MedicareLevy' | 'PayrollTax' | 'WorkersCompensation';
  financialYear: string;
  rate: number;
  threshold?: number;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
}

// Bonus Types
export interface BonusPayment {
  id: string;
  employeeId: string;
  bonusType: 'Performance' | 'Retention' | 'SignOn' | 'Annual' | 'Special';
  amount: number;
  paymentDate: string;
  taxMethod: 'Aggregate' | 'LumpSumA' | 'LumpSumB' | 'LumpSumD';
  isProcessed: boolean;
  processedAt?: string;
  createdAt: string;
}

// Annual Salary Statement Types
export interface AnnualSalaryStatement {
  id: string;
  employeeId: string;
  financialYear: string;
  grossPayments: number;
  taxWithheld: number;
  superannuation: number;
  reportableFringeBenefits: number;
  reportableSuperContributions: number;
  workplaceGiving: number;
  allowances: number;
  lumpSumPayments: number;
  terminationPayments: number;
  isFinal: boolean;
  generatedAt: string;
  amendedFrom?: string; // Reference to previous version if amended
}

// Payroll Processing Types
export interface PayrollCalculationResult {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  components: {
    earnings: PayComponent[];
    deductions: Deduction[];
    superContributions: SuperannuationContribution[];
  };
  totals: {
    grossPay: number;
    taxableIncome: number;
    totalDeductions: number;
    taxWithheld: number;
    netPay: number;
    superContributions: number;
  };
  validationErrors: string[];
  warnings: string[];
}

// Timesheet and Award Interpretation Types
export interface TimesheetEntry {
  id: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  projectId?: string;
  taskId?: string;
  notes?: string;
  isBillable: boolean;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
}

export interface AwardInterpretationResult {
  employeeId: string;
  awardId: string;
  classification: string;
  workPattern: string;
  penaltyRates: PenaltyRate[];
  allowances: Allowance[];
  shiftLoadings: ShiftLoading[];
  overtime: OvertimeEntry[];
  totalPenaltyAmount: number;
  totalAllowanceAmount: number;
  totalShiftLoadingAmount: number;
  totalOvertimeAmount: number;
  totalAwardAmount: number;
  interpretationDate: Date;
  complianceNotes: string[];
}

export interface PenaltyRate {
  id: string;
  ruleId: string;
  timesheetEntryId: string;
  description: string;
  penaltyPercentage: number;
  applicableHours: number;
  penaltyRate: number;
  amount: number;
  calculationMethod: 'percentage' | 'fixed' | 'hourly';
  notes?: string;
}

export interface Allowance {
  id: string;
  ruleId: string;
  timesheetEntryId: string;
  description: string;
  allowanceType: 'tool' | 'travel' | 'meal' | 'uniform' | 'vehicle' | 'other';
  amount: number;
  applicableHours: number;
  calculationMethod: 'fixed' | 'hourly' | 'daily';
  taxTreatment: 'taxable' | 'non-taxable' | 'reportable';
  notes?: string;
}

export interface ShiftLoading {
  id: string;
  ruleId: string;
  timesheetEntryId: string;
  description: string;
  shiftType: 'morning' | 'afternoon' | 'night' | 'weekend' | 'public-holiday';
  loadingPercentage: number;
  applicableHours: number;
  loadingRate: number;
  amount: number;
  calculationMethod: 'percentage' | 'fixed' | 'hourly';
  notes?: string;
}

export interface OvertimeEntry {
  type: 'daily' | 'weekly';
  date?: string;
  hours: number;
  rate: number;
  amount: number;
  ruleId: string;
}

// Error and Validation Types
export interface PayrollValidationError {
  type: 'Error' | 'Warning';
  code: string;
  message: string;
  employeeId?: string;
  component?: string;
  details?: any;
}