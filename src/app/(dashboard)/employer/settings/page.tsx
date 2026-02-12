'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { SystemSettings } from '@/types';
import { settingsService } from '@/services/settingsService';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    id: '',
    dateFormat: '',
    timeZone: '',
    currency: '',
    emailNotifications: true,
    pushNotifications: false,
    twoFactorAuth: false,
    sessionTimeout: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.get();
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (key: keyof SystemSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      await settingsService.update(settings);
      alert('Settings saved!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    }
  };

  if (loading) {
    return <div className="p-4">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure general system preferences</p>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">General</h3>
            <p className="mt-1 text-sm text-gray-500">
              Basic regional and display settings.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700">Date Format</label>
                <select
                  id="dateFormat"
                  name="dateFormat"
                  value={settings.dateFormat}
                  onChange={handleChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">Time Zone</label>
                <select
                  id="timeZone"
                  name="timeZone"
                  value={settings.timeZone}
                  onChange={handleChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                  <option value="Australia/Melbourne">Australia/Melbourne</option>
                  <option value="Australia/Brisbane">Australia/Brisbane</option>
                  <option value="Australia/Perth">Australia/Perth</option>
                  <option value="Australia/Adelaide">Australia/Adelaide</option>
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Currency</label>
                <select
                  id="currency"
                  name="currency"
                  value={settings.currency}
                  onChange={handleChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="AUD">Australian Dollar (AUD)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="NZD">New Zealand Dollar (NZD)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Notifications</h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage how you receive alerts.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={() => handleToggle('emailNotifications')}
                    className={classNames(
                      settings.emailNotifications ? 'bg-blue-600' : 'bg-gray-200',
                      'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    )}
                  >
                    <span className="sr-only">Use setting</span>
                    <span
                      aria-hidden="true"
                      className={classNames(
                        settings.emailNotifications ? 'translate-x-5' : 'translate-x-0',
                        'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200'
                      )}
                    />
                  </Switch>
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="emailNotifications" className="font-medium text-gray-700">Email Notifications</label>
                  <p className="text-gray-500">Receive emails for important updates and approvals.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <Switch
                    checked={settings.pushNotifications}
                    onChange={() => handleToggle('pushNotifications')}
                    className={classNames(
                      settings.pushNotifications ? 'bg-blue-600' : 'bg-gray-200',
                      'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    )}
                  >
                    <span className="sr-only">Use setting</span>
                    <span
                      aria-hidden="true"
                      className={classNames(
                        settings.pushNotifications ? 'translate-x-5' : 'translate-x-0',
                        'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200'
                      )}
                    />
                  </Switch>
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="pushNotifications" className="font-medium text-gray-700">Push Notifications</label>
                  <p className="text-gray-500">Receive push notifications on your device.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="button"
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="button"
          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </div>
  );
}
