'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Bank } from '@/types';
import { bankService } from '@/services/bankService';

export default function BanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBank, setCurrentBank] = useState<Bank | null>(null);

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      const data = await bankService.getAll();
      setBanks(data);
    } catch (error) {
      console.error('Failed to load banks:', error);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState<Omit<Bank, 'id'>>({
    name: '',
    swiftCode: ''
  });

  const handleOpenModal = (bank?: Bank) => {
    if (bank) {
      setCurrentBank(bank);
      setFormData({
        name: bank.name,
        swiftCode: bank.swiftCode
      });
    } else {
      setCurrentBank(null);
      setFormData({
        name: '',
        swiftCode: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this bank?')) {
      try {
        await bankService.delete(id);
        setBanks(prev => prev.filter(b => b.id !== id));
      } catch (error) {
        console.error('Failed to delete bank:', error);
        alert('Failed to delete bank');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentBank) {
        const updated = await bankService.update(currentBank.id, formData);
        setBanks(prev => prev.map(b => b.id === updated.id ? updated : b));
      } else {
        const newBank = await bankService.create(formData);
        setBanks(prev => [...prev, newBank]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save bank:', error);
      alert('Failed to save bank');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banks</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supported banks</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Add Bank
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SWIFT/BIC Code</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {banks.map((bank) => (
              <tr key={bank.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bank.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bank.swiftCode}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenModal(bank)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded" title="Edit">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(bank.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded" title="Delete">
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
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{currentBank ? 'Edit Bank' : 'Add Bank'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Bank Name</label>
                <input
                  type="text"
                  required
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">SWIFT/BIC Code</label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.swiftCode}
                  onChange={(e) => setFormData({...formData, swiftCode: e.target.value})}
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
