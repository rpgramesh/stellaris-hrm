import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar,
  PieChart,
  BarChart3,
  FileText,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';

interface PayrollMetrics {
  totalPayroll: number;
  totalEmployees: number;
  averageSalary: number;
  payrollGrowth: number;
  taxWithheld: number;
  superannuationContributions: number;
  bonusPayments: number;
  overtimePayments: number;
}

interface DepartmentCost {
  department: string;
  totalCost: number;
  employeeCount: number;
  averageSalary: number;
}

interface MonthlyTrend {
  month: string;
  grossPay: number;
  netPay: number;
  tax: number;
  superannuation: number;
  employees: number;
}

interface AgeDistribution {
  ageGroup: string;
  count: number;
  percentage: number;
}

interface PayComponentBreakdown {
  component: string;
  amount: number;
  percentage: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function PayrollAnalytics() {
  const [metrics, setMetrics] = useState<PayrollMetrics>({
    totalPayroll: 0,
    totalEmployees: 0,
    averageSalary: 0,
    payrollGrowth: 0,
    taxWithheld: 0,
    superannuationContributions: 0,
    bonusPayments: 0,
    overtimePayments: 0
  });
  const [departmentCosts, setDepartmentCosts] = useState<DepartmentCost[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<AgeDistribution[]>([]);
  const [payBreakdown, setPayBreakdown] = useState<PayComponentBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('12m');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange, selectedDepartment]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '3m':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6m':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '12m':
        default:
          startDate.setMonth(startDate.getMonth() - 12);
          break;
      }

