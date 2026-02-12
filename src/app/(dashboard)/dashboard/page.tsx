"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { employeeService } from '@/services/employeeService';
import { leaveService } from '@/services/leaveService';
import { expensesService } from '@/services/expensesService';
import { attendanceService } from '@/services/attendanceService';
import { payrollService } from '@/services/payrollService';
import { holidayService } from '@/services/holidayService';
import { calculateWorkingDays } from '@/utils/workDayCalculations';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    newEmployees: 0,
    onLeaveToday: 0,
    onLeaveTodayList: [] as any[], // For avatars
    pendingLeave: 0,
    pendingExpenses: 0,
    upcomingPayrollDays: 0,
    upcomingPayrollDate: '',
  });
  
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Fetch all data in parallel
        const [
          employeesRes,
          leavesRes,
          expensesRes,
          attendanceRes,
          payslipsRes,
          holidaysRes
        ] = await Promise.allSettled([
          employeeService.getAll(),
          leaveService.getAll(),
          expensesService.getExpenses(),
          attendanceService.getAll(), // We might want to limit this to current week
          payrollService.getAllPayslips(),
          holidayService.getByYear(currentYear)
        ]);

        // Process Employees
        let totalEmployees = 0;
        let newEmployees = 0;
        const employeeMap = new Map<string, string>();

        if (employeesRes.status === 'fulfilled') {
          const employees = employeesRes.value;
          totalEmployees = employees.length;
          employees.forEach(e => {
            employeeMap.set(e.id, `${e.firstName} ${e.lastName}`);
          });
          newEmployees = employees.filter(e => {
            const joinDate = new Date(e.joinDate);
            return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
          }).length;
        }

        // Process Leaves
        let onLeaveToday = 0;
        let onLeaveTodayList: any[] = [];
        let pendingLeave = 0;
        let leaveDistribution: Record<string, number> = {};
        
        if (leavesRes.status === 'fulfilled') {
          const leaves = leavesRes.value;
          
          // On Leave Today (Approved and covers today)
          const activeLeaves = leaves.filter(l => 
            l.status === 'Approved' && 
            l.startDate <= todayStr && 
            l.endDate >= todayStr
          );
          onLeaveToday = activeLeaves.length;
          onLeaveTodayList = activeLeaves.slice(0, 5).map(l => ({
            ...l,
            employeeName: employeeMap.get(l.employeeId) || 'Unknown'
          }));

          // Pending Approvals
          pendingLeave = leaves.filter(l => l.status === 'Pending').length;

          // Process Holidays
          let holidays: Date[] = [];
          if (holidaysRes.status === 'fulfilled') {
            holidays = holidaysRes.value.map(h => new Date(h.date));
          }

          // Leave Distribution (YTD) - Calculate working days instead of count
          leaves.forEach(l => {
            if (l.status === 'Approved') {
              const leaveDate = new Date(l.startDate);
              // Only include leaves for current year
              if (leaveDate.getFullYear() === currentYear) {
                const days = calculateWorkingDays(l.startDate, l.endDate, holidays);
                leaveDistribution[l.type] = (leaveDistribution[l.type] || 0) + days;
              }
            }
          });
        }

        // Process Expenses
        let pendingExpenses = 0;
        if (expensesRes.status === 'fulfilled') {
          const expenses = expensesRes.value;
          pendingExpenses = expenses.filter(e => e.status === 'Submitted').length;
        }

        // Process Attendance (Weekly)
        // Calculate start of current week (Monday)
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(today.setDate(diff));
        const weekDates = Array.from({length: 5}, (_, i) => {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          return d.toISOString().split('T')[0];
        });

        const weeklyAttendance = weekDates.map(date => {
          const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
          if (attendanceRes.status === 'fulfilled') {
            const records = attendanceRes.value.filter(r => r.date === date);
            return {
              name: dayName,
              present: records.filter(r => r.status === 'Present').length,
              late: records.filter(r => r.status === 'Late').length,
              absent: records.filter(r => r.status === 'Absent').length,
            };
          }
          return { name: dayName, present: 0, late: 0, absent: 0 };
        });
        setAttendanceData(weeklyAttendance);

        // Process Payroll (Upcoming)
        // Default to last day of current month if no data
        let upcomingPayrollDate = new Date(currentYear, currentMonth + 1, 0); // Last day of month
        // Or 15th if today is before 15th
        if (today.getDate() < 15) {
            upcomingPayrollDate = new Date(currentYear, currentMonth, 15);
        }
        
        const daysUntilPayroll = Math.ceil((upcomingPayrollDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        setStats({
          totalEmployees,
          newEmployees,
          onLeaveToday,
          onLeaveTodayList,
          pendingLeave,
          pendingExpenses,
          upcomingPayrollDays: daysUntilPayroll,
          upcomingPayrollDate: upcomingPayrollDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        });

        // Set Leave Data for Chart
        const leaveChartData = Object.entries(leaveDistribution).map(([name, value]) => ({ name, value }));
        // If empty, show some placeholders or empty state
        if (leaveChartData.length === 0) {
            setLeaveData([
                { name: 'Annual', value: 0 },
                { name: 'Sick', value: 0 },
                { name: 'Unpaid', value: 0 },
                { name: 'Maternity', value: 0 },
            ]);
        } else {
            setLeaveData(leaveChartData);
        }

        // Process Recent Activity (Combine sources)
        const activities: any[] = [];
        
        if (attendanceRes.status === 'fulfilled') {
            // Last 5 clock ins
            attendanceRes.value.slice(0, 5).forEach(a => {
                activities.push({
                    user: employeeMap.get(a.employeeId) || 'Employee',
                    action: 'clocked in',
                    time: new Date(a.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    type: 'attendance',
                    timestamp: new Date(a.clockIn).getTime()
                });
            });
        }
        
        if (expensesRes.status === 'fulfilled') {
            expensesRes.value.slice(0, 5).forEach(e => {
                activities.push({
                    user: employeeMap.get(e.employeeId) || 'Employee',
                    action: 'submitted an expense claim',
                    time: new Date(e.dateSubmitted).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    type: 'expense',
                    timestamp: new Date(e.dateSubmitted).getTime()
                });
            });
        }

        if (leavesRes.status === 'fulfilled') {
            leavesRes.value.slice(0, 5).forEach(l => {
                activities.push({
                    user: employeeMap.get(l.employeeId) || 'Employee',
                    action: `requested leave (${l.type})`,
                    time: new Date(l.startDate).toLocaleDateString(), // Use date as time is not available
                    type: 'leave',
                    timestamp: new Date(l.startDate).getTime() // Approximation
                });
            });
        }

        // Sort by timestamp desc and take top 5
        const sortedActivities = activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
        setRecentActivity(sortedActivities);

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
      return <div className="p-6">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Employees */}
        <Link href="/employees" className="block group relative">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500 transition-transform transform group-hover:-translate-y-1 h-full">
            <h3 className="text-gray-500 text-sm font-medium">Total Employees</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalEmployees}</p>
            <p className="text-xs text-green-600 mt-1">↑ {stats.newEmployees} new this month</p>
            
            {/* Hover Details */}
            <div className="absolute top-full left-0 w-full mt-2 p-3 bg-gray-800 text-white text-xs rounded z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              <p className="font-semibold mb-1">Overview</p>
              <ul className="space-y-1">
                <li>Total: {stats.totalEmployees}</li>
                <li>New: {stats.newEmployees}</li>
                <li>Click to manage employees</li>
              </ul>
            </div>
          </div>
        </Link>

        {/* On Leave Today */}
        <Link href="/leave/schedule" className="block group relative">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500 transition-transform transform group-hover:-translate-y-1 h-full">
            <h3 className="text-gray-500 text-sm font-medium">On Leave Today</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats.onLeaveToday}</p>
            <div className="flex -space-x-2 mt-2">
              {stats.onLeaveTodayList.slice(0, 3).map((l, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600" title={l.employeeName}>
                  {l.employeeName.charAt(0)}
                </div>
              ))}
              {stats.onLeaveToday > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] text-gray-500">+{stats.onLeaveToday - 3}</div>
              )}
            </div>

            {/* Hover Details */}
            <div className="absolute top-full left-0 w-full mt-2 p-3 bg-gray-800 text-white text-xs rounded z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              <p className="font-semibold mb-1">Who's on leave?</p>
              {stats.onLeaveTodayList.length > 0 ? (
                <ul className="space-y-1">
                  {stats.onLeaveTodayList.map((l, i) => (
                    <li key={i} className="truncate">• {l.employeeName}</li>
                  ))}
                  {stats.onLeaveToday > 5 && <li>...and {stats.onLeaveToday - 5} more</li>}
                </ul>
              ) : (
                <p className="text-gray-400">No one is on leave today.</p>
              )}
            </div>
          </div>
        </Link>

        {/* Pending Approvals */}
        <Link href="/employees/requests" className="block group relative">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500 transition-transform transform group-hover:-translate-y-1 h-full">
            <h3 className="text-gray-500 text-sm font-medium">Pending Approvals</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats.pendingLeave + stats.pendingExpenses}</p>
            <p className="text-xs text-gray-500 mt-1">Leave: {stats.pendingLeave} | Expenses: {stats.pendingExpenses}</p>

            {/* Hover Details */}
            <div className="absolute top-full left-0 w-full mt-2 p-3 bg-gray-800 text-white text-xs rounded z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              <p className="font-semibold mb-1">Action Items</p>
              <ul className="space-y-1">
                <li className="flex justify-between"><span>Leave Requests:</span> <span>{stats.pendingLeave}</span></li>
                <li className="flex justify-between"><span>Expense Claims:</span> <span>{stats.pendingExpenses}</span></li>
                <li className="text-gray-400 mt-1 pt-1 border-t border-gray-700">Click to review requests</li>
              </ul>
            </div>
          </div>
        </Link>

        {/* Upcoming Payroll */}
        <Link href="/payroll/process" className="block group relative">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500 transition-transform transform group-hover:-translate-y-1 h-full">
            <h3 className="text-gray-500 text-sm font-medium">Upcoming Payroll</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats.upcomingPayrollDays} Days</p>
            <p className="text-xs text-gray-500 mt-1">Due: {stats.upcomingPayrollDate}</p>

            {/* Hover Details */}
            <div className="absolute top-full left-0 w-full mt-2 p-3 bg-gray-800 text-white text-xs rounded z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              <p className="font-semibold mb-1">Next Pay Run</p>
              <ul className="space-y-1">
                <li>Date: {stats.upcomingPayrollDate}</li>
                <li>Status: Scheduled</li>
                <li className="text-gray-400 mt-1 pt-1 border-t border-gray-700">Click to process payroll</li>
              </ul>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Attendance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="present" fill="#4ade80" name="Present" />
                <Bar dataKey="late" fill="#facc15" name="Late" />
                <Bar dataKey="absent" fill="#f87171" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Distribution (YTD)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leaveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {leaveData.map((entry, index) => (
                <div key={index} className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  {entry.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            <button className="text-sm text-blue-600 hover:text-blue-800">View All</button>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 mt-2 rounded-full ${
                        activity.type === 'attendance' ? 'bg-green-500' :
                        activity.type === 'expense' ? 'bg-yellow-500' :
                        activity.type === 'leave' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <div>
                        <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user}</span> {activity.action}
                        </p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                    </div>
                ))
              ) : (
                  <div className="text-sm text-gray-500">No recent activity</div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <a href="/employees/add" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="text-2xl mb-2">👤</span>
              <span className="text-sm font-medium text-gray-700">Add Employee</span>
            </a>
            <a href="/attendance" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="text-2xl mb-2">⏱️</span>
              <span className="text-sm font-medium text-gray-700">Clock In/Out</span>
            </a>
            <a href="/leave" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="text-2xl mb-2">📅</span>
              <span className="text-sm font-medium text-gray-700">Apply Leave</span>
            </a>
            <a href="/expenses" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="text-2xl mb-2">💰</span>
              <span className="text-sm font-medium text-gray-700">Expense Claim</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
