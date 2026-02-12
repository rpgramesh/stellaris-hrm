"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { leaveService } from '@/services/leaveService';
import { employeeService } from '@/services/employeeService';
import { holidayService } from '@/services/holidayService';
import { calculateWorkingDays } from '@/utils/workDayCalculations';
import { Employee, LeaveRequest } from '@/types';

export default function ApplyLeavePage() {
  const [showForm, setShowForm] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState({ annual: 12, sick: 10, pending: 0 }); // Default mocks
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [workingDays, setWorkingDays] = useState<number>(0);

  // Form State
  const [formData, setFormData] = useState({
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    reason: '',
    duration: 'Full Day'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // 1. Get Current User
        const { data: { user } } = await supabase.auth.getUser();
        let currentEmployee: Employee | undefined;

        if (user?.email) {
           const allEmployees = await employeeService.getAll();
           currentEmployee = allEmployees.find(e => e.email === user.email);
        }

        if (!currentEmployee) {
          const allEmployees = await employeeService.getAll();
          if (allEmployees.length > 0) currentEmployee = allEmployees[0];
        }

        if (!currentEmployee) {
           setLoading(false);
           return;
        }

        setEmployee(currentEmployee);

        // 2. Fetch Leave History & Entitlements
        const currentYear = new Date().getFullYear();
        const [requests, entitlements] = await Promise.all([
            leaveService.getByEmployeeId(currentEmployee.id!),
            leaveService.getEntitlements(currentEmployee.id!, currentYear)
        ]);
        
        setLeaveRequests(requests);

        // 3. Fetch Holidays for this year and next (to cover year crossing)
        const thisYearHolidays = await holidayService.getByYear(currentYear);
        const nextYearHolidays = await holidayService.getByYear(currentYear + 1);
        const allHolidays = [...thisYearHolidays, ...nextYearHolidays].map(h => new Date(h.date));
        setHolidays(allHolidays);

        // 4. Calculate Balances (Real Data)
        // Annual Leave Entitlement
        const annualEntitlementRaw = entitlements
            .filter(e => e.leaveType === 'Annual' || e.leaveType === 'Annual Leave')
            .reduce((sum, e) => sum + Number(e.totalDays || 0) + Number(e.carriedOver || 0), 0);
        
        // Sick Leave Entitlement
        const sickEntitlementRaw = entitlements
            .filter(e => e.leaveType === 'Sick' || e.leaveType === 'Sick Leave' || e.leaveType.includes('Sick'))
            .reduce((sum, e) => sum + Number(e.totalDays || 0) + Number(e.carriedOver || 0), 0);

        // Fallbacks if no entitlement records exist
        const annualEntitlement = entitlements.length > 0 ? annualEntitlementRaw : 20;
        const sickEntitlement = entitlements.length > 0 ? sickEntitlementRaw : 10;

        const approvedAnnual = requests
          .filter(r => r.status === 'Approved' && (r.type === 'Annual Leave' || r.type === 'Annual'))
          .reduce((acc, r) => acc + calculateWorkingDays(r.startDate, r.endDate, allHolidays), 0);
        
        const approvedSick = requests
          .filter(r => r.status === 'Approved' && (r.type === 'Sick Leave' || r.type === "Sick / Carer's Leave" || r.type === 'Sick'))
          .reduce((acc, r) => acc + calculateWorkingDays(r.startDate, r.endDate, allHolidays), 0);
        
        const pendingCount = requests.filter(r => r.status === 'Pending').length;

        setBalances({
          annual: Math.max(annualEntitlement - approvedAnnual, 0),
          sick: Math.max(sickEntitlement - approvedSick, 0),
          pending: pendingCount
        });

      } catch (error) {
        console.error("Error fetching leave data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Update estimated working days when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const days = calculateWorkingDays(formData.startDate, formData.endDate, holidays);
      setWorkingDays(days);
    } else {
      setWorkingDays(0);
    }
  }, [formData.startDate, formData.endDate, holidays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    
    if (workingDays === 0) {
      alert('Selected range has 0 working days (weekends or holidays). Please select valid dates.');
      return;
    }

    try {
      setSubmitting(true);
      await leaveService.create({
        employeeId: employee.id!,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        totalHours: workingDays * 8 // Assuming 8 hours per day
      });
      
      alert('Request submitted successfully!');
      setShowForm(false);
      setFormData({ ...formData, startDate: '', endDate: '', reason: '' });
      
      // Refresh list
      const updated = await leaveService.getByEmployeeId(employee.id!);
      setLeaveRequests(updated);
      setBalances(prev => ({ ...prev, pending: prev.pending + 1 }));

    } catch (error) {
      console.error("Error submitting leave:", error);
      alert('Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading leave data...</div>;
  if (!employee) return <div className="p-8 text-center text-red-500">Employee not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leave</h1>
          <p className="text-gray-500">View your balance and request time off.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          {showForm ? 'Cancel Request' : 'New Request'}
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium mb-1">Annual Leave</div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">{balances.annual}</span>
            <span className="text-gray-500 mb-1">days available</span>
          </div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(balances.annual / 20) * 100}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium mb-1">Sick / Carer's Leave</div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">{balances.sick}</span>
            <span className="text-gray-500 mb-1">days available</span>
          </div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(balances.sick / 10) * 100}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium mb-1">Pending Approval</div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">{balances.pending}</span>
            <span className="text-gray-500 mb-1">requests</span>
          </div>
          <div className="mt-2 text-xs text-orange-600 font-medium">
            Waiting for manager review
          </div>
        </div>
      </div>

      {/* Application Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Request Time Off</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option>Annual Leave</option>
                <option>Sick / Carer's Leave</option>
                <option>Unpaid Leave</option>
                <option>Compassionate Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <div className="flex flex-col gap-2">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="duration" defaultChecked className="text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Full Day(s)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="duration" className="text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Part Day</span>
                  </label>
                </div>
                {formData.startDate && formData.endDate && (
                   <div className="text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-md border border-blue-100">
                     Estimated: <strong>{workingDays} working days</strong>
                     {workingDays === 0 && <span className="block text-red-600 font-medium">Warning: No working days in selected range.</span>}
                   </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input 
                type="date" 
                required
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input 
                type="date" 
                required
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
              <textarea 
                rows={3} 
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                placeholder="e.g. Family holiday"
              ></textarea>
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Leave History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {/* <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th> */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveRequests.length > 0 ? (
                leaveRequests.map((request, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {calculateWorkingDays(request.startDate, request.endDate, holidays)} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        request.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                        request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {request.status === 'Pending' && (
                        <button className="text-red-600 hover:text-red-900">Cancel</button>
                      )}
                    </td> */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No leave history found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
