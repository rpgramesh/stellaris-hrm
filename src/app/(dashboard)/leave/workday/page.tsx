"use client";

import { useState } from 'react';

export default function LeaveWorkdayPage() {
  const [workDays, setWorkDays] = useState({
    monday: { active: true, hours: 7.6 },
    tuesday: { active: true, hours: 7.6 },
    wednesday: { active: true, hours: 7.6 },
    thursday: { active: true, hours: 7.6 },
    friday: { active: true, hours: 7.6 },
    saturday: { active: false, hours: 0 },
    sunday: { active: false, hours: 0 },
  });

  const handleToggle = (day: keyof typeof workDays) => {
    setWorkDays(prev => ({
      ...prev,
      [day]: { ...prev[day], active: !prev[day].active }
    }));
  };

  const handleHoursChange = (day: keyof typeof workDays, hours: number) => {
    setWorkDays(prev => ({
      ...prev,
      [day]: { ...prev[day], hours }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workday Settings</h1>
          <p className="text-gray-500">Define the standard working week for leave calculation.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Weekly Schedule</h2>
          <div className="space-y-4">
            {Object.entries(workDays).map(([day, settings]) => (
              <div key={day} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input
                      type="checkbox"
                      name={`toggle-${day}`}
                      id={`toggle-${day}`}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                      checked={settings.active}
                      onChange={() => handleToggle(day as keyof typeof workDays)}
                    />
                    <label 
                      htmlFor={`toggle-${day}`} 
                      className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settings.active ? 'bg-blue-500' : 'bg-gray-300'}`}
                    ></label>
                  </div>
                  <span className="capitalize font-medium text-gray-700 w-24">{day}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Hours:</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.1"
                      disabled={!settings.active}
                      value={settings.hours}
                      onChange={(e) => handleHoursChange(day as keyof typeof workDays, parseFloat(e.target.value))}
                      className="w-20 border border-gray-300 rounded-md px-2 py-1 text-center disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
            <strong>Note:</strong> Total standard weekly hours: {Object.values(workDays).reduce((acc, curr) => acc + (curr.active ? curr.hours : 0), 0).toFixed(1)} hours.
          </div>
        </div>
      </div>
    </div>
  );
}
