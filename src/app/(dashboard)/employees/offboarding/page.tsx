'use client';

import { useState, useEffect } from 'react';
import { employeeService } from '@/services/employeeService';
import { Employee } from '@/types';
import { offboardingService, OffboardingWorkflow, OffboardingTask } from '@/services/offboardingService';
import { 
  UserMinusIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline';

export default function OffboardingPage() {
  const [offboardingList, setOffboardingList] = useState<OffboardingWorkflow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [wfData, empData] = await Promise.all([
        offboardingService.getAll(),
        employeeService.getAll()
      ]);
      setOffboardingList(wfData);
      setEmployees(empData);
    } catch (error) {
      console.error('Failed to load offboarding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'In Progress': return 'bg-orange-100 text-orange-800';
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleInitiateOffboarding = () => {
    setIsAdding(true);
  };

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    exitDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) return;

    try {
      const initialTasks = [
        'Resignation Letter',
        'Exit Interview',
        'Asset Return',
        'Account Deactivation',
        'Final Pay Calculation'
      ];

      const newProcess = await offboardingService.create({
        employeeId: formData.employeeId,
        exitDate: formData.exitDate,
        reason: formData.reason,
        status: 'Scheduled'
      }, initialTasks);

      setOffboardingList([newProcess, ...offboardingList]);
      setIsAdding(false);
      setFormData({
        employeeId: '',
        exitDate: new Date().toISOString().split('T')[0],
        reason: ''
      });
    } catch (error) {
      console.error('Failed to create offboarding process:', error);
      alert('Failed to initiate offboarding. Please try again.');
    }
  };

  const [selectedTask, setSelectedTask] = useState<{processId: string, task: OffboardingTask} | null>(null);
  const [viewWorkflow, setViewWorkflow] = useState<OffboardingWorkflow | null>(null);

  const handleTaskClick = (processId: string, task: OffboardingTask) => {
    setSelectedTask({ processId, task });
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;

    try {
      await offboardingService.updateTaskStatus(selectedTask.task.id, true);

      // Optimistically update UI
      const updateProcess = (process: OffboardingWorkflow) => {
        if (process.id !== selectedTask.processId) return process;

        const updatedTasks = process.tasks.map(t => 
          t.id === selectedTask.task.id ? { ...t, completed: true } : t
        );

        const allCompleted = updatedTasks.every(t => t.completed);
        const status: OffboardingWorkflow['status'] = allCompleted ? 'Completed' : 'In Progress';

        // Update workflow status if changed
        if (process.status !== status) {
           offboardingService.updateWorkflowStatus(process.id, status).catch(console.error);
        }

        return {
          ...process,
          tasks: updatedTasks,
          status: (process.status === 'Scheduled' && !allCompleted ? 'In Progress' : status) as OffboardingWorkflow['status']
        };
      };

      setOffboardingList(prev => prev.map(updateProcess));
      
      // Also update viewWorkflow if it's the one being modified
      if (viewWorkflow && viewWorkflow.id === selectedTask.processId) {
        setViewWorkflow(prev => prev ? updateProcess(prev) : null);
      }

      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading offboarding data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Offboarding</h1>
          <p className="text-sm text-gray-500 mt-1">Manage employee exits and offboarding workflows</p>
        </div>
        <button 
          onClick={handleInitiateOffboarding}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <UserMinusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Initiate Offboarding
        </button>
      </div>

      {/* Task Completion Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Complete Task</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to mark <strong>{selectedTask.task.name}</strong> as completed?
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 mb-2"
                  onClick={handleCompleteTask}
                >
                  Mark as Completed
                </button>
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  onClick={() => setSelectedTask(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewWorkflow && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-[600px] shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">Offboarding Details</h3>
              <button 
                onClick={() => setViewWorkflow(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {(() => {
              const employee = getEmployee(viewWorkflow.employeeId);
              return (
                <div className="space-y-6">
                  {/* Employee Info */}
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                     <div className="flex-shrink-0 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-xl font-bold text-red-600">
                        {employee?.firstName.charAt(0)}{employee?.lastName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{employee?.firstName} {employee?.lastName}</h4>
                        <p className="text-sm text-gray-500">{employee?.position} • {employee?.department}</p>
                      </div>
                  </div>

                  {/* Status Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-md">
                      <p className="text-xs text-gray-500 uppercase">Status</p>
                      <p className={`mt-1 font-medium ${
                        viewWorkflow.status === 'Completed' ? 'text-green-600' : 
                        viewWorkflow.status === 'In Progress' ? 'text-orange-600' : 'text-blue-600'
                      }`}>{viewWorkflow.status}</p>
                    </div>
                    <div className="p-3 border rounded-md">
                      <p className="text-xs text-gray-500 uppercase">Last Day</p>
                      <p className="mt-1 font-medium text-gray-900">{new Date(viewWorkflow.exitDate).toLocaleDateString()}</p>
                    </div>
                    <div className="p-3 border rounded-md col-span-2">
                      <p className="text-xs text-gray-500 uppercase">Reason</p>
                      <p className="mt-1 font-medium text-gray-900">{viewWorkflow.reason}</p>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Checklist Tasks</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {viewWorkflow.tasks.map(task => (
                        <div 
                          key={task.id}
                          className={`flex items-center justify-between p-3 rounded-md border ${
                            task.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300 hover:border-red-300 cursor-pointer'
                          }`}
                          onClick={() => !task.completed && handleTaskClick(viewWorkflow.id, task)}
                        >
                          <div className="flex items-center">
                            {task.completed ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                            ) : (
                              <div className="h-5 w-5 border-2 border-gray-300 rounded-full mr-3"></div>
                            )}
                            <span className={`text-sm ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {task.name}
                            </span>
                          </div>
                          {!task.completed && (
                            <span className="text-xs text-red-600 font-medium">Mark Complete</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <button
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none"
                      onClick={() => setViewWorkflow(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Initiate Offboarding</h3>
              <form onSubmit={handleSubmit} className="mt-2 text-left">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="employee">
                    Select Employee
                  </label>
                  <select
                    id="employee"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    required
                  >
                    <option value="">Select an employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="exitDate">
                    Last Working Day
                  </label>
                  <input
                    type="date"
                    id="exitDate"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.exitDate}
                    onChange={(e) => setFormData({...formData, exitDate: e.target.value})}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="reason">
                    Reason
                  </label>
                  <select
                    id="reason"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    required
                  >
                    <option value="">Select a reason...</option>
                    <option value="Resignation">Resignation</option>
                    <option value="Termination">Termination</option>
                    <option value="Contract End">Contract End</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex items-center justify-end mt-4">
                  <button
                    type="button"
                    className="mr-2 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none"
                    onClick={() => setIsAdding(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none"
                  >
                    Initiate
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {offboardingList.map((process) => {
            const employee = getEmployee(process.employeeId);
            if (!employee) return null;

            const completedTasks = process.tasks.filter(t => t.completed).length;
            const totalTasks = process.tasks.length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return (
              <li key={process.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-lg font-bold text-red-600">
                        {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.position} • {employee.department}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(process.status)}`}>
                        {process.status}
                      </span>
                      <div className="mt-1 text-xs text-gray-500">
                        Last Day: {new Date(process.exitDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Offboarding Checklist</h4>
                      <span className="text-xs text-gray-500">{progress}% Complete</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {process.tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className={`flex items-center p-2 rounded transition-colors ${!task.completed ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                          onClick={() => !task.completed && handleTaskClick(process.id, task)}
                        >
                          {task.completed ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-gray-300 rounded-full mr-2"></div>
                          )}
                          <span className={`text-sm ${task.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                            {task.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button 
                      onClick={() => setViewWorkflow(process)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => setViewWorkflow(process)}
                      className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Update Tasks
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
