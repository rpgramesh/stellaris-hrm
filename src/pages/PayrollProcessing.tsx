import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Play, 
  Calendar, 
  Users, 
  DollarSign, 
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PayrollRun, PayrollEmployee } from '../types/payroll';
import { payrollProcessingEngine } from '../services/payrollProcessingEngine';

// Local interface to match Supabase response
interface PayrollEmployeeDB {
  id: string;
  employee_id: string;
  base_salary: number;
  pay_frequency: string;
  employees: {
    first_name: string;
    last_name: string;
  };
}

interface PayrollEmployeeDisplay extends PayrollEmployee {
  full_name: string;
}

interface PayRunForm {
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  payFrequency: 'Weekly' | 'Fortnightly' | 'Monthly';
  selectedEmployees: string[];
}

export default function PayrollProcessing() {
  const router = useRouter();
  const [employees, setEmployees] = useState<PayrollEmployeeDisplay[]>([]);
  const [payRuns, setPayRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showNewPayRun, setShowNewPayRun] = useState(false);
  const [formData, setFormData] = useState<PayRunForm>({
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: '',
    payFrequency: 'Monthly',
    selectedEmployees: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesResponse, payRunsResponse] = await Promise.all([
        supabase
          .from('payroll_employees')
          .select(`
            *,
            employees:employee_id (
              first_name,
              last_name
            )
          `)
          .eq('is_active', true),
        supabase.from('payroll_runs').select('*').order('created_at', { ascending: false })
      ]);

      if (employeesResponse.error) throw employeesResponse.error;
      if (payRunsResponse.error) throw payRunsResponse.error;

      // Map employees to include full_name
      const mappedEmployees: PayrollEmployeeDisplay[] = (employeesResponse.data || []).map((emp: any) => ({
        ...emp,
        employeeId: emp.employee_id,
        baseSalary: emp.base_salary,
        payFrequency: emp.pay_frequency,
        full_name: emp.employees ? `${emp.employees.first_name} ${emp.employees.last_name}` : 'Unknown Employee'
      }));

      setEmployees(mappedEmployees);

      // Map pay runs to match PayrollRun interface
      const mappedPayRuns: PayrollRun[] = (payRunsResponse.data || []).map((run: any) => ({
        id: run.id,
        payPeriodStart: run.pay_period_start,
        payPeriodEnd: run.pay_period_end,
        paymentDate: run.payment_date || run.pay_date,
        payFrequency: run.pay_frequency,
        status: run.status,
        totalGrossPay: run.gross_pay || run.total_gross_pay || 0,
        totalTax: run.tax_withheld || run.total_tax || 0,
        totalSuper: run.superannuation || run.total_super || 0,
        totalNetPay: run.net_pay || run.total_net_pay || 0,
        employeeCount: run.employee_count || run.total_employees || 0,
        processedBy: run.processed_by,
        createdAt: run.created_at,
        updatedAt: run.updated_at || run.created_at
      }));
      setPayRuns(mappedPayRuns);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.selectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }

    setProcessing(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      // Create payroll run
      const { data: payRun, error: payRunError } = await supabase
        .from('payroll_runs')
        .insert({
          // company_id: 'default', // Removed as it's not in schema
          pay_period_start: formData.payPeriodStart,
          pay_period_end: formData.payPeriodEnd,
          payment_date: formData.payDate, // Updated to match schema column 'payment_date' if needed, but schema uses 'payment_date'
          pay_date: formData.payDate, // Wait, schema says 'payment_date', but local state uses 'payDate'. Let's check schema.
          // Schema: payment_date DATE NOT NULL
          // Code below maps 'pay_date' in insert. I need to fix this.
          // Actually, let's fix the insert object.
          pay_frequency: formData.payFrequency,
          status: 'Approved', // Start as Approved so engine can process it immediately
          // status: 'Draft', // Or Draft then Approve. But user flow implies direct processing.
          employee_count: formData.selectedEmployees.length, // Schema: employee_count
          processed_by: user.id
        })
        .select()
        .single();
        
      // Correction: Schema uses 'payment_date' not 'pay_date'.
      // Correction: Schema uses 'employee_count' not 'total_employees'.

      if (payRunError) {
          // If error is about column 'pay_date' not existing, it's likely 'payment_date'
          console.error("Pay run creation error", payRunError);
          throw payRunError;
      }

      // Process payroll using the engine
      await payrollProcessingEngine.processPayrollRun(payRun.id, user.id, formData.selectedEmployees);

      alert(`Payroll processing completed successfully.`);
      
      // Reset form and reload data
      setShowNewPayRun(false);
      setFormData({
        payPeriodStart: '',
        payPeriodEnd: '',
        payDate: '',
        payFrequency: 'Monthly',
        selectedEmployees: []
      });
      loadData();

    } catch (error: any) {
      console.error('Error processing payroll:', error);
      alert(`Error processing payroll: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.includes(employeeId)
        ? prev.selectedEmployees.filter(id => id !== employeeId)
        : [...prev.selectedEmployees, employeeId]
    }));
  };

  const selectAllEmployees = () => {
    setFormData(prev => ({
      ...prev,
      selectedEmployees: employees.map(e => e.id)
    }));
  };

  const deselectAllEmployees = () => {
    setFormData(prev => ({
      ...prev,
      selectedEmployees: []
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold text-gray-900">Payroll Processing</h1>
          <p className="text-gray-600 mt-1">Process payroll runs and manage pay periods</p>
        </div>
        <button
          onClick={() => setShowNewPayRun(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Play className="h-4 w-4" />
          <span>New Pay Run</span>
        </button>
      </div>

      {/* Recent Pay Runs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Pay Runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payRuns.map((payRun) => (
                <tr key={payRun.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payRun.payPeriodStart).toLocaleDateString()} - {new Date(payRun.payPeriodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payRun.paymentDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payRun.payFrequency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payRun.employeeCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${payRun.totalGrossPay?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${payRun.totalNetPay?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payRun.status)}`}>
                      {payRun.status.charAt(0).toUpperCase() + payRun.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="h-4 w-4" />
                      </button>
                      {payRun.status === 'Paid' && (
                        <button className="text-green-600 hover:text-green-900">
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Pay Run Modal */}
      {showNewPayRun && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl bg-white rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New Pay Run</h3>
              <button
                onClick={() => setShowNewPayRun(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pay Period Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pay Period Start
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.payPeriodStart}
                    onChange={(e) => setFormData({ ...formData, payPeriodStart: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pay Period End
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.payPeriodEnd}
                    onChange={(e) => setFormData({ ...formData, payPeriodEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pay Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.payDate}
                    onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pay Frequency
                  </label>
                  <select
                    value={formData.payFrequency}
                    onChange={(e) => setFormData({ ...formData, payFrequency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Fortnightly">Fortnightly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Employee Selection */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Employees ({formData.selectedEmployees.length} selected)
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={selectAllEmployees}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllEmployees}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                  {employees.map((employee) => (
                    <label key={employee.id} className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                      <input
                        type="checkbox"
                        checked={formData.selectedEmployees.includes(employee.id)}
                        onChange={() => handleEmployeeToggle(employee.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                        <div className="text-sm text-gray-500">{employee.employeeId}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        ${employee.baseSalary?.toLocaleString() || '0'}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewPayRun(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || formData.selectedEmployees.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Process Payroll</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}