"use client";

import { useState, useEffect, Fragment } from 'react';
import { employeeService } from '@/services/employeeService';
import { leaveEntitlementService } from '@/services/leaveEntitlementService';
import { leaveService } from '@/services/leaveService';
import { holidayService } from '@/services/holidayService';
import { calculateWorkingDays } from '@/utils/workDayCalculations';
import { Employee } from '@/types';

type LeaveSummary = {
  entitled: number;
  taken: number;
  pending: number;
  balance: number;
};

type LeaveTypeKey = 'Annual' | 'Sick' | 'Unpaid' | 'Maternity' | 'Paternity';

const LEAVE_TYPE_CONFIG: {
  key: LeaveTypeKey;
  label: string;
  entitlementNames: string[];
  requestTypes: string[];
  defaultEntitlement: number;
  headerBg: string;
  headerAltBg: string;
  cellBg: string;
  balanceText: string;
}[] = [
  {
    key: 'Annual',
    label: 'Annual Leave',
    entitlementNames: ['Annual', 'Annual Leave'],
    requestTypes: ['Annual', 'Annual Leave'],
    defaultEntitlement: 20,
    headerBg: 'bg-blue-50',
    headerAltBg: 'bg-blue-50/50',
    cellBg: 'bg-blue-50/10',
    balanceText: 'text-blue-600',
  },
  {
    key: 'Sick',
    label: 'Sick Leave',
    entitlementNames: ['Sick', 'Sick Leave'],
    requestTypes: ['Sick', 'Sick Leave'],
    defaultEntitlement: 10,
    headerBg: 'bg-green-50',
    headerAltBg: 'bg-green-50/50',
    cellBg: 'bg-green-50/10',
    balanceText: 'text-green-600',
  },
  {
    key: 'Unpaid',
    label: 'Unpaid Leave',
    entitlementNames: ['Unpaid', 'Unpaid Leave'],
    requestTypes: ['Unpaid', 'Unpaid Leave'],
    defaultEntitlement: 0,
    headerBg: 'bg-gray-50',
    headerAltBg: 'bg-gray-50/50',
    cellBg: 'bg-gray-50/10',
    balanceText: 'text-gray-700',
  },
  {
    key: 'Maternity',
    label: 'Maternity Leave',
    entitlementNames: ['Maternity', 'Maternity Leave'],
    requestTypes: ['Maternity', 'Maternity Leave'],
    defaultEntitlement: 0,
    headerBg: 'bg-purple-50',
    headerAltBg: 'bg-purple-50/50',
    cellBg: 'bg-purple-50/10',
    balanceText: 'text-purple-700',
  },
  {
    key: 'Paternity',
    label: 'Paternity Leave',
    entitlementNames: ['Paternity', 'Paternity Leave'],
    requestTypes: ['Paternity', 'Paternity Leave'],
    defaultEntitlement: 0,
    headerBg: 'bg-indigo-50',
    headerAltBg: 'bg-indigo-50/50',
    cellBg: 'bg-indigo-50/10',
    balanceText: 'text-indigo-700',
  },
];

