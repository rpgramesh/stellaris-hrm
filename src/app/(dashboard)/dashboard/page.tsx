"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { employeeService } from '@/services/employeeService';
import { leaveService } from '@/services/leaveService';
import { expensesService } from '@/services/expensesService';
import { attendanceService } from '@/services/attendanceService';
import { payrollService } from '@/services/payrollService';
import { holidayService } from '@/services/holidayService';
import { learningService } from '@/services/learningService';
import { recruitmentService } from '@/services/recruitmentService';
import { CourseEnrollment, Job, Applicant, Offer } from '@/types';
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
  const [mandatoryLearning, setMandatoryLearning] = useState<CourseEnrollment[]>([]);
  const [mandatoryError, setMandatoryError] = useState<string | null>(null);
  const [recruitmentStats, setRecruitmentStats] = useState({
    openJobs: 0,
    totalApplicants: 0,
    inInterview: 0,
    offersPending: 0,
  });
  const [openJobsList, setOpenJobsList] = useState<Job[]>([]);
  const [applicantsList, setApplicantsList] = useState<Applicant[]>([]);
  const [inInterviewList, setInInterviewList] = useState<Applicant[]>([]);
  const [pendingOffersList, setPendingOffersList] = useState<Offer[]>([]);

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
          holidaysRes,
          learningRes,
          jobsRes,
          applicantsRes,
          offersRes,
        ] = await Promise.allSettled([
          employeeService.getAll(),
          leaveService.getAll(),
          expensesService.getExpenses(),
          attendanceService.getAll(),
          payrollService.getAllPayslips(),
          holidayService.getByYear(currentYear),
          learningService.getAllAssignments(),
          recruitmentService.getJobs(),
          recruitmentService.getApplicants(),
          recruitmentService.getOffers(),
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
          
          const upcomingLeaves = leaves
            .filter(l => 
              l.status === 'Approved' &&
              l.endDate >= todayStr
            )
            .sort((a, b) => a.startDate.localeCompare(b.startDate));
          onLeaveToday = upcomingLeaves.length;
          onLeaveTodayList = upcomingLeaves.slice(0, 5).map(l => ({
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
          upcomingPayrollDate: upcomingPayrollDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        });

        // Process Mandatory Learning (non-completed assignments only)
        let mandatoryItems: CourseEnrollment[] = [];
        if (learningRes.status === 'fulfilled') {
          const allAssignments = (learningRes.value || []) as CourseEnrollment[];
          mandatoryItems = allAssignments.filter(a => a.status !== 'Completed');

          // Validate due dates; skip items with invalid due dates
          mandatoryItems = mandatoryItems.filter(a => {
            if (!a.dueDate) return true;
            const parsed = new Date(a.dueDate);
            const isValid = !isNaN(parsed.getTime());
            if (!isValid) {
              console.warn('Skipping mandatory learning item with invalid due date', a);
            }
            return isValid;
          });

          // Sort by due date (earliest first), then by enrolled date
          mandatoryItems.sort((a, b) => {
            const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
            const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
            if (aDate === bDate) {
              return new Date(a.enrolledDate).getTime() - new Date(b.enrolledDate).getTime();
            }
            return aDate - bDate;
          });

          setMandatoryError(null);
        } else {
          console.error('Error fetching mandatory learning:', learningRes.reason);
          setMandatoryError('Unable to load mandatory learning at this time.');
        }
        setMandatoryLearning(mandatoryItems);

        let openJobs = 0;
        let totalApplicants = 0;
        let inInterview = 0;
        let offersPending = 0;

        let openJobsItems: Job[] = [];
        let applicantsItems: Applicant[] = [];
        let inInterviewItems: Applicant[] = [];
        let pendingOffersItems: Offer[] = [];

        if (jobsRes.status === 'fulfilled') {
          const jobs = jobsRes.value as Job[];
          openJobsItems = jobs.filter(
            job => job.status === 'Published' || job.status === 'Paused'
          );
          openJobs = openJobsItems.length;
          totalApplicants = jobs.reduce(
            (sum, job) => sum + (job.applicantsCount || 0),
            0
          );
        }

        if (applicantsRes.status === 'fulfilled') {
          const applicants = applicantsRes.value as Applicant[];
          applicantsItems = applicants;
          inInterviewItems = applicants.filter(a => 
            a.status === 'Interview' ||
            (Array.isArray(a.interviews) && a.interviews.some(i => i.status === 'Scheduled'))
          );
          inInterview = inInterviewItems.length;
        }

        if (offersRes.status === 'fulfilled') {
          const offers = offersRes.value as Offer[];
          pendingOffersItems = offers.filter(
            offer =>
              offer.status === 'Draft' ||
              offer.status === 'Sent' ||
              offer.status === 'Pending Response'
          );
          offersPending = pendingOffersItems.length;
        }

        setRecruitmentStats({
          openJobs,
          totalApplicants,
          inInterview,
          offersPending,
        });
        setOpenJobsList(openJobsItems);
        setApplicantsList(applicantsItems);
        setInInterviewList(inInterviewItems);
        setPendingOffersList(pendingOffersItems);

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

        {/* Upcoming Approved Leave */}
        <Link href="/leave/schedule" className="block group relative">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500 transition-transform transform group-hover:-translate-y-1 h-full">
            <h3 className="text-gray-500 text-sm font-medium">Upcoming Approved Leave</h3>
            <p
              className="text-2xl font-bold text-gray-900 mt-2"
              title={
                stats.onLeaveTodayList.length > 0
                  ? `${stats.onLeaveTodayList[0].employeeName} (${new Date(stats.onLeaveTodayList[0].startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(stats.onLeaveTodayList[0].endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
                  : 'No upcoming approved leave'
              }
            >
              {stats.onLeaveToday}
            </p>
            <div className="flex -space-x-2 mt-2">
              {stats.onLeaveTodayList.slice(0, 3).map((l, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600"
                  title={`${l.employeeName} (${new Date(l.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(l.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                >
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
                    <li key={i} className="truncate">
                      • {l.employeeName} (
                      {new Date(l.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                      {new Date(l.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                    </li>
                  ))}
                  {stats.onLeaveToday > 5 && <li>...and {stats.onLeaveToday - 5} more</li>}
                </ul>
              ) : (
                <p className="text-gray-400">No upcoming approved leave.</p>
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

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Hiring & Interviews</h2>
          <Link
            href="/talent/recruitment?tab=jobs"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Open Recruitment
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/talent/recruitment?tab=jobs" className="block group relative">
            {openJobsList.length > 0 && (
              <div className="absolute inset-x-0 -top-2 transform -translate-y-full z-20 hidden group-hover:block">
                <div className="bg-white shadow-lg border border-gray-200 rounded-lg p-3 text-xs text-gray-700 space-y-1">
                  {openJobsList.slice(0, 5).map(job => (
                    <div key={job.id} className="flex justify-between gap-2">
                      <span className="font-medium truncate">{job.title}</span>
                      <span className="text-gray-500">{job.status}</span>
                    </div>
                  ))}
                  {openJobsList.length > 5 && (
                    <div className="text-gray-400">
                      +{openJobsList.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500 transition-transform transform group-hover:-translate-y-1 h-full">
              <h3 className="text-gray-500 text-sm font-medium">Open Positions</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {recruitmentStats.openJobs}
              </p>
              <p className="text-xs text-gray-500 mt-1">Published or active roles</p>
            </div>
          </Link>

          <Link href="/talent/recruitment?tab=applicants" className="block group relative">
            {applicantsList.length > 0 && (
              <div className="absolute inset-x-0 -top-2 transform -translate-y-full z-20 hidden group-hover:block">
                <div className="bg-white shadow-lg border border-gray-200 rounded-lg p-3 text-xs text-gray-700 space-y-1">
                  {applicantsList.slice(0, 5).map(applicant => (
                    <div key={applicant.id} className="flex justify-between gap-2">
                      <span className="font-medium truncate">
                        {applicant.firstName} {applicant.lastName}
                      </span>
                      <span className="text-gray-500">{applicant.status}</span>
                    </div>
                  ))}
                  {applicantsList.length > 5 && (
                    <div className="text-gray-400">
                      +{applicantsList.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-sky-500 transition-transform transform group-hover:-translate-y-1 h-full">
              <h3 className="text-gray-500 text-sm font-medium">Total Applicants</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {recruitmentStats.totalApplicants}
              </p>
              <p className="text-xs text-gray-500 mt-1">Across all active jobs</p>
            </div>
          </Link>

          <Link href="/talent/recruitment?tab=applicants&stage=Interview" className="block group relative">
            {inInterviewList.length > 0 && (
              <div className="absolute inset-x-0 -top-2 transform -translate-y-full z-20 hidden group-hover:block">
                <div className="bg-white shadow-lg border border-gray-200 rounded-lg p-3 text-xs text-gray-700 space-y-1">
                  {inInterviewList.slice(0, 5).map(applicant => (
                    <div key={applicant.id} className="flex justify-between gap-2">
                      <span className="font-medium truncate">
                        {applicant.firstName} {applicant.lastName}
                      </span>
                      <span className="text-gray-500">{applicant.status}</span>
                    </div>
                  ))}
                  {inInterviewList.length > 5 && (
                    <div className="text-gray-400">
                      +{inInterviewList.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-emerald-500 transition-transform transform group-hover:-translate-y-1 h-full">
              <h3 className="text-gray-500 text-sm font-medium">In Interview Stage</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {recruitmentStats.inInterview}
              </p>
              <p className="text-xs text-gray-500 mt-1">Applicants tagged as Interview</p>
            </div>
          </Link>

          <Link href="/talent/recruitment?tab=offers&offersFilter=pending" className="block group relative">
            {pendingOffersList.length > 0 && (
              <div className="absolute inset-x-0 -top-2 transform -translate-y-full z-20 hidden group-hover:block">
                <div className="bg-white shadow-lg border border-gray-200 rounded-lg p-3 text-xs text-gray-700 space-y-1">
                  {pendingOffersList.slice(0, 5).map(offer => (
                    <div key={offer.id} className="flex justify-between gap-2">
                      <span className="font-medium truncate">{offer.applicantName}</span>
                      <span className="text-gray-500">{offer.status}</span>
                    </div>
                  ))}
                  {pendingOffersList.length > 5 && (
                    <div className="text-gray-400">
                      +{pendingOffersList.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500 transition-transform transform group-hover:-translate-y-1 h-full">
              <h3 className="text-gray-500 text-sm font-medium">Pending Offers</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {recruitmentStats.offersPending}
              </p>
              <p className="text-xs text-gray-500 mt-1">Draft or sent offers needing action</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Mandatory Learning Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Mandatory Learning</h3>
            <p className="text-xs text-gray-500">
              Only non-completed assignments are shown here.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {mandatoryLearning.length} item{mandatoryLearning.length === 1 ? '' : 's'}
            </span>
            <Link
              href="/talent/learning?tab=management"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Open in Learning
            </Link>
          </div>
        </div>
        {mandatoryError && (
          <p className="text-sm text-red-600 mb-3">{mandatoryError}</p>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mandatoryLearning.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-4 text-sm text-gray-500 text-center"
                  >
                    No pending mandatory learning.
                  </td>
                </tr>
              ) : (
                mandatoryLearning.map((item) => {
                  const displayStatus =
                    item.status === 'In Progress' ? 'In Progress' : 'Req Sent';
                  const dueDateText = item.dueDate
                    ? new Date(item.dueDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '-';

                  return (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.employeeName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dueDateText}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            displayStatus === 'In Progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
              <span className="text-sm font-medium text-gray-700">Timesheets</span>
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
