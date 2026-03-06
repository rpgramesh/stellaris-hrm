"use client";

import { useState, useEffect } from 'react';
import { workdayService, WorkdayConfig } from '@/services/workdayService';
import { Loader2 } from 'lucide-react';

export default function LeaveWorkdayPage() {
  const [workDays, setWorkDays] = useState<WorkdayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadWorkdays();
  }, []);

  const loadWorkdays = async () => {
    try {
      setLoading(true);
      const data = await workdayService.getAll();
      if (data.length === 0) {
        // Fallback for initial load if DB is empty but migration hasn't run or table is empty
        // In a real scenario, the migration seeds this.
        console.warn('No workdays found in DB');
      }
      setWorkDays(data);
    } catch (error) {
      console.error('Failed to load workdays:', error);
      setMessage({ type: 'error', text: 'Failed to load workday settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setWorkDays(prev => prev.map(day => 
      day.id === id ? { ...day, is_active: !day.is_active } : day
    ));
  };

  const handleHoursChange = (id: string, hours: number) => {
    setWorkDays(prev => prev.map(day => 
      day.id === id ? { ...day, hours } : day
    ));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await workdayService.updateAll(workDays);
      setMessage({ type: 'success', text: 'Workday settings saved successfully' });
    } catch (error) {
      console.error('Failed to save workdays:', error);
      setMessage({ type: 'error', text: 'Failed to save changes' });
    } finally {
      setSaving(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Workday Settings</h1>
          <p className="text-gray-500">Define the standard working week for leave calculation.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50"
        >
          {saving && <Loader2 className="animate-spin w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Weekly Schedule</h2>
          <div className="space-y-4">
            {workDays.map((day) => (
              <div key={day.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input
                      type="checkbox"
                      name={`toggle-${day.day_name}`}
                      id={`toggle-${day.day_name}`}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                      checked={day.is_active}
                      onChange={() => handleToggle(day.id)}
                    />
                    <label 
                      htmlFor={`toggle-${day.day_name}`} 
                      className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${day.is_active ? 'bg-blue-500' : 'bg-gray-300'}`}
                    ></label>
                  </div>
                  <span className="capitalize font-medium text-gray-700 w-24">{day.day_name}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Hours:</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.1"
                      disabled={!day.is_active}
                      value={day.hours}
                      onChange={(e) => handleHoursChange(day.id, parseFloat(e.target.value))}
                      className="w-20 border border-gray-300 rounded-md px-2 py-1 text-center disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
            <strong>Note:</strong> Total standard weekly hours: {workDays.reduce((acc, curr) => acc + (curr.is_active ? curr.hours : 0), 0).toFixed(1)} hours.
          </div>
        </div>
      </div>
    </div>
  );
}
