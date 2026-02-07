
// ... existing types ...

// Payroll & STP Types
export interface STPConfiguration {
  organizationId: string; // ABN or similar
  softwareId: string;
  interimId: string;
}

export interface STPPayEvent {
  id: string;
  submissionDate: string;
  runDate: string;
  transactionId: string;
  status: 'Draft' | 'Submitted' | 'Accepted' | 'Rejected';
  employeeCount: number;
  totalGross: number;
  totalTax: number;
  totalSuper: number;
  payees: STPPayeePayload[];
  responseMessage?: string;
}

export interface STPPayeePayload {
  employeeId: string;
  ytdGross: number;
  ytdTax: number;
  ytdSuper: number;
  payPeriodGross: number;
  payPeriodTax: number;
  payPeriodSuper: number;
}

// Award Interpretation Types
export interface AwardRule {
  id: string;
  name: string;
  type: 'Penalty' | 'Overtime' | 'Allowance' | 'Loading';
  condition: {
    field: 'DayOfWeek' | 'TimeOfDay' | 'HoursWorked' | 'PublicHoliday';
    operator: 'equals' | 'greaterThan' | 'between';
    value: any;
    secondaryValue?: any; // for 'between'
  };
  multiplier?: number; // e.g. 1.5 for 150%
  flatAmount?: number; // e.g. $20 meal allowance
  applyTo: 'BaseRate' | 'Flat';
}

export interface PayComponent {
  code: string;
  description: string;
  units: number; // hours or count
  rate: number;
  amount: number;
  type: 'Ordinary' | 'Overtime' | 'Allowance' | 'Penalty';
}

// Superannuation Types
export interface SuperRateSchedule {
  effectiveDate: string;
  rate: number; // percentage, e.g. 11.5
}

// Leave Accrual Types
export interface LeaveAccrualRule {
  leaveType: 'Annual' | 'Sick' | 'LongService';
  method: 'PerPayPeriod' | 'PerHourWorked';
  rate: number; // hours per pay period or hours per hour worked
  cap?: number;
  accrueOnOvertime: boolean;
}
