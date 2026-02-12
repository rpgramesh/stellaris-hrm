"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { employeeService } from '@/services/employeeService';
import { leaveService } from '@/services/leaveService';
import { payrollService } from '@/services/payrollService';
import { attendanceService } from '@/services/attendanceService';
import { holidayService } from '@/services/holidayService';
import { calculateWorkingDays } from '@/utils/workDayCalculations';
import { Employee, LeaveRequest, Payslip, AttendanceRecord } from '@/types';

export default function ESSDashboardPage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaveBalance, setLeaveBalance] = useState<number>(0);
  const [nextPayDate, setNextPayDate] = useState<string>('Unknown');
  const [isPayDateConfirmed, setIsPayDateConfirmed] = useState<boolean>(false);
  const [nextShift, setNextShift] = useState<string>('No shift scheduled');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0); // Placeholder

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // 1. Get Current User (Fallback to first employee for demo)
        const { data: { user } } = await supabase.auth.getUser();
        let currentEmployee: Employee | undefined;

        if (user?.email) {
           const allEmployees = await employeeService.getAll();
           currentEmployee = allEmployees.find(e => e.email === user.email);
        }

        if (!currentEmployee) {
          // Fallback: Get the first employee
          const allEmployees = await employeeService.getAll();
          if (allEmployees.length > 0) {
            currentEmployee = allEmployees[0];
          }
        }

        if (!currentEmployee) {
          console.error("No employee record found");
          return;
        }

        setEmployee(currentEmployee);

        // 2. Fetch related data
        const currentYear = new Date().getFullYear();
        const [leaves, payslips, attendance, entitlements, thisYearHolidays, nextYearHolidays] = await Promise.all([
          leaveService.getByEmployeeId(currentEmployee.id!),
          payrollService.getPayslipsByEmployee(currentEmployee.id!),
          attendanceService.getAll(undefined, undefined, currentEmployee.id!),
          leaveService.getEntitlements(currentEmployee.id!, currentYear),
          holidayService.getByYear(currentYear),
          holidayService.getByYear(currentYear + 1)
        ]);

        const allHolidays = [...thisYearHolidays, ...nextYearHolidays].map(h => new Date(h.date));

        // 3. Process Leave Balance
        // Calculate total entitlement for Annual Leave
        const annualEntitlementRaw = entitlements
            .filter(e => e.leaveType === 'Annual' || e.leaveType === 'Annual Leave')
            .reduce((sum, e) => sum + Number(e.totalDays || 0) + Number(e.carriedOver || 0), 0);
        
        // Fallback if no entitlement records exist
        const totalEntitlement = entitlements.length > 0 ? annualEntitlementRaw : 20;

        const approvedLeaves = leaves.filter(l => l.status === 'Approved' && (l.type === 'Annual' || l.type === 'Annual Leave'));
        const daysTaken = approvedLeaves.reduce((acc, l) => {
          return acc + calculateWorkingDays(l.startDate, l.endDate, allHolidays);
        }, 0);
        setLeaveBalance(Math.max(totalEntitlement - daysTaken, 0));

        // 4. Process Next Pay Date
        // Assume monthly pay cycle, find next 15th or 30th?
        // Or just look at the last payslip and add 1 month.
        if (payslips.length > 0) {
          const lastPayDate = new Date(payslips[0].paymentDate);
          const nextPay = new Date(lastPayDate);
          nextPay.setMonth(nextPay.getMonth() + 1);
          setNextPayDate(nextPay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          setIsPayDateConfirmed(true);
        } else {
          // Default to end of current month
          const today = new Date();
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          setNextPayDate(lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          setIsPayDateConfirmed(false);
        }

        // 5. Process Next Shift / Attendance
        // Since we don't have a roster table, we'll check if clocked in today.
        const todayStr = new Date().toISOString().split('T')[0];
        const todayAttendance = attendance.find(a => a.date === todayStr);
        if (todayAttendance) {
          if (todayAttendance.clockOut) {
            setNextShift('Shift Completed');
          } else if (todayAttendance.clockIn) {
            setNextShift('Clocked In');
          } else {
             setNextShift('Not Started');
          }
        } else {
           setNextShift('No shift today');
        }

        // 6. Generate Recent Activity Feed
        const activities: any[] = [];

        // Payslips
        payslips.slice(0, 2).forEach(p => {
          activities.push({
            action: 'Payslip Available',
            date: new Date(p.paymentDate).toLocaleDateString(),
            detail: `Period: ${p.periodStart} - ${p.periodEnd}`,
            icon: '📄',
            color: 'bg-blue-100 text-blue-600',
            timestamp: new Date(p.paymentDate).getTime()
          });
        });

        // Leaves
        leaves.slice(0, 3).forEach(l => {
          activities.push({
            action: `Leave ${l.status}`,
            date: new Date(l.createdAt || l.startDate).toLocaleDateString(), // createdAt might be missing in type, fallback
            detail: `${l.type}: ${l.startDate} - ${l.endDate}`,
            icon: l.status === 'Approved' ? '✅' : '⏳',
            color: l.status === 'Approved' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600',
            timestamp: new Date(l.startDate).getTime() // Approximation
          });
        });

        // Sort by date desc
        activities.sort((a, b) => b.timestamp - a.timestamp);
        setRecentActivity(activities.slice(0, 5));

      } catch (error) {
        console.error("Error fetching ESS data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading your dashboard...</div>;
  }

  if (!employee) {
    return <div className="p-8 text-center text-red-500">Employee record not found. Please contact HR.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome back, {employee.firstName}!</h1>
          <p className="text-gray-500">Here's what's happening with your employment.</p>
        </div>
        <div className="hidden md:block text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="text-gray-500 text-sm font-medium mb-1">Next Pay Date</div>
            <div className="text-2xl font-bold text-gray-900">{nextPayDate}</div>
          </div>
          <div className={`mt-4 text-sm w-fit px-2 py-1 rounded-full ${isPayDateConfirmed ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
            {isPayDateConfirmed ? 'Confirmed' : 'Estimated'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="text-gray-500 text-sm font-medium mb-1">Annual Leave Balance</div>
            <div className="text-2xl font-bold text-gray-900">{leaveBalance} Days</div>
          </div>
          <div className="mt-4 text-sm text-blue-600 hover:underline">
            <Link href="/self-service/leave">View Details</Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="text-gray-500 text-sm font-medium mb-1">Today's Status</div>
            <div className="text-2xl font-bold text-gray-900">{nextShift}</div>
            {/* <div className="text-sm text-gray-600">09:00 AM - 05:00 PM</div> */} 
          </div>
          <div className="mt-4">
            <Link href="/attendance" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Check In / Out &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="text-gray-500 text-sm font-medium mb-1">Messages</div>
            <div className="text-2xl font-bold text-gray-900">{unreadMessages} New</div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            From HR & Manager
          </div>
        </div>
      </div>

      {/* Main Actions Grid - Mobile First */}
      <h2 className="text-lg font-semibold text-gray-900 mt-8">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/self-service/payslips" className="block group">
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all h-full">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">View Payslips</h3>
            <p className="text-sm text-gray-500">Download your latest pay advice.</p>
          </div>
        </Link>

        <Link href="/self-service/leave" className="block group">
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-green-400 hover:shadow-md transition-all h-full">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Apply for Leave</h3>
            <p className="text-sm text-gray-500">Request time off or view history.</p>
          </div>
        </Link>

        <Link href="/self-service/profile" className="block group">
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all h-full">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Bank Details</h3>
            <p className="text-sm text-gray-500">Update your payment information.</p>
          </div>
        </Link>

        <Link href="/attendance" className="block group">
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-orange-400 hover:shadow-md transition-all h-full">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Timesheets</h3>
            <p className="text-sm text-gray-500">Clock in/out and view hours.</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity Feed */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.length > 0 ? (
            recentActivity.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color} font-bold`}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.action}</p>
                  <p className="text-xs text-gray-500">{item.detail}</p>
                </div>
                <div className="ml-auto text-xs text-gray-400">
                  {item.date}
                </div>
              </div>
            ))
          ) : (
             <div className="p-6 text-center text-gray-500">No recent activity</div>
          )}
        </div>
        <div className="px-6 py-3 bg-gray-50 text-center">
          <button className="text-sm text-blue-600 font-medium hover:text-blue-800">View All Activity</button>
        </div>
      </div>
    </div>
  );
}
