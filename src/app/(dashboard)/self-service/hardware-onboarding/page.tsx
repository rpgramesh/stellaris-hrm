'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { employeeService } from '@/services/employeeService';
import { hardwareOnboardingService } from '@/services/hardwareOnboardingService';
import type { Employee } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const HARDWARE_ONBOARDING_TAG = '[HARDWARE_ONBOARDING]';

type AssetType = 'Laptop' | 'Phone' | 'Monitor' | 'Other';
type HardwareStatus = 'Assigned' | 'Pending' | 'Returned' | 'In Repair';

interface ClientDetails {
  name: string;
  managerEmail: string;
}

interface HardwareAssetRow {
  id: string;
  assetTag: string;
  assetType: AssetType;
  serialNumber: string;
  model: string;
  status: HardwareStatus;
  assetId: string;
  selected: boolean;
  error?: string;
  inventoryInfo?: {
    found: boolean;
    model?: string;
    status?: string;
    assignedTo?: string;
  };
}

interface HardwareRemarkData {
  client?: ClientDetails;
  assets?: {
    assetTag: string;
    assetType: AssetType;
    serialNumber: string;
    model: string;
    status: HardwareStatus;
    assetId: string;
  }[];
}

const parseHardwareRemark = (remark?: string | null): HardwareRemarkData => {
  if (!remark) {
    return {};
  }
  const dataMatch = remark.match(/\[HARDWARE_DATA:([^\]]+)\]/);
  if (!dataMatch || dataMatch.length < 2) {
    return {};
  }
  try {
    const parsed = JSON.parse(dataMatch[1]) as any;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    const clientRaw = parsed.client as any;
    let client: ClientDetails | undefined;
    if (clientRaw && typeof clientRaw === 'object') {
      const name: string = clientRaw.name || '';
      const managerEmail: string =
        clientRaw.managerEmail ||
        clientRaw.manager_email ||
        clientRaw.email ||
        clientRaw.id ||
        '';
      if (name || managerEmail) {
        client = { name, managerEmail };
      }
    }
    const assets = Array.isArray(parsed.assets) ? parsed.assets : undefined;
    return {
      client,
      assets
    };
  } catch {
    return {};
  }
};

const buildHardwareRemark = (client: ClientDetails, assets: HardwareAssetRow[]): string => {
  const payload: HardwareRemarkData = {
    client,
    assets: assets.map(a => ({
      assetTag: a.assetTag,
      assetType: a.assetType,
      serialNumber: a.serialNumber,
      model: a.model,
      status: a.status,
      assetId: a.assetId
    }))
  };
  const json = JSON.stringify(payload);
  return `${HARDWARE_ONBOARDING_TAG}[HARDWARE_DATA:${json}]`;
};

const createEmptyRow = (): HardwareAssetRow => ({
  id: uuidv4(),
  assetTag: '',
  assetType: 'Laptop',
  serialNumber: '',
  model: '',
  status: 'Pending',
  assetId: '',
  selected: false
});

