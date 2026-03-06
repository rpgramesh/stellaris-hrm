'use client';

import { useState, useEffect } from 'react';
import { payrollService, SalaryStructure } from '@/services/payrollService';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

export default function SalaryStructuresPage() {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basicPay: 50,
    daAllowance: 20,
    hra: 20,
    conveyance: 5,
    medical: 2,
    specialAllowance: 3,
    isActive: true
  });

  useEffect(() => {
    loadSalaryStructures();
  }, []);

  const loadSalaryStructures = async () => {
    try {
      setLoading(true);
      const data = await payrollService.getSalaryStructures();
      setStructures(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load salary structures');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      name: '',
      description: '',
      basicPay: 50,
      daAllowance: 20,
      hra: 20,
      conveyance: 5,
      medical: 2,
      specialAllowance: 3,
      isActive: true
    });
    setShowAddModal(true);
  };

  const handleEdit = (structure: SalaryStructure) => {
    setFormData({
      name: structure.name,
      description: structure.description,
      basicPay: structure.basicPay,
      daAllowance: structure.daAllowance,
      hra: structure.hra,
      conveyance: structure.conveyance,
      medical: structure.medical,
      specialAllowance: structure.specialAllowance,
      isActive: structure.isActive
    });
    setEditingId(structure.id);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate percentages sum to 100
      const total = formData.basicPay + formData.daAllowance + formData.hra + 
                   formData.conveyance + formData.medical + formData.specialAllowance;
      
      if (total !== 100) {
        setError('Salary components must sum to 100%');
        return;
      }

      if (editingId) {
        const updated = await payrollService.updateSalaryStructure(editingId, formData);
        setStructures(structures.map(s => s.id === editingId ? updated : s));
        setEditingId(null);
      } else {
        const newStructure = await payrollService.createSalaryStructure(formData);
        setStructures([newStructure, ...structures]);
        setShowAddModal(false);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to save salary structure');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddModal(false);
    setError(null);
  };

  const getTotalPercentage = () => {
    return formData.basicPay + formData.daAllowance + formData.hra + 
           formData.conveyance + formData.medical + formData.specialAllowance;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salary Structures</h1>
          <p className="text-sm text-gray-500">Manage salary components and structures for payroll calculation</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Structure
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Salary Structures</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HRA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conveyance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medical</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Special</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {structures.map((structure) => (
                <tr key={structure.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === structure.id ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{structure.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === structure.id ? (
                      <input
                        type="number"
                        value={formData.basicPay}
                        onChange={(e) => setFormData({ ...formData, basicPay: Number(e.target.value) })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                        max="100"
                      />
                    ) : (
                      `${structure.basicPay}%`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === structure.id ? (
                      <input
                        type="number"
                        value={formData.daAllowance}
                        onChange={(e) => setFormData({ ...formData, daAllowance: Number(e.target.value) })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                        max="100"
                      />
                    ) : (
                      `${structure.daAllowance}%`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === structure.id ? (
                      <input
                        type="number"
                        value={formData.hra}
                        onChange={(e) => setFormData({ ...formData, hra: Number(e.target.value) })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                        max="100"
                      />
                    ) : (
                      `${structure.hra}%`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === structure.id ? (
                      <input
                        type="number"
                        value={formData.conveyance}
                        onChange={(e) => setFormData({ ...formData, conveyance: Number(e.target.value) })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                        max="100"
                      />
                    ) : (
                      `${structure.conveyance}%`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === structure.id ? (
                      <input
                        type="number"
                        value={formData.medical}
                        onChange={(e) => setFormData({ ...formData, medical: Number(e.target.value) })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                        max="100"
                      />
                    ) : (
                      `${structure.medical}%`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === structure.id ? (
                      <input
                        type="number"
                        value={formData.specialAllowance}
                        onChange={(e) => setFormData({ ...formData, specialAllowance: Number(e.target.value) })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                        max="100"
                      />
                    ) : (
                      `${structure.specialAllowance}%`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      structure.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {structure.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingId === structure.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving || getTotalPercentage() !== 100}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          <Save className="w-3 h-3" />
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(structure)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => {/* TODO: Implement delete */}}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {structures.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <div className="mx-auto h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-900">No salary structures</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new salary structure.</p>
              <div className="mt-6">
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Salary Structure
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Add Salary Structure</h3>
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Salary Components (Must sum to 100%)</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-gray-600">Basic Pay</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.basicPay}
                          onChange={(e) => setFormData({ ...formData, basicPay: Number(e.target.value) })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-gray-600">DA Allowance</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.daAllowance}
                          onChange={(e) => setFormData({ ...formData, daAllowance: Number(e.target.value) })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-gray-600">HRA</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.hra}
                          onChange={(e) => setFormData({ ...formData, hra: Number(e.target.value) })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-gray-600">Conveyance</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.conveyance}
                          onChange={(e) => setFormData({ ...formData, conveyance: Number(e.target.value) })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-gray-600">Medical</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.medical}
                          onChange={(e) => setFormData({ ...formData, medical: Number(e.target.value) })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-gray-600">Special Allowance</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.specialAllowance}
                          onChange={(e) => setFormData({ ...formData, specialAllowance: Number(e.target.value) })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between items-center font-medium">
                        <span className="text-sm text-gray-700">Total</span>
                        <span className={`text-sm ${
                          getTotalPercentage() === 100 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {getTotalPercentage()}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || getTotalPercentage() !== 100}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Add Structure'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}