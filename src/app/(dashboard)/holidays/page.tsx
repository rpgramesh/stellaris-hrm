"use client";

import { useState, useEffect } from 'react';
import { format, getYear } from 'date-fns';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { holidayService, Holiday } from '@/services/holidayService';

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New Holiday Form State
  const [newHoliday, setNewHoliday] = useState<Partial<Holiday>>({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'Public',
    is_recurring: true,
    description: ''
  });

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const data = await holidayService.getByYear(year);
      setHolidays(data);
    } catch (error) {
      console.error('Error fetching holidays:', error);
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
      console.error('Error deleting holiday:', error);
      alert('Failed to delete holiday');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) return;

    try {
      const created = await holidayService.create({
        name: newHoliday.name!,
        date: newHoliday.date!,
        type: newHoliday.type as any || 'Public',
        is_recurring: newHoliday.is_recurring || false,
        description: newHoliday.description
      });
      setHolidays(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      setShowAddModal(false);
      setNewHoliday({
        name: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'Public',
        is_recurring: true,
        description: ''
      });
    } catch (error) {
      console.error('Error adding holiday:', error);
      alert('Failed to add holiday');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holiday Management</h1>
          <p className="text-gray-500">Manage public and company holidays</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Holiday
        </button>
      </div>

      {/* Year Filter */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Filter by Year:</label>
        <select 
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Holidays Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : holidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Calendar size={48} className="mb-4 text-gray-300" />
            <p>No holidays found for {year}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holiday Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recurring</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {holidays.map((holiday) => (
                <tr key={holiday.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    {format(new Date(holiday.date), 'EEE, MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {holiday.name}
                    {holiday.description && (
                      <p className="text-xs text-gray-500 font-normal">{holiday.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      holiday.type === 'Public' ? 'bg-purple-100 text-purple-800' :
                      holiday.type === 'Company' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {holiday.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {holiday.is_recurring ? 'Yes' : 'No'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleDelete(holiday.id)}
                      className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Holiday</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newHoliday.name}
                  onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newHoliday.date}
                  onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newHoliday.type}
                    onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value as any })}
                  >
                    <option value="Public">Public</option>
                    <option value="Company">Company</option>
                    <option value="Optional">Optional</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      checked={newHoliday.is_recurring}
                      onChange={e => setNewHoliday({ ...newHoliday, is_recurring: e.target.checked })}
                    />
                    <span className="text-sm text-gray-700">Recurring</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={2}
                  value={newHoliday.description}
                  onChange={e => setNewHoliday({ ...newHoliday, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
