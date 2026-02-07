"use client";

import { useState } from "react";
import { 
  BriefcaseIcon, 
  ClockIcon, 
  PencilIcon, 
  TrashIcon,
  PlusIcon
} from "@heroicons/react/24/outline";

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isDefault: boolean;
}

interface WeeklySchedule {
  day: string;
  isWorkDay: boolean;
  shiftId: string;
}

const initialShifts: Shift[] = [
  { id: "1", name: "General Shift", startTime: "09:00", endTime: "17:00", isDefault: true },
  { id: "2", name: "Morning Shift", startTime: "06:00", endTime: "14:00", isDefault: false },
  { id: "3", name: "Night Shift", startTime: "22:00", endTime: "06:00", isDefault: false },
];

const initialSchedule: WeeklySchedule[] = [
  { day: "Monday", isWorkDay: true, shiftId: "1" },
  { day: "Tuesday", isWorkDay: true, shiftId: "1" },
  { day: "Wednesday", isWorkDay: true, shiftId: "1" },
  { day: "Thursday", isWorkDay: true, shiftId: "1" },
  { day: "Friday", isWorkDay: true, shiftId: "1" },
  { day: "Saturday", isWorkDay: false, shiftId: "1" },
  { day: "Sunday", isWorkDay: false, shiftId: "1" },
];

export default function WorkdayPage() {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [schedule, setSchedule] = useState<WeeklySchedule[]>(initialSchedule);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [newShift, setNewShift] = useState<Omit<Shift, "id" | "isDefault">>({
    name: "",
    startTime: "",
    endTime: ""
  });

  const handleToggleDay = (dayIndex: number) => {
    const updatedSchedule = [...schedule];
    updatedSchedule[dayIndex].isWorkDay = !updatedSchedule[dayIndex].isWorkDay;
    setSchedule(updatedSchedule);
  };

  const handleShiftChange = (dayIndex: number, shiftId: string) => {
    const updatedSchedule = [...schedule];
    updatedSchedule[dayIndex].shiftId = shiftId;
    setSchedule(updatedSchedule);
  };

  const handleAddShift = () => {
    if (!newShift.name || !newShift.startTime || !newShift.endTime) return;
    
    const shift: Shift = {
      id: Math.random().toString(36).substr(2, 9),
      isDefault: false,
      ...newShift
    };
    
    setShifts([...shifts, shift]);
    setIsShiftModalOpen(false);
    setNewShift({ name: "", startTime: "", endTime: "" });
  };

  const handleDeleteShift = (id: string) => {
    if (shifts.find(s => s.id === id)?.isDefault) {
      alert("Cannot delete the default shift.");
      return;
    }
    if (confirm("Are you sure you want to delete this shift?")) {
      setShifts(shifts.filter(s => s.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workday & Shifts</h1>
        <p className="text-sm text-gray-500 mt-1">Configure weekly schedules and shift timings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Schedule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">Weekly Schedule</h2>
            <p className="text-sm text-gray-500">Define working days and default shifts</p>
          </div>
          <div className="divide-y divide-gray-100">
            {schedule.map((day, index) => (
              <div key={day.day} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`
                    w-12 h-8 rounded-full flex items-center p-1 cursor-pointer transition-colors duration-200
                    ${day.isWorkDay ? 'bg-blue-600' : 'bg-gray-200'}
                  `} onClick={() => handleToggleDay(index)}>
                    <div className={`
                      bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform duration-200
                      ${day.isWorkDay ? 'translate-x-4' : 'translate-x-0'}
                    `} />
                  </div>
                  <span className={`font-medium ${day.isWorkDay ? 'text-gray-900' : 'text-gray-400'}`}>
                    {day.day}
                  </span>
                </div>
                {day.isWorkDay && (
                  <select
                    value={day.shiftId}
                    onChange={(e) => handleShiftChange(index, e.target.value)}
                    className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                  >
                    {shifts.map(shift => (
                      <option key={shift.id} value={shift.id}>{shift.name}</option>
                    ))}
                  </select>
                )}
                {!day.isWorkDay && (
                  <span className="text-sm text-gray-400 italic px-2">Rest Day</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Shift Definitions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Shift Definitions</h2>
              <p className="text-sm text-gray-500">Manage available work shifts</p>
            </div>
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {shifts.map((shift) => (
              <div key={shift.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <BriefcaseIcon className="h-4 w-4 text-gray-400" />
                    {shift.name}
                    {shift.isDefault && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Default</span>
                    )}
                  </h3>
                  {!shift.isDefault && (
                    <button onClick={() => handleDeleteShift(shift.id)} className="text-red-400 hover:text-red-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center text-sm text-gray-500 gap-4">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    {shift.startTime} - {shift.endTime}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Shift</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name</label>
                <input
                  type="text"
                  value={newShift.name}
                  onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g. Afternoon Shift"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleAddShift}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                Add Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
