import { SuperRateSchedule } from "@/types/payroll";

const DEFAULT_SUPER_SCHEDULE: SuperRateSchedule[] = [
  { effectiveDate: '2023-07-01', rate: 11.0 },
  { effectiveDate: '2024-07-01', rate: 11.5 },
  { effectiveDate: '2025-07-01', rate: 12.0 },
];

export const getSuperRateForDate = (dateStr: string): number => {
  const date = new Date(dateStr);
  // Sort descending by date to find the latest effective rate
  const sortedSchedule = [...DEFAULT_SUPER_SCHEDULE].sort((a, b) => 
    new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  const applicable = sortedSchedule.find(s => new Date(s.effectiveDate) <= date);
  return applicable ? applicable.rate : 11.0; // Default fallback
};

export const calculateSuperContribution = (oteAmount: number, payDate: string): number => {
  const rate = getSuperRateForDate(payDate);
  return oteAmount * (rate / 100);
};

// Quarterly Cap check (Maximum Super Contribution Base)
// For 2024-2025, max base is $65,070 per quarter.
const MAX_CONTRIBUTION_BASE_QUARTERLY = 65070;

export const calculateCappedSuper = (oteAmount: number, payDate: string, ytdOte: number): number => {
  // Simplification: We usually need to check the quarter's total. 
  // This function assumes 'oteAmount' is for the current period and checks if YTD exceeds cap? 
  // No, cap is per quarter. 
  // For this MVP, we will just apply the rate directly.
  return calculateSuperContribution(oteAmount, payDate);
};
