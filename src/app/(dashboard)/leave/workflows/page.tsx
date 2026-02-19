"use client";

import { useState } from 'react';

type WorkflowStep = {
  id: string;
  role: string;
  action: 'Approve' | 'Notify';
};

type Workflow = {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  isDefault: boolean;
};

export default function LeaveWorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: '1',
      name: 'Standard Approval',
      description: 'Default workflow for most employees',
      steps: [
        { id: 's1', role: 'Line Manager', action: 'Approve' },
        { id: 's2', role: 'HR Manager', action: 'Notify' }
      ],
      isDefault: true
    },
    {
      id: '2',
      name: 'Extended Leave Approval',
      description: 'For leave requests exceeding 10 days',
      steps: [
        { id: 's3', role: 'Line Manager', action: 'Approve' },
        { id: 's4', role: 'Department Head', action: 'Approve' },
        { id: 's5', role: 'HR Manager', action: 'Approve' }
      ],
      isDefault: false
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Approval Workflow</h1>
          <p className="text-gray-500">Configure approval chains for different leave scenarios.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((workflow) => (
          <div key={workflow.id} className="bg-white rounded-lg shadow border border-gray-200 p-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{workflow.description}</p>
              </div>
              {workflow.isDefault && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">Default</span>
              )}
            </div>
            
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Approval Chain</h4>
              <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {workflow.steps.map((step, index) => (
                  <div key={step.id} className="relative flex items-center gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center text-xs font-bold text-blue-600 z-10">
                      {index + 1}
                    </div>
                    <div className="flex-1 bg-gray-50 p-3 rounded-md border border-gray-100">
                      <div className="text-sm font-medium text-gray-900">{step.role}</div>
                      <div className="text-xs text-gray-500">{step.action === 'Approve' ? 'Must Approve' : 'Receive Notification'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded"
                title="Edit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
              {!workflow.isDefault && (
                <button
                  className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
