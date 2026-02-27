"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { roleBasedAccessService, UserRole } from '@/services/roleBasedAccessService';
import { menuItems } from '@/components/Sidebar';
import { emailTemplateService, EmailTemplate } from '@/services/emailTemplateService';
import { employeeService } from '@/services/employeeService';
import { emailService } from '@/services/emailService';
import { Employee } from '@/types';
import { Mail, Plus, Pencil, Trash2, X, Check, Play } from 'lucide-react';

type RoleMenuState = {
  [roleId: string]: string[];
};

type ActiveTab = 'company' | 'menu' | 'email';

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

  // Email Templates State
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [variablesInput, setVariablesInput] = useState('');
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  // Test Email State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testTemplate, setTestTemplate] = useState<EmailTemplate | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [isTestSending, setIsTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
    if (activeTab !== 'email') return;
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      setError(null);
      try {
        const data = await emailTemplateService.getAll();
        setEmailTemplates(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load email templates');
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'email') return;
    const loadEmployees = async () => {
      try {
        const data = await employeeService.getAll();
        setEmployees(data);
      } catch (err) {
        console.error('Failed to load employees for email test:', err);
      }
    };
    loadEmployees();
  }, [activeTab]);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editingTemplate.name || !editingTemplate.subject || !editingTemplate.body) return;

    setLoadingTemplates(true);
    setError(null);
    try {
      const payload = {
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        body: editingTemplate.body,
        category: editingTemplate.category || 'General',
        variables: editingTemplate.variables || []
      };

      if (isAddingTemplate) {
        const newTemplate = await emailTemplateService.create(payload);
        setEmailTemplates(prev => [...prev, newTemplate]);
      } else if (editingTemplate.id) {
        const updated = await emailTemplateService.update(editingTemplate.id, payload);
        setEmailTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
      }
      setEditingTemplate(null);
      setIsAddingTemplate(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    setLoadingTemplates(true);
    setError(null);
    try {
      await emailTemplateService.delete(id);
      setEmailTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testTemplate || !selectedEmployeeId) return;

    setIsTestSending(true);
    setTestResult(null);

    try {
      const employee = employees.find(e => e.id === selectedEmployeeId);
      if (!employee) throw new Error('Selected employee not found');

      // Add some generic mock data for variables that might be in templates
      const mockCustomVariables = {
        resetLink: 'https://stellaris-hrm.com/reset-password?token=test-token',
        period: 'January 2024',
        documentType: 'Passport',
        startDate: '2024-01-01',
        endDate: '2024-01-10',
        reason: 'Personal leave',
        reviewDate: '2024-02-15',
        policyName: 'Work from Home Policy',
        exitDate: '2024-12-31',
        interviewDate: '2024-03-01 10:00 AM',
        jobTitle: 'Senior Developer',
        salary: '$120,000'
      };

      const success = await emailService.sendTestEmail(testTemplate.name, employee, mockCustomVariables);
      
      if (success) {
        setTestResult({ success: true, message: `Test email sent successfully to ${employee.email}` });
      } else {
        throw new Error('Failed to send test email');
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'An error occurred while sending test email' });
    } finally {
      setIsTestSending(false);
    }
  };

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

  const renderEmailSettings = () => {
    const filteredTemplates = emailTemplates.filter(t =>
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(templateSearch.toLowerCase())
    );

    return (
      <div className="bg-white rounded-lg shadow min-h-[600px]">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Email Template Management</h2>
            <p className="text-sm text-gray-500">Configure and customize system-generated emails.</p>
          </div>
          <button
            onClick={() => {
              setEditingTemplate({
                name: '',
                subject: '',
                body: '',
                category: 'General',
                variables: []
              });
              setVariablesInput('');
              setIsAddingTemplate(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Template
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 relative">
            <input
              type="text"
              placeholder="Search templates by name or category..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>

          {loadingTemplates ? (
            <div className="text-center py-12 text-gray-500">Loading templates...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {template.category}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setTestTemplate(template);
                          setIsTestModalOpen(true);
                          setTestResult(null);
                        }}
                        title="Test Template"
                        className="p-1 text-gray-400 hover:text-green-600"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingTemplate(template);
                          setVariablesInput(template.variables.join(', '));
                          setIsAddingTemplate(false);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1 mb-3">{template.subject}</p>
                  <div className="text-xs text-gray-400">
                    Variables: {template.variables.join(', ') || 'None'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {editingTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-lg font-semibold text-gray-800">
                  {isAddingTemplate ? 'Create New Template' : `Edit Template: ${editingTemplate.name}`}
                </h3>
                <button onClick={() => { setEditingTemplate(null); setVariablesInput(''); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.name || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    placeholder="e.g., Welcome Email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      required
                      value={editingTemplate.category || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                      placeholder="e.g., Onboarding"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Variables (comma separated)</label>
                    <input
                      type="text"
                      value={variablesInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVariablesInput(val);
                        setEditingTemplate({
                          ...editingTemplate,
                          variables: val.split(',').map(v => v.trim()).filter(v => v)
                        });
                      }}
                      placeholder="e.g., fullName, username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.subject || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                  <textarea
                    required
                    rows={8}
                    value={editingTemplate.body || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    placeholder="Use {{variableName}} for dynamic content"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
                <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setEditingTemplate(null); setVariablesInput(''); }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-semibold"
                  >
                    <Check className="w-4 h-4" />
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isTestModalOpen && testTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Test Email: {testTemplate.name}</h3>
                <button 
                  onClick={() => {
                    setIsTestModalOpen(false);
                    setTestTemplate(null);
                    setTestResult(null);
                    setSelectedEmployeeId('');
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  Select an employee to send a test email using this template. 
                  Dynamic variables like <code className="bg-gray-100 px-1 rounded">{"{{fullName}}"}</code> will be automatically replaced with the employee's data.
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Choose an employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-md text-sm ${testResult.success ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {testResult.message}
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTestModalOpen(false);
                      setTestTemplate(null);
                      setTestResult(null);
                      setSelectedEmployeeId('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSendTestEmail}
                    disabled={!selectedEmployeeId || isTestSending}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTestSending ? 'Sending...' : (
                      <>
                        <Play className="w-4 h-4" />
                        Send Test Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
