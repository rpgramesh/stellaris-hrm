"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { roleBasedAccessService, UserRole } from '@/services/roleBasedAccessService';
import { menuItems } from '@/components/Sidebar';
import { emailService } from '@/services/emailService';
import { menuConfigurationService, MenuItemConfig } from '@/services/menuConfigurationService';
import { Employee } from '@/types';
import { Mail, Plus, Pencil, Trash2, X, Check, Play, History, ChevronRight, ShieldCheck, LayoutDashboard, Settings as SettingsIcon, Type, Loader2 } from 'lucide-react';
import { settingsService } from '@/services/settingsService';
import Link from 'next/link';

type RoleMenuState = {
  [roleId: string]: string[];
};

type ActiveTab = 'company' | 'menu' | 'email';

const getFallbackMenuKeysForRole = (roleName: string): string[] => {
  if (['Super Admin', 'Administrator'].includes(roleName)) {
    return menuItems.map(item => item.key || '');
  }
  if (roleName === 'Employee') {
    const allowed = ['dashboard', 'self_service_ess'];
    return menuItems
      .filter(item => allowed.includes(item.key || ''))
      .map(item => item.key || '');
  }

  if (roleName === 'Manager') {
    const allowed = ['dashboard', 'team', 'leave'];
    return menuItems
      .filter(item => allowed.includes(item.key || ''))
      .map(item => item.key || '');
  }

  if (['HR Admin', 'HR Manager'].includes(roleName)) {
    return menuItems
      .filter(item => item.key !== 'settings' && item.key !== 'self_service_ess')
      .map(item => item.key || '');
  }

  return menuItems
    .filter(item => item.key !== 'self_service_ess')
    .map(item => item.key || '');
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

  // Company Settings state
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('AUD ($)');
  const [timezone, setTimezone] = useState('Australia/Sydney');
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Menu Label state
  const [menuLabelConfigs, setMenuLabelConfigs] = useState<MenuItemConfig[]>([]);
  const [editingLabels, setEditingLabels] = useState<Record<string, string>>({});
  const [savingLabels, setSavingLabels] = useState<string | null>(null);

  const menuConfig = useMemo(
    () =>
      menuItems.map(item => ({
        key: item.key || '',
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

  useEffect(() => {
    if (activeTab !== 'company') return;
    const loadCompany = async () => {
      setLoadingCompany(true);
      setCompanyError(null);
      try {
        const s = await settingsService.get();
        if (s) {
          setCompanyName(s.companyName || '');
          setTaxId(s.taxId || '');
          setCompanyAddress(s.companyAddress || '');
          if (s.currency) setDefaultCurrency(s.currency);
          if (s.timeZone) setTimezone(s.timeZone);
        }
      } catch (e: any) {
        setCompanyError(e?.message || 'Failed to load settings');
      } finally {
        setLoadingCompany(false);
      }
    };
    loadCompany();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'menu') return;
    const loadMenuConfigs = async () => {
      try {
        const configs = await menuConfigurationService.getAll();
        setMenuLabelConfigs(configs);
        
        // Initialize editing labels with either custom names or defaults from menuItems
        const initialLabels: Record<string, string> = {};
        menuConfig.forEach(m => {
          const config = configs.find(c => c.menu_key === m.key);
          initialLabels[m.key] = config ? config.display_name : m.name;
        });
        setEditingLabels(initialLabels);
      } catch (err) {
        console.error('Error loading menu configs:', err);
      }
    };
    loadMenuConfigs();
  }, [activeTab, menuConfig]);

  const handleCompanySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCompanyError(null);
    try {
      if (!companyName.trim()) {
        setCompanyError('Company name is required');
        setLoading(false);
        return;
      }
      await settingsService.update({
        companyName,
        taxId,
        companyAddress,
        currency: defaultCurrency,
        timeZone: timezone
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setCompanyError(e?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSaveMenuLabel = async (menuKey: string) => {
    const newName = editingLabels[menuKey];
    if (!newName || !newName.trim()) return;

    setSavingLabels(menuKey);
    try {
      const result = await menuConfigurationService.update(menuKey, newName.trim());
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        // Refresh local configs
        const configs = await menuConfigurationService.getAll();
        setMenuLabelConfigs(configs);
      } else {
        alert(result.error || 'Failed to update menu label');
      }
    } catch (err: any) {
      alert(err.message || 'An unexpected error occurred');
    } finally {
      setSavingLabels(null);
    }
  };

  const renderCompanySettings = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Company Profile</h2>
        <p className="text-sm text-gray-500">Manage your company's information and preferences.</p>
      </div>
      <form onSubmit={handleCompanySave} className="p-6 space-y-6">
        {companyError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
            {companyError}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              disabled={loadingCompany}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tax ID / ABN</label>
            <input
              type="text"
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
              disabled={loadingCompany}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              rows={3}
              value={companyAddress}
              onChange={e => setCompanyAddress(e.target.value)}
              disabled={loadingCompany}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Default Currency</label>
            <select
              value={defaultCurrency}
              onChange={e => setDefaultCurrency(e.target.value)}
              disabled={loadingCompany}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="AUD ($)">AUD ($)</option>
              <option value="USD ($)">USD ($)</option>
              <option value="EUR (€)">EUR (€)</option>
              <option value="GBP (£)">GBP (£)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Timezone</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              disabled={loadingCompany}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Australia/Sydney">Australia/Sydney</option>
              <option value="Australia/Melbourne">Australia/Melbourne</option>
              <option value="Australia/Brisbane">Australia/Brisbane</option>
              <option value="Australia/Perth">Australia/Perth</option>
            </select>
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
    <div className="space-y-8">
      {/* Menu Label Customization Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Type className="h-5 w-5 text-blue-600" />
            Menu Display Names
          </h2>
          <p className="text-sm text-gray-500">
            Customize how menu items appear in the sidebar. Changes apply system-wide.
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuConfig.map(menu => {
              const config = menuLabelConfigs.find(c => c.menu_key === menu.key);
              const isDefault = !config || config.display_name === menu.name;
              
              return (
                <div key={menu.key} className="space-y-2 p-4 rounded-xl border border-gray-100 hover:border-blue-100 transition-all bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {menu.name} (Default)
                    </label>
                    {!isDefault && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full uppercase">
                        Customized
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingLabels[menu.key] || ''}
                      onChange={e => setEditingLabels(prev => ({ ...prev, [menu.key]: e.target.value }))}
                      className="flex-1 min-w-0 rounded-lg border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 p-2 border bg-white"
                      placeholder={`Enter new name for ${menu.name}`}
                    />
                    <button
                      onClick={() => handleSaveMenuLabel(menu.key)}
                      disabled={savingLabels === menu.key || editingLabels[menu.key] === (config?.display_name || menu.name)}
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      title="Save Name"
                    >
                      {savingLabels === menu.key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    URL: <code className="bg-gray-100 px-1 rounded">{menu.href}</code>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Existing Role-Based Menu Access Section */}
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
    </div>
  );

  const renderEmailSettings = () => {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            Email Communication Settings
          </h2>
          <p className="mt-1 text-gray-500">
            Configure system-wide email behavior, templates, and track communication history.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link 
            href="/settings/email/templates"
            className="group relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 bg-blue-50 group-hover:bg-blue-100 transition-colors rounded-bl-2xl">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                Template Configuration
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Assign specific email templates to different system events like welcome emails, payslips, and notifications.
              </p>
              <div className="pt-4 flex items-center text-sm font-semibold text-blue-600">
                Configure Templates
                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link 
            href="/settings/email/audit"
            className="group relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 bg-gray-50 group-hover:bg-gray-100 transition-colors rounded-bl-2xl">
              <History className="h-6 w-6 text-gray-600" />
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                Communication Audit Log
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Review a complete history of all emails sent by the system, including delivery status, recipients, and error logs.
              </p>
              <div className="pt-4 flex items-center text-sm font-semibold text-blue-600">
                View Audit Log
                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <div className="flex gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-blue-900">Enterprise Security & Compliance</h4>
              <p className="mt-1 text-blue-800 text-sm leading-relaxed max-w-2xl">
                Our email delivery system ensures all communications are encrypted and logged for compliance purposes. 
                You can audit any email sent by your organization to ensure proper communication standards are met.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium ${
              activeTab === 'email'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Email Templates
          </button>
        </nav>
      </div>
      {activeTab === 'company' && renderCompanySettings()}
      {activeTab === 'menu' && renderMenuSettings()}
      {activeTab === 'email' && renderEmailSettings()}
    </div>
  );
}
