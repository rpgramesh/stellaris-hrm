'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Eye, 
  Calendar, 
  DollarSign, 
  User,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { payrollService } from '@/services/payrollService';
import { supabase } from '@/lib/supabase';
import { comprehensivePayrollService } from '@/services/comprehensivePayrollService';

interface Payslip {
  id: string;
  period_start: string;
  period_end: string;
  gross_pay: number;
  net_pay: number;
  tax_withheld: number;
  superannuation: number;
  allowances: number;
  overtime: number;
  payment_date: string;
  status: 'Draft' | 'Published' | 'Paid';
  pay_components?: PayComponent[];
}

interface PayComponent {
  id: string;
  component_type: string;
  description: string;
  units: number;
  rate: number;
  amount: number;
  tax_treatment: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_code?: string;
  department?: string;
  position?: string;
  employment_type?: string;
}

export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadEmployeePayslips();
  }, []);

  const loadEmployeePayslips = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would get the current employee ID from auth context
      const currentEmployeeId = 'current-employee-id'; // Placeholder
      
      // Load employee details
      const { data: employeeData } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          employee_code,
          departments:name,
          job_positions:title,
          employment_type
        `)
        .eq('user_id', 'current-user-id') // Would get from auth
        .single();

      if (employeeData) {
        setEmployee({
          ...employeeData,
          department: employeeData.departments?.name,
          position: employeeData.job_positions?.title
        });
      }

      // Load payslips for the employee
      const employeePayslips = await payrollService.getPayslipsByEmployee(currentEmployeeId);
      
      // Load detailed pay components for each payslip
      const payslipsWithDetails: Payslip[] = await Promise.all(
        employeePayslips.map(async (p) => {
          const { data: components } = await supabase
            .from('pay_components')
            .select('*')
            .eq('payslip_id', p.id);

          const mapped: Payslip = {
            id: p.id,
            period_start: (p as any).period_start ?? (p as any).periodStart,
            period_end: (p as any).period_end ?? (p as any).periodEnd,
            gross_pay: (p as any).gross_pay ?? (p as any).grossPay ?? 0,
            net_pay: (p as any).net_pay ?? (p as any).netPay ?? 0,
            tax_withheld: (p as any).tax_withheld ?? (p as any).paygTax ?? 0,
            superannuation: (p as any).superannuation ?? 0,
            allowances: (p as any).allowances ?? 0,
            overtime: (p as any).overtime ?? 0,
            payment_date: (p as any).payment_date ?? (p as any).paymentDate,
            status: (p as any).status,
            pay_components: (components as any) || []
          };
          return mapped;
        })
      );

      setPayslips(payslipsWithDetails);
    } catch (error) {
      console.error('Error loading employee payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPayslip = async (payslipId: string) => {
    try {
      setDownloading(payslipId);
      
      // Generate PDF for the payslip
      const pdfBuffer = await comprehensivePayrollService.generatePayslipPDF(payslipId);
      
      // Create blob and download
      const arrayBuffer: ArrayBuffer = (pdfBuffer as any)?.buffer instanceof ArrayBuffer 
        ? (pdfBuffer as any).buffer 
        : (pdfBuffer as unknown as ArrayBuffer);
      const blob = new Blob([pdfBuffer as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${selectedPayslip?.period_start}-${selectedPayslip?.period_end}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading payslip:', error);
      alert('Error downloading payslip. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const viewPayslipDetails = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Published':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'Draft':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'text-green-600 bg-green-100';
      case 'Published':
        return 'text-blue-600 bg-blue-100';
      case 'Draft':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
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
          <h1 className="text-3xl font-bold text-gray-900">My Payslips</h1>
          <p className="text-gray-600 mt-1">View and download your payslips</p>
        </div>
        {employee && (
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{employee.first_name} {employee.last_name}</span>
            </div>
            {employee.employee_code && (
              <div>
                <span className="text-gray-500">ID:</span> {employee.employee_code}
              </div>
            )}
            {employee.department && (
              <div>
                <span className="text-gray-500">Department:</span> {employee.department}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payslips List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payslip History</h2>
        </div>
        
        {payslips.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payslips found</h3>
            <p className="text-gray-600">You don't have any payslips yet. They will appear here once processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {payslips.map((payslip) => (
              <div key={payslip.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(payslip.status)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatDate(payslip.period_start)} - {formatDate(payslip.period_end)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Payment Date: {formatDate(payslip.payment_date)}
                        </p>
                      </div>
                    </div>
                    
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payslip.status)}`}>
                      {payslip.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Net Pay</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(payslip.net_pay)}</p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewPayslipDetails(payslip)}
                        className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </button>
                      
                      <button
                        onClick={() => downloadPayslip(payslip.id)}
                        disabled={downloading === payslip.id}
                        className="flex items-center space-x-1 px-3 py-1 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded disabled:opacity-50"
                      >
                        {downloading === payslip.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payslip Details Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Payslip Details - {formatDate(selectedPayslip.period_start)} to {formatDate(selectedPayslip.period_end)}
              </h2>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Header */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Employee Details</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Name:</span> {employee?.first_name} {employee?.last_name}</p>
                    {employee?.employee_code && (
                      <p><span className="text-gray-600">Employee ID:</span> {employee.employee_code}</p>
                    )}
                    {employee?.department && (
                      <p><span className="text-gray-600">Department:</span> {employee.department}</p>
                    )}
                    {employee?.position && (
                      <p><span className="text-gray-600">Position:</span> {employee.position}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Pay Period</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Period:</span> {formatDate(selectedPayslip.period_start)} - {formatDate(selectedPayslip.period_end)}</p>
                    <p><span className="text-gray-600">Payment Date:</span> {formatDate(selectedPayslip.payment_date)}</p>
                    <p><span className="text-gray-600">Status:</span> 
                      <span className={`ml-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedPayslip.status)}`}>
                        {selectedPayslip.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Earnings */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Earnings</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    {selectedPayslip.pay_components?.filter(c => c.amount > 0).map((component, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700">{component.description || component.component_type}</span>
                        <span className="font-medium">{formatCurrency(component.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total Earnings</span>
                      <span>{formatCurrency(selectedPayslip.gross_pay)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Deductions</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Tax Withheld</span>
                      <span className="font-medium">{formatCurrency(selectedPayslip.tax_withheld)}</span>
                    </div>
                    {selectedPayslip.allowances > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Allowances</span>
                        <span className="font-medium">{formatCurrency(selectedPayslip.allowances)}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total Deductions</span>
                      <span>{formatCurrency(selectedPayslip.gross_pay - selectedPayslip.net_pay)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Gross Pay</span>
                      <span className="font-medium">{formatCurrency(selectedPayslip.gross_pay)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Less Total Deductions</span>
                      <span className="font-medium">{formatCurrency(selectedPayslip.gross_pay - selectedPayslip.net_pay)}</span>
                    </div>
                    <div className="border-t border-blue-200 mt-3 pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Net Pay</span>
                        <span>{formatCurrency(selectedPayslip.net_pay)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-2">
                      <span>Superannuation</span>
                      <span>{formatCurrency(selectedPayslip.superannuation)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => downloadPayslip(selectedPayslip.id)}
                  disabled={downloading === selectedPayslip.id}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {downloading === selectedPayslip.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
