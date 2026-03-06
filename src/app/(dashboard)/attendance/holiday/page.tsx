"use client";

import { useState, useEffect } from "react";
import { 
  CalendarDaysIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilSquareIcon 
} from "@heroicons/react/24/outline";
import { holidayService, Holiday } from "@/services/holidayService";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function HolidayPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    name: "",
    date: "",
    type: "Public" as "Public" | "Company" | "Optional",
    isRecurring: false // Mapping to is_recurring for service
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
      console.error("Failed to load holidays:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) return;
    
    try {
      const added = await holidayService.create({
        name: newHoliday.name,
        date: newHoliday.date,
        type: newHoliday.type,
        is_recurring: newHoliday.isRecurring
      });
      setHolidays([...holidays, added]);
      setIsModalOpen(false);
      setNewHoliday({ name: "", date: "", type: "Public", isRecurring: false });
    } catch (error) {
      console.error("Failed to add holiday:", error);
      alert("Failed to add holiday");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this holiday?")) {
      try {
        await holidayService.delete(id);
        setHolidays(holidays.filter(h => h.id !== id));
      } catch (error) {
        console.error("Failed to delete holiday:", error);
        alert("Failed to delete holiday");
      }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holiday Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage public and company holidays</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Holiday
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Add New Holiday</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  value={newHoliday.name}
                  onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  value={newHoliday.date}
                  onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  value={newHoliday.type}
                  onChange={e => setNewHoliday({...newHoliday, type: e.target.value as any})}
                >
                  <option value="Public">Public</option>
                  <option value="Company">Company</option>
                  <option value="Optional">Optional</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recurring"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={newHoliday.isRecurring}
                  onChange={e => setNewHoliday({...newHoliday, isRecurring: e.target.checked})}
                />
                <label htmlFor="recurring" className="ml-2 block text-sm text-gray-900">
                  Recurring Annually
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHoliday}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holidays List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Holiday Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recurring
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No holidays found.</p>
                  </td>
                </tr>
              ) : (
                holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((holiday) => (
                  <tr key={holiday.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                        {format(new Date(holiday.date), 'MMMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {holiday.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        holiday.type === 'Public' ? 'bg-purple-100 text-purple-800' :
                        holiday.type === 'Company' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {holiday.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {holiday.is_recurring ? (
                        <span className="text-green-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleDelete(holiday.id)}
                          className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
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