interface EmployeeEntitlement {
  employee: Employee;
  summaries: Record<LeaveTypeKey, LeaveSummary>;
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
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear + 1, 11, 31);

      const [employees, entitlements, requests, holidaysRaw] = await Promise.all([
        employeeService.getAll(),
        leaveEntitlementService.getAll(currentYear),
        leaveService.getAll(),
        holidayService.getHolidays(yearStart.toISOString(), yearEnd.toISOString())
      ]);

      const holidays = holidaysRaw.map(h => new Date(h.date));

      const processedData = employees.map(emp => {
        const empEntitlements = entitlements.filter(e => e.employeeId === emp.id);
        const empRequests = requests.filter(r => r.employeeId === emp.id);

        const empRequestsForYear = empRequests.filter(r => {
          const startYear = new Date(r.startDate).getFullYear();
          return startYear === currentYear;
        });

        const summaries = {} as Record<LeaveTypeKey, LeaveSummary>;

        LEAVE_TYPE_CONFIG.forEach(cfg => {
          const entRecord = empEntitlements.find(e =>
            cfg.entitlementNames.includes(e.leaveType)
          );
          const entitlementTotal =
            (entRecord?.totalDays || 0) + (entRecord?.carriedOver || 0);
          const entitlement =
            entitlementTotal > 0 ? entitlementTotal : cfg.defaultEntitlement;

          const taken = empRequestsForYear
            .filter(
              r =>
                cfg.requestTypes.includes(r.type) &&
                r.status === 'Approved'
            )
            .reduce(
              (sum, r) =>
                sum + calculateWorkingDays(r.startDate, r.endDate, holidays),
              0
            );

          const pending = empRequestsForYear
            .filter(
              r =>
                cfg.requestTypes.includes(r.type) &&
                r.status === 'Pending'
            )
            .reduce(
              (sum, r) =>
                sum + calculateWorkingDays(r.startDate, r.endDate, holidays),
              0
            );

          summaries[cfg.key] = {
            entitled: entitlement,
            taken,
            pending,
            balance: entitlement - taken,
          };
        });

        return {
          employee: emp,
          summaries,
        };
      });

      setData(processedData);
    } catch (error) {
      console.error('Failed to load entitlement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    `${item.employee.firstName} ${item.employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-4 text-center">Loading entitlement data...</div>;
  }

  const handleExportCsv = () => {
    if (!data.length) return;

    const headers = [
      'Employee Name',
      'Department',
      ...LEAVE_TYPE_CONFIG.flatMap(cfg => [
        `${cfg.label} Entitled`,
        `${cfg.label} Taken`,
        `${cfg.label} Balance`,
      ]),
    ];

    const escapeCsv = (value: string | number) => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = data.map(row => {
      const base = [
        `${row.employee.firstName} ${row.employee.lastName}`,
        row.employee.department,
      ];

      const typeValues = LEAVE_TYPE_CONFIG.flatMap(cfg => {
        const s = row.summaries[cfg.key] || {
          entitled: 0,
          taken: 0,
          pending: 0,
          balance: 0,
        };
        return [s.entitled, s.taken, s.balance];
      });

      return [...base, ...typeValues];
    });

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(r => r.map(escapeCsv).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const year = new Date().getFullYear();
    link.setAttribute('download', `leave-entitlements-${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Entitlement Report</h1>
          <p className="text-gray-500">View current leave balances and history for all employees.</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
        >
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
                <th
                  rowSpan={2}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                >
                  Employee
                </th>
                {LEAVE_TYPE_CONFIG.map(cfg => (
                  <th
                    key={cfg.key}
                    colSpan={3}
                    className={`px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 ${cfg.headerBg}`}
                  >
                    {cfg.label}
                  </th>
                ))}
              </tr>
              <tr>
                {LEAVE_TYPE_CONFIG.map(cfg => (
                  <Fragment key={cfg.key}>
                    <th
                      className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200 ${cfg.headerAltBg}`}
                    >
                      Entitled
                    </th>
                    <th
                      className={`px-4 py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200 ${cfg.headerAltBg}`}
                    >
                      Taken
                    </th>
                    <th
                      className={`px-4 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-200 ${cfg.headerAltBg}`}
                    >
                      Balance
                    </th>
                  </Fragment>
                ))}
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
                    {LEAVE_TYPE_CONFIG.map(cfg => {
                      const s = item.summaries[cfg.key];
                      return (
                        <Fragment key={`${item.employee.id}-${cfg.key}`}>
                          <td
                            className={`px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-200 ${cfg.cellBg}`}
                          >
                            {s.entitled}
                          </td>
                          <td
                            className={`px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500 border-r border-gray-200 ${cfg.cellBg}`}
                          >
                            {s.taken}
                          </td>
                          <td
                            className={`px-4 py-4 whitespace-nowrap text-center text-sm font-bold border-r border-gray-200 ${cfg.cellBg} ${cfg.balanceText}`}
                          >
                            {s.balance}
                          </td>
                        </Fragment>
                      );
                    })}
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
