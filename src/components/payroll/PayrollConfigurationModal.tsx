
'use client';

import React, { useState, useEffect } from 'react';
import { X, DollarSign, Save, AlertTriangle } from 'lucide-react';
import { payrollEmployeeService } from '@/services/payrollEmployeeService';
import { employeeService } from '@/services/employeeService';

interface PayrollConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  defaultPayFrequency?: 'Weekly' | 'Fortnightly' | 'Monthly';
}

export function PayrollConfigurationModal({ isOpen, onClose, onSave, defaultPayFrequency }: PayrollConfigurationModalProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [superFunds, setSuperFunds] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    baseSalary: 0,
    payFrequency: defaultPayFrequency || 'Monthly',
    taxScale: 'TaxFreeThreshold',
    residencyStatus: 'Resident',
    employmentType: 'FullTime',
    taxFileNumber: '',
    superFundId: '',
    superMemberNumber: '',
    hourlyRate: 0
  });

  useEffect(() => {
    if (defaultPayFrequency) {
      setFormData(prev => ({ ...prev, payFrequency: defaultPayFrequency }));
    }
  }, [defaultPayFrequency, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadEmployeesWithoutPayroll();
      loadSuperFunds();
    }
  }, [isOpen]);

  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadEmployeeDetails(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  const loadEmployeeDetails = async (employeeId: string) => {
    try {
      setIsFetchingDetails(true);
      // Find the employee in the already loaded list first
      const emp = employees.find(e => e.id === employeeId);
      
      // Also fetch fresh details to ensure we have the latest data
      // and fields that might not be in the list view (though getAll usually fetches all)
      // This satisfies the "reload and refresh" requirement
      const freshEmp = await employeeService.getById(employeeId);
      
      const targetEmp = freshEmp || emp;
      
      if (targetEmp) {
        setFormData(prev => ({
          ...prev,
          baseSalary: targetEmp.salary || 0,
          payFrequency: defaultPayFrequency || (targetEmp.payCycle as any) || prev.payFrequency,
          taxFileNumber: targetEmp.tfn || '',
          superMemberNumber: targetEmp.superannuationMemberNumber || '',
          // Try to match super fund name if possible, or leave as default
          // We don't have fund ID in employee record directly usually, just name
          // Logic to match fund name to ID could go here if we had it
        }));
        
        // Try to match super fund by name
        if (targetEmp.superannuationFundName) {
           const matchedFund = superFunds.find(f => f.fund_name === targetEmp.superannuationFundName);
           if (matchedFund) {
             setFormData(prev => ({ ...prev, superFundId: matchedFund.id }));
           }
        }
      }
    } catch (error) {
      console.error("Error fetching employee details:", error);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const loadEmployeesWithoutPayroll = async () => {
    try {
      // Fetch all active employees
      const allEmployees = await employeeService.getAll();
      
      // Filter out those who already have payroll configuration
      // Note: In a real app, we might want to do this filtering on the server/DB side
      // for performance, but here we'll fetch all and check their payroll status.
      // However, employeeService.getAll() doesn't return payroll info by default in some implementations.
      // Let's use payrollEmployeeService to get existing payroll configs to exclude.
      
      const existingConfigs = await payrollEmployeeService.getAll();
      const configuredEmployeeIds = new Set(existingConfigs?.map((pc: any) => pc.employee_id));

      const availableEmployees = allEmployees
        .filter(emp => emp.status === 'Active') // Filter Active employees first
        .filter(emp => !configuredEmployeeIds.has(emp.id)); // Then filter those without payroll config
      
      setEmployees(availableEmployees);
      
      if (availableEmployees.length > 0) {
        setSelectedEmployeeId(availableEmployees[0].id);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadSuperFunds = async () => {
    try {
      const { data, error } = await payrollEmployeeService.getSuperFunds();
      if (!error) {
        setSuperFunds(data || []);
      }
    } catch (error) {
      console.error('Error loading super funds:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    try {
      setLoading(true);
      await payrollEmployeeService.upsert(selectedEmployeeId, {
        baseSalary: formData.baseSalary,
        payFrequency: formData.payFrequency,
        taxScale: formData.taxScale,
        residencyStatus: formData.residencyStatus as any,
        employmentType: formData.employmentType as any,
        taxFileNumber: formData.taxFileNumber,
        superFundId: formData.superFundId,
        superMemberNumber: formData.superMemberNumber,
        hourlyRate: formData.hourlyRate
      });
      
      onSave();
      onClose();
      // Reset form
      setFormData({
        baseSalary: 0,
        payFrequency: 'Monthly',
        taxScale: 'TaxFreeThreshold',
        residencyStatus: 'Resident',
        employmentType: 'FullTime',
        taxFileNumber: '',
        superFundId: '',
        superMemberNumber: '',
        hourlyRate: 0
      });
    } catch (error: any) {
      console.error('Error saving payroll config:', error);
      alert(`Error saving configuration: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Add Employee to Payroll</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
            <div className="flex gap-2 items-center">
              {employees.length > 0 ? (
                <div className="relative flex-1">
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    required
                    disabled={isFetchingDetails}
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.email})
                      </option>
                    ))}
                  </select>
                  {isFetchingDetails && (
                    <div className="absolute right-8 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200 flex items-center w-full">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  All active employees already have payroll configured.
                </div>
              )}
            </div>
            {isFetchingDetails && <p className="text-xs text-blue-600 mt-1">Loading employee details...</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Salary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Annual Base Salary</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  value={formData.baseSalary || ''}
                  onChange={(e) => setFormData({...formData, baseSalary: parseFloat(e.target.value) || 0})}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Hourly Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  value={formData.hourlyRate || ''}
                  onChange={(e) => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 0})}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Pay Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pay Frequency</label>
              <select
                value={formData.payFrequency}
                onChange={(e) => setFormData({...formData, payFrequency: e.target.value as any})}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Weekly">Weekly</option>
                <option value="Fortnightly">Fortnightly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>

            {/* Employment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({...formData, employmentType: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="FullTime">Full Time</option>
                <option value="PartTime">Part Time</option>
                <option value="Casual">Casual</option>
                <option value="Contractor">Contractor</option>
              </select>
            </div>

            {/* Tax Scale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax Scale</label>
              <select
                value={formData.taxScale}
                onChange={(e) => setFormData({...formData, taxScale: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="TaxFreeThreshold">Tax Free Threshold</option>
                <option value="NoTaxFreeThreshold">No Tax Free Threshold</option>
                <option value="ForeignResident">Foreign Resident</option>
              </select>
            </div>

            {/* Residency Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Residency Status</label>
              <select
                value={formData.residencyStatus}
                onChange={(e) => setFormData({...formData, residencyStatus: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Resident">Resident</option>
                <option value="NonResident">Non-Resident</option>
                <option value="WorkingHoliday">Working Holiday</option>
              </select>
            </div>

            {/* TFN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax File Number</label>
              <input
                type="text"
                value={formData.taxFileNumber}
                onChange={(e) => setFormData({...formData, taxFileNumber: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="000 000 000"
              />
            </div>

            {/* Super Fund */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Superannuation Fund</label>
              <select
                value={formData.superFundId}
                onChange={(e) => setFormData({...formData, superFundId: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Fund...</option>
                {superFunds.map(fund => (
                  <option key={fund.id} value={fund.id}>
                    {fund.fund_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Super Member Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Super Member Number</label>
              <input
                type="text"
                value={formData.superMemberNumber}
                onChange={(e) => setFormData({...formData, superMemberNumber: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Member Number"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedEmployeeId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
