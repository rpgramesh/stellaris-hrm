"use client";

import { useState } from "react";
import { 
  ClockIcon, 
  MapPinIcon, 
  ShieldCheckIcon, 
  Cog6ToothIcon
} from "@heroicons/react/24/outline";

export default function AttendanceSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    workDayStart: "09:00",
    workDayEnd: "17:00",
    gracePeriod: 15,
    breakDuration: 60,
    isBreakPaid: false,
    enableGeofencing: true,
    geofenceRadius: 100,
    enableIpRestriction: false,
    allowedIps: "192.168.1.1, 10.0.0.1"
  });

  const handleSave = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      alert("Settings saved successfully!");
    }, 1000);
  };

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure global rules for attendance tracking</p>
      </div>

      {/* Working Hours Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <ClockIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">Working Hours & Shifts</h2>
            <p className="text-sm text-gray-500">Define standard working hours and grace periods</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Day Start</label>
            <input
              type="time"
              value={settings.workDayStart}
              onChange={(e) => handleChange("workDayStart", e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Day End</label>
            <input
              type="time"
              value={settings.workDayEnd}
              onChange={(e) => handleChange("workDayEnd", e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (Minutes)</label>
            <input
              type="number"
              value={settings.gracePeriod}
              onChange={(e) => handleChange("gracePeriod", parseInt(e.target.value))}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Allowed delay before marking as "Late"</p>
          </div>
        </div>
      </div>

      {/* Breaks Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
            <Cog6ToothIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">Break Policies</h2>
            <p className="text-sm text-gray-500">Configure break durations and payment rules</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Standard Break Duration (Minutes)</label>
              <input
                type="number"
                value={settings.breakDuration}
                onChange={(e) => handleChange("breakDuration", parseInt(e.target.value))}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex items-center pt-6">
              <input
                id="paid-break"
                type="checkbox"
                checked={settings.isBreakPaid}
                onChange={(e) => handleChange("isBreakPaid", e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="paid-break" className="ml-2 block text-sm text-gray-900">
                Breaks are paid
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Location & Security Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
            <MapPinIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">Location & Security</h2>
            <p className="text-sm text-gray-500">Geofencing and IP restriction settings</p>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Geofencing */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="geofencing"
                  type="checkbox"
                  checked={settings.enableGeofencing}
                  onChange={(e) => handleChange("enableGeofencing", e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="geofencing" className="ml-2 block text-sm font-medium text-gray-900">
                  Enable Geofencing
                </label>
              </div>
            </div>
            {settings.enableGeofencing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Radius (Meters)</label>
                <input
                  type="number"
                  value={settings.geofenceRadius}
                  onChange={(e) => handleChange("geofenceRadius", parseInt(e.target.value))}
                  className="block w-full md:w-1/2 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-6"></div>

          {/* IP Restriction */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="ip-restriction"
                  type="checkbox"
                  checked={settings.enableIpRestriction}
                  onChange={(e) => handleChange("enableIpRestriction", e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="ip-restriction" className="ml-2 block text-sm font-medium text-gray-900">
                  Enable IP Restriction
                </label>
              </div>
            </div>
            {settings.enableIpRestriction && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allowed IP Addresses (Comma separated)</label>
                <textarea
                  value={settings.allowedIps}
                  onChange={(e) => handleChange("allowedIps", e.target.value)}
                  rows={3}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g. 192.168.1.1, 10.0.0.1"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`
            inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white 
            ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}
          `}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
}
