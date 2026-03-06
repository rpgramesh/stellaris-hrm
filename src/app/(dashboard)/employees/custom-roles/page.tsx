'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { roleBasedAccessService } from '@/services/roleBasedAccessService';
import { menuItems } from '@/components/Sidebar';

type RoleType = 'Admin' | 'User' | 'Custom';

type RoleRow = {
  id: string;
  name: string;
  description: string;
  permissions: string[] | null;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const toKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
const menuToken = (key: string) => `menu:${key}`;
const crudToken = (key: string, op: 'create' | 'read' | 'update' | 'delete') => `perm:${key}:${op}`;

export default function CustomRolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleType, setRoleType] = useState<RoleType>('Custom');
  const [isActive, setIsActive] = useState(true);

  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedMenus, setSelectedMenus] = useState<Set<string>>(new Set());
  const [crud, setCrud] = useState<Record<string, Set<'create' | 'read' | 'update' | 'delete'>>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const rs = await roleBasedAccessService.getRoles();
        setRoles(rs as any);
      } catch (e: any) {
        setError(e?.message || 'Failed to load roles');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const allMenus = useMemo(() => {
    return menuItems.map(cat => {
      const catKey = toKey(cat.name);
      const children = (cat.subItems || [])
        .filter((si: any) => !!si && !!si.href && !!si.name)
        .map((si: any) => {
          const nm = String(si.name);
          return {
            name: nm,
            key: toKey(nm),
            href: String(si.href)
          };
        });
      return {
        name: cat.name,
        key: catKey,
        href: cat.href,
        children
      };
    });
  }, []);

  const filteredMenus = useMemo(() => {
    if (!search.trim()) return allMenus;
    const t = search.toLowerCase();
    return allMenus
      .map(cat => {
        const matchesCat = cat.name.toLowerCase().includes(t);
        const children = cat.children.filter(ch => ch.name.toLowerCase().includes(t));
        if (matchesCat) return cat;
        return children.length ? { ...cat, children } : null;
      })
      .filter(Boolean) as typeof allMenus;
  }, [allMenus, search]);

  const loadForEdit = async (roleId: string) => {
    setSelectedRoleId(roleId);
    const r = roles.find(x => x.id === roleId);
    if (!r) return;
    setRoleName(r.name);
    setRoleDesc(r.description || '');
    setIsActive(!!r.is_active);
    setRoleType('Custom');
    const tokens = r.permissions || [];
    const nextSelected = new Set<string>();
    const nextCrud: Record<string, Set<'create' | 'read' | 'update' | 'delete'>> = {};
    tokens.forEach(tok => {
      if (tok.startsWith('menu:')) {
        nextSelected.add(tok.replace('menu:', ''));
      }
      if (tok.startsWith('perm:')) {
        const parts = tok.split(':');
        const key = parts[1];
        const op = parts[2] as any;
        if (!nextCrud[key]) nextCrud[key] = new Set();
        nextCrud[key].add(op);
      }
    });
    setSelectedMenus(nextSelected);
    setCrud(nextCrud);
  };

  const resetForm = () => {
    setSelectedRoleId(null);
    setRoleName('');
    setRoleDesc('');
    setRoleType('Custom');
    setIsActive(true);
    setSelectedMenus(new Set());
    setCrud({});
    setError(null);
  };

  const toggleMenu = (key: string, checked: boolean) => {
    setSelectedMenus(prev => {
      const next = new Set(prev);
      if (checked) next.add(key); else next.delete(key);
      return next;
    });
  };

  const toggleCrud = (key: string, op: 'create' | 'read' | 'update' | 'delete', checked: boolean) => {
    setCrud(prev => {
      const set = new Set(prev[key] || []);
      if (checked) set.add(op); else set.delete(op);
      return { ...prev, [key]: set };
    });
  };

  const bulkCategory = (catKey: string, select: boolean) => {
    const cat = allMenus.find(c => c.key === catKey);
    if (!cat) return;
    const keys = [cat.key, ...cat.children.map(c => c.key)];
    setSelectedMenus(prev => {
      const next = new Set(prev);
      keys.forEach(k => select ? next.add(k) : next.delete(k));
      return next;
    });
  };

  const previewTree = useMemo(() => {
    return allMenus
      .map(cat => {
        const items = [
          ...(selectedMenus.has(cat.key) ? [{ name: cat.name, key: cat.key }] : []),
          ...cat.children.filter(ch => selectedMenus.has(ch.key)).map(ch => ({ name: ch.name, key: ch.key }))
        ];
        return items.length ? { cat: cat.name, items } : null;
      })
      .filter(Boolean) as Array<{ cat: string; items: Array<{ name: string; key: string }> }>;
  }, [allMenus, selectedMenus]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!roleName.trim()) throw new Error('Role name is required');
      if (selectedMenus.size === 0) throw new Error('Select at least one menu item');
      const menuTokens = Array.from(selectedMenus).map(k => menuToken(k));
      const crudTokens: string[] = [];
      Object.keys(crud).forEach(key => {
        const ops = crud[key];
        if (!ops) return;
        ops.forEach(op => crudTokens.push(crudToken(key, op)));
      });
      const typeToken = `role_type:${roleType.toLowerCase()}`;
      const finalTokens = [typeToken, ...menuTokens, ...crudTokens];
      if (selectedRoleId) {
        const r = roles.find(x => x.id === selectedRoleId);
        const other = (r?.permissions || []).filter(t => !t.startsWith('menu:') && !t.startsWith('perm:') && !t.startsWith('role_type:'));
        const next = Array.from(new Set([...other, ...finalTokens]));
        const updated = await roleBasedAccessService.updateRole(selectedRoleId, {
          name: roleName.trim(),
          description: roleDesc.trim(),
          is_active: isActive,
          permissions: next
        } as any);
        setRoles(prev => prev.map(x => x.id === updated.id ? { ...x, name: updated.name, description: updated.description, is_active: updated.is_active, permissions: next } : x));
        setNotice('Role updated successfully');
      } else {
        const created = await roleBasedAccessService.createRole({
          name: roleName.trim(),
          description: roleDesc.trim(),
          permissions: finalTokens,
          level: roleType === 'Admin' ? 0 : roleType === 'User' ? 50 : 100,
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          id: '' as any
        } as any);
        const fresh = await roleBasedAccessService.getRoles();
        setRoles(fresh as any);
        setSelectedRoleId(created.id);
        setNotice('Role created successfully');
      }
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      setError(e?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role & Menu Configuration</h1>
          <p className="text-sm text-gray-500">Create roles and assign menu permissions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetForm} className="px-3 py-2 border rounded-md hover:bg-gray-50">New Role</button>
          <select
            value={selectedRoleId || ''}
            onChange={e => e.target.value ? loadForEdit(e.target.value) : resetForm()}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">Select existing role</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name} {r.is_active ? '' : '(inactive)'}</option>
            ))}
          </select>
        </div>
      </div>

      {notice && <div className="px-4 py-2 rounded-md bg-green-50 text-green-700 border border-green-200 text-sm">{notice}</div>}
      {error && <div className="px-4 py-2 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
            <input value={roleName} onChange={e => setRoleName(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={roleDesc} onChange={e => setRoleDesc(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Type</label>
              <select value={roleType} onChange={e => setRoleType(e.target.value as RoleType)} className="w-full px-3 py-2 border rounded-md">
                <option>Admin</option>
                <option>User</option>
                <option>Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-4 py-2 rounded-md ${isActive ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Role'}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-md border hover:bg-gray-50">Cancel</button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <input
              placeholder="Search menu items"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3 py-2 border rounded-md w-72"
            />
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Menu</th>
                  <th className="text-center px-3 py-2 border-b">Create</th>
                  <th className="text-center px-3 py-2 border-b">Read</th>
                  <th className="text-center px-3 py-2 border-b">Update</th>
                  <th className="text-center px-3 py-2 border-b">Delete</th>
                  <th className="text-right px-3 py-2 border-b">Bulk</th>
                </tr>
              </thead>
              <tbody>
                {filteredMenus.map(cat => {
                  const catChecked = selectedMenus.has(cat.key);
                  const ops = crud[cat.key] || new Set();
                  return (
                    <tr key={cat.key} className="border-b align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <input type="checkbox" checked={catChecked} onChange={e => toggleMenu(cat.key, e.target.checked)} />
                          {cat.name}
                        </div>
                        {cat.children.length > 0 && (
                          <div className="pl-6 mt-2 space-y-1">
                            {cat.children.map(ch => {
                              const k = ch.key;
                              const checked = selectedMenus.has(k);
                              const cOps = crud[k] || new Set();
                              return (
                                <div key={k} className="flex items-center justify-between">
                                  <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={checked} onChange={e => toggleMenu(k, e.target.checked)} />
                                    <span>{ch.name}</span>
                                  </label>
                                  <div className="flex items-center gap-3">
                                    <input type="checkbox" checked={cOps.has('create')} onChange={e => toggleCrud(k, 'create', e.target.checked)} />
                                    <input type="checkbox" checked={cOps.has('read')} onChange={e => toggleCrud(k, 'read', e.target.checked)} />
                                    <input type="checkbox" checked={cOps.has('update')} onChange={e => toggleCrud(k, 'update', e.target.checked)} />
                                    <input type="checkbox" checked={cOps.has('delete')} onChange={e => toggleCrud(k, 'delete', e.target.checked)} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={ops.has('create')} onChange={e => toggleCrud(cat.key, 'create', e.target.checked)} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={ops.has('read')} onChange={e => toggleCrud(cat.key, 'read', e.target.checked)} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={ops.has('update')} onChange={e => toggleCrud(cat.key, 'update', e.target.checked)} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={ops.has('delete')} onChange={e => toggleCrud(cat.key, 'delete', e.target.checked)} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <button onClick={() => bulkCategory(cat.key, true)} className="px-2 py-1 rounded border text-xs hover:bg-gray-50">Select All</button>
                          <button onClick={() => bulkCategory(cat.key, false)} className="px-2 py-1 rounded border text-xs hover:bg-gray-50">Clear</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Preview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {previewTree.map(group => (
            <div key={group.cat} className="border rounded-md p-3">
              <div className="font-medium mb-2">{group.cat}</div>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {group.items.map(item => (
                  <li key={item.key}>{item.name}</li>
                ))}
              </ul>
            </div>
          ))}
          {previewTree.length === 0 && (
            <div className="text-sm text-gray-500">No menu items selected</div>
          )}
        </div>
      </div>
    </div>
  );
}
