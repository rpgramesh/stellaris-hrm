"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { salaryAdjustmentService } from '@/services/salaryAdjustmentService';
import { employeeService } from '@/services/employeeService';
import { Employee } from '@/types';
import { SalaryAdjustment } from '@/types/payroll';

export default function NewAdjustmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    employeeId: '',
    adjustmentType: 'BaseSalary' as SalaryAdjustment['adjustmentType'],
    amount: '',
    adjustmentReason: 'AnnualReview' as SalaryAdjustment['adjustmentReason'],
    effectiveDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isPermanent: true,
    requestedBy: 'current_user' // Ideally this should come from auth context
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await employeeService.getAll();
      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setError('Failed to load employees list');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.employeeId) throw new Error('Please select an employee');
      if (!formData.amount || Number(formData.amount) <= 0) throw new Error('Please enter a valid amount');
      if (!formData.effectiveDate) throw new Error('Please select an effective date');

      await salaryAdjustmentService.createAdjustment({
        employeeId: formData.employeeId,
        adjustmentType: formData.adjustmentType,
        amount: Number(formData.amount),
        adjustmentReason: formData.adjustmentReason,
        effectiveDate: formData.effectiveDate,
        endDate: formData.isPermanent ? undefined : formData.endDate,
        isPermanent: formData.isPermanent,
        requestedBy: 'System Admin', // Replace with actual user ID when auth is available
        isProcessed: false
      });

      router.push('/payroll/adjustments');
      router.refresh();
    } catch (err: any) {
      console.error('Failed to create adjustment:', err);
      setError(err.message || 'Failed to create adjustment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link 
          href="/payroll/adjustments" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Adjustments
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Salary Adjustment</h1>
        <p className="text-gray-600">Create a new salary adjustment request for approval.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-w-3xl">
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee Selection */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} - {emp.position || 'No Position'}
                  </option>
                ))}
              </select>
            </div>

            {/* Adjustment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type</label>
              <select
                name="adjustmentType"
                value={formData.adjustmentType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="BaseSalary">Base Salary Change</option>
                <option value="Allowance">Allowance</option>
                <option value="Bonus">Bonus</option>
                <option value="Deduction">Deduction</option>
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <select
                name="adjustmentReason"
                value={formData.adjustmentReason}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="AnnualReview">Annual Review</option>
                <option value="Promotion">Promotion</option>
                <option value="MarketAdjustment">Market Adjustment</option>
                <option value="Performance">Performance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Effective Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
              <input
                type="date"
                name="effectiveDate"
                value={formData.effectiveDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Is Permanent Checkbox */}
            <div className="col-span-2 flex items-center">
              <input
                type="checkbox"
                name="isPermanent"
                id="isPermanent"
                checked={formData.isPermanent}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPermanent" className="ml-2 block text-sm text-gray-900">
                This is a permanent adjustment
              </label>
            </div>

            {/* End Date (Conditional) */}
            {!formData.isPermanent && (
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={!formData.isPermanent}
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <Link
            href="/payroll/adjustments"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Adjustment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
