"use client";

import { useState } from 'react';

type LeaveType = {
  id: string;
  name: string;
  code: string;
  description: string;
  isPaid: boolean;
  color: string;
  allowNegative: boolean;
  requiresAttachment: boolean;
};

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([
    { id: '1', name: 'Annual Leave', code: 'AL', description: 'Paid time off for rest and relaxation', isPaid: true, color: 'bg-blue-500', allowNegative: false, requiresAttachment: false },
    { id: '2', name: 'Sick Leave', code: 'SL', description: 'Time off for medical reasons', isPaid: true, color: 'bg-red-500', allowNegative: false, requiresAttachment: true },
    { id: '3', name: 'Unpaid Leave', code: 'UL', description: 'Leave without pay', isPaid: false, color: 'bg-gray-500', allowNegative: true, requiresAttachment: false },
    { id: '4', name: 'Maternity Leave', code: 'ML', description: 'Leave for expecting mothers', isPaid: true, color: 'bg-pink-500', allowNegative: false, requiresAttachment: true },
    { id: '5', name: 'Paternity Leave', code: 'PL', description: 'Leave for new fathers', isPaid: true, color: 'bg-indigo-500', allowNegative: false, requiresAttachment: false },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Types</h1>
          <p className="text-gray-500">Configure the different types of leave available to employees.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Type
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Settings</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveTypes.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${type.color}`}></div>
                      <div className="text-sm font-medium text-gray-900">{type.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                      {type.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {type.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {type.isPaid ? (
                      <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">Paid</span>
                    ) : (
                      <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded-full text-xs font-medium">Unpaid</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                    {type.allowNegative && <span title="Allows Negative Balance">📉</span>}
                    {type.requiresAttachment && <span title="Requires Attachment">📎</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                    <button className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
