'use client';

import { useState, useEffect } from 'react';
import { payrollService, Payslip } from '@/services/payrollService';
import { format } from 'date-fns';
import { Download, Eye, Calendar, IndianRupeeIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function EmployeePayslipsPage() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPayslips();
    }
  }, [user]);

  const loadPayslips = async () => {
    try {
      setLoading(true);
      // Get all payslips for the current employee
      const data = await payrollService.getPayslipsByMonthYear(format(new Date(), 'yyyy-MM'));
      setPayslips(data);
    } catch (error) {
      console.error('Error loading payslips:', error);
    } finally {
      setLoading(false);
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
    setSelectedPayslip(payslip);
  };

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
          <h1 className="text-2xl font-bold text-gray-900">My Payslips</h1>
          <p className="text-sm text-gray-500">View and download your salary payslips</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              onChange={(e) => {
                // Load payslips for selected month
                if (e.target.value) {
                  // This would be implemented to filter by month
                }
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Current Month</option>
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Current Month Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <IndianRupeeIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Current Month Salary</p>
              <p className="text-2xl font-semibold text-gray-900">
                ₹{payslips.length > 0 ? payslips[0]?.netSalary.toLocaleString() : '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Payslips</p>
              <p className="text-2xl font-semibold text-gray-900">{payslips.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Download className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Downloads Available</p>
              <p className="text-2xl font-semibold text-gray-900">{payslips.filter(p => p.isFinalized).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payslips List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payslip History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payslip Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Salary
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading payslips...
                  </td>
                </tr>
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No payslips found. Please contact HR if you believe this is an error.
                  </td>
                </tr>
              ) : (
                payslips.map((payslip) => (
                  <tr key={payslip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(payslip.payPeriodStart), 'MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payslip.payslipNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{payslip.grossSalary.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{payslip.netSalary.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payslip.isFinalized 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payslip.isFinalized ? 'Finalized' : 'Draft'}
                      </span>
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
                        {payslip.isFinalized && (
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
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Details Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Payslip Details</h3>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <div className="h-6 w-6">✕</div>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pay Period Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Pay Period Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Payslip Number:</span> {selectedPayslip.payslipNumber}</div>
                    <div><span className="font-medium">Pay Period:</span> {format(new Date(selectedPayslip.payPeriodStart), 'dd MMM yyyy')} - {format(new Date(selectedPayslip.payPeriodEnd), 'dd MMM yyyy')}</div>
                    <div><span className="font-medium">Working Days:</span> {selectedPayslip.workingDays}</div>
                    <div><span className="font-medium">Paid Days:</span> {selectedPayslip.paidDays}</div>
                  </div>
                </div>

                {/* Salary Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3">Salary Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="font-medium">Gross Salary:</span><span>₹{selectedPayslip.grossSalary.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="font-medium">Total Deductions:</span><span>₹{selectedPayslip.totalDeductions.toLocaleString()}</span></div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-medium text-lg"><span>Net Salary:</span><span>₹{selectedPayslip.netSalary.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-4">Detailed Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Earnings */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-medium text-green-900 mb-3">Earnings</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Basic Salary:</span><span>₹{selectedPayslip.basicSalary.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>DA Allowance:</span><span>₹{selectedPayslip.daAllowance.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>HRA:</span><span>₹{selectedPayslip.hra.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Conveyance:</span><span>₹{selectedPayslip.conveyance.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Medical:</span><span>₹{selectedPayslip.medical.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Special Allowance:</span><span>₹{selectedPayslip.specialAllowance.toLocaleString()}</span></div>
                      {selectedPayslip.overtimeAmount > 0 && (
                        <div className="flex justify-between"><span>Overtime:</span><span>₹{selectedPayslip.overtimeAmount.toLocaleString()}</span></div>
                      )}
                      {selectedPayslip.arrears > 0 && (
                        <div className="flex justify-between"><span>Arrears:</span><span>₹{selectedPayslip.arrears.toLocaleString()}</span></div>
                      )}
                      <hr className="my-2" />
                      <div className="flex justify-between font-medium"><span>Gross Salary:</span><span>₹{selectedPayslip.grossSalary.toLocaleString()}</span></div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h5 className="font-medium text-red-900 mb-3">Deductions</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>PF Contribution:</span><span>₹{selectedPayslip.pfDeduction.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>ESI Contribution:</span><span>₹{selectedPayslip.esiDeduction.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Professional Tax:</span><span>₹{selectedPayslip.professionalTax.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Income Tax:</span><span>₹{selectedPayslip.incomeTax.toLocaleString()}</span></div>
                      {selectedPayslip.loanDeductions > 0 && (
                        <div className="flex justify-between"><span>Loan Deduction:</span><span>₹{selectedPayslip.loanDeductions.toLocaleString()}</span></div>
                      )}
                      {selectedPayslip.otherDeductions > 0 && (
                        <div className="flex justify-between"><span>Other Deductions:</span><span>₹{selectedPayslip.otherDeductions.toLocaleString()}</span></div>
                      )}
                      <hr className="my-2" />
                      <div className="flex justify-between font-medium"><span>Total Deductions:</span><span>₹{selectedPayslip.totalDeductions.toLocaleString()}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedPayslip.isFinalized && (
                  <button
                    onClick={() => handleDownload(selectedPayslip.id)}
                    disabled={downloading === selectedPayslip.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    {downloading === selectedPayslip.id ? (
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}