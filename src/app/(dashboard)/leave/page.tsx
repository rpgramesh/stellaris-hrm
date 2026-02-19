"use client";

import { useState, useEffect } from 'react';
import { leaveService } from '@/services/leaveService';
import { employeeService } from '@/services/employeeService';
import { holidayService } from '@/services/holidayService';
import { LeaveRequest, Employee } from '@/types';
import LeaveDetailsModal from '@/components/leave/LeaveDetailsModal';
import LeaveReportModal from '@/components/leave/LeaveReportModal';
import { calculateWorkingDays } from '@/utils/workDayCalculations';

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [formData, setFormData] = useState({
    type: 'Annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      const yearEnd = new Date(new Date().getFullYear() + 1, 11, 31); // 2 years coverage

      const [leaveData, empData, holidayData] = await Promise.all([
        leaveService.getAll(),
        employeeService.getAll(),
        holidayService.getHolidays(yearStart.toISOString(), yearEnd.toISOString())
      ]);
      setRequests(leaveData);
      setEmployees(empData);
      setHolidays(holidayData.map(h => new Date(h.date)));
    } catch (error) {
      console.error('Failed to load leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Employee';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (employees.length === 0) {
      alert('No employees found. Cannot create leave request.');
      return;
    }

    const workingDays = calculateWorkingDays(formData.startDate, formData.endDate, holidays);
    if (workingDays === 0) {
      alert('Selected range has 0 working days (weekends or holidays). Please select valid dates.');
      return;
    }

    try {
      // TODO: Replace with actual logged-in user ID
      const currentEmployeeId = employees[0].id;

      const newRequest = await leaveService.create({
        employeeId: currentEmployeeId,
        type: formData.type as any,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        totalHours: workingDays * 8 // Assume 8h days
      });

      setRequests([newRequest, ...requests]);
      setIsModalOpen(false);
      setFormData({ type: 'Annual', startDate: '', endDate: '', reason: '' });
    } catch (error) {
      console.error('Failed to create leave request:', error);
      alert('Failed to create leave request. Please try again.');
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'Approved' | 'Rejected') => {
    try {
      // TODO: Replace with actual logged-in user ID (approver)
      const approverId = employees[0]?.id;
      
      await leaveService.updateStatus(id, newStatus, approverId);
      
      setRequests(requests.map(req => 
        req.id === id ? { ...req, status: newStatus } : req
      ));
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-6">Loading leave data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1">View and manage leave requests.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsReportOpen(true)}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export Report
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Apply for Leave
          </button>
        </div>
      </div>

      {/* Leave Entitlements Summary (Mock) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium">Annual Leave</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">14 Days</p>
          <p className="text-xs text-gray-400 mt-1">Available</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-medium">Sick Leave</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">8 Days</p>
          <p className="text-xs text-gray-400 mt-1">Available</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <h3 className="text-gray-500 text-sm font-medium">Unpaid Leave</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">0 Days</p>
          <p className="text-xs text-gray-400 mt-1">Taken this year</p>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Leave Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {getEmployeeName(req.employeeId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {req.startDate} to {req.endDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${req.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                        req.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Details
                      </button>
                      {req.status === 'Pending' && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleStatusChange(req.id, 'Approved')}
                            className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded"
                            title="Approve"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25L15 9.75" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleStatusChange(req.id, 'Rejected')}
                            className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                            title="Reject"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <LeaveDetailsModal 
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        employee={selectedRequest ? employees.find(e => e.id === selectedRequest.employeeId) || null : null}
      />

      {/* Report Modal */}
      <LeaveReportModal 
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        requests={requests}
        employees={employees}
        holidays={holidays}
      />

      {/* Apply Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Apply for Leave</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Leave Type</label>
                <select 
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 text-gray-900"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option>Annual</option>
                  <option>Sick</option>
                  <option>Unpaid</option>
                  <option>Maternity</option>
                  <option>Paternity</option>
                  <option>Long Service</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input 
                    type="date" 
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 text-gray-900"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input 
                    type="date" 
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 text-gray-900"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <textarea 
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 text-gray-900"
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  required
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
