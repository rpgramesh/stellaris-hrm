'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Plus,
  Save,
  X
} from 'lucide-react';

export default function StatutoryContributionPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    employee_id: '',
    contribution_type: 'payg-withholding',
    amount: 0,
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    payment_date: '',
    payment_reference: '',
    is_paid: false
  });

  const contributionTypes = [
    { id: 'payg-withholding', label: 'PAYG Withholding' },
    { id: 'superannuation-guarantee', label: 'Super Guarantee' },
    { id: 'payroll-tax', label: 'Payroll Tax' },
    { id: 'workers-compensation', label: 'Workers Comp' },
    { id: 'medicare-levy', label: 'Medicare Levy' }
  ];

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('employment_status', 'Active')
        .order('first_name');
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      alert('Please select an employee');
      return;
    }
    
    setSaving(true);
    try {
      // Since superannuation_contributions is the only statutory table we have for now,
      // we'll use it for Super. For others, we might need a general statutory_contributions table.
      // But based on the error message, superannuation_contributions is what's being used.
      
      const table = formData.contribution_type === 'superannuation-guarantee' 
        ? 'superannuation_contributions' 
        : 'superannuation_contributions'; // Fallback for now, ideally a separate table
      
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        // If it's super, we might need fund_id. For now, we'll keep it simple.
      };

      const { error } = await supabase
        .from(table)
        .insert([payload]);

      if (error) throw error;

      alert('Contribution saved successfully');
      setShowForm(false);
      setFormData({
        employee_id: '',
        contribution_type: 'payg-withholding',
        amount: 0,
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        payment_date: '',
        payment_reference: '',
        is_paid: false
      });
    } catch (error) {
      console.error('Error saving contribution:', error);
      alert('Error saving contribution');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Statutory Contributions</h1>
          <p className="text-gray-600 mt-1">Record and manage statutory payments for employees</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Contribution</span>
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800">Record New Contribution</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Employee Selection */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <Users className="h-4 w-4 mr-2 text-blue-500" />
                  Employee
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contribution Type */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <FileText className="h-4 w-4 mr-2 text-blue-500" />
                  Contribution Type
                </label>
                <select
                  value={formData.contribution_type}
                  onChange={(e) => setFormData({ ...formData, contribution_type: e.target.value })}
                  className="w-full border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  {contributionTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <DollarSign className="h-4 w-4 mr-2 text-blue-500" />
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="w-full border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                  Payment Status
                </label>
                <div className="flex items-center space-x-4 h-[42px]">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_paid}
                      onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Mark as Paid</span>
                  </label>
                </div>
              </div>

              {/* Date Period */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                  Period Start
                </label>
                <input
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                  className="w-full border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                  Period End
                </label>
                <input
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                  className="w-full border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              {/* Payment Details */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                  Payment Date
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <FileText className="h-4 w-4 mr-2 text-blue-500" />
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={formData.payment_reference}
                  onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                  className="w-full border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="e.g. TXN-12345"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Contribution
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No contributions recorded yet</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Get started by recording a new statutory contribution for an employee.
          </p>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
          >
            Record Your First Contribution
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 flex items-start space-x-4">
        <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-900">Compliance Reminder</h4>
          <p className="text-sm text-amber-800 mt-1">
            Ensure all statutory contributions are recorded accurately for STP Phase 2 compliance. 
            PAYG and Superannuation must be reported within specific timeframes to avoid ATO penalties.
          </p>
        </div>
      </div>
    </div>
  );
}
