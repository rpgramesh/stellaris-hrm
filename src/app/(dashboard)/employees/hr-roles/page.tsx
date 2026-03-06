'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { roleBasedAccessService } from '@/services/roleBasedAccessService';

type RoleRow = {
  id: string;
  name: string;
  description: string;
  permissions: string[] | null;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permCount?: number;
};

type Permission = {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
};

const PROTECTED_ROLES = new Set([
  'Super Admin',
  'Administrator',
  'HR Admin',
  'HR Manager',
  'Manager',
  'Employee'
]);

export default function HRRolesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'description' | 'permCount' | 'created_at' | 'is_active'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formSelectedPerms, setFormSelectedPerms] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const [rolesData, permsData] = await Promise.all([
          roleBasedAccessService.getRoles(),
          roleBasedAccessService.getPermissions()
        ]);

        // Aggregate permission counts per role from role_permissions
        const { data: rolePermRows } = await supabase
          .from('role_permissions')
          .select('role_id');
        const countsByRole: Record<string, number> = {};
        (rolePermRows || []).forEach((r: any) => {
          countsByRole[r.role_id] = (countsByRole[r.role_id] || 0) + 1;
        });

        const withCounts: RoleRow[] = rolesData.map((r: any) => ({
          ...r,
          permCount: countsByRole[r.id] || (Array.isArray(r.permissions) ? r.permissions.length : 0)
        }));

        setRoles(withCounts);
        setPermissions(permsData as any);
      } catch (e: any) {
        setError(e?.message || 'Failed to load roles');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredSorted = useMemo(() => {
    let data = [...roles];
    if (search.trim()) {
      const t = search.toLowerCase();
      data = data.filter(r => r.name.toLowerCase().includes(t) || (r.description || '').toLowerCase().includes(t));
    }
    if (statusFilter !== 'All') {
      const active = statusFilter === 'Active';
      data = data.filter(r => !!r.is_active === active);
    }
    data.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'permCount') {
        return ((a.permCount || 0) - (b.permCount || 0)) * dir;
      }
      if (sortBy === 'created_at') {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
      if (sortBy === 'is_active') {
        return ((a.is_active ? 1 : 0) - (b.is_active ? 1 : 0)) * dir;
      }
      const av = (a[sortBy] as any || '').toString().toLowerCase();
      const bv = (b[sortBy] as any || '').toString().toLowerCase();
      return av.localeCompare(bv) * dir;
    });
    return data;
  }, [roles, search, statusFilter, sortBy, sortDir]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, page, pageSize]);

  const openAdd = () => {
    setEditId(null);
    setFormName('');
    setFormDescription('');
    setFormStatus('Active');
    setFormSelectedPerms([]);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = async (role: RoleRow) => {
    setEditId(role.id);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormStatus(role.is_active ? 'Active' : 'Inactive');
    setFormError(null);
    // Load current role permissions
    try {
      const curPerms = await roleBasedAccessService.getPermissionsByRole(role.id);
      setFormSelectedPerms(curPerms.map(p => p.id));
    } catch {
      setFormSelectedPerms([]);
    }
    setShowModal(true);
  };

  const saveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Role name is required');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editId) {
        const updated = await roleBasedAccessService.updateRole(editId, {
          name: formName.trim(),
          description: formDescription.trim(),
          is_active: formStatus === 'Active'
        } as any);
        // Sync role_permissions: remove extras and add missing
        const existing = await roleBasedAccessService.getPermissionsByRole(editId);
        const existingIds = new Set(existing.map(p => p.id));
        const desired = new Set(formSelectedPerms);
        for (const pid of existingIds) {
          if (!desired.has(pid)) {
            await roleBasedAccessService.removePermissionFromRole(editId, pid);
          }
        }
        for (const pid of desired) {
          if (!existingIds.has(pid)) {
            await roleBasedAccessService.assignPermissionToRole(editId, pid);
          }
        }
        setRoles(prev => prev.map(r => r.id === updated.id ? { ...r, name: updated.name, description: updated.description, is_active: updated.is_active } : r));
        setNotice('Role updated successfully');
      } else {
        const created = await roleBasedAccessService.createRole({
          name: formName.trim(),
          description: formDescription.trim(),
          permissions: [],
          level: 100,
          is_active: formStatus === 'Active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          id: '' as any
        } as any);
        for (const pid of formSelectedPerms) {
          await roleBasedAccessService.assignPermissionToRole(created.id, pid);
        }
        setRoles(prev => [{ ...created, permCount: formSelectedPerms.length }, ...prev]);
        setNotice('Role created successfully');
      }
      setShowModal(false);
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (role: RoleRow) => {
    if (PROTECTED_ROLES.has(role.name)) {
      setNotice('This role is protected and cannot be deleted.');
      setTimeout(() => setNotice(null), 3000);
      return;
    }
    setDeleteId(role.id);
  };

  const doDelete = async () => {
    if (!deleteId) return;
    try {
      await roleBasedAccessService.deleteRole(deleteId);
      setRoles(prev => prev.map(r => r.id === deleteId ? { ...r, is_active: false } : r));
      setNotice('Role deactivated successfully');
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      setNotice(e?.message || 'Failed to delete role');
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setDeleteId(null);
    }
  };

  const canManage = useMemo(() => {
    // Leverage current user role from user_roles -> handled by AccessGuard at route level,
    // but we add an extra client-side gate by simple role name fetched earlier from roles if needed.
    // For simplicity, assume AccessGuard enforces. Additional controls can be added here.
    return true;
  }, []);

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          <h1 className="text-lg font-semibold mb-2">Access Denied</h1>
          <p className="text-sm">You do not have permission to manage roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-sm text-gray-500">Create, update, and manage role permissions</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Add Role
        </button>
      </div>

      {notice && (
        <div className="px-4 py-2 rounded-md bg-green-50 text-green-700 border border-green-200 text-sm">
          {notice}
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by role or description"
              className="px-3 py-2 border rounded-md w-64"
            />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
              className="px-3 py-2 border rounded-md"
            >
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
          <div className="flex gap-2">
            <label className="text-sm text-gray-600 self-center">Sort by</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="name">Role</option>
              <option value="description">Description</option>
              <option value="permCount">Permissions</option>
              <option value="created_at">Created</option>
              <option value="is_active">Status</option>
            </select>
            <select
              value={sortDir}
              onChange={e => setSortDir(e.target.value as any)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Role Name</th>
                <th className="text-left px-3 py-2 border-b">Description</th>
                <th className="text-left px-3 py-2 border-b">Permissions</th>
                <th className="text-left px-3 py-2 border-b">Created</th>
                <th className="text-left px-3 py-2 border-b">Status</th>
                <th className="text-right px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">Loading...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-red-600">{error}</td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">No roles found</td>
                </tr>
              ) : (
                pageData.map(role => (
                  <tr key={role.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{role.name}</td>
                    <td className="px-3 py-2 text-gray-700">{role.description || '-'}</td>
                    <td className="px-3 py-2">{role.permCount ?? 0}</td>
                    <td className="px-3 py-2">{new Date(role.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${role.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {role.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => openEdit(role)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => confirmDelete(role)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-gray-500">
            Total: {filteredSorted.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
            >
              Prev
            </button>
            <span className="text-sm">Page {page}</span>
            <button
              onClick={() => setPage(p => (p * pageSize < filteredSorted.length ? p + 1 : p))}
              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
            >
              Next
            </button>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1 border rounded"
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">{editId ? 'Edit Role' : 'Add Role'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={saveRole} className="p-6 space-y-4">
              {formError && (
                <div className="px-3 py-2 rounded bg-red-50 text-red-700 border border-red-200 text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permissions</label>
                <div className="border rounded-md p-2 max-h-56 overflow-y-auto">
                  {permissions.map(p => {
                    const checked = formSelectedPerms.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-start gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setFormSelectedPerms(prev => checked ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                          }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.resource}:{p.action} — {p.description}</div>
                        </div>
                      </label>
                    );
                  })}
                  {permissions.length === 0 && (
                    <div className="text-sm text-gray-500">No permissions defined.</div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Confirm Delete</h3>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-700">
                This will deactivate the role. Existing users with this role may lose access controlled by this role. Continue?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={doDelete}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
