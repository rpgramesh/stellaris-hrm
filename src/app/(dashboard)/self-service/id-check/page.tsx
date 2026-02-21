'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { employeeService } from '@/services/employeeService';
import { legalDocumentService } from '@/services/legalDocumentService';
import { auditService } from '@/services/auditService';
import { notificationService } from '@/services/notificationService';
import { saveEmployeeDrafts, loadEmployeeDrafts } from '@/utils/idCheckDraftStorage';
import { validateIdCheckSubmission } from '@/utils/idCheckValidation';
import type { Employee, LegalDocument } from '@/types';

type IDCategory = 'Primary' | 'Secondary' | 'Tertiary';

type IDStatus = 'Pending' | 'Approved' | 'Rejected';

const CATEGORY_POINTS: Record<IDCategory, number> = {
  Primary: 70,
  Secondary: 40,
  Tertiary: 25
};

interface DocumentOption {
  id: string;
  category: IDCategory;
  label: string;
  points: number;
}

const PRIMARY_DOCUMENT_OPTIONS: DocumentOption[] = [
  { id: 'primary_foreign_passport', category: 'Primary', label: 'Foreign Passport (current)', points: 70 },
  { id: 'primary_aus_passport', category: 'Primary', label: 'Australian Passport (current or expired within last 2 years but not cancelled)', points: 70 },
  { id: 'primary_citizenship_cert', category: 'Primary', label: 'Australian Citizenship Certificate', points: 70 },
  { id: 'primary_full_birth_cert', category: 'Primary', label: 'Full Birth Certificate (not extract)', points: 70 },
  { id: 'primary_certificate_of_identity', category: 'Primary', label: 'Certificate of Identity (Australian Government)', points: 70 },
  { id: 'primary_driver_licence', category: 'Primary', label: 'Australian Driver Licence / Learner\'s Permit', points: 40 },
  { id: 'primary_tertiary_id', category: 'Primary', label: 'Current Australian Tertiary Student Identification Card', points: 40 },
  { id: 'primary_regulatory_id', category: 'Primary', label: 'Photo ID card for Australian regulatory purposes', points: 40 },
  { id: 'primary_gov_employee_id', category: 'Primary', label: 'Government Employee ID (Australian Federal/State/Territory)', points: 40 },
  { id: 'primary_defence_force_id', category: 'Primary', label: 'Defence Force Identity Card (with photo or signature)', points: 40 }
];

const SECONDARY_DOCUMENT_OPTIONS: DocumentOption[] = [
  { id: 'secondary_dva_card', category: 'Secondary', label: 'Department of Veterans Affairs (DVA) card', points: 40 },
  { id: 'secondary_centrelink_card', category: 'Secondary', label: 'Centrelink card (with reference number)', points: 40 },
  { id: 'secondary_birth_cert_extract', category: 'Secondary', label: 'Birth Certificate Extract', points: 25 },
  { id: 'secondary_birth_card', category: 'Secondary', label: 'Birth card (NSW Births, Deaths, Marriages)', points: 25 },
  { id: 'secondary_medicare', category: 'Secondary', label: 'Medicare card', points: 25 },
  { id: 'secondary_credit_card', category: 'Secondary', label: 'Credit card or account card', points: 25 },
  { id: 'secondary_marriage_cert', category: 'Secondary', label: 'Australian Marriage Certificate (Registry issue only)', points: 25 },
  { id: 'secondary_decree_nisi', category: 'Secondary', label: 'Decree Nisi / Decree Absolute', points: 25 },
  { id: 'secondary_change_of_name', category: 'Secondary', label: 'Change of Name Certificate', points: 25 },
  { id: 'secondary_bank_statement', category: 'Secondary', label: 'Bank statement (showing transactions)', points: 25 },
  { id: 'secondary_property_lease', category: 'Secondary', label: 'Property lease agreement – current address', points: 25 },
  { id: 'secondary_tax_assessment', category: 'Secondary', label: 'Taxation assessment notice', points: 25 },
  { id: 'secondary_mortgage_docs', category: 'Secondary', label: 'Australian mortgage documents – current address', points: 25 },
  { id: 'secondary_rating_authority', category: 'Secondary', label: 'Rating Authority – current address (eg. Land Rates)', points: 25 },
  { id: 'secondary_utility_bill', category: 'Secondary', label: 'Utility bill – electricity, gas, telephone (last 12 months)', points: 20 },
  { id: 'secondary_indigenous_ref', category: 'Secondary', label: 'Reference from Indigenous Organisation', points: 20 },
  { id: 'secondary_overseas_docs', category: 'Secondary', label: 'Documents issued outside Australia (equivalent to Australian documents)', points: 20 }
];

