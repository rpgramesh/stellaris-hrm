'use client';

import React, { useState, useEffect } from 'react';
import { expenseSettingsService } from '@/services/expenseSettingsService';
import { ExpenseWorkflow } from '@/types';

export default function ExpenseWorkflowsPage() {
  const [workflows, setWorkflows] = useState<ExpenseWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState<Partial<ExpenseWorkflow>>({
    name: '',
    steps: []
  });
  const [stepsInput, setStepsInput] = useState('');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const data = await expenseSettingsService.getWorkflows();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflow.name) return;

    const steps = stepsInput.split(',').map(s => s.trim()).filter(s => s !== '');
    
    try {
      const workflow = await expenseSettingsService.createWorkflow({
        ...newWorkflow,
        steps
      } as ExpenseWorkflow);
      setWorkflows([workflow, ...workflows]);
      setNewWorkflow({ name: '', steps: [] });
      setStepsInput('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert('Failed to create workflow. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      try {
        await expenseSettingsService.deleteWorkflow(id);
        setWorkflows(workflows.filter(w => w.id !== id));
      } catch (error) {
        console.error('Failed to delete workflow:', error);
        alert('Failed to delete workflow. Please try again.');
      }
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading workflows...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Approval Workflows</h1>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          {isAdding ? 'Cancel' : 'Add Workflow'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">New Workflow</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={newWorkflow.name}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-sm font-medium text-gray-700">Steps (comma separated, e.g. Manager, HR)</label>
              <input
                type="text"
                value={stepsInput}
                onChange={(e) => setStepsInput(e.target.value)}
                className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Manager, HR Manager, Director"
              />
            </div>
            <div className="sm:col-span-6 flex justify-end">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Steps</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workflows.map((workflow) => (
              <tr key={workflow.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{workflow.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{workflow.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {workflow.steps.map((step, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                      {index + 1}. {step}
                    </span>
                  ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDelete(workflow.id)}
                    className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
