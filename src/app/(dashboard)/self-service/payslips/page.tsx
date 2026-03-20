'use client';

import React, { useMemo, useState, useEffect } from 'react';
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
import { supabase } from '@/lib/supabase';
import { auditService } from '@/services/auditService';
import { pdfGeneratorService } from '@/services/pdfGeneratorService';
import { computeCalendarYearYtdTotals, getPayslipAmounts, getPayslipDates, validatePayslip } from '@/lib/payroll/payslipUtils';

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Payslip['status']>('all');

  useEffect(() => {
    loadEmployeePayslips();
  }, []);

  const loadEmployeePayslips = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData?.user;
      if (!user) {
        setEmployee(null);
        setPayslips([]);
        return;
      }

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code, email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (employeeError) throw employeeError;
      if (!employeeData) {
        setEmployee(null);
        setPayslips([]);
        return;
      }

      setEmployee(employeeData as any);

      const { data: payslipRows, error: payslipError } = await supabase
        .from('payslips')
        .select('*')
        .eq('employee_id', employeeData.id)
        .order('payment_date', { ascending: false });

      if (payslipError) throw payslipError;

      const normalizePayslipStatus = (raw: any): Payslip['status'] => {
        const s = String(raw || '').trim();
        if (s === 'Paid') return 'Paid';
        if (s === 'Published') return 'Published';
        if (s === 'Draft') return 'Draft';
        if (s === 'Final') return 'Published';
        if (s === 'Corrected') return 'Published';
        return 'Published';
      };

      const payslipsWithDetails: Payslip[] = await Promise.all(
        ((payslipRows as any[]) || []).map(async (p) => {
          const { data: components } = await supabase
            .from('pay_components')
            .select('*')
            .eq('payslip_id', p.id);

          const mapped: Payslip = {
            id: p.id,
            period_start: String(p.pay_period_start ?? p.period_start ?? ''),
            period_end: String(p.pay_period_end ?? p.period_end ?? ''),
            gross_pay: Number(p.gross_earnings ?? p.gross_pay ?? 0),
            net_pay: Number(p.net_pay || 0),
            tax_withheld: Number(p.income_tax ?? p.tax_withheld ?? p.payg_tax ?? 0),
            superannuation: Number(p.superannuation || 0),
            allowances: Number(p.allowances || 0),
            overtime: Number(p.overtime || 0),
            payment_date: String(p.payment_date ?? ''),
            status: normalizePayslipStatus(p.status),
            pay_components: (components as any) || []
          };
          return mapped;
        })
      );

      setPayslips(payslipsWithDetails);
    } catch (error) {
      setEmployee(null);
      setPayslips([]);
      setLoadError('Unable to load your payslips right now. Please refresh and try again.');
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Error loading employee payslips:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadPayslip = async (payslipId: string) => {
    try {
      setDownloading(payslipId);

      const payslip = payslips.find((p) => p.id === payslipId);
      if (!payslip) throw new Error('Payslip not found');

      const pdfUrl = (payslip as any).pdf_url as string | undefined;
      const pdfBucket = (payslip as any).pdf_bucket as string | undefined;
      const pdfPath = (payslip as any).pdf_path as string | undefined;

      if (pdfUrl) {
        window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        await auditService.logAction('payslips', payslipId, 'SYSTEM_ACTION', null, { event: 'DOWNLOAD_PDF_URL' });
        return;
      }

      if (pdfBucket && pdfPath) {
        const { data, error } = await supabase.storage.from(pdfBucket).createSignedUrl(pdfPath, 60);
        if (!error && data?.signedUrl) {
          window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
          await auditService.logAction('payslips', payslipId, 'SYSTEM_ACTION', null, { event: 'DOWNLOAD_PDF_SIGNED_URL' });
          return;
        }
      }

      const integrity = validatePayslip(payslip as any);
      if (!integrity.isValid) throw new Error('Payslip data is incomplete or corrupted');

      const { paymentDate } = getPayslipDates(payslip as any);
      const ytd = paymentDate ? computeCalendarYearYtdTotals(payslips as any, paymentDate) : undefined;

      pdfGeneratorService.generatePayslipPdf({
        payslip,
        employee,
        ytd: ytd || undefined,
      });

      await auditService.logAction('payslips', payslipId, 'SYSTEM_ACTION', null, { event: 'DOWNLOAD_PDF' });
    } catch (error) {
      console.error('Error downloading payslip:', error);
      alert('Error downloading payslip. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const viewPayslipDetails = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    auditService.logAction('payslips', payslip.id, 'SYSTEM_ACTION', null, { event: 'VIEW' }).catch(() => {});
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const filteredPayslips = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payslips
      .filter((p) => (statusFilter === 'all' ? true : p.status === statusFilter))
      .filter((p) => {
        if (!q) return true;
        const ref = String((p as any).payment_reference || (p as any).payslip_number || p.id).toLowerCase();
        const range = `${p.period_start} ${p.period_end}`.toLowerCase();
        return ref.includes(q) || range.includes(q) || String(p.status).toLowerCase().includes(q);
      });
  }, [payslips, search, statusFilter]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-AU', {
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Payslip History</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Search by period, status, reference…"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full sm:w-40 rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>
        </div>

        {loadError && (
          <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-red-800">Payslips could not be loaded</div>
                <div className="text-sm text-red-700">{loadError}</div>
              </div>
            </div>
          </div>
        )}
        
        {filteredPayslips.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payslips found</h3>
            <p className="text-gray-600">You don't have any payslips yet. They will appear here once processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPayslips.map((payslip) => (
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
                        <p className="text-xs text-gray-500">
                          Ref: {String((payslip as any).payment_reference || (payslip as any).payslip_number || payslip.id)}
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
                      <span className="font-medium">{formatCurrency(getPayslipAmounts(selectedPayslip as any).taxWithheld)}</span>
                    </div>
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

              {(() => {
                const integrity = validatePayslip(selectedPayslip as any);
                if (integrity.isValid) return null;
                return (
                  <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                    This payslip appears to be incomplete. Please contact HR.
                  </div>
                );
              })()}

              {(() => {
                const { paymentDate } = getPayslipDates(selectedPayslip as any);
                if (!paymentDate) return null;
                const ytd = computeCalendarYearYtdTotals(payslips as any, paymentDate);
                return (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Year-to-date Totals</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">YTD Gross</span>
                          <span className="font-medium">{formatCurrency(ytd.gross)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">YTD Tax</span>
                          <span className="font-medium">{formatCurrency(ytd.tax)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">YTD Net</span>
                          <span className="font-medium">{formatCurrency(ytd.net)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">YTD Super</span>
                          <span className="font-medium">{formatCurrency(ytd.super)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
