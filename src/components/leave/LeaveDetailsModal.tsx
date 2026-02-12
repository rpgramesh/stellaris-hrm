
import React from 'react';
import { LeaveRequest, Employee } from '@/types';
import { format } from 'date-fns';

interface LeaveDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: LeaveRequest | null;
  employee: Employee | null;
  approver?: Employee | null;
}

export default function LeaveDetailsModal({
  isOpen,
  onClose,
  request,
  employee,
  approver
}: LeaveDetailsModalProps) {
  if (!isOpen || !request) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Mock timestamp history as it's not in the base type yet
  const history = [
    { action: 'Request Created', date: new Date().toISOString(), user: employee ? `${employee.firstName} ${employee.lastName}` : 'Employee' },
    ...(request.status !== 'Pending' ? [{ 
      action: `Request ${request.status}`, 
      date: new Date().toISOString(), 
      user: approver ? `${approver.firstName} ${approver.lastName}` : 'Approver',
      comment: request.status === 'Rejected' ? 'Not feasible at this time' : 'Approved'
    }] : [])
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-bold text-gray-900">Leave Request Details</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Banner */}
          <div className={`p-4 rounded-lg flex justify-between items-center ${getStatusColor(request.status)} bg-opacity-10`}>
            <div>
              <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Status</p>
              <p className="text-lg font-bold">{request.status}</p>
            </div>
            <div className="text-right">
               <p className="text-sm font-medium opacity-80">Request ID</p>
               <p className="font-mono">{request.id.slice(0, 8)}</p>
            </div>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Employee</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {employee?.firstName?.[0]}{employee?.lastName?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{employee?.firstName} {employee?.lastName}</p>
                  <p className="text-sm text-gray-500">{employee?.role} • {employee?.department}</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Leave Type</h3>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-gray-100 rounded-md">
                  📅
                </span>
                <p className="font-semibold text-gray-900">{request.type}</p>
              </div>
            </div>
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-500 mb-1">Start Date</p>
              <p className="font-medium text-gray-900">{request.startDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">End Date</p>
              <p className="font-medium text-gray-900">{request.endDate}</p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Reason</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-gray-700">
              {request.reason || "No reason provided."}
            </div>
          </div>

          {/* History / Timeline */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">History</h3>
            <div className="border-l-2 border-gray-200 ml-2 space-y-6">
              {history.map((item, index) => (
                <div key={index} className="relative pl-6">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500"></div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <div>
                      <p className="font-medium text-gray-900">{item.action}</p>
                      <p className="text-sm text-gray-500">by {item.user}</p>
                      {item.comment && (
                        <p className="text-sm text-gray-600 mt-1 italic">"{item.comment}"</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 mt-1 sm:mt-0">
                      {format(new Date(item.date), 'PP p')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
