"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { roleBasedAccessService, UserRole } from '@/services/roleBasedAccessService';
import { menuItems } from '@/components/Sidebar';

type RoleMenuState = {
  [roleId: string]: string[];
};

type ActiveTab = 'company' | 'menu';

const toMenuKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

const getFallbackMenuKeysForRole = (roleName: string): string[] => {
  if (roleName === 'Employee') {
    const allowed = ['Dashboard', 'Self Service (ESS)'];
    return menuItems
      .filter(item => allowed.includes(item.name))
      .map(item => toMenuKey(item.name));
  }

  if (roleName === 'Manager') {
    const allowed = ['Dashboard', 'Team', 'Leave'];
    return menuItems
      .filter(item => allowed.includes(item.name))
      .map(item => toMenuKey(item.name));
  }

  if (['HR Admin', 'HR Manager'].includes(roleName)) {
    return menuItems
      .filter(item => item.name !== 'Settings' && item.name !== 'Self Service (ESS)')
      .map(item => toMenuKey(item.name));
  }

  return menuItems
    .filter(item => item.name !== 'Self Service (ESS)')
    .map(item => toMenuKey(item.name));
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('company');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleMenuState, setRoleMenuState] = useState<RoleMenuState>({});
  const [savingMenu, setSavingMenu] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (activeTab !== 'menu') return;
    const loadRoles = async () => {
      setError(null);
      try {
        const loadedRoles = await roleBasedAccessService.getRoles();
        setRoles(loadedRoles);
        if (!selectedRoleId && loadedRoles.length > 0) {
          setSelectedRoleId(loadedRoles[0].id);
        }
        const menuState: RoleMenuState = {};
        for (const role of loadedRoles) {
          const menuPermissions = await roleBasedAccessService.getRoleMenuPermissions(role.id);
          const keys = menuPermissions.map(p => p.replace('menu:', ''));
          if (keys.length > 0) {
            menuState[role.id] = keys;
          } else {
            menuState[role.id] = getFallbackMenuKeysForRole(role.name);
          }
        }
        setRoleMenuState(menuState);
      } catch (err: any) {
        setError(err.message || 'Failed to load roles');
      }
    };
    loadRoles();
  }, [activeTab, selectedRoleId]);

  const handleCompanySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const menuConfig = useMemo(
    () =>
      menuItems.map(item => ({
        key: toMenuKey(item.name),
        name: item.name,
        href: item.href
      })),
    []
  );

  const filteredMenuConfig = useMemo(() => {
    if (!menuSearch.trim()) return menuConfig;
    const term = menuSearch.toLowerCase();
    return menuConfig.filter(
      m => m.name.toLowerCase().includes(term) || m.href.toLowerCase().includes(term)
    );
  }, [menuConfig, menuSearch]);

  const selectedRole = roles.find(r => r.id === selectedRoleId) || null;
  const selectedRoleMenuKeys = selectedRoleId ? roleMenuState[selectedRoleId] || [] : [];

  const toggleMenuForSelectedRole = (menuKey: string) => {
    if (!selectedRoleId) return;
    setRoleMenuState(prev => {
      const current = prev[selectedRoleId] || [];
      const exists = current.includes(menuKey);
      const next = exists ? current.filter(k => k !== menuKey) : [...current, menuKey];
      return { ...prev, [selectedRoleId]: next };
    });
  };

  const setAllMenusForSelectedRole = (enabled: boolean) => {
    if (!selectedRoleId) return;
    setRoleMenuState(prev => ({
      ...prev,
      [selectedRoleId]: enabled ? menuConfig.map(m => m.key) : []
    }));
  };

  const applyMenuToAllRoles = () => {
    if (!selectedRoleId) return;
    const sourceKeys = roleMenuState[selectedRoleId] || [];
    setRoleMenuState(prev => {
      const next: RoleMenuState = {};
      for (const role of roles) {
        next[role.id] = [...sourceKeys];
      }
      return next;
    });
  };

  const handleSaveMenu = async () => {
    if (!selectedRoleId || !selectedRole || !currentUserId) return;
    const confirmed = window.confirm(
      `Apply menu permission changes for role "${selectedRole.name}"?`
    );
    if (!confirmed) return;
    setSavingMenu(true);
    setError(null);
    try {
      const keys = roleMenuState[selectedRoleId] || [];
      await roleBasedAccessService.updateRoleMenuPermissions(
        selectedRoleId,
        keys,
        currentUserId
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save menu permissions');
    } finally {
      setSavingMenu(false);
    }
  };

  const renderCompanySettings = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Company Profile</h2>
        <p className="text-sm text-gray-500">Manage your company's information and preferences.</p>
      </div>
      <form onSubmit={handleCompanySave} className="p-6 space-y-6">
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
              <input
                id="email-notif"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="email-notif" className="ml-2 block text-sm text-gray-900">
                Email alerts for leave requests
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="payroll-notif"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
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
            className={`bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 transition-colors ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderMenuSettings = () => (
    <div className="bg-white rounded-lg shadow flex flex-col lg:flex-row">
      <div className="border-b lg:border-b-0 lg:border-r border-gray-200 w-full lg:w-1/3">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Role-Based Menu Access</h2>
            <p className="text-sm text-gray-500">
              Configure which menu items are visible for each role.
            </p>
          </div>
        </div>
        <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
          {roles.map(role => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRoleId(role.id)}
              className={`w-full text-left px-3 py-2 rounded-md border text-sm mb-1 ${
                selectedRoleId === role.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{role.name}</div>
              <div className="text-xs text-gray-500 truncate">{role.description}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="w-full lg:w-2/3 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedRole ? selectedRole.name : 'Select a role'}
            </h3>
            <p className="text-xs text-gray-500">
              Use the toggles to enable or disable individual menu items.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAllMenusForSelectedRole(true)}
              className="text-xs px-3 py-1 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600"
              disabled={!selectedRole}
            >
              Enable All
            </button>
            <button
              type="button"
              onClick={() => setAllMenusForSelectedRole(false)}
              className="text-xs px-3 py-1 rounded-full border border-gray-300 hover:border-red-500 hover:text-red-600"
              disabled={!selectedRole}
            >
              Disable All
            </button>
            <button
              type="button"
              onClick={applyMenuToAllRoles}
              className="text-xs px-3 py-1 rounded-full border border-gray-300 hover:border-purple-500 hover:text-purple-600"
              disabled={!selectedRole}
            >
              Copy To All Roles
            </button>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row flex-1">
          <div className="flex-1 border-b lg:border-b-0 lg:border-r border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                placeholder="Search menu items..."
                className="w-full mr-2 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {filteredMenuConfig.map(menu => {
                const enabled = selectedRoleMenuKeys.includes(menu.key);
                return (
                  <div
                    key={menu.key}
                    className="flex items-center justify-between px-3 py-2 rounded-md border border-gray-100 hover:border-gray-300"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">{menu.name}</div>
                      <div className="text-xs text-gray-500">{menu.href}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMenuForSelectedRole(menu.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        enabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                      disabled={!selectedRole}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-full lg:w-1/3 p-4 space-y-3">
            <div className="border-b border-gray-200 pb-2">
              <h4 className="text-sm font-semibold text-gray-900">Preview</h4>
              <p className="text-xs text-gray-500">
                This is how the sidebar will look for the selected role.
              </p>
            </div>
            <div className="bg-gray-900 text-white rounded-lg p-3 space-y-1 max-h-[320px] overflow-y-auto">
              {menuConfig
                .filter(menu => selectedRoleMenuKeys.includes(menu.key))
                .map(menu => (
                  <div
                    key={menu.key}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-800 text-sm"
                  >
                    <span>{menu.name}</span>
                  </div>
                ))}
              {!selectedRoleMenuKeys.length && (
                <div className="text-xs text-gray-400 px-3 py-2">
                  No menu items enabled for this role.
                </div>
              )}
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveMenu}
                disabled={!selectedRole || savingMenu || !currentUserId}
                className={`w-full px-4 py-2 rounded-md text-sm font-semibold ${
                  !selectedRole || savingMenu || !currentUserId
                    ? 'bg-blue-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {savingMenu ? 'Saving...' : 'Save Menu Permissions'}
              </button>
              {error && (
                <div className="mt-2 text-xs text-red-600 border border-red-200 bg-red-50 px-2 py-1 rounded">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        {saved && (
          <span className="bg-green-100 text-green-800 px-4 py-2 rounded-md text-sm font-medium animate-fade-in">
            Changes saved successfully
          </span>
        )}
      </div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium ${
              activeTab === 'company'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Company Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium ${
              activeTab === 'menu'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Role-Based Menu Configuration
          </button>
        </nav>
      </div>
      {activeTab === 'company' ? renderCompanySettings() : renderMenuSettings()}
    </div>
  );
}
