'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  ChevronLeft, 
  Save,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function NewPayrollRunPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    pay_period_start: '',
    pay_period_end: '',
    payment_date: '',
    pay_frequency: 'Fortnightly' as 'Weekly' | 'Fortnightly' | 'Monthly',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('payroll_runs')
        .insert([
          {
            ...formData,
            status: 'Draft',
            total_gross_pay: 0,
            total_tax: 0,
            total_super: 0,
            total_net_pay: 0,
            employee_count: 0
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // Redirect to the process page for this new run
      router.push('/payroll/process');
    } catch (err: any) {
      console.error('Error details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
        fullError: err
      });
      setError(err.message || 'Failed to create payroll run');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create New Pay Run</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pay Frequency */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Pay Frequency
              </label>
              <div className="relative">
                <select
                  name="pay_frequency"
                  value={formData.pay_frequency}
                  onChange={handleChange}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none bg-white border"
                  required
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Fortnightly">Fortnightly</option>
                  <option value="Monthly">Monthly</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Payment Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Pay Period Start */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Pay Period Start
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="pay_period_start"
                  value={formData.pay_period_start}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Pay Period End */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Pay Period End
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="pay_period_end"
                  value={formData.pay_period_end}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Create Pay Run</span>
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="text-sm font-medium text-blue-800 mb-1">Information</h3>
        <p className="text-sm text-blue-700">
          Creating a new pay run will initialize a draft run for the selected period. 
          You will be redirected to the process page where you can review employee payments and finalize the payroll.
        </p>
      </div>
    </div>
  );
}
