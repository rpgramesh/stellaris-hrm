"use client";

import { useState } from "react";
import { 
  CalendarDaysIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilSquareIcon 
} from "@heroicons/react/24/outline";

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: "Public" | "Company" | "Optional";
  isRecurring: boolean;
}

const initialHolidays: Holiday[] = [
  { id: "1", name: "New Year's Day", date: "2024-01-01", type: "Public", isRecurring: true },
  { id: "2", name: "Australia Day", date: "2024-01-26", type: "Public", isRecurring: true },
  { id: "3", name: "Good Friday", date: "2024-03-29", type: "Public", isRecurring: false },
  { id: "4", name: "Easter Monday", date: "2024-04-01", type: "Public", isRecurring: false },
  { id: "5", name: "Company Anniversary", date: "2024-08-15", type: "Company", isRecurring: true },
];

export default function HolidayPage() {
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState<Omit<Holiday, "id">>({
    name: "",
    date: "",
    type: "Public",
    isRecurring: false
  });

  const handleAddHoliday = () => {
    if (!newHoliday.name || !newHoliday.date) return;
    
    const holiday: Holiday = {
      id: Math.random().toString(36).substr(2, 9),
      ...newHoliday
    };
    
    setHolidays([...holidays, holiday]);
    setIsModalOpen(false);
    setNewHoliday({ name: "", date: "", type: "Public", isRecurring: false });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this holiday?")) {
      setHolidays(holidays.filter(h => h.id !== id));
    }
  };

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
              {holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((holiday) => (
                <tr key={holiday.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                      {new Date(holiday.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {holiday.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${holiday.type === 'Public' ? 'bg-purple-100 text-purple-800' : 
                        holiday.type === 'Company' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {holiday.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {holiday.isRecurring ? 'Yes' : 'No'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(holiday.id)}
                      className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Holiday</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g. Labor Day"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newHoliday.type}
                  onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value as any })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="Public">Public Holiday</option>
                  <option value="Company">Company Holiday</option>
                  <option value="Optional">Optional Holiday</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  id="recurring"
                  type="checkbox"
                  checked={newHoliday.isRecurring}
                  onChange={(e) => setNewHoliday({ ...newHoliday, isRecurring: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="recurring" className="ml-2 block text-sm text-gray-900">
                  Recurs Annually
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleAddHoliday}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                Add Holiday
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
