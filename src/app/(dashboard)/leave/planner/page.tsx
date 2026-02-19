"use client";

import { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isWithinInterval, 
  parseISO, 
  isWeekend
} from 'date-fns';
import { leaveService } from '@/services/leaveService';
import { employeeService } from '@/services/employeeService';
import { LeaveRequest, Employee } from '@/types';

export default function LeavePlannerPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leaveData, empData] = await Promise.all([
        leaveService.getAll(),
        employeeService.getAll()
      ]);
      setRequests(leaveData);
      setEmployees(empData);
    } catch (error) {
      console.error('Failed to load planner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getLeaveForEmployeeAndDay = (employeeId: string, day: Date) => {
    return requests.find(req => {
      if (req.employeeId !== employeeId) return false;
      // Only show approved or pending requests
      if (req.status === 'Rejected') return false;
      
      const start = parseISO(req.startDate);
      const end = parseISO(req.endDate);
      return isWithinInterval(day, { start, end });
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-500';
      case 'Pending': return 'bg-yellow-500';
      case 'Rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredEmployees = employees.filter(emp => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading planner...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Planner</h1>
          <p className="text-gray-500">Visualize team availability and scheduled leaves.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
          >
            ←
          </button>
          <span className="font-semibold text-gray-900 min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
          >
            →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search employee..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span>Pending</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 w-48 min-w-[12rem]">
                    Employee
                  </th>
                  {daysInMonth.map(day => (
                    <th 
                      key={day.toISOString()} 
                      className={`px-2 py-3 text-center text-xs font-medium border-b border-gray-200 min-w-[2.5rem] ${
                        isWeekend(day) ? 'bg-gray-50 text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      <div className="font-bold">{format(day, 'd')}</div>
                      <div className="font-normal text-[10px]">{format(day, 'EEEEE')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div className="truncate">
                          <div>{emp.firstName} {emp.lastName}</div>
                          <div className="text-xs text-gray-500 font-normal">{emp.position}</div>
                        </div>
                      </div>
                    </td>
                    {daysInMonth.map(day => {
                      const leave = getLeaveForEmployeeAndDay(emp.id, day);
                      const isWeekendDay = isWeekend(day);
                      
                      return (
                        <td 
                          key={day.toISOString()} 
                          className={`p-1 h-16 border-r border-gray-100 last:border-r-0 ${
                            isWeekendDay ? 'bg-gray-50/50' : ''
                          }`}
                        >
                          {leave && (
                            <div 
                              className={`w-full h-full rounded-md ${getStatusColor(leave.status)} opacity-80 group relative cursor-help`}
                              title={`${leave.type} - ${leave.status}`}
                            >
                              {/* Tooltip can be added here if needed */}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
