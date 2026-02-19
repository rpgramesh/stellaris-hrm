"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { expensesService } from '@/services/expensesService';
import { expenseSettingsService } from '@/services/expenseSettingsService';
import { employeeService } from '@/services/employeeService';
import { ExpenseClaim, ExpenseCategory, ExpenseType } from '@/types';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseClaim[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    typeId: '',
    amount: '',
    description: '',
  });
  
  // We need to fetch employee names map or fetch individually
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      await fetchCurrentUser();
      await loadData();
    };
    init();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const employee = await employeeService.getByUserId(user.id);
        if (employee) {
          setCurrentEmployeeId(employee.id);
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const loadData = async () => {
    try {
      const [expensesData, categoriesData, typesData] = await Promise.all([
        expensesService.getExpenses(),
        expenseSettingsService.getCategories(),
        expenseSettingsService.getTypes()
      ]);
      
      setExpenses(expensesData);
      setCategories(categoriesData);
      setTypes(typesData);
      
      // Fetch names for all unique employee IDs
      const uniqueEmployeeIds = Array.from(new Set(expensesData.map(e => e.employeeId)));
      const names: Record<string, string> = {};
      
      // This could be optimized with a bulk fetch if available, or Promise.all
      await Promise.all(uniqueEmployeeIds.map(async (id) => {
         const name = await employeeService.getEmployeeName(id);
         names[id] = name;
      }));
      
      setEmployeeNames(names);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (id: string) => {
    return employeeNames[id] || id;
  };
  
  const getCategoryName = (id: string) => {
    const category = categories.find(c => c.id === id);
    return category ? category.name : id;
  };

  const formatCurrency = (amount: number, currency: string = 'AUD') => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployeeId) {
      alert("You must be logged in as an employee to submit expenses.");
      return;
    }

    try {
        const amount = parseFloat(formData.amount);
        
        const newExpenseData = {
            employeeId: currentEmployeeId,
            title: formData.description || 'New Expense',
            totalAmount: amount,
        };
        
        const newItemData = {
            categoryId: formData.category,
            typeId: formData.typeId,
            date: new Date().toISOString().split('T')[0],
            amount: amount,
            description: formData.description
        };
        
        await expensesService.createExpense(newExpenseData, [newItemData]);
        
        // Reload data
        loadData();
        
        setIsModalOpen(false);
        setFormData({ category: '', typeId: '', amount: '', description: '' });
    } catch (error) {
        console.error("Failed to create expense", error);
        alert("Failed to create expense. Please try again.");
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'Approved' | 'Rejected') => {
    if (!currentEmployeeId) {
        alert("You must be logged in to approve/reject expenses.");
        return;
    }
    try {
        const approverId = currentEmployeeId;
        await expensesService.updateExpenseStatus(id, newStatus, approverId);
        
        // Optimistic update
        setExpenses(expenses.map(exp => 
          exp.id === id ? { ...exp, status: newStatus, approvedBy: approverId } : exp
        ));
    } catch (error) {
        console.error("Failed to update status", error);
        alert("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expense Claims</h1>
          <p className="text-gray-600 mt-1">Submit and track reimbursement claims.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Submit Claim
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Claim History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.length === 0 ? (
                <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">No expense claims found.</td>
                </tr>
              ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getEmployeeName(exp.employeeId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.dateSubmitted}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getCategoryName(exp.items?.[0]?.categoryId) || 'Uncategorized'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{exp.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(exp.totalAmount, 'AUD')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${exp.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                            exp.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                            exp.status === 'Paid' ? 'bg-blue-100 text-blue-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {exp.status === 'Submitted' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleStatusChange(exp.id, 'Approved')}
                              className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded"
                              title="Approve"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25L15 9.75" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleStatusChange(exp.id, 'Rejected')}
                              className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                              title="Reject"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">New Expense Claim</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.typeId}
                  onChange={(e) => setFormData({...formData, typeId: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Type</option>
                  {types.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Details about the expense..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