export default function HardwareOnboardingSelfServicePage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [clientName, setClientName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');

  const [assets, setAssets] = useState<HardwareAssetRow[]>([createEmptyRow()]);
  const [assetFilter, setAssetFilter] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!user?.email) {
          setError('Unable to load your employee record. Please contact HR.');
          return;
        }

        const employees = await employeeService.getAll();
        const emp = employees.find(e => e.email === user.email);
        if (!emp) {
          setError('No employee record found for your account.');
          return;
        }
        setEmployee(emp);

        const existing = await hardwareOnboardingService.getLatestByEmployee(emp.id);
        if (existing) {
          setClientName(existing.clientName || '');
          setManagerEmail(existing.clientManagerEmail || '');
          if (existing.assets && existing.assets.length > 0) {
            setAssets(
              existing.assets.map(a => ({
                id: uuidv4(),
                assetTag: a.assetTag || '',
                assetType: (a.assetType as AssetType) || 'Laptop',
                serialNumber: a.serialNumber || '',
                model: a.model || '',
                status: (a.status as HardwareStatus) || 'Pending',
                assetId: a.assetCode || '',
                selected: false
              }))
            );
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load hardware onboarding data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredAssets = useMemo(() => {
    const query = assetFilter.trim().toLowerCase();
    if (!query) {
      return assets;
    }
    return assets.filter(a => a.assetTag.toLowerCase().includes(query));
  }, [assets, assetFilter]);

  const updateAssetRow = (id: string, field: keyof HardwareAssetRow, value: string | boolean) => {
    setAssets(prev =>
      prev.map(row => {
        if (row.id !== id) {
          return row;
        }
        const updated: HardwareAssetRow = {
          ...row,
          [field]: value
        } as HardwareAssetRow;
        if (field === 'assetType' && !updated.assetId) {
          updated.assetId = generateAssetId(String(value));
        }
        return updated;
      })
    );
  };

  const generateAssetId = (assetType: string): string => {
    const prefix = assetType && assetType.length > 0 ? assetType[0].toUpperCase() : 'X';
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `HW-${prefix}-${randomPart}`;
  };

  const addAssetRow = (count: number) => {
    setAssets(prev => [...prev, ...Array.from({ length: count }).map(() => createEmptyRow())]);
  };

  const removeSelectedAssets = () => {
    setAssets(prev => prev.filter(row => !row.selected));
  };

  const validateAssets = (currentAssets: HardwareAssetRow[]): string | null => {
    const active = currentAssets.filter(a =>
      a.assetTag.trim() ||
      a.serialNumber.trim() ||
      a.model.trim()
    );
    if (active.length === 0) {
      return 'Please add at least one hardware asset.';
    }

    const tagCount: Record<string, number> = {};
    active.forEach(a => {
      const tag = a.assetTag.trim();
      if (!tag) {
        return;
      }
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });

    let firstError: string | null = null;
    const updated = currentAssets.map(row => {
      let rowError: string | undefined;
      const isActive =
        row.assetTag.trim() ||
        row.serialNumber.trim() ||
        row.model.trim();
      if (isActive) {
        if (!row.assetTag.trim()) {
          rowError = 'Asset tag is required.';
        } else if (tagCount[row.assetTag.trim()] > 1) {
          rowError = 'Duplicate asset tag. Each asset must be unique.';
        } else if (!row.serialNumber.trim() || !row.model.trim()) {
          rowError = 'Serial number and model are required.';
        }
      }
      if (!firstError && rowError) {
        firstError = rowError;
      }
      return { ...row, error: rowError };
    });
    setAssets(updated);
    return firstError;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) {
      return;
    }
    setError(null);
    setSuccess(null);

    if (!clientName.trim() || !managerEmail.trim()) {
      setError('Please enter client name and manager email before submitting hardware details.');
      return;
    }

    const validationError = validateAssets(assets);
    if (validationError) {
      setError(validationError);
      return;
    }

    setConfirmOpen(true);
  };

  const performSave = async () => {
    if (!employee) {
      return;
    }
    try {
      setSaving(true);
      const activeAssets = assets.filter(a =>
        a.assetTag.trim() ||
        a.serialNumber.trim() ||
        a.model.trim()
      );
      if (activeAssets.length === 0) {
        setError('Please add at least one hardware asset.');
        return;
      }

      const client: ClientDetails = {
        name: clientName.trim(),
        managerEmail: managerEmail.trim()
      };

      const remark = buildHardwareRemark(client, activeAssets);

      await hardwareOnboardingService.upsertForEmployee({
        employeeId: employee.id,
        clientName: client.name,
        clientManagerEmail: client.managerEmail,
        assets: activeAssets.map(a => ({
          assetTag: a.assetTag,
          assetType: a.assetType,
          serialNumber: a.serialNumber,
          model: a.model,
          status: a.status,
          assetCode: a.assetId
        }))
      });

      setSuccess('Hardware onboarding details saved successfully.');
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to save hardware onboarding details.');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const handleExportPdf = () => {
    if (!employee) {
      return;
    }
    const lines: string[] = [];
    lines.push('HARDWARE ONBOARDING SUMMARY');
    lines.push('');
    lines.push(`Employee: ${employee.firstName} ${employee.lastName} (${employee.email})`);
    if (clientName || managerEmail) {
      lines.push(
        `Client: ${clientName || '-'}${
          managerEmail ? ` (Manager Email: ${managerEmail})` : ''
        }`
      );
    }
    lines.push('');
    lines.push('Assets:');
    assets.forEach(a => {
      const tag = a.assetTag || '-';
      const type = a.assetType || '-';
      const serial = a.serialNumber || '-';
      const model = a.model || '-';
      const status = a.status || '-';
      const assetId = a.assetId || '-';
      lines.push(
        `- ${assetId}: ${tag} (${type}), SN: ${serial}, Model: ${model}, Status: ${status}`
      );
    });
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hardware-onboarding.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading hardware onboarding...</div>;
  }

  if (!employee) {
    return (
      <div className="p-8 text-center text-red-500">
        Employee record not found. Please contact HR.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hardware Onboarding</h1>
        <p className="text-gray-500">
          Provide details about your client assignment and issued hardware so IT and HR can verify and complete onboarding.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Employee
            </p>
            <p className="text-sm font-medium text-gray-900">
              {employee.firstName} {employee.lastName}
            </p>
            <p className="text-xs text-gray-500">{employee.email}</p>
          </div>
          <div className="md:col-span-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </p>
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mt-1">
              Hardware Onboarding
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Details
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Client Manager Email
                </label>
                <input
                  type="email"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={managerEmail}
                  onChange={e => setManagerEmail(e.target.value)}
                  placeholder="Enter manager email (e.g. manager@client.com)"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Hardware Assets</p>
                <p className="text-xs text-gray-500">
                  List all hardware assigned for this client engagement.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={assetFilter}
                  onChange={e => setAssetFilter(e.target.value)}
                  placeholder="Filter by asset tag"
                  className="w-40 rounded-md border border-gray-300 px-2 py-1 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => addAssetRow(1)}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Add Asset
                </button>
                <button
                  type="button"
                  onClick={() => addAssetRow(5)}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Add 5 Assets
                </button>
                <button
                  type="button"
                  onClick={removeSelectedAssets}
                  className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50"
                >
                  Remove Selected
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">Asset Tag</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">Asset Type</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">Serial Number</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">Model</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">Status</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">Asset ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredAssets.map(row => (
                    <tr key={row.id}>
                      <td className="px-2 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={e => updateAssetRow(row.id, 'selected', e.target.checked)}
                          className="h-3 w-3 text-indigo-600 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <input
                          type="text"
                          value={row.assetTag}
                          onChange={e => updateAssetRow(row.id, 'assetTag', e.target.value)}
                          className="w-32 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="e.g. LT-001"
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <select
                          value={row.assetType}
                          onChange={e => updateAssetRow(row.id, 'assetType', e.target.value)}
                          className="w-28 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="Laptop">Laptop</option>
                          <option value="Phone">Phone</option>
                          <option value="Monitor">Monitor</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <input
                          type="text"
                          value={row.serialNumber}
                          onChange={e => updateAssetRow(row.id, 'serialNumber', e.target.value)}
                          className="w-32 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="Serial number"
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <input
                          type="text"
                          value={row.model}
                          onChange={e => updateAssetRow(row.id, 'model', e.target.value)}
                          className="w-40 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="Model"
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <select
                          value={row.status}
                          onChange={e => updateAssetRow(row.id, 'status', e.target.value)}
                          className="w-28 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="Assigned">Assigned</option>
                          <option value="Pending">Pending</option>
                          <option value="Returned">Returned</option>
                          <option value="In Repair">In Repair</option>
                        </select>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <input
                          type="text"
                          value={row.assetId}
                          onChange={e => updateAssetRow(row.id, 'assetId', e.target.value)}
                          className="w-40 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="Auto-generated or enter manually"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Export as PDF
            </button>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {saving ? 'Saving...' : 'Save Hardware Details'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[520px] shadow-lg rounded-md bg-white">
            <div className="mt-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                Confirm Hardware Assignment
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Review the client and hardware details below. Once confirmed, the assignment will be saved and visible to HR.
              </p>
              <div className="mb-4 space-y-2 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Employee: </span>
                  <span className="text-gray-900">
                    {employee.firstName} {employee.lastName} ({employee.email})
                  </span>
                </div>
                {(clientName || managerEmail) && (
                  <div>
                    <span className="font-semibold text-gray-700">Client: </span>
                    <span className="text-gray-900">
                      {clientName || '-'}
                      {managerEmail ? ` (Manager Email: ${managerEmail})` : ''}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-gray-700">Assets: </span>
                  <span className="text-gray-900">
                    {assets.filter(a =>
                      a.assetTag.trim() ||
                      a.serialNumber.trim() ||
                      a.model.trim()
                    ).length}{' '}
                    item(s)
                  </span>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-md mb-4">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700">Asset ID</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700">Tag</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700">Type</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700">Serial</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700">Model</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {assets
                      .filter(a =>
                        a.assetTag.trim() ||
                        a.serialNumber.trim() ||
                        a.model.trim()
                      )
                      .map(a => (
                        <tr key={a.id}>
                          <td className="px-2 py-1 text-gray-900">{a.assetId || '-'}</td>
                          <td className="px-2 py-1 text-gray-700">{a.assetTag || '-'}</td>
                          <td className="px-2 py-1 text-gray-700">{a.assetType}</td>
                          <td className="px-2 py-1 text-gray-700">{a.serialNumber || '-'}</td>
                          <td className="px-2 py-1 text-gray-700">{a.model || '-'}</td>
                          <td className="px-2 py-1 text-gray-700">{a.status}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none"
                  onClick={() => setConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  onClick={performSave}
                >
                  {saving ? 'Saving...' : 'Confirm and Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
