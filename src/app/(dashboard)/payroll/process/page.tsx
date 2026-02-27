'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileText,
  Settings,
  Play,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react';
import { comprehensivePayrollService, PayrollProcessingOptions } from '@/services/comprehensivePayrollService';
import { payrollReportingService } from '@/services/payrollReportingService';
import { payrollErrorHandlingService } from '@/services/payrollErrorHandlingService';
import { supabase } from '@/lib/supabase';

interface PayrollRun {
  id: string;
  pay_period_start: string;
  pay_period_end: string;
  payment_date: string;
  pay_frequency: 'Weekly' | 'Fortnightly' | 'Monthly';
  status: 'Draft' | 'Approved' | 'Processing' | 'Paid' | 'STPSubmitted';
  total_gross_pay: number;
  total_tax: number;
  total_net_pay: number;
  total_super: number;
  employee_count: number;
  processed_at?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_code?: string;
  employment_type: string;
  pay_frequency: string;
  employment_status?: string;
  selected: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingTimesheets: string[];
  unapprovedTimesheets: string[];
}

interface PayrollReport {
  payrollRunId: string;
  periodStart: string;
  periodEnd: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalTax: number;
  totalNetPay: number;
  totalSuper: number;
  employeeBreakdown: {
    employeeId: string;
    employeeName: string;
    grossPay: number;
    tax: number;
    netPay: number;
    super: number;
    hoursWorked: number;
    status: 'Processed' | 'Error' | 'Warning';
    errors: string[];
    warnings: string[];
  }[];
}

