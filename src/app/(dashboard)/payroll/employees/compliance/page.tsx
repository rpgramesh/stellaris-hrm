"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Save } from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { payrollEmployeeService } from '@/services/payrollEmployeeService';
import { Employee } from '@/types';

type Residency = 'Resident' | 'NonResident' | 'WorkingHoliday';

export default function EmployeeCompliancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [superFunds, setSuperFunds] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const selectedEmployee = useMemo(
    () => employees.find(e => e.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  const [form, setForm] = useState({
    // Tax
    tfn: '',
    residencyStatus: 'Resident' as Residency,
    claimTaxFreeThreshold: true,
    // Timesheet Exemption
    noTimesheet: false,
    justification: '',
    // Super
    superFundId: '',
    superMemberNumber: '',
    contributionPct: '',
    useDefaultFund: false
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [emps, funds] = await Promise.all([
          employeeService.getAll(),
          payrollEmployeeService.getSuperFunds().then(r => r.data || [])
        ]);
        setEmployees(emps);
        setSuperFunds(funds);
      } catch (e: any) {
        setError(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    // Reset form when employee changes by lightly pre-filling available info
    if (!selectedEmployee) return;
    setForm(prev => ({
      ...prev,
      tfn: selectedEmployee.tfn || '',
      // Other payroll-specific fields will be loaded from payroll page on save; keep selections empty for now
    }));
  }, [selectedEmployee]);

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!selectedEmployeeId) errs.push('Please select an employee');
    if (!form.tfn || !/^[0-9]{8,9}$/.test(form.tfn)) errs.push('Enter a valid Tax File Number (8-9 digits)');
    if (form.noTimesheet && form.justification.trim().length < 5) errs.push('Provide a justification for timesheet exemption');
    if (!form.useDefaultFund && !form.superFundId) errs.push('Select a superannuation fund or use default');
    if (!form.superMemberNumber) errs.push('Enter the superannuation member number');
    if (form.contributionPct) {
      const pct = Number(form.contributionPct);
      if (isNaN(pct) || pct < 0 || pct > 100) errs.push('Contribution percentage must be between 0 and 100');
    }
    return errs;
  };

  const deriveRemark = (existing: string | undefined) => {
    let remark = existing || '';
    const lines = remark.split('\n').filter(Boolean).filter(l => !l.startsWith('NO_TIMESHEET:') && !l.startsWith('SUPER_CONTRIB_PCT:') && !l.startsWith('SUPER_DEFAULT:'));
    if (form.noTimesheet) {
      lines.push(`NO_TIMESHEET: ${form.justification.trim()}`);
    }
    if (form.contributionPct) {
      lines.push(`SUPER_CONTRIB_PCT: ${Number(form.contributionPct).toFixed(2)}`);
    }
    lines.push(`SUPER_DEFAULT: ${form.useDefaultFund ? 'true' : 'false'}`);
    return lines.join('\n');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const errs = validate();
    if (errs.length > 0) {
      setError(errs.join(' • '));
      return;
    }
    try {
      setSaving(true);
      const remark = deriveRemark(selectedEmployee?.remark);
      // Persist tax info + exemption markers on employees table
      await employeeService.update(selectedEmployeeId, {
        tfn: form.tfn,
        remark
      });
      // Persist payroll-specific settings
      await payrollEmployeeService.upsert(selectedEmployeeId, {
        residencyStatus: form.residencyStatus,
        taxScale: form.claimTaxFreeThreshold ? 'TaxFreeThreshold' : 'NoTaxFreeThreshold',
        superFundId: form.useDefaultFund ? '' : form.superFundId,
        superMemberNumber: form.superMemberNumber
      } as any);
      setSuccess('Compliance details saved successfully');
    } catch (e: any) {
      setError(e.message || 'Failed to save compliance details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Tax & Super Compliance</h1>
          <p className="text-gray-600">Capture tax, timesheet exemption and superannuation details</p>
        </div>
        <Link
          href="/payroll/employees"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
          aria-label="Back to Payroll Employees"
        >
          Back to Payroll Employees
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4" role="alert" aria-live="polite">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4" role="status" aria-live="polite">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-3xl">
        <div className="p-6 space-y-8">
          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              id="employeeId"
              name="employeeId"
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              aria-invalid={!selectedEmployeeId ? 'true' : 'false'}
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="text-lg font-semibold text-gray-900">Tax Information</legend>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tfn" className="block text-sm font-medium text-gray-700 mb-1">Tax File Number</label>
                <input
                  id="tfn"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{8,9}"
                  value={form.tfn}
                  onChange={e => setForm({...form, tfn: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-describedby="tfn-help"
                  required
                />
                <p id="tfn-help" className="text-xs text-gray-500 mt-1">8–9 digits, no spaces</p>
              </div>
              <div>
                <label htmlFor="residency" className="block text-sm font-medium text-gray-700 mb-1">Residency Status</label>
                <select
                  id="residency"
                  value={form.residencyStatus}
                  onChange={e => setForm({...form, residencyStatus: e.target.value as Residency})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Resident">Resident</option>
                  <option value="NonResident">Non-Resident</option>
                  <option value="WorkingHoliday">Working Holiday</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.claimTaxFreeThreshold}
                    onChange={e => setForm({...form, claimTaxFreeThreshold: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Claim tax‑free threshold (withholding declaration)
                </label>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-lg font-semibold text-gray-900">Timesheet Exemption</legend>
            <div className="mt-4 space-y-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.noTimesheet}
                  onChange={e => setForm({...form, noTimesheet: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                No Timesheet required for payroll
              </label>
              {form.noTimesheet && (
                <div>
                  <label htmlFor="justification" className="block text-sm font-medium text-gray-700 mb-1">Justification</label>
                  <textarea
                    id="justification"
                    value={form.justification}
                    onChange={e => setForm({...form, justification: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    required
                    aria-invalid={form.noTimesheet && form.justification.trim().length < 5 ? 'true' : 'false'}
                  />
                </div>
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-lg font-semibold text-gray-900">Superannuation Details</legend>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.useDefaultFund}
                    onChange={e => setForm({...form, useDefaultFund: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Use default company fund
                </label>
              </div>
              <div>
                <label htmlFor="superFund" className="block text-sm font-medium text-gray-700 mb-1">Fund Name</label>
                <select
                  id="superFund"
                  value={form.superFundId}
                  onChange={e => setForm({...form, superFundId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={form.useDefaultFund}
                  required={!form.useDefaultFund}
                >
                  <option value="">Select a fund</option>
                  {superFunds.map(f => (
                    <option key={f.id} value={f.id}>{f.fund_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="memberNumber" className="block text-sm font-medium text-gray-700 mb-1">Member Number</label>
                <input
                  id="memberNumber"
                  type="text"
                  value={form.superMemberNumber}
                  onChange={e => setForm({...form, superMemberNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="contribPct" className="block text-sm font-medium text-gray-700 mb-1">Contribution Percentage</label>
                <div className="relative">
                  <input
                    id="contribPct"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={form.contributionPct}
                    onChange={e => setForm({...form, contributionPct: e.target.value})}
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    aria-describedby="contribPctHelp"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                <p id="contribPctHelp" className="text-xs text-gray-500 mt-1">Optional — defaults to statutory SG</p>
              </div>
            </div>
          </fieldset>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            aria-busy={saving ? 'true' : 'false'}
          >
            <Save className="h-4 w-4 mr-2" aria-hidden="true" />
            {saving ? 'Saving…' : 'Save Compliance Details'}
          </button>
        </div>
      </form>
    </div>
  );
}
