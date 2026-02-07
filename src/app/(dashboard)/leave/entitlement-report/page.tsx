"use client";

import { useState, useEffect } from 'react';
import { employeeService } from '@/services/employeeService';
import { leaveEntitlementService, LeaveEntitlement } from '@/services/leaveEntitlementService';
import { leaveService } from '@/services/leaveService';
import { Employee, LeaveRequest } from '@/types';

interface EmployeeEntitlement {
  employee: Employee;
  annual: {
    entitled: number;
    taken: number;
    pending: number;
    balance: number;
  };
  sick: {
    entitled: number;
    taken: number;
    pending: number;
    balance: number;
  };
}

export default function EntitlementReportPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EmployeeEntitlement[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      
      const [employees, entitlements, requests] = await Promise.all([
        employeeService.getAll(),
        leaveEntitlementService.getAll(currentYear),
        leaveService.getAll()
      ]);

      const processedData = employees.map(emp => {
        // Filter records for this employee
        const empEntitlements = entitlements.filter(e => e.employeeId === emp.id);
        const empRequests = requests.filter(r => r.employeeId === emp.id); // Assuming LeaveRequest has employeeId mapping to DB employee_id

        // Calculate Annual Leave
        const annualEntitlement = empEntitlements.find(e => e.leaveType === 'Annual')?.totalDays || 20; // Default 20
        const annualTaken = empRequests
          .filter(r => r.type === 'Annual' && r.status === 'Approved')
          .reduce((sum, r) => sum + calculateDays(r.startDate, r.endDate), 0);
        const annualPending = empRequests
          .filter(r => r.type === 'Annual' && r.status === 'Pending')
          .reduce((sum, r) => sum + calculateDays(r.startDate, r.endDate), 0);

        // Calculate Sick Leave
        const sickEntitlement = empEntitlements.find(e => e.leaveType === 'Sick')?.totalDays || 10; // Default 10
        const sickTaken = empRequests
          .filter(r => r.type === 'Sick' && r.status === 'Approved')
          .reduce((sum, r) => sum + calculateDays(r.startDate, r.endDate), 0);
        const sickPending = empRequests
          .filter(r => r.type === 'Sick' && r.status === 'Pending')
          .reduce((sum, r) => sum + calculateDays(r.startDate, r.endDate), 0);

        return {
          employee: emp,
          annual: {
            entitled: annualEntitlement,
            taken: annualTaken,
            pending: annualPending,
            balance: annualEntitlement - annualTaken
          },
          sick: {
            entitled: sickEntitlement,
            taken: sickTaken,
            pending: sickPending,
            balance: sickEntitlement - sickTaken
          }
        };
      });

      setData(processedData);
    } catch (error) {
      console.error('Failed to load entitlement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays;
  };

  const filteredData = data.filter(item => 
    `${item.employee.firstName} ${item.employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-4 text-center">Loading entitlement data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Entitlement Report</h1>
          <p className="text-gray-500">View current leave balances and history for all employees.</p>
        </div>
        <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search by name or department..."
            className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Employee</th>
                <th colSpan={3} className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 bg-blue-50">Annual Leave</th>
                <th colSpan={3} className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b bg-green-50">Sick Leave</th>
              </tr>
              <tr>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200 bg-blue-50/50">Entitled</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200 bg-blue-50/50">Taken</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-200 bg-blue-50/50">Balance</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200 bg-green-50/50">Entitled</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200 bg-green-50/50">Taken</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-900 bg-green-50/50">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => {
                const emp = item.employee;
                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</div>
                          <div className="text-xs text-gray-500">{emp.department}</div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Annual Leave */}
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-200 bg-blue-50/10">{item.annual.entitled}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-200 bg-blue-50/10">{item.annual.taken}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-blue-600 border-r border-gray-200 bg-blue-50/10">{item.annual.balance}</td>

                    {/* Sick Leave */}
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-200 bg-green-50/10">{item.sick.entitled}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-200 bg-green-50/10">{item.sick.taken}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-green-600 bg-green-50/10">{item.sick.balance}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
