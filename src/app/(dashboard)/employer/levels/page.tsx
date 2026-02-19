'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Level } from '@/types';
import { levelService } from '@/services/levelService';

export default function LevelsPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      const data = await levelService.getAll();
      setLevels(data);
    } catch (error) {
      console.error('Failed to load levels:', error);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState<Omit<Level, 'id'>>({
    name: '',
    grade: '',
    description: ''
  });

  const handleOpenModal = (level?: Level) => {
    if (level) {
      setCurrentLevel(level);
      setFormData({
        name: level.name,
        grade: level.grade,
        description: level.description
      });
    } else {
      setCurrentLevel(null);
      setFormData({
        name: '',
        grade: '',
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this level?')) {
      try {
        await levelService.delete(id);
        setLevels(prev => prev.filter(l => l.id !== id));
      } catch (error) {
        console.error('Failed to delete level:', error);
        alert('Failed to delete level');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentLevel) {
        const updated = await levelService.update(currentLevel.id, formData);
        setLevels(prev => prev.map(l => l.id === updated.id ? updated : l));
      } else {
        const newLevel = await levelService.create(formData);
        setLevels(prev => [...prev, newLevel]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save level:', error);
      alert('Failed to save level');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Levels</h1>
          <p className="text-sm text-gray-500 mt-1">Manage employee grades and levels</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Add Level
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {levels.map((level) => (
              <tr key={level.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{level.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{level.grade}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{level.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenModal(level)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded" title="Edit">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(level.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded" title="Delete">
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
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{currentLevel ? 'Edit Level' : 'Add Level'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Level Name</label>
                <input
                  type="text"
                  required
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Grade</label>
                <input
                  type="text"
                  required
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.grade}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Description</label>
                <textarea
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
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