const DOCUMENT_OPTIONS: DocumentOption[] = [
  ...PRIMARY_DOCUMENT_OPTIONS,
  ...SECONDARY_DOCUMENT_OPTIONS
];

interface IDDraft {
  id: string;
  file: File | null;
  name: string;
  category: IDCategory;
  points: number;
  documentTypeId?: string;
  documentTypeLabel?: string;
}

interface IDStoredDoc {
  doc: LegalDocument;
  category?: IDCategory;
  points?: number;
  status: IDStatus;
  remark?: string | null;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

const parseIdMetadata = (remark?: string): { category?: IDCategory; points?: number; status: IDStatus } => {
  if (!remark) return { status: 'Pending' };
  let category: IDCategory | undefined;
  let points: number | undefined;
  let status: IDStatus = 'Pending';
  const categoryMatch = remark.match(/\[ID_CHECK_CATEGORY:(Primary|Secondary|Tertiary)\]/);
  if (categoryMatch) {
    category = categoryMatch[1] as IDCategory;
  }
  const pointsMatch = remark.match(/\[ID_CHECK_POINTS:(\d+)\]/);
  if (pointsMatch) {
    const value = parseInt(pointsMatch[1], 10);
    if (!Number.isNaN(value)) {
      points = value;
    }
  }
  const statusMatch = remark.match(/\[ID_CHECK_STATUS:(Pending|Approved|Rejected)\]/);
  if (statusMatch) {
    status = statusMatch[1] as IDStatus;
  }
  return { category, points, status };
};

const extractHrReason = (remark?: string | null): string | null => {
  if (!remark) return null;
  const idx = remark.indexOf('Reason from HR:');
  if (idx === -1) return null;
  return remark
    .slice(idx + 'Reason from HR:'.length)
    .trim();
};

export default function IDCheckPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [idDocs, setIdDocs] = useState<IDStoredDoc[]>([]);
  const [drafts, setDrafts] = useState<IDDraft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeCategoryModal, setActiveCategoryModal] = useState<IDCategory | null>(null);
  const [selectedOptionsByCategory, setSelectedOptionsByCategory] = useState<Partial<Record<IDCategory, string[]>>>({});
  const [totalPoints, setTotalPoints] = useState(0);
  const [existingPoints, setExistingPoints] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);
  const tertiaryInputRef = useRef<HTMLInputElement>(null);
  const optionFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const rejectedReplaceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          setError('Unable to load employee record. Please contact HR.');
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
        const mapped: IDStoredDoc[] = docs.map(doc => {
          const meta = parseIdMetadata(doc.remark);
          return {
            doc,
            category: meta.category,
            points: meta.points,
            status: meta.status,
            remark: doc.remark
          };
        });
        setIdDocs(mapped);
        const basePoints = mapped
          .filter(item => item.status !== 'Rejected')
          .reduce((sum, item) => sum + (item.points || 0), 0);
        setExistingPoints(basePoints);
        try {
          const storedDrafts = await loadEmployeeDrafts(emp.id);
          if (storedDrafts && storedDrafts.length > 0) {
            const restoredDrafts: IDDraft[] = storedDrafts.map((d: any) => ({
              id: d.id,
              file: null,
              name: d.name,
              category: d.category,
              points: d.points,
              documentTypeId: d.documentTypeId,
              documentTypeLabel: d.documentTypeLabel
            }));
            setDrafts(restoredDrafts);
            setAutoSaveStatus('saved');
          }
        } catch (storageError) {
          console.error('Failed to load saved ID check drafts:', storageError);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load ID check data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const draftPoints = drafts.reduce((sum, d) => sum + d.points, 0);
    setTotalPoints(draftPoints);
  }, [drafts]);

  useEffect(() => {
    if (!employee) return;
    let cancelled = false;
    const persistDrafts = async () => {
      try {
        if (drafts.length === 0) {
          await saveEmployeeDrafts(employee.id, []);
          if (!cancelled) {
            setAutoSaveStatus('idle');
          }
          return;
        }
        setAutoSaveStatus('saving');
        const serializableDrafts = drafts.map(d => ({
          id: d.id,
          name: d.name,
          category: d.category,
          points: d.points,
          documentTypeId: d.documentTypeId,
          documentTypeLabel: d.documentTypeLabel
        }));
        await saveEmployeeDrafts(employee.id, serializableDrafts);
        if (!cancelled) {
          setAutoSaveStatus('saved');
        }
      } catch (e) {
        if (!cancelled) {
          setAutoSaveStatus('error');
        }
      }
    };
    persistDrafts();
    return () => {
      cancelled = true;
    };
  }, [drafts, employee]);

  const handleFilesSelected = (category: IDCategory, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setSuccess(null);
    const newDrafts: IDDraft[] = [];
    const invalidMessages: string[] = [];
    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const validExt = ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png';
      if (!validExt) {
        invalidMessages.push(`${file.name}: unsupported file type. Allowed: PDF, JPG, PNG.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        invalidMessages.push(`${file.name}: file is larger than 5MB.`);
        return;
      }
      newDrafts.push({
        id: generateId(),
        file,
        name: file.name,
        category,
        points: CATEGORY_POINTS[category]
      });
    });
    if (invalidMessages.length > 0) {
      setError(invalidMessages.join(' '));
    }
    if (newDrafts.length > 0) {
      setDrafts(prev => [...prev, ...newDrafts]);
    }
  };

  const handleFilesSelectedForOption = (category: IDCategory, option: DocumentOption, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setSuccess(null);
    const newDrafts: IDDraft[] = [];
    const invalidMessages: string[] = [];
    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const validExt = ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png';
      if (!validExt) {
        invalidMessages.push(`${file.name}: unsupported file type. Allowed: PDF, JPG, PNG.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        invalidMessages.push(`${file.name}: file is larger than 5MB.`);
        return;
      }
      newDrafts.push({
        id: generateId(),
        file,
        name: file.name,
        category,
        points: option.points,
        documentTypeId: option.id,
        documentTypeLabel: option.label
      });
    });
    if (invalidMessages.length > 0) {
      setError(invalidMessages.join(' '));
    }
    if (newDrafts.length > 0) {
      setDrafts(prev => [...prev, ...newDrafts]);
    }
  };

  const handleDrop = (category: IDCategory, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (category === 'Secondary' && !primaryRequirementSatisfiedForSecondary) {
      setError('At least one primary document must be uploaded before adding secondary documents.');
      return;
    }
    if (category === 'Tertiary') {
      handleFilesSelected(category, e.dataTransfer.files);
      return;
    }
    setError('Please use the popup window to upload Primary and Secondary documents.');
    setActiveCategoryModal(category);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleZoneClick = (category: IDCategory) => {
    if (category === 'Secondary' && !primaryRequirementSatisfiedForSecondary) {
      setError('At least one primary document must be uploaded before adding secondary documents.');
      return;
    }
    if (category === 'Tertiary') {
      const ref = tertiaryInputRef.current;
      ref?.click();
      return;
    }
    setActiveCategoryModal(category);
  };

  const handleZoneKeyDown = (category: IDCategory, e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleZoneClick(category);
    }
  };

  const handlePreviewDraft = (draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft || !draft.file) return;
    const url = URL.createObjectURL(draft.file);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  };

  const removeDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  const categoryDrafts = (category: IDCategory) => drafts.filter(d => d.category === category);

  const hasPrimaryDraft = drafts.some(d => d.category === 'Primary');
  const hasAnyPrimaryUploaded = idDocs.some(
    d => d.category === 'Primary' && d.status !== 'Rejected'
  );
  const primaryRequirementSatisfiedForSecondary = hasPrimaryDraft || hasAnyPrimaryUploaded;

  const hasUploadableDraft = drafts.some(d => d.file);
  const canSubmit = totalPoints >= 100 && hasUploadableDraft && hasPrimaryDraft && !uploading;

  const validationMessage = () => {
    if (!hasPrimaryDraft) {
      return 'At least one primary document must be uploaded before submission';
    }
    if (totalPoints < 100) {
      return `You currently have ${totalPoints} points. You need at least 100 points before submitting.`;
    }
    return '';
  };

  const handleReplaceRejectedFiles = (item: IDStoredDoc, files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!item.category) return;
    setError(null);
    setSuccess(null);
    const newDrafts: IDDraft[] = [];
    const invalidMessages: string[] = [];
    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const validExt = ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png';
      if (!validExt) {
        invalidMessages.push(`${file.name}: unsupported file type. Allowed: PDF, JPG, PNG.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        invalidMessages.push(`${file.name}: file is larger than 5MB.`);
        return;
      }
      const category = item.category as IDCategory;
      const points =
        typeof item.points === 'number' && item.points > 0
          ? item.points
          : CATEGORY_POINTS[category];
      const logicalLabel = item.doc.documentType || `${category} document`;
      newDrafts.push({
        id: generateId(),
        file,
        name: file.name,
        category,
        points,
        documentTypeLabel: logicalLabel
      });
    });
    if (invalidMessages.length > 0) {
      setError(invalidMessages.join(' '));
    }
    if (newDrafts.length > 0) {
      setDrafts(prev => [...prev, ...newDrafts]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || drafts.length === 0) return;
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const uploadableDrafts = drafts.filter(d => d.file);
      const validation = validateIdCheckSubmission(uploadableDrafts);
      if (!validation.valid) {
        setError(validation.errors.join(' '));
        setUploading(false);
        return;
      }

      const isResubmission = existingPoints > 0;
      if (isResubmission) {
        await auditService.logAction(
          'id_check_points',
          employee.id,
          'SYSTEM_ACTION',
          { previousVerifiedPoints: existingPoints },
          {
            previousVerifiedPoints: existingPoints,
            resetTo: 0,
            reason: 'Resubmission of 100-point ID check'
          }
        );
      }

      const created: IDStoredDoc[] = [];
      let skippedMissingFile = false;
      if (uploadableDrafts.length !== drafts.length) {
        skippedMissingFile = true;
      }
      for (const draft of uploadableDrafts) {
        const urls = await legalDocumentService.uploadAttachments([draft.file as File]);
        if (!urls || urls.length === 0) {
          continue;
        }
        const today = new Date().toISOString().split('T')[0];
        const logicalLabel = draft.documentTypeLabel || `${draft.category} document`;
        const remark = `100-point ID check document. [ID_CHECK_CATEGORY:${draft.category}][ID_CHECK_POINTS:${draft.points}][ID_CHECK_STATUS:Pending][ID_CHECK_SCAN:Passed][ID_CHECK_TYPE:${logicalLabel}][ID_CHECK_RESUBMISSION:${isResubmission ? 'true' : 'false'}]`;
        const newDoc = await legalDocumentService.create({
          employeeId: employee.id,
          documentType: logicalLabel,
          documentNumber: draft.name || draft.file?.name || '',
          issueDate: today,
          expiryDate: '',
          issuingAuthority: '',
          remark,
          attachment: urls
        });
        await auditService.logAction(
          'legal_documents',
          newDoc.id,
          'INSERT',
          null,
          newDoc
        );
        created.push({
          doc: newDoc,
          category: draft.category,
          points: draft.points,
          status: 'Pending'
        });
      }
      if (created.length === 0) {
        setError('No documents were uploaded. Please try again.');
        return;
      }
      if (skippedMissingFile) {
        setError('Some drafts were missing files and were not submitted. Please re-attach those documents.');
      }
      const refreshedDocs = await legalDocumentService.getByEmployeeId(employee.id);
      const refreshedMapped: IDStoredDoc[] = refreshedDocs.map(doc => {
        const meta = parseIdMetadata(doc.remark);
        return {
          doc,
          category: meta.category,
          points: meta.points,
          status: meta.status,
          remark: doc.remark
        };
      });
      setIdDocs(refreshedMapped);
      const basePoints = refreshedMapped
        .filter(item => item.status !== 'Rejected')
        .reduce((sum, item) => sum + (item.points || 0), 0);
      setExistingPoints(basePoints);
      setDrafts([]);
      setSuccess('Documents submitted successfully for verification.');

      try {
        const allEmployees = await employeeService.getAll();
        const hrEmployees = allEmployees.filter(
          e => e.role === 'HR Manager' || e.role === 'HR Admin'
        );
        const employeeName = `${employee.firstName} ${employee.lastName}`;
        for (const hr of hrEmployees) {
          if (hr.userId) {
            await notificationService.createNotification(
              hr.userId,
              'ID Documents Resubmitted',
              `${employeeName} has resubmitted ${created.length} ID document${created.length > 1 ? 's' : ''} for verification.`,
              'info'
            );
          }
        }
        if (hrEmployees.length > 0) {
          console.log(
            `Simulating email notifications to ${hrEmployees.length} HR users for ID document resubmission by ${employeeName}`
          );
        }
      } catch (notifyError) {
        console.error('Error sending HR notifications for ID resubmission:', notifyError);
      }

      try {
        const myNotifications = await notificationService.getMyNotifications();
        const idCheckNotifications = myNotifications.filter(
          n => !n.isRead && n.title === 'Update 100-Point ID Documents'
        );
        for (const n of idCheckNotifications) {
          await notificationService.markAsRead(n.id);
        }
      } catch (notifyError) {
        console.error('Error updating ID check notifications after submit:', notifyError);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to submit documents. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading your 100-point ID check...
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="p-8">
        <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          <h1 className="text-lg font-semibold mb-2">Unable to load ID Check</h1>
          <p className="text-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/self-service')}
            className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const categoryProgress = (category: IDCategory) => {
    return drafts
      .filter(d => d.category === category)
      .reduce((sum, d) => sum + d.points, 0);
  };

  const renderBadgeForStatus = (status: IDStatus) => {
    let color = 'bg-gray-100 text-gray-800';
    if (status === 'Approved') {
      color = 'bg-green-100 text-green-800';
    } else if (status === 'Rejected') {
      color = 'bg-red-100 text-red-800';
    } else if (status === 'Pending') {
      color = 'bg-yellow-100 text-yellow-800';
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">100-Point ID Check</h1>
          <p className="text-sm text-gray-500 mt-1">
            Submit your identity documents to complete onboarding.
          </p>
          {employee && (
            <p className="text-xs text-gray-400 mt-1">
              Employee: {employee.firstName} {employee.lastName}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-100 px-4 py-3 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <span className="text-xl font-bold text-blue-600">
              {totalPoints}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Total Points
            </p>
            <p className="text-sm text-gray-700">
              {totalPoints}/100 points
            </p>
            <div className="mt-1 w-40 bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${totalPoints >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(totalPoints, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['Primary', 'Secondary', 'Tertiary'] as IDCategory[]).map(category => {
              const isSecondary = category === 'Secondary';
              const secondaryLocked = isSecondary && !primaryRequirementSatisfiedForSecondary;
              return (
              <div
                key={category}
                className="bg-white rounded-lg shadow-sm border border-dashed border-gray-300 p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveCategoryModal(category)}
                      className="text-left"
                    >
                      <h2 className="text-sm font-semibold text-gray-800">
                        {category} Documents
                      </h2>
                      <p className="text-xs text-gray-500">
                        {category === 'Tertiary' ? `${CATEGORY_POINTS[category]} points each` : 'Points vary by document type'}
                      </p>
                    </button>
                  </div>
                  <div className="text-right">
                    {category === 'Primary' && (
                      <p className="text-[11px] font-semibold text-amber-700">
                        Required
                      </p>
                    )}
                    {isSecondary && (
                      <p
                        className={`text-[11px] font-semibold ${
                          secondaryLocked ? 'text-gray-400' : 'text-green-700'
                        }`}
                      >
                        {secondaryLocked ? 'Locked until primary uploaded' : 'Enabled'}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">Points from this category</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {categoryProgress(category)}
                    </p>
                  </div>
                </div>
                <div
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(category, e)}
                  onClick={() => handleZoneClick(category)}
                  onKeyDown={e => handleZoneKeyDown(category, e)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Upload ${category.toLowerCase()} identity documents`}
                  aria-disabled={isSecondary && secondaryLocked}
                  className={`flex-1 flex flex-col items-center justify-center rounded-md border border-gray-200 border-dashed px-3 py-6 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isSecondary && secondaryLocked
                      ? 'bg-gray-100 cursor-not-allowed opacity-70'
                      : 'bg-gray-50 cursor-pointer'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mx-auto h-8 w-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 12l-4-4m0 0l-4 4m4-4v12"
                    />
                  </svg>
                  <p className="mt-2 text-xs font-medium text-gray-700">
                    Drag and drop or press Enter to select files
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    PDF, JPG, PNG up to 5MB
                  </p>
                </div>
                <input
                  type="file"
                  ref={
                    category === 'Primary'
                      ? primaryInputRef
                      : category === 'Secondary'
                      ? secondaryInputRef
                      : tertiaryInputRef
                  }
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={e => handleFilesSelected(category, e.target.files)}
                />
                {categoryDrafts(category).length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] font-medium text-gray-500 uppercase">
                      Pending Uploads
                    </p>
                    {categoryDrafts(category).map(draft => (
                      <div
                        key={draft.id}
                        className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5"
                      >
                        <div className="flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handlePreviewDraft(draft.id)}
                            className="text-xs text-gray-800 truncate text-left hover:underline"
                            aria-label={`Preview ${draft.documentTypeLabel || draft.name}`}
                          >
                            {draft.documentTypeLabel || draft.name}
                          </button>
                          <p className="text-[11px] text-gray-500">
                            {draft.points} points
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDraft(draft.id)}
                          className="ml-2 inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          aria-label="Remove document from selection"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );})}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Submission Summary
                </h2>
                <p className="text-xs text-gray-500">
                  You need at least 100 points before submitting.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">This submission</p>
                <p className="text-sm font-semibold text-gray-900">
                  {totalPoints} points
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Previous verified points: {existingPoints}
                </p>
                <p className="mt-1 text-[11px]">
                  {autoSaveStatus === 'saving' && (
                    <span className="text-blue-600">Auto-saving documents…</span>
                  )}
                  {autoSaveStatus === 'saved' && drafts.length > 0 && (
                    <span className="text-green-600">All document drafts saved</span>
                  )}
                  {autoSaveStatus === 'error' && (
                    <span className="text-red-600">Auto-save failed. Your drafts are only in this session.</span>
                  )}
                  {autoSaveStatus === 'idle' && drafts.length === 0 && (
                    <span className="text-gray-400">No document drafts</span>
                  )}
                </p>
              </div>
            </div>
            {validationMessage() && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {validationMessage()}
              </p>
            )}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  canSubmit
                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {uploading ? 'Submitting...' : 'Submit for verification'}
              </button>
              <p className="text-[11px] text-gray-500">
                Your documents will be reviewed by HR. Status updates will appear here.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Document Preview
            </h2>
            {idDocs.length === 0 && drafts.length === 0 ? (
              <p className="text-xs text-gray-500">
                No documents submitted yet. Upload your ID documents using the panels on the left.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {drafts.map(draft => (
                  <div
                    key={draft.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handlePreviewDraft(draft.id)}
                        className="text-xs font-medium text-gray-800 truncate text-left hover:underline"
                        aria-label={`Preview ${draft.documentTypeLabel || draft.name}`}
                      >
                        {draft.documentTypeLabel || draft.name}
                      </button>
                      <p className="text-[11px] text-gray-500">
                        {draft.category} • {draft.points} points • Not yet submitted
                      </p>
                    </div>
                    <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] text-gray-700">
                      Draft
                    </span>
                  </div>
                ))}
                {idDocs.map(item => {
                  const url = item.doc.attachment && item.doc.attachment[0];
                  const label = item.doc.documentNumber || url?.split('/').pop() || 'Document';
                  const isRejected = item.status === 'Rejected';
                  const hrReason = extractHrReason(item.remark);
                  return (
                    <div
                      key={item.doc.id}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">
                          {label}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {item.category || 'Uncategorised'}{item.points ? ` • ${item.points} points` : ''} • Stored
                        </p>
                        {hrReason && (
                          <p className="text-[11px] text-red-600 mt-0.5">
                            HR remark: {hrReason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {renderBadgeForStatus(item.status)}
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            View
                          </a>
                        )}
                        {isRejected && item.category && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const input = rejectedReplaceInputRefs.current[item.doc.id];
                                if (input) {
                                  input.click();
                                }
                              }}
                              className="text-[11px] px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              Upload new file
                            </button>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              ref={el => {
                                if (el) {
                                  rejectedReplaceInputRefs.current[item.doc.id] = el;
                                }
                              }}
                              onChange={e => handleReplaceRejectedFiles(item, e.target.files)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Upload History
            </h2>
            {idDocs.length === 0 ? (
              <p className="text-xs text-gray-500">
                Once you submit documents, a timeline of your submissions will appear here.
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" aria-hidden="true" />
                <ul className="space-y-3 pl-6">
                  {idDocs.map(item => {
                    const label = item.doc.documentNumber || 'ID document';
                    const hrReason = extractHrReason(item.remark);
                    return (
                      <li key={item.doc.id} className="relative">
                        <div className="absolute -left-2 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                        <div className="bg-gray-50 rounded-md border border-gray-200 px-3 py-2">
                          <p className="text-xs font-medium text-gray-800">
                            {label}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {item.category || 'Uncategorised'}{item.points ? ` • ${item.points} points` : ''} • {item.status}
                          </p>
                          {hrReason && (
                            <p className="text-[11px] text-red-600 mt-0.5">
                              HR remark: {hrReason}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </form>

      {activeCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Select {activeCategoryModal} document type
              </h2>
              <button
                type="button"
                onClick={() => setActiveCategoryModal(null)}
                className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-2">
              {DOCUMENT_OPTIONS.filter(o => o.category === activeCategoryModal).map(option => {
                if (!activeCategoryModal) return null;
                const selectedIds = selectedOptionsByCategory[activeCategoryModal] || [];
                const checked = selectedIds.includes(option.id);
                const optionDrafts = drafts.filter(
                  d => d.documentTypeId === option.id && d.category === activeCategoryModal
                );
                return (
                  <div
                    key={option.id}
                    className="flex items-start gap-3 rounded-md border border-gray-200 px-3 py-2"
                  >
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={checked}
                        onChange={() => {
                          setSelectedOptionsByCategory(prev => {
                            const current = prev[activeCategoryModal] || [];
                            if (checked) {
                              return {
                                ...prev,
                                [activeCategoryModal]: current.filter(id => id !== option.id)
                              };
                            }
                            return {
                              ...prev,
                              [activeCategoryModal]: [...current, option.id]
                            };
                          });
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900">
                        {option.label}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {option.points} points
                      </p>
                      {checked && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center px-2 py-1 text-[11px] font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                              onClick={() => {
                                const input = optionFileInputRefs.current[option.id];
                                if (input) {
                                  input.click();
                                }
                              }}
                            >
                              Upload for this document type
                            </button>
                            {optionDrafts.length > 0 && (
                              <span className="text-[11px] text-gray-500">
                                {optionDrafts.length} file
                                {optionDrafts.length > 1 ? 's' : ''} selected
                              </span>
                            )}
                          </div>
                          {optionDrafts.length > 0 && (
                            <div className="border border-gray-100 rounded-md bg-gray-50 px-2 py-1 max-h-24 overflow-y-auto">
                              <ul className="space-y-0.5">
                                {optionDrafts.map(draft => (
                                  <li
                                    key={draft.id}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <p className="text-[11px] text-gray-700 truncate">
                                      {draft.name}
                                    </p>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        className="text-[11px] text-blue-600 hover:text-blue-800 underline"
                                        onClick={() => handlePreviewDraft(draft.id)}
                                      >
                                        Preview
                                      </button>
                                      <button
                                        type="button"
                                        className="text-[11px] text-red-600 hover:text-red-800"
                                        onClick={() => removeDraft(draft.id)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            ref={el => {
                              if (el) {
                                optionFileInputRefs.current[option.id] = el;
                              }
                            }}
                            className="hidden"
                            onChange={e => {
                              handleFilesSelectedForOption(activeCategoryModal, option, e.target.files);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
              <p className="text-[11px] text-gray-500">
                After selecting a type, click the upload area to attach files.
              </p>
              <button
                type="button"
                onClick={() => setActiveCategoryModal(null)}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
