import { format } from 'date-fns';
import type { LeaveRequest } from '@/types';
import type { PublicHoliday } from '@/services/holidayService';

export type AutoFillReason = 'HOLIDAY' | 'LEAVE' | 'PARTIAL_LEAVE';

export type AutoFillCandidate = {
  date: string;
  hours: number;
  reason: AutoFillReason;
  label: string;
};

export const detectAutoFillCandidates = (args: {
  days: Date[];
  holidays: PublicHoliday[];
  leaves: LeaveRequest[];
  defaultHours: number;
}): AutoFillCandidate[] => {
  const out: AutoFillCandidate[] = [];
  const defaultHours = Number(args.defaultHours || 0) || 0;

  for (const day of args.days) {
    const dayOfWeek = day.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) continue;

    const date = format(day, 'yyyy-MM-dd');

    const holiday = args.holidays.find((h) => String((h as any).date) === date);
    if (holiday) {
      const override = Number((holiday as any).hours);
      const hours = Number.isFinite(override) && override > 0 ? override : defaultHours;
      out.push({ date, hours, reason: 'HOLIDAY', label: String((holiday as any).name || 'Public Holiday') });
      continue;
    }

    const leave = args.leaves.find((l) => date >= l.startDate && date <= l.endDate);
    if (!leave) continue;

    const isSingleDay = leave.startDate === leave.endDate;
    const leaveHoursRaw = Number((leave as any).totalHours);
    const isPartial = isSingleDay && Number.isFinite(leaveHoursRaw) && leaveHoursRaw > 0 && leaveHoursRaw < defaultHours;
    const hours = isPartial ? leaveHoursRaw : defaultHours;
    out.push({
      date,
      hours,
      reason: isPartial ? 'PARTIAL_LEAVE' : 'LEAVE',
      label: String((leave as any).type || 'Leave'),
    });
  }

  return out;
};

