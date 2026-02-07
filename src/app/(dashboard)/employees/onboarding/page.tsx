'use client';

import { useState, useEffect } from 'react';
import { OnboardingProcess, OnboardingTask, Employee } from '@/types';
import { onboardingService } from '@/services/onboardingService';
import { employeeService } from '@/services/employeeService';
import { 
  UserPlusIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function OnboardingPage() {
  const [onboardingList, setOnboardingList] = useState<OnboardingProcess[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch employees first as it's critical for the form
      try {
        const emps = await employeeService.getAll();
        setEmployees(emps);
      } catch (e) {
        console.error('Failed to fetch employees:', e);
      }

      // Fetch workflows separately so failure doesn't block employees
      try {
        const wfs = await onboardingService.getAll();
        setOnboardingList(wfs);
      } catch (e) {
        console.error('Failed to fetch onboarding workflows:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartOnboarding = () => {
    setIsAdding(true);
  };

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    startDate: new Date().toISOString().split('T')[0],
    currentStage: 'Account Creation'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) return;

    try {
      const newProcess = await onboardingService.create({
        employeeId: formData.employeeId,
        startDate: formData.startDate,
        status: 'In Progress',
        progress: 0,
        currentStage: formData.currentStage,
        tasks: [
          { id: 'T1', name: 'Account Creation', completed: false },
          { id: 'T2', name: 'Document Submission', completed: false },
          { id: 'T3', name: 'Hardware Setup', completed: false },
          { id: 'T4', name: 'Orientation Training', completed: false },
          { id: 'T5', name: 'Team Introduction', completed: false },
        ]
      });
      setOnboardingList(prev => [...prev, newProcess]);
      setIsAdding(false);
      setFormData({
        employeeId: '',
        startDate: new Date().toISOString().split('T')[0],
        currentStage: 'Account Creation'
      });
    } catch (error) {
      console.error('Failed to start onboarding:', JSON.stringify(error, null, 2));
      alert('Failed to start onboarding. Please try again.');
    }
  };

  const [selectedTask, setSelectedTask] = useState<{processId: string, task: OnboardingTask} | null>(null);

  const handleTaskClick = (processId: string, task: OnboardingTask) => {
    setSelectedTask({ processId, task });
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;

    try {
      await onboardingService.updateTask(selectedTask.task.id, true);

      const process = onboardingList.find(p => p.id === selectedTask.processId);
      if (!process) return;

      const updatedTasks = process.tasks.map(t => 
        t.id === selectedTask.task.id ? { ...t, completed: true } : t
      );

      const completedCount = updatedTasks.filter(t => t.completed).length;
      const progress = Math.round((completedCount / updatedTasks.length) * 100);
      
      // Determine next stage
      let currentStage = process.currentStage;
      const nextIncompleteTask = updatedTasks.find(t => !t.completed);
      if (nextIncompleteTask) {
        currentStage = nextIncompleteTask.name;
      } else {
        currentStage = 'Completed';
      }

      const status = progress === 100 ? 'Completed' : 'In Progress';

      await onboardingService.updateWorkflow(process.id, {
        progress,
        currentStage,
        status
      });

      setOnboardingList(prev => prev.map(p => {
        if (p.id !== selectedTask.processId) return p;
        return {
          ...p,
          tasks: updatedTasks,
          progress,
          currentStage,
          status
        };
      }));

      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task status. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Onboarding</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage new hire onboarding workflows</p>
        </div>
        <button 
          onClick={handleStartOnboarding}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Start Onboarding
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
                  className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2"
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

      {isAdding && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Start New Onboarding</h3>
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
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startDate">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
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
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
                  >
                    Start
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 mb-8 md:grid-cols-3">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <ChartBarIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Onboarding</p>
              <p className="text-2xl font-semibold text-gray-900">
                {onboardingList.filter(o => o.status === 'In Progress').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Completed (YTD)</p>
              <p className="text-2xl font-semibold text-gray-900">
                {onboardingList.filter(o => o.status === 'Completed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
              <ClockIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Completion Time</p>
              <p className="text-2xl font-semibold text-gray-900">5 Days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {onboardingList.map((process) => {
            const employee = getEmployee(process.employeeId);
            if (!employee) return null;

            return (
              <li key={process.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600">
                        {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-blue-600 truncate">
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
                        Started: {new Date(process.startDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress: {process.currentStage}</span>
                      <span>{process.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${process.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pending Tasks</h4>
                    <div className="flex flex-wrap gap-2">
                      {process.tasks.map((task) => (
                        <button
                          key={task.id} 
                          onClick={() => !task.completed && handleTaskClick(process.id, task)}
                          disabled={task.completed}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            task.completed 
                              ? 'bg-green-100 text-green-800 cursor-default' 
                              : 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 cursor-pointer'
                          }`}
                        >
                          {task.completed && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                          {task.name}
                        </button>
                      ))}
                    </div>
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