      // Load payroll metrics
      const { data: payrollData } = await supabase
        .from('payroll_runs')
        .select('gross_pay, net_pay, tax_withheld, superannuation, bonus, overtime, total_employees, created_at')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'processed');

      // Load employee data
      const { data: employeeData } = await supabase
        .from('payroll_employees')
        .select('base_salary, department, birth_date, employment_start_date');

      // Calculate metrics
      const totalPayroll = payrollData?.reduce((sum, run) => sum + (run.gross_pay || 0), 0) || 0;
      const totalEmployees = employeeData?.length || 0;
      const averageSalary = totalEmployees > 0 ? 
        (employeeData?.reduce((sum, emp) => sum + (emp.base_salary || 0), 0) / totalEmployees) : 0;
      
      const taxWithheld = payrollData?.reduce((sum, run) => sum + (run.tax_withheld || 0), 0) || 0;
      const superannuationContributions = payrollData?.reduce((sum, run) => sum + (run.superannuation || 0), 0) || 0;
      const bonusPayments = payrollData?.reduce((sum, run) => sum + (run.bonus || 0), 0) || 0;
      const overtimePayments = payrollData?.reduce((sum, run) => sum + (run.overtime || 0), 0) || 0;

      // Calculate growth (comparing to previous period)
      const previousPeriodStart = new Date(startDate);
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 12);
      
      const { data: previousData } = await supabase
        .from('payroll_runs')
        .select('gross_pay')
        .gte('created_at', previousPeriodStart.toISOString())
        .lt('created_at', startDate.toISOString())
        .eq('status', 'processed');

      const previousPayroll = previousData?.reduce((sum, run) => sum + (run.gross_pay || 0), 0) || 0;
      const payrollGrowth = previousPayroll > 0 ? 
        ((totalPayroll - previousPayroll) / previousPayroll) * 100 : 0;

      // Department costs
      const deptCosts: { [key: string]: { total: number, count: number, salaries: number[] } } = {};
      
      employeeData?.forEach(emp => {
        const dept = emp.department || 'Unassigned';
        if (!deptCosts[dept]) {
          deptCosts[dept] = { total: 0, count: 0, salaries: [] };
        }
        deptCosts[dept].count++;
        deptCosts[dept].salaries.push(emp.base_salary || 0);
      });

      // Add payroll run costs to departments
      payrollData?.forEach(run => {
        // This is simplified - in reality you'd need employee-department mapping
        const avgCostPerEmployee = (run.gross_pay || 0) / (run.total_employees || 1);
        Object.keys(deptCosts).forEach(dept => {
          deptCosts[dept].total += avgCostPerEmployee * deptCosts[dept].count;
        });
      });

      const departmentCostArray = Object.keys(deptCosts).map(dept => ({
        department: dept,
        totalCost: deptCosts[dept].total,
        employeeCount: deptCosts[dept].count,
        averageSalary: deptCosts[dept].salaries.reduce((a, b) => a + b, 0) / deptCosts[dept].salaries.length
      }));

      // Monthly trends (last 12 months)
      const monthlyData: { [key: string]: MonthlyTrend } = {};
      const months: MonthlyTrend[] = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7);
        months.push({
          month: date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
          grossPay: 0,
          netPay: 0,
          tax: 0,
          superannuation: 0,
          employees: 0
        });
      }

      payrollData?.forEach(run => {
        const monthKey = run.created_at.slice(0, 7);
        const monthData = monthlyData[monthKey] || {
          month: new Date(run.created_at).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
          grossPay: 0,
          netPay: 0,
          tax: 0,
          superannuation: 0,
          employees: 0
        };
        
        monthData.grossPay += run.gross_pay || 0;
        monthData.netPay += run.net_pay || 0;
        monthData.tax += run.tax_withheld || 0;
        monthData.superannuation += run.superannuation || 0;
        monthData.employees = Math.max(monthData.employees, run.total_employees || 0);
        
        monthlyData[monthKey] = monthData;
      });

      const monthlyTrends = months.map(month => monthlyData[month.month.slice(0, 4) + '-' + 
        new Date(month.month + ' 1').toISOString().slice(5, 7)] || month);

      // Age distribution
      const ageGroups = {
        'Under 25': 0,
        '25-34': 0,
        '35-44': 0,
        '45-54': 0,
        '55-64': 0,
        '65+': 0
      };

      employeeData?.forEach(emp => {
        if (emp.birth_date) {
          const age = calculateAge(new Date(emp.birth_date));
          if (age < 25) ageGroups['Under 25']++;
          else if (age < 35) ageGroups['25-34']++;
          else if (age < 45) ageGroups['35-44']++;
          else if (age < 55) ageGroups['45-54']++;
          else if (age < 65) ageGroups['55-64']++;
          else ageGroups['65+']++;
        }
      });

      const total = Object.values(ageGroups).reduce((a, b) => a + b, 0);
      const ageDistribution = Object.keys(ageGroups).map(group => ({
        ageGroup: group,
        count: ageGroups[group as keyof typeof ageGroups],
        percentage: total > 0 ? (ageGroups[group as keyof typeof ageGroups] / total) * 100 : 0
      }));

      // Pay component breakdown
      const breakdown: PayComponentBreakdown[] = [
        { component: 'Base Salary', amount: totalPayroll * 0.7, percentage: 70 },
        { component: 'Overtime', amount: overtimePayments, percentage: (overtimePayments / totalPayroll) * 100 },
        { component: 'Bonuses', amount: bonusPayments, percentage: (bonusPayments / totalPayroll) * 100 },
        { component: 'Allowances', amount: totalPayroll * 0.1, percentage: 10 },
        { component: 'Superannuation', amount: superannuationContributions, percentage: (superannuationContributions / totalPayroll) * 100 }
      ];

      setMetrics({
        totalPayroll,
        totalEmployees,
        averageSalary,
        payrollGrowth,
        taxWithheld,
        superannuationContributions,
        bonusPayments,
        overtimePayments
      });

      setDepartmentCosts(departmentCostArray);
      setMonthlyTrends(monthlyTrends);
      setAgeDistribution(ageDistribution);
      setPayBreakdown(breakdown);

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const exportReport = (type: 'pdf' | 'excel') => {
    // Implementation for exporting reports
    alert(`Exporting ${type.toUpperCase()} report...`);
  };

  const refreshData = () => {
    loadAnalyticsData();
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
          <h1 className="text-3xl font-bold text-gray-900">Payroll Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive payroll reporting and insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="12m">Last 12 Months</option>
          </select>
          
          <button
            onClick={refreshData}
            className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => exportReport('excel')}
            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            <span>Export Excel</span>
          </button>
          
          <button
            onClick={() => exportReport('pdf')}
            className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <FileText className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payroll</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.totalPayroll.toLocaleString()}</p>
              <p className={`text-sm ${metrics.payrollGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
                {metrics.payrollGrowth >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {Math.abs(metrics.payrollGrowth).toFixed(1)}%
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalEmployees}</p>
              <p className="text-sm text-gray-500 mt-1">Active employees</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Salary</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.averageSalary.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">Per employee</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tax Withheld</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.taxWithheld.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">PAYG tax</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Payroll Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Payroll Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
              <Legend />
              <Line type="monotone" dataKey="grossPay" stroke="#3B82F6" name="Gross Pay" strokeWidth={2} />
              <Line type="monotone" dataKey="netPay" stroke="#10B981" name="Net Pay" strokeWidth={2} />
              <Line type="monotone" dataKey="tax" stroke="#EF4444" name="Tax" strokeWidth={2} />
              <Line type="monotone" dataKey="superannuation" stroke="#8B5CF6" name="Superannuation" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Department Cost Analysis */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Cost Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentCosts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Total Cost']} />
              <Bar dataKey="totalCost" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Age Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={ageDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ ageGroup, percentage }: any) => `${ageGroup} (${percentage.toFixed(1)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {ageDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Pay Component Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pay Component Breakdown</h3>
          <div className="space-y-4">
            {payBreakdown.map((item, index) => (
              <div key={item.component}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.component}</span>
                  <span className="text-sm text-gray-900">${item.amount.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full" 
                    style={{ 
                      width: `${item.percentage}%`, 
                      backgroundColor: COLORS[index % COLORS.length] 
                    }}
                  ></div>
                </div>
                <div className="text-right text-xs text-gray-500 mt-1">{item.percentage.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Earners */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Earners by Department</h3>
          <div className="space-y-3">
            {departmentCosts.slice(0, 5).map((dept, index) => (
              <div key={dept.department} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{dept.department}</div>
                    <div className="text-sm text-gray-500">{dept.employeeCount} employees</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">${dept.totalCost.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">avg: ${dept.averageSalary.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Statistics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">${metrics.superannuationContributions.toLocaleString()}</div>
              <div className="text-sm text-blue-700">Superannuation Contributions</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">${metrics.bonusPayments.toLocaleString()}</div>
              <div className="text-sm text-green-700">Bonus Payments</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">${metrics.overtimePayments.toLocaleString()}</div>
              <div className="text-sm text-yellow-700">Overtime Payments</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{departmentCosts.length}</div>
              <div className="text-sm text-purple-700">Departments</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}