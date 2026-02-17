'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { employeeService } from '@/services/employeeService';
import { legalDocumentService } from '@/services/legalDocumentService';
import type { Employee, LegalDocument } from '@/types';

const CLIENT_ONBOARDING_TAG = '[CLIENT_ONBOARDING]';

const extractManagerEmail = (remark?: string | null): string => {
  if (!remark) return '';
  const match = remark.match(/\[CLIENT_MANAGER_EMAIL:([^\]]+)\]/);
  return match ? match[1] : '';
};

const buildRemark = (baseRemark: string, managerEmail: string): string => {
  const existing = baseRemark || '';
  let remark = existing.includes(CLIENT_ONBOARDING_TAG)
    ? existing
    : `${existing.trim()} ${CLIENT_ONBOARDING_TAG}`.trim();

  if (remark.match(/\[CLIENT_MANAGER_EMAIL:[^\]]+\]/)) {
    remark = remark.replace(
      /\[CLIENT_MANAGER_EMAIL:[^\]]+\]/,
      `[CLIENT_MANAGER_EMAIL:${managerEmail}]`
    );
  } else {
    const suffix = `[CLIENT_MANAGER_EMAIL:${managerEmail}]`;
    remark = remark ? `${remark} ${suffix}` : suffix;
  }

  return remark;
};

export default function ClientOnboardingSelfServicePage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingDoc, setExistingDoc] = useState<LegalDocument | null>(null);
  const [clientName, setClientName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
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

        const docs = await legalDocumentService.getByEmployeeId(emp.id);
        const clientDocs = (docs || []).filter(
          (doc: LegalDocument) =>
            typeof doc.remark === 'string' && doc.remark.includes(CLIENT_ONBOARDING_TAG)
        );
        if (clientDocs.length > 0) {
          const doc = clientDocs[0];
          setExistingDoc(doc);
          setClientName(doc.documentNumber || '');
          setManagerEmail(extractManagerEmail(doc.remark));
        }
      } catch (e: any) {
        console.error('Failed to load client onboarding data:', e);
        setError(e?.message || 'Failed to load client onboarding data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setError(null);
    setSuccess(null);

    if (!clientName.trim()) {
      setError('Please enter the client name.');
      return;
    }

    if (!managerEmail.trim()) {
      setError('Please enter the manager email.');
      return;
    }

    if (!managerEmail.includes('@')) {
      setError('Please enter a valid manager email address.');
      return;
    }

    try {
      setSaving(true);

      let attachmentUrls: string[] =
        (existingDoc && Array.isArray(existingDoc.attachment) && existingDoc.attachment) ||
        [];

      if (selectedFiles.length > 0) {
        const uploaded = await legalDocumentService.uploadAttachments(selectedFiles);
        attachmentUrls = [...attachmentUrls, ...uploaded];
      }

      const remark = buildRemark(existingDoc?.remark || '', managerEmail.trim());
      const today = new Date().toISOString().split('T')[0];

      let saved: LegalDocument;
      if (existingDoc) {
        saved = await legalDocumentService.update(existingDoc.id, {
          documentType: existingDoc.documentType || 'Client Onboarding',
          documentNumber: clientName.trim(),
          issuingAuthority: managerEmail.trim(),
          attachment: attachmentUrls,
          remark
        });
      } else {
        saved = await legalDocumentService.create({
          employeeId: employee.id,
          documentType: 'Client Onboarding',
          documentNumber: clientName.trim(),
          issueDate: today,
          expiryDate: '',
          issuingAuthority: managerEmail.trim(),
          attachment: attachmentUrls,
          remark
        });
      }

      setExistingDoc(saved);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSuccess('Client onboarding details saved successfully.');
    } catch (e: any) {
      console.error('Failed to save client onboarding details:', e);
      setError(e?.message || 'Failed to save client onboarding details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading client onboarding...</div>;
  }

  if (!employee) {
    return (
      <div className="p-8 text-center text-red-500">
        Employee record not found. Please contact HR.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Onboarding Details</h1>
        <p className="text-gray-500">
          Provide details about your client assignment so HR can verify and complete onboarding.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee
            </label>
            <div className="text-sm text-gray-900">
              {employee.firstName} {employee.lastName}
            </div>
            <div className="text-xs text-gray-500">{employee.email}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
              Client Onboarding
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Name
            </label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Enter the client / end-customer name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager Email
            </label>
            <input
              type="email"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={managerEmail}
              onChange={e => setManagerEmail(e.target.value)}
              placeholder="manager@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attachments (optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-700"
            />
            {selectedFiles.length > 0 && (
              <ul className="mt-2 text-xs text-gray-600 space-y-1">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {existingDoc && Array.isArray(existingDoc.attachment) && existingDoc.attachment.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-700 mb-1">
                  Existing uploaded documents
                </p>
                <div className="flex flex-wrap gap-2">
                  {existingDoc.attachment.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                    >
                      View {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {saving ? 'Saving...' : 'Save Client Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

