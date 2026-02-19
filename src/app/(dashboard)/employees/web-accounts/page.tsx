'use client';

import { useState, useEffect } from 'react';
import { 
  GlobeAltIcon, 
  KeyIcon, 
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { webAccountService } from '@/services/webAccountService';
import { employeeService } from '@/services/employeeService';
import { WebAccount, Employee } from '@/types';

export default function WebAccountsPage() {
  const [accounts, setAccounts] = useState<WebAccount[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    platform: '',
    username: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsData, employeesData] = await Promise.all([
        webAccountService.getAll(),
        employeeService.getAll()
      ]);
      setAccounts(accountsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this account?')) {
      try {
        await webAccountService.delete(id);
        setAccounts(prev => prev.filter(a => a.id !== id));
      } catch (error) {
        console.error('Failed to delete account:', error);
        alert('Failed to delete account');
      }
    }
  };

  const handleAddAccount = () => {
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) return;

    try {
      const newAccount = await webAccountService.create({
        employeeId: formData.employeeId,
        platform: formData.platform,
        username: formData.username,
        status: 'Active'
      });

      setAccounts([newAccount, ...accounts]);
      setIsAdding(false);
      setFormData({
        employeeId: '',
        platform: '',
        username: ''
      });
    } catch (error) {
      console.error('Failed to create account:', error);
      alert('Failed to create account');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Web Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">Manage employee access to external platforms and tools</p>
        </div>
        <button 
          onClick={handleAddAccount}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <KeyIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Add Account
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Add Web Account</h3>
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
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="platform">
                    Platform
                  </label>
                  <input
                    type="text"
                    id="platform"
                    placeholder="e.g. Slack, Jira, Gmail"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.platform}
                    onChange={(e) => setFormData({...formData, platform: e.target.value})}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    placeholder="e.g. john.doe"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
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
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Platform
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {accounts.map((account) => {
              const employee = getEmployee(account.employeeId);
              return (
                <tr key={account.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                        {employee?.firstName.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee?.department}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-2" />
                      {account.platform}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{account.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      account.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {account.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {account.lastLogin || 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(account.id)}
                        className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
