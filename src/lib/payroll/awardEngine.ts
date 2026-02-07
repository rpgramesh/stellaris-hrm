import { AttendanceRecord } from "@/types";
import { AwardRule, PayComponent } from "@/types/payroll";
import { differenceInHours, getDay, isSaturday, isSunday, parseISO } from "date-fns";

// Mock Rules for a standard award (e.g., Clerks Private Sector)
export const STANDARD_AWARD_RULES: AwardRule[] = [
  {
    id: 'OT-1',
    name: 'Overtime > 8h',
    type: 'Overtime',
    condition: { field: 'HoursWorked', operator: 'greaterThan', value: 8 },
    multiplier: 1.5,
    applyTo: 'BaseRate'
  },
  {
    id: 'PEN-SAT',
    name: 'Saturday Loading',
    type: 'Penalty',
    condition: { field: 'DayOfWeek', operator: 'equals', value: 6 }, // 0=Sun, 6=Sat
    multiplier: 1.25,
    applyTo: 'BaseRate'
  },
  {
    id: 'PEN-SUN',
    name: 'Sunday Loading',
    type: 'Penalty',
    condition: { field: 'DayOfWeek', operator: 'equals', value: 0 },
    multiplier: 2.0,
    applyTo: 'BaseRate'
  }
];

export const interpretTimesheet = (
  record: AttendanceRecord, 
  hourlyRate: number, 
  rules: AwardRule[] = STANDARD_AWARD_RULES
): PayComponent[] => {
  const components: PayComponent[] = [];
  const date = parseISO(record.date);
  
  if (!record.clockIn || !record.clockOut) {
    return components; // Incomplete record
  }

  const start = parseISO(record.clockIn);
  const end = parseISO(record.clockOut);
  const totalHours = Math.max(0, differenceInHours(end, start));
  
  // 1. Determine Base Hours vs Overtime
  let ordinaryHours = totalHours;
  let overtimeHours = 0;

  // Rule: OT after 8 hours (simplified daily check)
  const otRule = rules.find(r => r.type === 'Overtime' && r.condition.field === 'HoursWorked');
  if (otRule && totalHours > otRule.condition.value) {
    ordinaryHours = otRule.condition.value;
    overtimeHours = totalHours - ordinaryHours;
  }

  // 2. Determine Multipliers based on Day
  let ordinaryMultiplier = 1.0;
  
  // Check for Saturday
  if (isSaturday(date)) {
    const satRule = rules.find(r => r.type === 'Penalty' && r.condition.value === 6);
    if (satRule && satRule.multiplier) ordinaryMultiplier = Math.max(ordinaryMultiplier, satRule.multiplier);
  }
  // Check for Sunday
  if (isSunday(date)) {
    const sunRule = rules.find(r => r.type === 'Penalty' && r.condition.value === 0);
    if (sunRule && sunRule.multiplier) ordinaryMultiplier = Math.max(ordinaryMultiplier, sunRule.multiplier);
  }

  // 3. Create Pay Components
  if (ordinaryHours > 0) {
    components.push({
      code: 'ORD',
      description: 'Ordinary Hours',
      units: ordinaryHours,
      rate: hourlyRate * ordinaryMultiplier,
      amount: ordinaryHours * hourlyRate * ordinaryMultiplier,
      type: 'Ordinary'
    });
  }

  if (overtimeHours > 0) {
    // OT is usually 1.5x for first 2h, then 2x. Simplified to 1.5x here or use rule.
    const otMultiplier = otRule?.multiplier || 1.5;
    components.push({
      code: 'OT1.5',
      description: 'Overtime (1.5x)',
      units: overtimeHours,
      rate: hourlyRate * otMultiplier,
      amount: overtimeHours * hourlyRate * otMultiplier,
      type: 'Overtime'
    });
  }

  return components;
};

export const calculateGrossPay = (components: PayComponent[]): number => {
  return components.reduce((sum, c) => sum + c.amount, 0);
};
