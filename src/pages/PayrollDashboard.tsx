import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  FileText,
  Settings,
  Calculator,
  Award,
  PiggyBank
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PayrollStats {
  totalEmployees: number;
  totalPayroll: number;
  pendingAdjustments: number;
  pendingApprovals: number;
  upcomingPayRuns: number;
  stpSubmissions: number;
  superContributions: number;
  bonusPayments: number;
}

interface RecentActivity {
  id: string;
  type: 'adjustment' | 'payroll' | 'approval' | 'bonus' | 'super';
  description: string;
  employeeName: string;
  date: string;
  status: 'pending' | 'approved' | 'processed' | 'rejected';
}

export default function PayrollDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<PayrollStats>({
    totalEmployees: 0,
    totalPayroll: 0,
    pendingAdjustments: 0,
    pendingApprovals: 0,
    upcomingPayRuns: 0,
    stpSubmissions: 0,
    superContributions: 0,
    bonusPayments: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const fetchEmployeeNames = async (employeeIds: string[]) => {
    if (employeeIds.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .in('id', employeeIds);

      if (error) throw error;

      const names: Record<string, string> = {};
      data?.forEach(emp => {
        names[emp.id] = `${emp.first_name} ${emp.last_name}`;
      });
      setEmployeeNames(names);
    } catch (error) {
      console.error('Error loading employee names:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load payroll statistics
      const [
        employeesCount, 
        payrollStats, 
        adjustmentsCount, 
        approvalsCount,
        upcomingRuns,
        stpCount,
        superCount,
        bonusCount
      ] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('employment_status', 'Active'),
        supabase.from('payroll_runs')
          .select('total_gross_pay, total_net_pay')
          .eq('status', 'Paid')
          .gte('pay_period_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('salary_adjustments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Draft'),
        supabase.from('salary_adjustments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'PendingApproval'),
        supabase.from('payroll_runs')
          .select('id', { count: 'exact', head: true })
          .in('status', ['Draft', 'Processing']),
        supabase.from('stp_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Submitted'),
        supabase.from('superannuation_contributions')
          .select('id', { count: 'exact', head: true })
          .eq('is_paid', false),
        supabase.from('bonus_payments')
          .select('id', { count: 'exact', head: true })
      ]);

      // Load recent activity
      const { data: recentData } = await supabase
        .from('salary_adjustments')
        .select(`
          id,
          employee_id,
          adjustment_type,
          amount,
          effective_date,
          status
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Transform recent activity data
      const transformedActivity: RecentActivity[] = recentData?.map(item => ({
        id: item.id,
        type: 'adjustment' as const,
        description: `${item.adjustment_type} adjustment of $${item.amount}`,
        employeeName: employeeNames[item.employee_id] || 'Unknown Employee',
        date: item.effective_date,
        status: item.status as any
      })) || [];

      // Fetch employee names for recent activity
      if (recentData && recentData.length > 0) {
        const employeeIds = [...new Set(recentData.map(item => item.employee_id))];
        await fetchEmployeeNames(employeeIds);
      }

      setStats({
        totalEmployees: employeesCount.count || 0,
        totalPayroll: payrollStats.data?.reduce((sum, run) => sum + (run.total_net_pay || 0), 0) || 0,
        pendingAdjustments: adjustmentsCount.count || 0,
        pendingApprovals: approvalsCount.count || 0,
        upcomingPayRuns: upcomingRuns.count || 0,
        stpSubmissions: stpCount.count || 0,
        superContributions: superCount.count || 0,
        bonusPayments: bonusCount.count || 0
      });

      setRecentActivity(transformedActivity);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'processed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'adjustment':
        return <DollarSign className="h-4 w-4" />;
      case 'payroll':
        return <Calculator className="h-4 w-4" />;
      case 'approval':
        return <CheckCircle className="h-4 w-4" />;
      case 'bonus':
        return <TrendingUp className="h-4 w-4" />;
      case 'super':
        return <PiggyBank className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your payroll operations and compliance</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/payroll/process')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Calculator className="h-4 w-4" />
            <span>Process Payroll</span>
          </button>
          <button
            onClick={() => router.push('/payroll/settings')}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Payroll</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalPayroll.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Pay Runs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingPayRuns}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/payroll/adjustments"
            className="p-4 border rounded-lg hover:bg-gray-50 text-center"
          >
            <DollarSign className="h-6 w-6 mx-auto text-blue-600 mb-2" />
            <span className="text-sm font-medium">Salary Adjustments</span>
          </Link>

          <Link
            href="/payroll/bonus"
            className="p-4 border rounded-lg hover:bg-gray-50 text-center"
          >
            <TrendingUp className="h-6 w-6 mx-auto text-green-600 mb-2" />
            <span className="text-sm font-medium">Bonus Payments</span>
          </Link>

          <Link
            href="/payroll/superannuation"
            className="p-4 border rounded-lg hover:bg-gray-50 text-center"
          >
            <PiggyBank className="h-6 w-6 mx-auto text-purple-600 mb-2" />
            <span className="text-sm font-medium">Superannuation</span>
          </Link>

          <Link
            href="/payroll/award-interpretation"
            className="p-4 border rounded-lg hover:bg-gray-50 text-center"
          >
            <Award className="h-6 w-6 mx-auto text-orange-600 mb-2" />
            <span className="text-sm font-medium">Awards</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          ) : (
            recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-gray-600">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.employeeName} • {new Date(activity.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
                  {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}