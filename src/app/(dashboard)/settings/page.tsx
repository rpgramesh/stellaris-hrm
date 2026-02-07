"use client";

import { useState } from 'react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        {saved && (
          <span className="bg-green-100 text-green-800 px-4 py-2 rounded-md text-sm font-medium animate-fade-in">
            Settings saved successfully!
          </span>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Company Profile</h2>
          <p className="text-sm text-gray-500">Manage your company's information and preferences.</p>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <input 
                type="text" 
                defaultValue="Stellaris Tech Solutions"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900 focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Tax ID / ABN</label>
              <input 
                type="text" 
                defaultValue="12 345 678 901"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900 focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea 
                rows={3}
                defaultValue="123 Innovation Way, Sydney NSW 2000"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900 focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Default Currency</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900 focus:ring-blue-500 focus:border-blue-500">
                <option>AUD ($)</option>
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Timezone</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900 focus:ring-blue-500 focus:border-blue-500">
                <option>Australia/Sydney</option>
                <option>Australia/Melbourne</option>
                <option>Australia/Brisbane</option>
                <option>Australia/Perth</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input id="email-notif" type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <label htmlFor="email-notif" className="ml-2 block text-sm text-gray-900">
                  Email alerts for leave requests
                </label>
              </div>
              <div className="flex items-center">
                <input id="payroll-notif" type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <label htmlFor="payroll-notif" className="ml-2 block text-sm text-gray-900">
                  Reminders for payroll processing
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={loading}
              className={`bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