export default function PayrollProcessingPage() {
  const router = useRouter();
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [payrollReport, setPayrollReport] = useState<PayrollReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [options, setOptions] = useState<PayrollProcessingOptions>({
    validateTimesheets: true,
    requireManagerApproval: true,
    generatePayslips: true,
    sendNotifications: true
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load payroll runs
      const runs = await loadPayrollRuns();
      setPayrollRuns(runs);
      
      // Auto-select the most recent draft run
      const draftRun = runs.find(run => run.status === 'Draft');
      if (draftRun) {
        setSelectedRun(draftRun);
        // Load employees matching the pay frequency of the draft run
        const emps = await loadEmployees(draftRun.pay_frequency);
        setEmployees(emps);
        if (emps.length > 0) {
          await validatePayrollRun(draftRun.id);
        }
      } else {
        // Load all active employees if no draft run is selected
        const emps = await loadEmployees();
        setEmployees(emps);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollRuns = async (): Promise<PayrollRun[]> => {
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .order('pay_period_start', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading payroll runs:', error);
      return [];
    }
  };

  const loadEmployees = async (payFrequency?: string): Promise<Employee[]> => {
    try {
      let query = supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          employee_code,
          employment_status,
          payroll_employees!inner (
            id,
            employment_type,
            pay_frequency
          )
        `)
        .eq('employment_status', 'Active')
        .eq('payroll_employees.is_active', true);

      if (payFrequency) {
        query = query.eq('payroll_employees.pay_frequency', payFrequency);
      }

      const { data, error } = await query.order('first_name', { ascending: true });

      if (error) throw error;
      
      return (data || []).map((emp: any) => {
        const payrollInfo = emp.payroll_employees?.[0] || {};
        return {
          id: payrollInfo.id || emp.id, // Use payroll_employees.id for processing
          employee_id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          employee_code: emp.employee_code,
          employment_type: payrollInfo.employment_type || 'Unknown',
          pay_frequency: payrollInfo.pay_frequency || 'Unknown',
          employment_status: emp.employment_status,
          selected: true
        };
      });
    } catch (error: any) {
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
      return [];
    }
  };

  const validatePayrollRun = async (payrollRunId: string) => {
    try {
      setValidating(true);
      const result = await comprehensivePayrollService.validatePayrollRun(payrollRunId);
      setValidationResult(result);
    } catch (error) {
      console.error('Error validating payroll run:', error);
    } finally {
      setValidating(false);
    }
  };

  const processPayroll = async () => {
    if (!selectedRun) return;

    try {
      setProcessing(true);
      
      const selectedEmployeeIds = employees
        .filter(emp => emp.selected)
        .map(emp => emp.id);
      
      if (selectedEmployeeIds.length === 0) {
        alert('Please select at least one employee to process payroll.');
        setProcessing(false);
        return;
      }
      
      const processingOptions: PayrollProcessingOptions = {
        ...options,
        selectedEmployeeIds
      };

      const report = await comprehensivePayrollService.processPayrollRun(
        selectedRun.id,
        'current-user', // Would get from auth context
        processingOptions
      );

      setPayrollReport(report);
      
      // Refresh payroll runs
      const updatedRuns = await loadPayrollRuns();
      setPayrollRuns(updatedRuns);
      
    } catch (error: any) {
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
      
      // Handle specific error types
      if (error.message?.includes('validation failed')) {
        alert('Payroll validation failed. Please review errors and try again.');
      } else if (error.message?.includes('timesheet')) {
        alert('Timesheet validation error. Please ensure all timesheets are approved.');
      } else {
        alert(`Error processing payroll: ${error.message || 'Unknown error'}. Please contact support.`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const generateReport = async (type: 'summary' | 'tax' | 'super' | 'compliance') => {
    if (!selectedRun) return;

    try {
      const filters = {
        startDate: selectedRun.pay_period_start,
        endDate: selectedRun.pay_period_end,
        employeeIds: employees.filter(emp => emp.selected).map(emp => emp.id)
      };

      let report;
      switch (type) {
        case 'summary':
          report = await payrollReportingService.generatePayrollSummaryReport(filters);
          break;
        case 'tax':
          report = await payrollReportingService.generateTaxReport(filters);
          break;
        case 'super':
          report = await payrollReportingService.generateSuperannuationReport(filters);
          break;
        case 'compliance':
          report = await payrollReportingService.generateComplianceReport(filters);
          break;
      }

      // In a real implementation, this would generate and download a PDF/Excel file
      console.log('Generated report:', report);
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} report generated successfully!`);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'text-green-600 bg-green-100';
      case 'Processing':
        return 'text-blue-600 bg-blue-100';
      case 'Approved':
        return 'text-purple-600 bg-purple-100';
      case 'Draft':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId ? { ...emp, selected: !emp.selected } : emp
    ));
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
          <p className="text-gray-600 mt-1">Process payroll runs and manage employee payments</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/payroll/runs/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Calendar className="h-4 w-4" />
            <span>New Payroll Run</span>
          </button>
        </div>
      </div>

      {/* Payroll Run Selection */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Payroll Run</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payrollRuns.map((run) => (
            <div
              key={run.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedRun?.id === run.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={async () => {
                setSelectedRun(run);
                // Refresh employees based on the new selection
                const emps = await loadEmployees(run.pay_frequency);
                setEmployees(emps);
                validatePayrollRun(run.id);
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(run.pay_period_start).toLocaleDateString()} - {new Date(run.pay_period_end).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">{run.pay_frequency}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(run.status)}`}>
                  {run.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 relative group/run-info">
                <p className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {selectedRun?.id === run.id 
                    ? `${employees.filter(e => e.selected).length} employees selected` 
                    : `${run.employee_count} employees`}
                </p>
                <p className="flex items-center">
                  <DollarSign className="h-3 w-3 mr-1" />
                  ${run.total_net_pay.toLocaleString()} net pay
                </p>

                {/* Hover Details */}
                <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover/run-info:opacity-100 transition-opacity pointer-events-none z-50 border border-gray-700">
                  <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                    <span className="font-bold">Run Details</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${getStatusColor(run.status)}`}>
                      {run.status}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Frequency:</span>
                      <span>{run.pay_frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Start Date:</span>
                      <span>{new Date(run.pay_period_start).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">End Date:</span>
                      <span>{new Date(run.pay_period_end).toLocaleDateString()}</span>
                    </div>
                    {run.processed_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Processed At:</span>
                        <span>{new Date(run.processed_at).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between font-medium">
                      <span className="text-gray-400">Total Net:</span>
                      <span className="text-green-400">${run.total_net_pay.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Validation Results {validating && <span className="text-sm text-gray-500">(Validating...)</span>}
          </h2>
          
          {validationResult.isValid ? (
            <div className="flex items-center text-green-600 mb-4">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>All validations passed. Payroll is ready to process.</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600 mb-4">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>Validation failed. Please address the issues below.</span>
            </div>
          )}

          {validationResult.errors.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-red-700 mb-2">Errors</h3>
              <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-yellow-700 mb-2">Warnings</h3>
              <ul className="list-disc list-inside text-sm text-yellow-600 space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.missingTimesheets.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-orange-700 mb-2">Missing Timesheets</h3>
              <p className="text-sm text-orange-600">
                {validationResult.missingTimesheets.length} employees are missing timesheets.
              </p>
            </div>
          )}

          {validationResult.unapprovedTimesheets.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-yellow-700 mb-2">Unapproved Timesheets</h3>
              <p className="text-sm text-yellow-600">
                {validationResult.unapprovedTimesheets.length} employees have unapproved timesheets.
              </p>
            </div>
          )}
          {!validationResult.isValid && (
            <div className="mt-4 flex items-center space-x-4">
              <button
                onClick={() => router.push('/payroll/errors')}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
              >
                <Eye className="h-4 w-4 mr-1" />
                View all payroll errors
              </button>
            </div>
          )}
        </div>
      )}

      {/* Employee Selection */}
      {selectedRun && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Employees</h2>
          {employees.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No active employees found</p>
              <p className="text-gray-500 text-sm mt-1">
                There are no active employees configured with <strong>{selectedRun.pay_frequency}</strong> pay frequency.
              </p>
              <button
                onClick={() => router.push('/payroll/employees')}
                className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Configure employee payroll settings →
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      employee.selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleEmployeeSelection(employee.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={employee.selected}
                        onChange={() => {}} // Handled by parent click
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {employee.employment_type} • {employee.pay_frequency} • {employee.employment_status || 'Unknown'}
                        </p>
                        {employee.employee_code && (
                          <p className="text-xs text-gray-500">{employee.employee_code}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={() => setEmployees(prev => prev.map(emp => ({ ...emp, selected: true })))}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={() => setEmployees(prev => prev.map(emp => ({ ...emp, selected: false })))}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Deselect All
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Processing Options */}
      {selectedRun && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Processing Options</h2>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.validateTimesheets}
                onChange={(e) => setOptions(prev => ({ ...prev, validateTimesheets: e.target.checked }))}
                className="mr-3"
              />
              <span className="text-sm text-gray-700">Validate timesheets before processing</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.requireManagerApproval}
                onChange={(e) => setOptions(prev => ({ ...prev, requireManagerApproval: e.target.checked }))}
                className="mr-3"
              />
              <span className="text-sm text-gray-700">Require manager approval for processing</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.generatePayslips}
                onChange={(e) => setOptions(prev => ({ ...prev, generatePayslips: e.target.checked }))}
                className="mr-3"
              />
              <span className="text-sm text-gray-700">Generate payslips automatically</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.sendNotifications}
                onChange={(e) => setOptions(prev => ({ ...prev, sendNotifications: e.target.checked }))}
                className="mr-3"
              />
              <span className="text-sm text-gray-700">Send notifications to employees</span>
            </label>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {selectedRun && validationResult && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={processPayroll}
              disabled={processing || !validationResult.isValid}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Process Payroll</span>
                </>
              )}
            </button>

            <button
              onClick={() => generateReport('summary')}
              disabled={processing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Summary Report</span>
            </button>

            <button
              onClick={() => generateReport('tax')}
              disabled={processing}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Tax Report</span>
            </button>

            <button
              onClick={() => generateReport('super')}
              disabled={processing}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Super Report</span>
            </button>

            <button
              onClick={() => generateReport('compliance')}
              disabled={processing}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Compliance Report</span>
            </button>
          </div>
        </div>
      )}

      {/* Payroll Report */}
      {payrollReport && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payroll Processing Results</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-700">Total Employees</p>
              <p className="text-2xl font-bold text-green-900">{payrollReport.totalEmployees}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-700">Total Gross Pay</p>
              <p className="text-2xl font-bold text-blue-900">${payrollReport.totalGrossPay.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-700">Total Tax</p>
              <p className="text-2xl font-bold text-purple-900">${payrollReport.totalTax.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-700">Total Net Pay</p>
              <p className="text-2xl font-bold text-green-900">${payrollReport.totalNetPay.toLocaleString()}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Super</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrollReport.employeeBreakdown.map((emp, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {emp.employeeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${emp.grossPay.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${emp.tax.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${emp.netPay.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${emp.super.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {emp.hoursWorked.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        emp.status === 'Processed' ? 'text-green-600 bg-green-100' :
                        emp.status === 'Error' ? 'text-red-600 bg-red-100' :
                        'text-yellow-600 bg-yellow-100'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}