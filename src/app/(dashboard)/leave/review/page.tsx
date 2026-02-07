"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { leaveService } from '@/services/leaveService';
import { employeeService } from '@/services/employeeService';
import { LeaveRequest, Employee } from '@/types';
import { format, parseISO, differenceInDays } from 'date-fns';

export default function LeaveReviewPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      await fetchUser();
    };
    init();
  }, []);

  useEffect(() => {
    if (userRole && currentEmployeeId) {
      loadData();
    }
  }, [userRole, currentEmployeeId]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: employee } = await supabase
        .from('employees')
        .select('system_access_role, id')
        .eq('email', user.email)
        .single();
        
      if (employee) {
        setUserRole(employee.system_access_role);
        setCurrentEmployeeId(employee.id);
      }
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsData, employeesData] = await Promise.all([
        leaveService.getAll(),
        employeeService.getAll()
      ]);
      
      // Filter requests based on user role and hierarchy
      let filteredRequests = requestsData;
      
      if (userRole === 'Manager' && currentEmployeeId) {
        // Managers see requests from their direct reports
        const directReports = employeesData.filter(emp => emp.lineManagerId === currentEmployeeId);
        const directReportIds = directReports.map(emp => emp.id);
        filteredRequests = requestsData.filter(req => 
          directReportIds.includes(req.employeeId) && 
          (req.status === 'Pending' || req.status === 'Manager Approved')
        );
      } else if (userRole === 'HR Admin') {
        // HR Admin sees all requests that have been manager-approved or are pending
        filteredRequests = requestsData.filter(req => 
          req.status === 'Pending' || req.status === 'Manager Approved'
        );
      } else if (userRole === 'Employee') {
        // Employees see their own requests
        filteredRequests = requestsData.filter(req => req.employeeId === currentEmployeeId);
      }
      
      setRequests(filteredRequests);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const handleAction = async (requestId: string, action: 'Approved' | 'Rejected') => {
    try {
      if (!currentEmployeeId) {
        alert('User identification failed. Please try logging in again.');
        return;
      }

      let statusToSet: 'Approved' | 'Rejected' | 'Manager Approved' = action;
      
      if (userRole === 'Manager' && action === 'Approved') {
        statusToSet = 'Manager Approved';
      }

      await leaveService.updateStatus(requestId, statusToSet, currentEmployeeId);

      setRequests(requests.map(req => 
        req.id === requestId ? { ...req, status: statusToSet } : req
      ));
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const pendingRequests = requests.filter(req => {
    if (userRole === 'Manager') {
      return req.status === 'Pending';
    } else if (userRole === 'HR Admin') {
      return req.status === 'Manager Approved';
    } else if (userRole === 'Employee') {
      return req.status === 'Pending';
    }
    return false;
  });
  
  const historyRequests = requests.filter(req => {
    if (req.status === 'Approved' || req.status === 'Rejected') {
      return true;
    }
    if (userRole === 'Manager' && req.status === 'Manager Approved') {
      return true;
    }
    return false;
  });

  const displayedRequests = activeTab === 'pending' ? pendingRequests : historyRequests;

  if (loading) {
    return <div className="p-6">Loading review data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Review</h1>
          <p className="text-gray-500">Review and action employee leave requests.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              History
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {activeTab === 'pending' && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No {activeTab} requests found.
                  </td>
                </tr>
              ) : (
                displayedRequests.map((req) => {
                  const employee = getEmployee(req.employeeId);
                  const startDate = parseISO(req.startDate);
                  const endDate = parseISO(req.endDate);
                  const days = differenceInDays(endDate, startDate) + 1;

                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                            {employee?.firstName[0]}{employee?.lastName[0]}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{employee?.firstName} {employee?.lastName}</div>
                            <div className="text-sm text-gray-500">{employee?.position}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {req.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{format(startDate, 'MMM d, yyyy')}</div>
                        <div className="text-xs text-gray-400">to {format(endDate, 'MMM d, yyyy')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {days} day{days > 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          req.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      {activeTab === 'pending' && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleAction(req.id, 'Approved')}
                              className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-md border border-green-200 hover:bg-green-100 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(req.id, 'Rejected')}
                              className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-md border border-red-200 hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
