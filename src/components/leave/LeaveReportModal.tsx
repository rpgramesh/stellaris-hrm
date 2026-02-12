
import React, { useState } from 'react';
import { LeaveRequest, Employee } from '@/types';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { calculateWorkingDays } from '@/utils/workDayCalculations';

interface LeaveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: LeaveRequest[];
  employees: Employee[];
  holidays: Date[];
}

export default function LeaveReportModal({
  isOpen,
  onClose,
  requests,
  employees,
  holidays
}: LeaveReportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleExport = (formatType: 'csv' | 'print') => {
    setLoading(true);
    setError('');

    try {
      // 1. Filter Data
      const filteredRequests = requests.filter(req => {
        const reqStart = parseISO(req.startDate);
        const reqEnd = parseISO(req.endDate);
        
        // Date Range Filter
        if (startDate && endDate) {
            const start = parseISO(startDate);
            const end = parseISO(endDate);
            // Check if request overlaps with selected range
            const overlaps = 
                (reqStart >= start && reqStart <= end) ||
                (reqEnd >= start && reqEnd <= end) ||
                (reqStart <= start && reqEnd >= end);
            
            if (!overlaps) return false;
        }

        // Employee Filter
        if (selectedEmployee !== 'all' && req.employeeId !== selectedEmployee) {
            return false;
        }

        // Type Filter
        if (selectedType !== 'all' && req.type !== selectedType) {
            return false;
        }

        return true;
      });

      if (filteredRequests.length === 0) {
        setError('No records found matching the selected criteria.');
        setLoading(false);
        return;
      }

      // 2. Generate Report
      if (formatType === 'csv') {
        generateCSV(filteredRequests);
      } else {
        generatePrintView(filteredRequests);
      }
      
      // Simulate slight delay for UX
      setTimeout(() => setLoading(false), 500);

    } catch (err) {
      console.error(err);
      setError('An error occurred while generating the report.');
      setLoading(false);
    }
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
  };

  const generateCSV = (data: LeaveRequest[]) => {
    const headers = ['Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Duration (Working Days)', 'Reason', 'Status'];
    
    const rows = data.map(req => {
        const empName = getEmployeeName(req.employeeId);
        // Precise working days calculation
        const duration = calculateWorkingDays(req.startDate, req.endDate, holidays);

        return [
            `"${empName}"`,
            `"${req.type}"`,
            req.startDate,
            req.endDate,
            duration,
            `"${(req.reason || '').replace(/"/g, '""')}"`, // Escape quotes
            req.status
        ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leave_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePrintView = (data: LeaveRequest[]) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        setError('Please allow popups to print the report.');
        return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Leave Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { color: #333; }
            .header { margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .status-approved { color: green; font-weight: bold; }
            .status-rejected { color: red; font-weight: bold; }
            .status-pending { color: orange; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Leave Request Report</h1>
            <p>Stellaris HRM System</p>
          </div>
          <div class="meta">
            <p><strong>Date Generated:</strong> ${format(new Date(), 'PPP')}</p>
            <p><strong>Filter Range:</strong> ${startDate || 'All Time'} to ${endDate || 'All Time'}</p>
            <p><strong>Total Records:</strong> ${data.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(req => `
                <tr>
                  <td>${getEmployeeName(req.employeeId)}</td>
                  <td>${req.type}</td>
                  <td>${req.startDate} to ${req.endDate}</td>
                  <td>${req.reason}</td>
                  <td class="status-${req.status.toLowerCase()}">${req.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Export Leave Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input 
                type="date" 
                className="w-full rounded-md border border-gray-300 shadow-sm p-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input 
                type="date" 
                className="w-full rounded-md border border-gray-300 shadow-sm p-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select 
              className="w-full rounded-md border border-gray-300 shadow-sm p-2"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="all">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select 
              className="w-full rounded-md border border-gray-300 shadow-sm p-2"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option>Annual</option>
              <option>Sick</option>
              <option>Unpaid</option>
              <option>Maternity</option>
              <option>Paternity</option>
              <option>Long Service</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={() => handleExport('print')}
            disabled={loading}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / PDF
          </button>
          <button 
            onClick={() => handleExport('csv')}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            )}
            Export Excel
          </button>
        </div>
      </div>
    </div>
  );
}
