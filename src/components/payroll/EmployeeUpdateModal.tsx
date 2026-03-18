
import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EmployeeUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onSuccess: () => void;
}

export default function EmployeeUpdateModal({ isOpen, onClose, employeeId, onSuccess }: EmployeeUpdateModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tfn: '',
    superFundName: '',
    superMemberNumber: '',
    payRate: '',
  });

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchEmployeeDetails();
    }
  }, [isOpen, employeeId]);

  const fetchEmployeeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch employee basic details
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('tfn, superannuation_fund_name, superannuation_member_number')
        .eq('id', employeeId)
        .single();

      if (empError) throw empError;

      // Fetch current salary
      const { data: salaryData, error: salaryError } = await supabase
        .from('employee_salaries')
        .select('basic_salary')
        .eq('employee_id', employeeId)
        .eq('is_current', true)
        .single();

      // Note: salaryData might be null if no active salary record exists
      
      setFormData({
        tfn: empData.tfn || '',
        superFundName: empData.superannuation_fund_name || '',
        superMemberNumber: empData.superannuation_member_number || '',
        payRate: salaryData?.basic_salary?.toString() || '',
      });
    } catch (err: any) {
      console.error('Error fetching details:', err);
      setError('Failed to load employee details.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.tfn) return 'Tax File Number is required.';
    if (!/^\d{9,11}$/.test(formData.tfn.replace(/\s/g, ''))) return 'TFN must be 9-11 digits.';
    if (!formData.superFundName) return 'Superannuation Fund Name is required.';
    if (!formData.superMemberNumber) return 'Superannuation Member Number is required.';
    if (!formData.payRate) return 'Pay Rate is required.';
    if (isNaN(parseFloat(formData.payRate)) || parseFloat(formData.payRate) <= 0) return 'Pay Rate must be a positive number.';
    
    // Minimum wage check (example: $23.23 per hour or roughly $45k/year depending on context)
    // Assuming annual salary for now based on previous context
    if (parseFloat(formData.payRate) < 40000) return 'Pay Rate seems below minimum wage threshold (Warning).';
    
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    // Allow warning but maybe prompt? For now, strict validation for errors.
    if (validationError && !validationError.includes('Warning')) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Update employee details
      const { error: empUpdateError } = await supabase
        .from('employees')
        .update({
          tfn: formData.tfn,
          superannuation_fund_name: formData.superFundName,
          superannuation_member_number: formData.superMemberNumber,
        })
        .eq('id', employeeId);

      if (empUpdateError) throw empUpdateError;

      // Update or Insert salary record
      // Check if exists first
      const { data: existingSalary, error: fetchError } = await supabase
        .from('employee_salaries')
        .select('id, salary_structure_id')
        .eq('employee_id', employeeId)
        .eq('is_current', true)
        .maybeSingle(); // Use maybeSingle to avoid error on 0 rows

      if (fetchError) throw fetchError;

      if (existingSalary) {
        const { error: salaryUpdateError } = await supabase
          .from('employee_salaries')
          .update({ basic_salary: parseFloat(formData.payRate) })
          .eq('id', existingSalary.id);
        
        if (salaryUpdateError) throw salaryUpdateError;
      } else {
        // No active salary record found. We need to create one.
        // First, try to find a salary structure to use.
        // 1. Try to find from previous salary history of this employee
        let structureId = null;
        
        const { data: historySalary } = await supabase
          .from('employee_salaries')
          .select('salary_structure_id')
          .eq('employee_id', employeeId)
          .limit(1)
          .maybeSingle();
          
        if (historySalary) {
          structureId = historySalary.salary_structure_id;
        } else {
          // 2. Fallback to any active salary structure in the system
          const { data: defaultStructure } = await supabase
            .from('salary_structures')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
            
          if (defaultStructure) {
            structureId = defaultStructure.id;
          }
        }

        if (structureId) {
          const { error: insertError } = await supabase
            .from('employee_salaries')
            .insert({
              employee_id: employeeId,
              salary_structure_id: structureId,
              basic_salary: parseFloat(formData.payRate),
              is_current: true,
              effective_from: new Date().toISOString()
            });
            
          if (insertError) throw insertError;
        } else {
          // If we still can't find a structure ID, we can't create a salary record safely
          // unless the column allows nulls. 
          // We should warn the user but still persist the employee details update.
          console.warn('Could not create salary record: No salary structure found.');
          setError('Employee details updated, but Pay Rate could not be saved (No Salary Structure found).');
          return; // Stop here, don't show success message
        }
      }

      setSuccess('Employee details updated successfully.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error saving details:', err);
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Update Employee Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-4">Loading details...</div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-100 text-green-700 rounded-md flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax File Number (TFN)</label>
                <input
                  type="text"
                  value={formData.tfn}
                  onChange={(e) => setFormData({ ...formData, tfn: e.target.value })}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Superannuation Fund Name</label>
                <input
                  type="text"
                  value={formData.superFundName}
                  onChange={(e) => setFormData({ ...formData, superFundName: e.target.value })}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. AustralianSuper"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Super Member Number</label>
                <input
                  type="text"
                  value={formData.superMemberNumber}
                  onChange={(e) => setFormData({ ...formData, superMemberNumber: e.target.value })}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Member Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pay Rate (Annual)</label>
                <input
                  type="number"
                  value={formData.payRate}
                  onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
