"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { holidayService, Holiday } from '@/services/holidayService';
import { Loader2, Plus, Trash2, Calendar } from 'lucide-react';

export default function LeaveHolidayPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  // Simple form state for adding new holidays
  const [isAdding, setIsAdding] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: '',
    type: 'Public' as 'Public' | 'Company',
    is_recurring: true
  });

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const data = await holidayService.getAll();
      setHolidays(data);
    } catch (error) {
      console.error('Failed to load holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await holidayService.delete(id);
      setHolidays(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      console.error('Failed to delete holiday:', error);
      alert('Failed to delete holiday');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const added = await holidayService.create(newHoliday);
      setHolidays(prev => [...prev, added].sort((a, b) => a.date.localeCompare(b.date)));
      setIsAdding(false);
      setNewHoliday({ name: '', date: '', type: 'Public', is_recurring: true });
    } catch (error) {
      console.error('Failed to add holiday:', error);
      alert('Failed to add holiday');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holiday Settings</h1>
          <p className="text-gray-500">Configure public and company holidays for leave calculations.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {isAdding ? 'Cancel' : 'Add Holiday'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-medium text-blue-900 mb-3">Add New Holiday</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-blue-800 mb-1">Name</label>
              <input 
                type="text" 
                required
                className="w-full rounded-md border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g. New Year's Day"
                value={newHoliday.name}
                onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">Date</label>
              <input 
                type="date" 
                required
                className="w-full rounded-md border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                value={newHoliday.date}
                onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">Type</label>
              <select 
                className="w-full rounded-md border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                value={newHoliday.type}
                onChange={e => setNewHoliday({...newHoliday, type: e.target.value as any})}
              >
                <option value="Public">Public</option>
                <option value="Company">Company</option>
              </select>
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium h-10">
              Save
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holiday Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recurring</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No holidays configured yet.</p>
                  </td>
                </tr>
              ) : (
                holidays.map((holiday) => (
                  <tr key={holiday.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {format(new Date(holiday.date), 'MMMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {holiday.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        holiday.type === 'Public' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {holiday.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {holiday.is_recurring ? (
                        <span className="text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full w-fit text-xs font-medium border border-green-200">
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(holiday.id)}
                        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
