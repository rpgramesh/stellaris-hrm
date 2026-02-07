import { LeaveAccrualRule } from "@/types/payroll";

const STANDARD_ACCRUAL_RULES: LeaveAccrualRule[] = [
  {
    leaveType: 'Annual',
    method: 'PerHourWorked',
    rate: 0.0769, // 4 weeks / 52 weeks = ~1/13
    accrueOnOvertime: false
  },
  {
    leaveType: 'Sick',
    method: 'PerHourWorked',
    rate: 0.0385, // 10 days / (52 * 5) = ~1/26 (approx 2 weeks per year)
    accrueOnOvertime: false
  }
];

export interface AccrualResult {
  leaveType: string;
  accruedAmount: number; // in hours
}

export const calculateLeaveAccrual = (
  hoursWorkedOrdinary: number,
  hoursWorkedOvertime: number,
  rules: LeaveAccrualRule[] = STANDARD_ACCRUAL_RULES
): AccrualResult[] => {
  return rules.map(rule => {
    let basisHours = 0;
    if (rule.method === 'PerHourWorked') {
      basisHours = hoursWorkedOrdinary;
      if (rule.accrueOnOvertime) {
        basisHours += hoursWorkedOvertime;
      }
    } else if (rule.method === 'PerPayPeriod') {
      // Simplified: Assume this function is called once per period.
      // In reality, 'rate' would be fixed amount per period (e.g., 2.923 hours per fortnight).
      // Here we assume rate is the amount to accrue.
      return {
        leaveType: rule.leaveType,
        accruedAmount: rule.rate
      };
    }

    return {
      leaveType: rule.leaveType,
      accruedAmount: basisHours * rule.rate
    };
  });
};
