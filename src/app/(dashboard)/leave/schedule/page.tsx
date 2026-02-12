"use client";

import { useState, useEffect } from 'react';
import { 
  format, 
  parseISO, 
  isWithinInterval, 
  startOfWeek, 
  endOfWeek, 
  isAfter, 
  isBefore, 
  addDays,
  isSameDay
} from 'date-fns';
import { leaveService } from '@/services/leaveService';
import { employeeService } from '@/services/employeeService';
import { holidayService, PublicHoliday } from '@/services/holidayService';
import { LeaveRequest, Employee } from '@/types';

export default function LeaveSchedulePage() {
  const [currentDate] = useState(new Date());
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const yearStart = new Date(currentDate.getFullYear(), 0, 1);
      const yearEnd = new Date(currentDate.getFullYear() + 1, 11, 31); // Fetch 2 years to be safe

      const [leaveData, empData, holidayData] = await Promise.all([
        leaveService.getAll(),
        employeeService.getAll(),
        holidayService.getHolidays(yearStart.toISOString(), yearEnd.toISOString())
      ]);
      setRequests(leaveData);
      setEmployees(empData);
      setHolidays(holidayData);
    } catch (error) {
      console.error('Failed to load schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  // Filter approved requests
  const approvedRequests = requests.filter(req => req.status === 'Approved');

  // 1. Who is away TODAY?
  const awayToday = approvedRequests.filter(req => {
    const start = parseISO(req.startDate);
    const end = parseISO(req.endDate);
    return isWithinInterval(currentDate, { start, end });
  });

  const holidayToday = holidays.find(h => isSameDay(new Date(h.date), currentDate));

  // 2. Who is away THIS WEEK?
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
  const endOfCurrentWeek = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  const awayThisWeek = approvedRequests.filter(req => {
    const start = parseISO(req.startDate);
    const end = parseISO(req.endDate);
    // Check if leave overlaps with this week
    return (isWithinInterval(start, { start: startOfCurrentWeek, end: endOfCurrentWeek }) ||
            isWithinInterval(end, { start: startOfCurrentWeek, end: endOfCurrentWeek }) ||
            (isBefore(start, startOfCurrentWeek) && isAfter(end, endOfCurrentWeek)));
  });

  const holidaysThisWeek = holidays.filter(h => {
    const date = new Date(h.date);
    return isWithinInterval(date, { start: startOfCurrentWeek, end: endOfCurrentWeek });
  });

  // 3. Upcoming Leaves (Next 30 days)
  const thirtyDaysFromNow = addDays(currentDate, 30);
  const upcomingLeaves = approvedRequests.filter(req => {
    const start = parseISO(req.startDate);
    return isAfter(start, currentDate) && isBefore(start, thirtyDaysFromNow);
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));

  const upcomingHolidays = holidays.filter(h => {
    const date = new Date(h.date);
    return isAfter(date, currentDate) && isBefore(date, thirtyDaysFromNow);
  }).sort((a, b) => a.date.localeCompare(b.date));

  const LeaveCard = ({ req, showDate = false }: { req: LeaveRequest, showDate?: boolean }) => {
    const emp = getEmployee(req.employeeId);
    if (!emp) return null;

    return (
      <div className="flex items-center p-4 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
          {emp.firstName[0]}{emp.lastName[0]}
        </div>
        <div className="ml-4 flex-1">
          <div className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</div>
          <div className="text-xs text-gray-500">{req.type}</div>
          {showDate && (
             <div className="text-xs text-gray-400 mt-1">
               {format(parseISO(req.startDate), 'MMM d')} - {format(parseISO(req.endDate), 'MMM d')}
             </div>
          )}
        </div>
        <div className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">
          {req.reason}
        </div>
      </div>
    );
  };

  const HolidayCard = ({ holiday }: { holiday: PublicHoliday }) => (
    <div className="flex items-center p-4 bg-purple-50 border border-purple-100 rounded-lg shadow-sm">
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xl">
        🎉
      </div>
      <div className="ml-4 flex-1">
        <div className="text-sm font-bold text-purple-900">{holiday.name}</div>
        <div className="text-xs text-purple-600">{format(new Date(holiday.date), 'EEEE, MMM d')}</div>
      </div>
      <div className="text-xs font-medium text-purple-600 bg-white px-2 py-1 rounded border border-purple-100">
        Public Holiday
      </div>
    </div>
  );

  if (loading) {
    return <div className="p-6">Loading schedule...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Schedule</h1>
        <p className="text-gray-500">Overview of who is away today, this week, and upcoming.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Absences */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Away Today
            </h2>
            <span className="text-sm text-gray-500">{format(currentDate, 'MMM d, yyyy')}</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 min-h-[200px] space-y-3">
            {holidayToday && <HolidayCard holiday={holidayToday} />}
            {awayToday.length > 0 ? (
              awayToday.map(req => <LeaveCard key={req.id} req={req} />)
            ) : !holidayToday && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm py-8">
                <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Everyone is present today
              </div>
            )}
          </div>
        </div>

        {/* This Week's Absences */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              This Week
            </h2>
            <span className="text-sm text-gray-500">
              {format(startOfCurrentWeek, 'MMM d')} - {format(endOfCurrentWeek, 'MMM d')}
            </span>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 min-h-[200px] space-y-3">
             {holidaysThisWeek.map(h => <HolidayCard key={h.id} holiday={h} />)}
             {awayThisWeek.length > 0 ? (
              awayThisWeek.map(req => <LeaveCard key={req.id} req={req} showDate={true} />)
            ) : holidaysThisWeek.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                No planned leaves this week
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Leaves */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Upcoming (30 Days)
            </h2>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 min-h-[200px] space-y-3">
            {upcomingHolidays.map(h => <HolidayCard key={h.id} holiday={h} />)}
            {upcomingLeaves.length > 0 ? (
              upcomingLeaves.map(req => <LeaveCard key={req.id} req={req} showDate={true} />)
            ) : upcomingHolidays.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                No upcoming leaves scheduled
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
