'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Settings, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { payrollEmployeeService } from '@/services/payrollEmployeeService';

export default function PayrollEmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [superFunds, setSuperFunds] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    baseSalary: 0,
    payFrequency: 'Monthly' as 'Weekly' | 'Fortnightly' | 'Monthly',
    taxScale: 'TaxFreeThreshold',
    residencyStatus: 'Resident',
    employmentType: 'FullTime',
    taxFileNumber: '',
    superFundId: '',
    superMemberNumber: '',
    hourlyRate: 0
  });

  useEffect(() => {
    loadEmployees();
    loadSuperFunds();
  }, []);

  const loadSuperFunds = async () => {
    try {
      const { data, error } = await payrollEmployeeService.getSuperFunds();
      if (error) throw error;
      setSuperFunds(data || []);
    } catch (error) {
      console.error('Error loading super funds:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await payrollEmployeeService.getAll();
      setEmployees(data);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (emp: any) => {
    setSelectedEmployee(emp);
    const payroll = emp.payroll_employees?.[0] || {};
    setFormData({
      baseSalary: payroll.base_salary || 0,
      payFrequency: payroll.pay_frequency || 'Monthly',
      taxScale: payroll.tax_scale || 'TaxFreeThreshold',
      residencyStatus: payroll.residency_status || 'Resident',
      employmentType: payroll.employment_type || 'FullTime',
      taxFileNumber: payroll.tax_file_number || '',
      superFundId: payroll.super_fund_id || '',
      superMemberNumber: payroll.super_member_number || '',
      hourlyRate: payroll.hourly_rate || 0
    });
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;
    try {
      await payrollEmployeeService.upsert(selectedEmployee.id, {
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
      alert('Payroll settings updated successfully');
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      console.error('Error saving payroll data:', error);
      let message = error.message || 'Unknown error';
      if (message.includes('row-level security policy')) {
        message = 'Database Policy Error: You do not have permission to modify payroll settings. Please contact your administrator to ensure RLS policies are correctly configured for the payroll_employees table.';
      }
      alert(`Error saving payroll data: ${message}`);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Employee Payroll Configuration</h1>
        <p className="text-gray-600 mt-1">Configure individual payroll settings for active employees</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payroll Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hourly Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax File#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Super Fund</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Residency</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmployees.map((emp) => {
              const payroll = emp.payroll_employees?.[0];
              const superFundName = payroll?.super_fund_id 
                ? superFunds.find(f => f.id === payroll.super_fund_id)?.fund_name || 'Unknown'
                : 'Not Set';
              
              return (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                    <div className="text-xs text-gray-500">{emp.employee_code || 'No Code'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payroll ? (
                      <span className="flex items-center text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4 mr-1" /> Configured
                      </span>
                    ) : (
                      <span className="flex items-center text-amber-600 text-sm">
                        <AlertTriangle className="h-4 w-4 mr-1" /> Not Configured
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payroll ? `$${payroll.base_salary.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payroll?.hourly_rate ? `$${payroll.hourly_rate.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payroll?.tax_file_number ? (
                      <span className="text-green-600">✓ Set</span>
                    ) : (
                      <span className="text-red-600">✗ Required</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payroll?.super_fund_id ? (
                      <span className="text-green-600">{superFundName}</span>
                    ) : (
                      <span className="text-red-600">✗ Required</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payroll?.pay_frequency || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payroll?.employment_type || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payroll?.residency_status || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleEdit(emp)}
                      className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full"
                    >
                      <Settings className="h-4 w-4 mr-1" /> {payroll ? 'Edit' : 'Configure'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[500px]">
            <h3 className="text-lg font-bold mb-4">
              Payroll Settings: {selectedEmployee.first_name} {selectedEmployee.last_name}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Base Salary (Annual)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="number" 
                      value={formData.baseSalary || ''} 
                      onChange={e => setFormData({...formData, baseSalary: parseFloat(e.target.value) || 0})}
                      className="w-full border rounded pl-8 p-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hourly Rate</label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="number" 
                      value={formData.hourlyRate || ''} 
                      onChange={e => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 0})}
                      className="w-full border rounded pl-8 p-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pay Frequency</label>
                  <select 
                    value={formData.payFrequency} 
                    onChange={e => setFormData({...formData, payFrequency: e.target.value as any})}
                    className="w-full border rounded p-2"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Fortnightly">Fortnightly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tax Scale</label>
                <select 
                  value={formData.taxScale} 
                  onChange={e => setFormData({...formData, taxScale: e.target.value})}
                  className="w-full border rounded p-2"
                >
                  <option value="TaxFreeThreshold">Tax Free Threshold</option>
                  <option value="NoTaxFreeThreshold">No Tax Free Threshold</option>
                  <option value="ForeignResident">Foreign Resident</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Residency Status</label>
                  <select 
                    value={formData.residencyStatus} 
                    onChange={e => setFormData({...formData, residencyStatus: e.target.value})}
                    className="w-full border rounded p-2"
                  >
                    <option value="Resident">Resident</option>
                    <option value="NonResident">Non-Resident</option>
                    <option value="WorkingHoliday">Working Holiday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Employment Type</label>
                  <select 
                    value={formData.employmentType} 
                    onChange={e => setFormData({...formData, employmentType: e.target.value})}
                    className="w-full border rounded p-2"
                  >
                    <option value="FullTime">Full Time</option>
                    <option value="PartTime">Part Time</option>
                    <option value="Casual">Casual</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tax File Number (TFN)</label>
                  <input 
                    type="text" 
                    value={formData.taxFileNumber} 
                    onChange={e => setFormData({...formData, taxFileNumber: e.target.value})}
                    placeholder="9 digits"
                    className="w-full border rounded p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Super Member Number</label>
                  <input 
                    type="text" 
                    value={formData.superMemberNumber} 
                    onChange={e => setFormData({...formData, superMemberNumber: e.target.value})}
                    className="w-full border rounded p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Superannuation Fund</label>
                <select 
                  value={formData.superFundId} 
                  onChange={e => setFormData({...formData, superFundId: e.target.value})}
                  className="w-full border rounded p-2"
                >
                  <option value="">Select a fund</option>
                  {superFunds.map(fund => (
                    <option key={fund.id} value={fund.id}>
                      {fund.fund_name} ({fund.usi || fund.fund_abn})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={() => setSelectedEmployee(null)} className="px-4 py-2 border rounded text-gray-600">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
