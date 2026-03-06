'use client';

import { useState, useEffect } from 'react';
import { payrollService, PayrollRun } from '@/services/payrollService';
import { format } from 'date-fns';
import { Plus, Play, Download, Eye, CheckCircle, Clock, DollarSign, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function PayrollDashboard() {
  const { user } = useAuth();
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [newRunMonth, setNewRunMonth] = useState('');
  const [newRunStart, setNewRunStart] = useState('');
  const [newRunEnd, setNewRunEnd] = useState('');

  useEffect(() => {
    loadPayrollRuns();
  }, []);

  useEffect(() => {
    // Set default dates for new run
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setNewRunMonth(format(now, 'yyyy-MM'));
    setNewRunStart(format(firstDay, 'yyyy-MM-dd'));
    setNewRunEnd(format(lastDay, 'yyyy-MM-dd'));
  }, []);

  const loadPayrollRuns = async () => {
    try {
      setLoading(true);
      const runs = await payrollService.getPayrollRuns();
      setPayrollRuns(runs);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payroll runs');
    } finally {
      setLoading(false);
    }
  };

  const createNewRun = async () => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    try {
      setProcessing(true);
      const run = await payrollService.createPayrollRun(newRunMonth, user.id);
      setPayrollRuns([run, ...payrollRuns]);
      setShowNewRunModal(false);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to create payroll run');
    } finally {
      setProcessing(false);
    }
  };

  const processPayroll = async (runId: string) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    try {
      setProcessing(true);
      await payrollService.processPayrollRun(runId, user.id);
      await loadPayrollRuns();
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'finalized': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="w-4 h-4" />;
      case 'processed': return <Play className="w-4 h-4" />;
      case 'finalized': return <CheckCircle className="w-4 h-4" />;
      case 'paid': return <DollarSign className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-sm text-gray-500">Process employee salaries and manage payroll operations</p>
        </div>
        <button
          onClick={() => setShowNewRunModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Payroll Run
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payroll Runs</p>
              <p className="text-2xl font-bold text-gray-900">{payrollRuns.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Draft Runs</p>
              <p className="text-2xl font-bold text-gray-900">
                {payrollRuns.filter(r => r.status === 'draft').length}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <Clock className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Processed Runs</p>
              <p className="text-2xl font-bold text-gray-900">
                {payrollRuns.filter(r => r.status === 'processed').length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Play className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid Runs</p>
              <p className="text-2xl font-bold text-gray-900">
                {payrollRuns.filter(r => r.status === 'paid').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Runs Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payroll Runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month/Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Net Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processed By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processed At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrollRuns.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {run.monthYear}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {run.payPeriodStart && run.payPeriodEnd ? (
                      `${format(new Date(run.payPeriodStart), 'MMM dd')} - ${format(new Date(run.payPeriodEnd), 'MMM dd, yyyy')}`
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
                      {getStatusIcon(run.status)}
                      {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {run.totalEmployees}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ₹{(run.totalNetPay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {run.processedBy || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {run.processedAt ? format(new Date(run.processedAt), 'MMM dd, yyyy HH:mm') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      {run.status === 'draft' && (
                        <button
                          onClick={() => processPayroll(run.id)}
                          disabled={processing}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Play className="w-3 h-3" />
                          Process
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedRun(run)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <button
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payrollRuns.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payroll runs</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new payroll run.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowNewRunModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  New Payroll Run
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Run Modal */}
      {showNewRunModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Create New Payroll Run</h3>
              <form onSubmit={(e) => { e.preventDefault(); createNewRun(); }} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month/Year</label>
                  <input
                    type="month"
                    value={newRunMonth}
                    onChange={(e) => setNewRunMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pay Period Start</label>
                  <input
                    type="date"
                    value={newRunStart}
                    onChange={(e) => setNewRunStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pay Period End</label>
                  <input
                    type="date"
                    value={newRunEnd}
                    onChange={(e) => setNewRunEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewRunModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {processing ? 'Creating...' : 'Create Run'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Selected Run Details Modal */}
      {selectedRun && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Payroll Run Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Month/Year:</span>
                  <span className="ml-2 text-gray-900">{selectedRun.monthYear}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Pay Period:</span>
                  <span className="ml-2 text-gray-900">
                    {format(new Date(selectedRun.payPeriodStart), 'MMM dd')} - {format(new Date(selectedRun.payPeriodEnd), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedRun.status)}`}>
                    {selectedRun.status.charAt(0).toUpperCase() + selectedRun.status.slice(1)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total Employees:</span>
                  <span className="ml-2 text-gray-900">{selectedRun.totalEmployees}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total Gross Pay:</span>
                  <span className="ml-2 text-gray-900">₹{(selectedRun.totalGrossPay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total Deductions:</span>
                  <span className="ml-2 text-gray-900">₹{(selectedRun.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total Net Pay:</span>
                  <span className="ml-2 text-gray-900 font-semibold">₹{(selectedRun.totalNetPay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {selectedRun.processedAt && (
                  <div>
                    <span className="font-medium text-gray-700">Processed At:</span>
                    <span className="ml-2 text-gray-900">{format(new Date(selectedRun.processedAt), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-6">
                <button
                  onClick={() => setSelectedRun(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}