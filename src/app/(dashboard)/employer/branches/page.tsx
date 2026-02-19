'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Branch } from '@/types';
import { branchService } from '@/services/branchService';

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const data = await branchService.getAll();
      setBranches(data);
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState<Omit<Branch, 'id'>>({
    name: '',
    address: '',
    contactNumber: ''
  });

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setCurrentBranch(branch);
      setFormData({
        name: branch.name,
        address: branch.address,
        contactNumber: branch.contactNumber
      });
    } else {
      setCurrentBranch(null);
      setFormData({
        name: '',
        address: '',
        contactNumber: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this branch?')) {
      try {
        await branchService.delete(id);
        setBranches(prev => prev.filter(b => b.id !== id));
      } catch (error) {
        console.error('Failed to delete branch:', error);
        alert('Failed to delete branch');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentBranch) {
        const updated = await branchService.update(currentBranch.id, formData);
        setBranches(prev => prev.map(b => b.id === updated.id ? updated : b));
      } else {
        const newBranch = await branchService.create(formData);
        setBranches(prev => [...prev, newBranch]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save branch:', error);
      alert('Failed to save branch');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-500 mt-1">Manage company branches and locations</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Add Branch
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Number</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {branches.map((branch) => (
              <tr key={branch.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.contactNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenModal(branch)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded" title="Edit">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(branch.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded" title="Delete">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{currentBranch ? 'Edit Branch' : 'Add Branch'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Branch Name</label>
                <input
                  type="text"
                  required
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Address</label>
                <textarea
                  required
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Contact Number</label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="mr-2 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
