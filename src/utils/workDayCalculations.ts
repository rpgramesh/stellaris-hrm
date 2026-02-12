import { isWeekend, eachDayOfInterval, isSameDay } from 'date-fns';

/**
 * Calculates the number of working days between two dates, excluding weekends and provided holidays.
 * @param start Start date
 * @param end End date
 * @param holidays Array of holiday dates (Date objects or ISO strings)
 * @returns Number of working days
 */
export const calculateWorkingDays = (start: Date | string, end: Date | string, holidays: (Date | string)[]): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (startDate > endDate) return 0;

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Convert holidays to Date objects for comparison
  const holidayDates = holidays.map(h => new Date(h));

  return days.filter(day => {
    // 1. Exclude Weekends
    if (isWeekend(day)) return false;

    // 2. Exclude Holidays
    const isHoliday = holidayDates.some(h => isSameDay(h, day));
    if (isHoliday) return false;

    return true;
  }).length;
};
