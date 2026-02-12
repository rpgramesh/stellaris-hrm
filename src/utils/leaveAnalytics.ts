import { calculateWorkingDays } from './workDayCalculations';
import { LeaveRequest } from '@/types';

export interface LeaveDistribution {
  [key: string]: number;
}

/**
 * Calculates the distribution of leave days by type for a specific year.
 * Only includes 'Approved' leave requests.
 * Calculates working days (excluding weekends and holidays).
 * 
 * @param leaves Array of leave requests
 * @param holidays Array of holiday dates
 * @param year The year to calculate distribution for
 * @returns Object mapping leave type to total working days
 */
export const calculateLeaveDistribution = (
  leaves: LeaveRequest[], 
  holidays: Date[], 
  year: number
): LeaveDistribution => {
  const distribution: LeaveDistribution = {};

  leaves.forEach(l => {
    if (l.status === 'Approved') {
      const leaveDate = new Date(l.startDate);
      // Only include leaves for the specified year
      if (leaveDate.getFullYear() === year) {
        const days = calculateWorkingDays(l.startDate, l.endDate, holidays);
        distribution[l.type] = (distribution[l.type] || 0) + days;
      }
    }
  });

  return distribution;
};
