'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ExpenseClaim, 
  ExpenseItem, 
  ExpenseCategory, 
  ExpenseType, 
  ExpenseWorkflow 
} from '@/types';
import { expenseSettingsService } from '@/services/expenseSettingsService';

interface ExpenseFormProps {
  initialData?: ExpenseClaim;
  onSubmit?: (data: ExpenseClaim) => void; // Optional for now
}

export default function ExpenseForm({ initialData }: ExpenseFormProps) {
  const router = useRouter();
  
  // Reference Data State
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [workflows, setWorkflows] = useState<ExpenseWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState(initialData?.title || '');
  const [workflowId, setWorkflowId] = useState(initialData?.workflowId || '');
  const [items, setItems] = useState<ExpenseItem[]>(initialData?.items || []);

  // New Item State
  const [newItem, setNewItem] = useState<Partial<ExpenseItem>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    categoryId: '',
    typeId: ''
  });

  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      setLoading(true);
      const [categoriesData, typesData, workflowsData] = await Promise.all([
        expenseSettingsService.getCategories(),
        expenseSettingsService.getTypes(),
        expenseSettingsService.getWorkflows()
      ]);
      setCategories(categoriesData);
      setTypes(typesData);
      setWorkflows(workflowsData);
    } catch (error) {
      console.error('Failed to load expense reference data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleAddItem = () => {
    if (!newItem.categoryId || !newItem.typeId || !newItem.amount || !newItem.description) {
      alert('Please fill in all item fields');
      return;
    }

    const item: ExpenseItem = {
      id: `ITM${Date.now()}`,
      claimId: initialData?.id || '',
      categoryId: newItem.categoryId!,
      typeId: newItem.typeId!,
      date: newItem.date || new Date().toISOString().split('T')[0],
      amount: Number(newItem.amount),
      description: newItem.description!,
      receiptUrl: newItem.receiptUrl
    };

    setItems([...items, item]);
    setNewItem({
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      categoryId: '',
      typeId: ''
    });
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      alert('Please add at least one expense item');
      return;
    }

    const claimData: ExpenseClaim = {
      id: initialData?.id || `EXP${Date.now()}`,
      employeeId: 'EMP002', // Mock current user
      title,
      dateSubmitted: new Date().toISOString().split('T')[0],
      status: 'Submitted', // Default to submitted for simplicity
      totalAmount: calculateTotal(),
      items,
      workflowId: workflowId || undefined,
      history: [
        {
          date: new Date().toISOString().split('T')[0],
          action: 'Submitted',
          actorId: 'EMP002'
        }
      ]
    };

    console.log('Submitting claim:', claimData);
    // In a real app, this would be an API call
    // For now, we just redirect back
    alert('Expense Claim Submitted Successfully!');
    router.push('/expenses/management');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-6 shadow rounded-lg">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {initialData ? 'Edit Expense Claim' : 'New Expense Claim'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Fill in the details for your expense claim.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Claim Title
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="title"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g. Client Meeting Trip"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="workflow" className="block text-sm font-medium text-gray-700">
              Approval Workflow
            </label>
            <div className="mt-1">
              <select
                id="workflow"
                name="workflow"
                value={workflowId}
                onChange={(e) => setWorkflowId(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="">Select Workflow (Optional)</option>
                {workflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>{wf.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Expense Items Section */}
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Expense Items</h4>
          
          {/* List of added items */}
          {items.length > 0 && (
            <div className="mb-6 overflow-x-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {categories.find(c => c.id === item.categoryId)?.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {types.find(t => t.id === item.typeId)?.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{item.description}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{item.date}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">${item.amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-900">Total:</td>
                    <td className="px-4 py-2 text-right text-sm text-gray-900">${calculateTotal().toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Add New Item Form */}
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Add New Item</h5>
            <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
              
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700">Category</label>
                <select
                  value={newItem.categoryId}
                  onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                  className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700">Type</label>
                <select
                  value={newItem.typeId}
                  onChange={(e) => setNewItem({ ...newItem, typeId: e.target.value })}
                  className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Type</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={newItem.date}
                  onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                  className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Expense description"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.amount}
                  onChange={(e) => setNewItem({ ...newItem, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Submit Claim
          </button>
        </div>
      </div>
    </form>
  );
}
