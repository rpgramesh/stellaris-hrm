
'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  RefreshCw,
  Info
} from 'lucide-react';
import { statutoryTablesService } from '@/services/statutoryTablesService';
import { StatutoryRate, StatutoryContributionType } from '@/types/statutory';

export default function StatutoryTablePage() {
  const [rates, setRates] = useState<StatutoryRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatutoryContributionType>('payg-withholding');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StatutoryRate>>({});
  const [newRateForm, setNewRateForm] = useState<Partial<StatutoryRate>>({
    rateType: activeTab,
    name: '',
    description: '',
    rate: 0,
    threshold: 0,
    effectiveFrom: new Date(),
    isActive: true,
    isReportable: true,
    liabilityAccount: '',
    expenseAccount: ''
  });

  useEffect(() => {
    setNewRateForm(prev => ({ ...prev, rateType: activeTab }));
  }, [activeTab]);

  const contributionTypes: { id: StatutoryContributionType; label: string }[] = [
    { id: 'payg-withholding', label: 'PAYG Withholding' },
    { id: 'superannuation-guarantee', label: 'Super Guarantee' },
    { id: 'payroll-tax', label: 'Payroll Tax' },
    { id: 'workers-compensation', label: 'Workers Comp' },
    { id: 'medicare-levy', label: 'Medicare Levy' }
  ];

  useEffect(() => {
    loadRates();
  }, [activeTab]);

  const loadRates = async () => {
    try {
      setLoading(true);
      const data = await statutoryTablesService.getStatutoryRates(activeTab, new Date());
      setRates(data);
    } catch (error) {
      console.error('Error loading statutory rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rate: StatutoryRate) => {
    setIsEditing(rate.id);
    setEditForm(rate);
  };

  const handleSave = async () => {
    if (!isEditing) return;
    try {
      await statutoryTablesService.updateStatutoryRate(isEditing, editForm);
      setIsEditing(null);
      loadRates();
    } catch (error) {
      console.error('Error saving rate:', error);
      alert('Failed to save rate. Please check all fields are correct.');
    }
  };

  const handleCancel = () => {
    setIsEditing(null);
    setEditForm({});
  };

  const handleAddNewRate = async () => {
    try {
      const payload = {
        ...newRateForm,
        rate_type: activeTab,
        effective_from: newRateForm.effectiveFrom?.toISOString()
      };
      
      const { error } = await supabase
        .from('statutory_rates')
        .insert([payload]);

      if (error) throw error;

      setShowAddModal(false);
      setNewRateForm({
        rateType: activeTab,
        name: '',
        description: '',
        rate: 0,
        threshold: 0,
        effectiveFrom: new Date(),
        isActive: true,
        isReportable: true,
        liabilityAccount: '',
        expenseAccount: ''
      });
      loadRates();
    } catch (error) {
      console.error('Error adding new rate:', error);
      alert('Failed to add new rate.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Statutory Tables</h1>
          <p className="text-gray-600 mt-1">Manage tax rates, superannuation, and other statutory requirements</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Rate</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {contributionTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveTab(type.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === type.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {type.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading rates...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (%)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Threshold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {isEditing === rate.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="block w-full text-sm border-gray-300 rounded-md"
                            placeholder="Name"
                          />
                          <input
                            type="text"
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="block w-full text-sm border-gray-300 rounded-md text-gray-500"
                            placeholder="Description"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rate.name}</div>
                          <div className="text-xs text-gray-500">{rate.description}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing === rate.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.rate || 0}
                          onChange={(e) => setEditForm({ ...editForm, rate: parseFloat(e.target.value) })}
                          className="w-20 text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">{(rate.rate * 100).toFixed(2)}%</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing === rate.id ? (
                        <input
                          type="number"
                          value={editForm.threshold || 0}
                          onChange={(e) => setEditForm({ ...editForm, threshold: parseFloat(e.target.value) })}
                          className="w-32 text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">
                          {rate.threshold ? `$${rate.threshold.toLocaleString()}` : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(rate.effectiveFrom).toLocaleDateString()} - 
                      {rate.effectiveTo ? new Date(rate.effectiveTo).toLocaleDateString() : 'Present'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rate.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rate.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {isEditing === rate.id ? (
                        <div className="flex items-center space-x-2">
                          <button onClick={handleSave} className="text-green-600 hover:text-green-900">
                            <Save className="h-4 w-4" />
                          </button>
                          <button onClick={handleCancel} className="text-red-600 hover:text-red-900">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button onClick={() => handleEdit(rate)} className="text-blue-600 hover:text-blue-900">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 p-4 rounded-lg flex items-start space-x-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">About Statutory Tables</p>
          <p className="mt-1">
            These rates are used by the payroll engine to calculate withholdings, contributions, and taxes. 
            Ensure rates are kept up to date with the latest Australian Taxation Office (ATO) and Fair Work regulations.
          </p>
        </div>
      </div>

      {/* Add New Rate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New {contributionTypes.find(t => t.id === activeTab)?.label}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={newRateForm.name || ''}
                  onChange={(e) => setNewRateForm({ ...newRateForm, name: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g. Standard PAYG"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newRateForm.description || ''}
                  onChange={(e) => setNewRateForm({ ...newRateForm, description: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newRateForm.rate || 0}
                  onChange={(e) => setNewRateForm({ ...newRateForm, rate: parseFloat(e.target.value) / 100 })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Threshold ($)</label>
                <input
                  type="number"
                  value={newRateForm.threshold || 0}
                  onChange={(e) => setNewRateForm({ ...newRateForm, threshold: parseFloat(e.target.value) })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Effective From</label>
                <input
                  type="date"
                  value={newRateForm.effectiveFrom?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setNewRateForm({ ...newRateForm, effectiveFrom: new Date(e.target.value) })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={newRateForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setNewRateForm({ ...newRateForm, isActive: e.target.value === 'active' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Liability Account</label>
                <input
                  type="text"
                  value={newRateForm.liabilityAccount || ''}
                  onChange={(e) => setNewRateForm({ ...newRateForm, liabilityAccount: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g. 2-1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expense Account</label>
                <input
                  type="text"
                  value={newRateForm.expenseAccount || ''}
                  onChange={(e) => setNewRateForm({ ...newRateForm, expenseAccount: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g. 6-1000"
                />
              </div>
            </div>
            
            <div className="mt-8 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewRate}
                className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
