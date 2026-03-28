'use client';

import { useState, useEffect, useMemo } from 'react';
import { payrollService, Payslip } from '@/services/payrollService';
import { format } from 'date-fns';
import { Download, Eye, Search, Calendar, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PayslipsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const payrollRunId = (searchParams?.get('payrollRunId') || '').trim();

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [runPayslips, setRunPayslips] = useState<any[]>([]);

  useEffect(() => {
    loadPayslips();
  }, [payrollRunId, selectedMonth]);

  const loadPayslips = async () => {
    try {
      setLoading(true);
      if (payrollRunId) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setRunPayslips([]);
          return;
        }
        const res = await fetch(`/api/payroll/payslips/for-run?payrollRunId=${encodeURIComponent(payrollRunId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(String(json?.error || 'Failed to load payslips'));
        setRunPayslips(Array.isArray(json?.payslips) ? json.payslips : []);
        setPayslips([]);
        return;
      }
      const fetchMonth = selectedMonth === 'all' ? undefined : (selectedMonth || format(new Date(), 'yyyy-MM'));
      const data = await payrollService.getPayslipsByMonthYear(fetchMonth);
      setPayslips(data);
    } catch (error) {
      console.error('Error loading payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadRunPayslip = async (p: any) => {
    try {
      setDownloading(String(p.id));
      const bucket = String(p.pdf_bucket || '');
      const path = String(p.pdf_path || '');
      
      // Fallback to on-the-fly generation if storage info is missing
      if (!bucket || !path) {
        console.warn('PDF storage info missing, falling back to on-the-fly generation');
        return await handleDownload(String(p.id));
      }

      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
      
      if (error || !data?.signedUrl) {
        // Fallback for "Object not found" or permissions errors
        console.warn('Storage download failed, falling back to on-the-fly generation:', error);
        return await handleDownload(String(p.id));
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      alert(String(e?.message || 'Failed to download payslip'));
    } finally {
      setDownloading(null);
    }
  };

  const handleDownload = async (payslipId: string) => {
    try {
      setDownloading(payslipId);
      const pdfBuffer = await payrollService.generatePayslipPDF(payslipId);
      
      // Convert buffer to Uint8Array for Blob constructor
      const uint8Array = new Uint8Array(pdfBuffer);
      const blob = new Blob([uint8Array], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${payslipId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading payslip:', error);
      alert('Failed to download payslip');
    } finally {
      setDownloading(null);
    }
  };

  const handleView = (payslip: Payslip) => {
    setViewingPayslip(payslip);
  };

  const runFilteredPayslips = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return runPayslips;
    return runPayslips.filter((p: any) => {
      const first = String(p?.employees?.first_name || '').toLowerCase();
      const last = String(p?.employees?.last_name || '').toLowerCase();
      const num = String(p?.payslip_number || '').toLowerCase();
      return first.includes(q) || last.includes(q) || num.includes(q);
    });
  }, [runPayslips, searchTerm]);

  const filteredPayslips = payslips.filter(payslip => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (payslip.employee?.firstName || '').toLowerCase().includes(q) ||
      (payslip.employee?.lastName || '').toLowerCase().includes(q) ||
      (payslip.employee?.employeeCode || '').toLowerCase().includes(q) ||
      (payslip.payslipNumber || '').toLowerCase().includes(q);
    
    return matchesSearch;
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMM yyyy')
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payslips</h1>
          <p className="text-sm text-gray-500">View and download employee payslips</p>
        </div>
        
        <div className="flex items-center gap-4">
          {payrollRunId ? (
            <button
              onClick={() => router.push('/payroll/process')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to payroll runs
            </button>
          ) : null}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={!!payrollRunId}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="">Current Month</option>
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={payrollRunId ? "Search by name or payslip number..." : "Search by name or employee code..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
          
          <button
            onClick={loadPayslips}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Payslip Records</h3>
            <span className="text-sm text-gray-500">
              {payrollRunId ? `${runFilteredPayslips.length} of ${runPayslips.length} payslips` : `${filteredPayslips.length} of ${payslips.length} payslips`}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payslip Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Loading payslips...
                  </td>
                </tr>
              ) : payrollRunId ? (
                runFilteredPayslips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No payslips found for this payroll run
                    </td>
                  </tr>
                ) : (
                  runFilteredPayslips.map((p: any) => (
                    <tr key={String(p.id)} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {String(p?.employees?.first_name || '')} {String(p?.employees?.last_name || '')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {String(p.payslip_number || p.id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {p.period_start && p.period_end ? `${String(p.period_start).slice(0, 10)} - ${String(p.period_end).slice(0, 10)}` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Number(p.hours_worked || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${Number(p.gross_pay ?? p.gross_earnings ?? 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${Number(p.net_pay ?? 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => downloadRunPayslip(p)}
                            disabled={downloading === String(p.id)}
                            className="text-green-600 hover:text-green-900 p-1 disabled:opacity-50"
                            title="Download PDF"
                          >
                            {downloading === String(p.id) ? (
                              <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )
              ) : filteredPayslips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No payslips found for the selected criteria
                  </td>
                </tr>
              ) : (
                filteredPayslips.map((payslip) => (
                  <tr key={payslip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-800">
                                {(payslip.employee?.firstName || '?').charAt(0)}{(payslip.employee?.lastName || '?').charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {payslip.employee?.firstName || ''} {payslip.employee?.lastName || ''}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payslip.employee.employeeCode || payslip.employee.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payslip.payslipNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(payslip.payPeriodStart), 'dd MMM yyyy')} - {format(new Date(payslip.payPeriodEnd), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(payslip.hoursWorked || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(payslip.grossSalary || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(payslip.netSalary || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(payslip)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(payslip.id)}
                          disabled={downloading === payslip.id}
                          className="text-green-600 hover:text-green-900 p-1 disabled:opacity-50"
                          title="Download PDF"
                        >
                          {downloading === payslip.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {viewingPayslip && !payrollRunId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Payslip Details</h3>
                <button
                  onClick={() => setViewingPayslip(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Employee Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {viewingPayslip.employee?.firstName || 'Unknown'} {viewingPayslip.employee?.lastName || ''}</div>
                    <div><span className="font-medium">Employee ID:</span> {viewingPayslip.employee?.employeeCode || viewingPayslip.employee?.id || '—'}</div>
                    <div><span className="font-medium">Department:</span> {viewingPayslip.employee?.departments?.name || viewingPayslip.employee?.department || 'N/A'}</div>
                    <div><span className="font-medium">Designation:</span> {viewingPayslip.employee?.designations?.name || viewingPayslip.employee?.position || 'N/A'}</div>
                  </div>
                </div>

                {/* Pay Period Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Pay Period Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Payslip Number:</span> {viewingPayslip.payslipNumber}</div>
                    <div><span className="font-medium">Pay Period:</span> {format(new Date(viewingPayslip.payPeriodStart), 'dd MMM yyyy')} - {format(new Date(viewingPayslip.payPeriodEnd), 'dd MMM yyyy')}</div>
                    <div><span className="font-medium">Working Days:</span> {viewingPayslip.workingDays}</div>
                    <div><span className="font-medium">Paid Days:</span> {viewingPayslip.paidDays}</div>
                  </div>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-4">Salary Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Earnings */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-medium text-green-900 mb-3">Earnings</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Basic Salary:</span><span>${(viewingPayslip.basicSalary || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>DA Allowance:</span><span>${(viewingPayslip.daAllowance || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>HRA:</span><span>${(viewingPayslip.hra || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Conveyance:</span><span>${(viewingPayslip.conveyance || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Medical:</span><span>${(viewingPayslip.medical || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Special Allowance:</span><span>${(viewingPayslip.specialAllowance || 0).toLocaleString()}</span></div>
                      {(viewingPayslip.overtimeAmount || 0) > 0 && (
                        <div className="flex justify-between"><span>Overtime:</span><span>${(viewingPayslip.overtimeAmount || 0).toLocaleString()}</span></div>
                      )}
                      {(viewingPayslip.arrears || 0) > 0 && (
                        <div className="flex justify-between"><span>Arrears:</span><span>${(viewingPayslip.arrears || 0).toLocaleString()}</span></div>
                      )}
                      <hr className="my-2" />
                      <div className="flex justify-between font-medium"><span>Gross Salary:</span><span>${(viewingPayslip.grossSalary || 0).toLocaleString()}</span></div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h5 className="font-medium text-red-900 mb-3">Deductions</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>PF Contribution:</span><span>${(viewingPayslip.pfDeduction || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>ESI Contribution:</span><span>${(viewingPayslip.esiDeduction || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Professional Tax:</span><span>${(viewingPayslip.professionalTax || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Income Tax:</span><span>${(viewingPayslip.incomeTax || 0).toLocaleString()}</span></div>
                      {(viewingPayslip.loanDeductions || 0) > 0 && (
                        <div className="flex justify-between"><span>Loan Deduction:</span><span>${(viewingPayslip.loanDeductions || 0).toLocaleString()}</span></div>
                      )}
                      {(viewingPayslip.otherDeductions || 0) > 0 && (
                        <div className="flex justify-between"><span>Other Deductions:</span><span>${(viewingPayslip.otherDeductions || 0).toLocaleString()}</span></div>
                      )}
                      <hr className="my-2" />
                      <div className="flex justify-between font-medium"><span>Total Deductions:</span><span>${(viewingPayslip.totalDeductions || 0).toLocaleString()}</span></div>
                    </div>
                  </div>
                </div>

                {/* Net Salary */}
                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-blue-900">Net Salary:</span>
                    <span className="text-2xl font-bold text-blue-900">${(viewingPayslip.netSalary || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setViewingPayslip(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownload(viewingPayslip.id)}
                  disabled={downloading === viewingPayslip.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {downloading === viewingPayslip.id ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
