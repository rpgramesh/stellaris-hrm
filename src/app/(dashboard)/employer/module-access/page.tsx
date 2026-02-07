'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { Module } from '@/types';
import { moduleAccessService } from '@/services/moduleAccessService';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ModuleAccessPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const data = await moduleAccessService.getAll();
      setModules(data);
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (id: string, currentEnabled: boolean) => {
    // Optimistic update
    setModules(prev => prev.map(m => 
      m.id === id ? { ...m, enabled: !m.enabled } : m
    ));

    try {
      await moduleAccessService.updateStatus(id, !currentEnabled);
    } catch (error) {
      console.error('Error toggling module:', error);
      // Revert on error
      setModules(prev => prev.map(m => 
        m.id === id ? { ...m, enabled: currentEnabled } : m
      ));
    }
  };

  if (loading) {
    return <div className="p-4">Loading modules...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Module Access</h1>
        <p className="text-sm text-gray-500 mt-1">Enable or disable system modules for your organization</p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {modules.map((module) => (
            <li key={module.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-blue-600 truncate">{module.name}</p>
                  <p className="text-sm text-gray-500">{module.description}</p>
                </div>
                <div className="flex items-center">
                  <Switch
                    checked={module.enabled}
                    onChange={() => toggleModule(module.id, module.enabled)}
                    className={classNames(
                      module.enabled ? 'bg-blue-600' : 'bg-gray-200',
                      'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    )}
                  >
                    <span className="sr-only">Use setting</span>
                    <span
                      aria-hidden="true"
                      className={classNames(
                        module.enabled ? 'translate-x-5' : 'translate-x-0',
                        'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200'
                      )}
                    />
                  </Switch>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
