'use client';

import { useState, useEffect } from 'react';
import { OnboardingProcess, OnboardingTask, Employee, LegalDocument } from '@/types';
import { onboardingService } from '@/services/onboardingService';
import { employeeService } from '@/services/employeeService';
import { learningService } from '@/services/learningService';
import { hardwareOnboardingService } from '@/services/hardwareOnboardingService';
import { notificationService } from '@/services/notificationService';
import { legalDocumentService } from '@/services/legalDocumentService';
import { auditService } from '@/services/auditService';
import {
  UserPlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

type IDCategory = 'Primary' | 'Secondary' | 'Tertiary';
type IDStatus = 'Pending' | 'Approved' | 'Rejected';
type DocumentSubmissionStage = 'requested' | 'submitted' | 'sent_back' | 'approved';
type ClientOnboardingStage = 'requested' | 'updated';
type HardwareOnboardingStage = 'requested' | 'updated';

interface HRIdCheckDoc {
  id: string;
  typeLabel: string;
  category?: IDCategory;
  points?: number;
  status: IDStatus;
  url?: string;
  uploadedDate?: string;
  remark?: string | null;
  isResubmission?: boolean;
}

const parseIdCheckMetadata = (remark?: string | null): {
  category?: IDCategory;
  points?: number;
  status: IDStatus;
  typeLabel?: string;
  isResubmission?: boolean;
} => {
  if (!remark) {
    return { status: 'Pending' };
  }

  let category: IDCategory | undefined;
  let points: number | undefined;
  let status: IDStatus = 'Pending';
  let typeLabel: string | undefined;
  let isResubmission: boolean | undefined;

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

  const typeMatch = remark.match(/\[ID_CHECK_TYPE:([^\]]+)\]/);
  if (typeMatch) {
    typeLabel = typeMatch[1];
  }

  const resubMatch = remark.match(/\[ID_CHECK_RESUBMISSION:(true|false)\]/);
  if (resubMatch) {
    isResubmission = resubMatch[1] === 'true';
  }

  return { category, points, status, typeLabel, isResubmission };
};

const upsertIdCheckStatusTag = (remark: string | null | undefined, status: IDStatus): string => {
  const existing = remark || '';
  if (existing.match(/\[ID_CHECK_STATUS:(Pending|Approved|Rejected)\]/)) {
    return existing.replace(
      /\[ID_CHECK_STATUS:(Pending|Approved|Rejected)\]/,
      `[ID_CHECK_STATUS:${status}]`
    );
  }
  const trimmed = existing.trim();
  const tag = `[ID_CHECK_STATUS:${status}]`;
  if (!trimmed) {
    return tag;
  }
  return `${trimmed} ${tag}`;
};

const deriveDocumentSubmissionStage = (
  docs: HRIdCheckDoc[],
  totalPoints: number
): DocumentSubmissionStage => {
  if (!docs || docs.length === 0) {
    return 'requested';
  }
  const hasApproved = docs.some(d => d.status === 'Approved');
  const hasRejected = docs.some(d => d.status === 'Rejected');
  if (hasApproved && totalPoints >= 100) {
    return 'approved';
  }
  if (hasRejected) {
    return 'sent_back';
  }
  return 'submitted';
};

const getDocumentSubmissionClasses = (stage: DocumentSubmissionStage, completed: boolean) => {
  if (completed || stage === 'approved') {
    return 'bg-green-100 text-green-800 border border-green-200 cursor-default';
  }
  if (stage === 'submitted' || stage === 'requested') {
    return 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 cursor-pointer';
  }
  if (stage === 'sent_back') {
    return 'bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 cursor-pointer';
  }
  return 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 cursor-pointer';
};

const getDocumentSubmissionLabelSuffix = (stage: DocumentSubmissionStage) => {
  if (stage === 'submitted') return ' (Submitted)';
  if (stage === 'sent_back') return ' (Needs update)';
  if (stage === 'approved') return ' (Approved)';
  return ' (Requested)';
};

const getDocumentSubmissionTitle = (stage: DocumentSubmissionStage) => {
  if (stage === 'submitted') {
    return 'Employee has submitted ID documents. Awaiting HR review.';
  }
  if (stage === 'sent_back') {
    return 'Documents sent back to employee. Waiting for updated upload.';
  }
  if (stage === 'approved') {
    return 'HR has approved the documents and met the 100-point requirement.';
  }
  return 'Request sent to employee. No documents submitted yet.';
};

export default function OnboardingPage() {
  const [onboardingList, setOnboardingList] = useState<OnboardingProcess[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [mandatoryModal, setMandatoryModal] = useState<{
    processId: string;
    employeeId: string;
    employeeName: string;
    courses: { id: string; title: string; status: string; dueDate?: string }[];
  } | null>(null);
  const [mandatoryLoading, setMandatoryLoading] = useState(false);
  const [mandatoryAssignedEmployees, setMandatoryAssignedEmployees] = useState<Record<string, boolean>>({});
  const [clientDocsModal, setClientDocsModal] = useState<{
    processId: string;
    employeeId: string;
    employeeName: string;
    documents: LegalDocument[];
  } | null>(null);
  const [clientDocsLoading, setClientDocsLoading] = useState(false);
  const [hardwareModal, setHardwareModal] = useState<{
    processId: string;
    employeeId: string;
    employeeName: string;
    clientName?: string;
    clientManagerEmail?: string;
    assets: {
      assetTag: string;
      assetType: string;
      serialNumber: string;
      model: string;
      status: string;
      assetId: string;
    }[];
  } | null>(null);
  const [hardwareLoading, setHardwareLoading] = useState(false);
  const [idCheckModal, setIdCheckModal] = useState<{
    processId: string;
    employeeId: string;
    employeeName: string;
    docs: HRIdCheckDoc[];
    totalPoints: number;
  } | null>(null);
  const [idCheckLoading, setIdCheckLoading] = useState(false);
  const [idCheckComment, setIdCheckComment] = useState('');
  const [idCheckDocModal, setIdCheckDocModal] = useState<{
    doc: HRIdCheckDoc;
    action: IDStatus;
    comment: string;
  } | null>(null);
  const [idCheckDocError, setIdCheckDocError] = useState<string | null>(null);
  const [documentSubmissionStatus, setDocumentSubmissionStatus] = useState<
    Record<string, DocumentSubmissionStage>
  >({});
  const [clientOnboardingStatus, setClientOnboardingStatus] = useState<
    Record<string, ClientOnboardingStage>
  >({});
  const [hardwareOnboardingStatus, setHardwareOnboardingStatus] = useState<
    Record<string, HardwareOnboardingStage>
  >({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch employees first as it's critical for the form
      try {
        const emps = await employeeService.getAll();
        setEmployees(emps);
      } catch (e) {
        console.error('Failed to fetch employees:', e);
      }

      // Fetch workflows separately so failure doesn't block employees
      try {
        const wfs = await onboardingService.getAll();
        setOnboardingList(wfs);
        const statusByProcess: Record<string, DocumentSubmissionStage> = {};
        const clientStatusByProcess: Record<string, ClientOnboardingStage> = {};
        const hardwareStatusByProcess: Record<string, HardwareOnboardingStage> = {};
        await Promise.all(
          wfs.map(async process => {
            try {
              const docs = await legalDocumentService.getByEmployeeId(process.employeeId);
              const idDocs: HRIdCheckDoc[] = (docs || [])
                .filter(
                  (doc: LegalDocument) =>
                    typeof doc.remark === 'string' &&
                    doc.remark.includes('100-point ID check')
                )
                .map((doc: LegalDocument) => {
                  const meta = parseIdCheckMetadata(doc.remark);
                  const url =
                    Array.isArray(doc.attachment) && doc.attachment.length > 0
                      ? doc.attachment[0]
                      : undefined;
                  return {
                    id: doc.id,
                    typeLabel: meta.typeLabel || doc.documentType || 'ID document',
                    category: meta.category,
                    points: meta.points,
                    status: meta.status,
                    url,
                    uploadedDate: doc.issueDate || undefined,
                    remark: doc.remark,
                    isResubmission: meta.isResubmission
                  };
                });
              const totalPoints = idDocs.reduce((sum, item) => sum + (item.points || 0), 0);
              statusByProcess[process.id] = deriveDocumentSubmissionStage(idDocs, totalPoints);

              const hasClientDocs =
                docs &&
                docs.some(
                  (doc: LegalDocument) =>
                    typeof doc.remark === 'string' &&
                    doc.remark.includes('[CLIENT_ONBOARDING]')
                );
              clientStatusByProcess[process.id] = hasClientDocs ? 'updated' : 'requested';

              const hasHardwareDocsLegacy =
                docs &&
                docs.some(
                  (doc: LegalDocument) =>
                    typeof doc.remark === 'string' &&
                    doc.remark.includes('[HARDWARE_ONBOARDING]')
                );

              let hasHardwareDocs = hasHardwareDocsLegacy;
              if (!hasHardwareDocsLegacy) {
                try {
                  hasHardwareDocs = await hardwareOnboardingService.hasHardwareForEmployee(
                    process.employeeId
                  );
                } catch {
                  hasHardwareDocs = false;
                }
              }

              hardwareStatusByProcess[process.id] = hasHardwareDocs ? 'updated' : 'requested';
            } catch {
              statusByProcess[process.id] = 'requested';
              clientStatusByProcess[process.id] = 'requested';
              hardwareStatusByProcess[process.id] = 'requested';
            }
          })
        );
        setDocumentSubmissionStatus(statusByProcess);
        setClientOnboardingStatus(clientStatusByProcess);
        setHardwareOnboardingStatus(hardwareStatusByProcess);
      } catch (e) {
        console.error('Failed to fetch onboarding workflows:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const markMandatoryAssigned = (employeeId: string) => {
    setMandatoryAssignedEmployees(prev => ({
      ...prev,
      [employeeId]: true
    }));
  };

  const openIdCheckModalForEmployee = async (processId: string, employeeId: string, employeeName: string) => {
    setIdCheckLoading(true);
    try {
      const docs = await legalDocumentService.getByEmployeeId(employeeId);
      const mapped: HRIdCheckDoc[] = docs
        .filter((doc: LegalDocument) => typeof doc.remark === 'string' && doc.remark.includes('100-point ID check'))
        .map((doc: LegalDocument) => {
          const meta = parseIdCheckMetadata(doc.remark);
          const url =
            Array.isArray(doc.attachment) && doc.attachment.length > 0
              ? doc.attachment[0]
              : undefined;
          return {
            id: doc.id,
            typeLabel: meta.typeLabel || doc.documentType || 'ID document',
            category: meta.category,
            points: meta.points,
            status: meta.status,
            url,
            uploadedDate: doc.issueDate || undefined,
            remark: doc.remark
          };
        });

      const totalPoints = mapped.reduce((sum, item) => sum + (item.points || 0), 0);

      setIdCheckModal({
        processId,
        employeeId,
        employeeName,
        docs: mapped,
        totalPoints
      });
      setIdCheckComment('');
    } catch (error) {
      console.error('Failed to load ID check documents for onboarding:', error);
      alert('Failed to load ID documents. Please try again.');
    } finally {
      setIdCheckLoading(false);
    }
  };

  const updateIdCheckDocStatus = async (
    doc: HRIdCheckDoc,
    status: IDStatus,
    comment?: string
  ): Promise<HRIdCheckDoc> => {
    const oldRemark = doc.remark || '';
    let newRemark = upsertIdCheckStatusTag(oldRemark, status);
    const trimmedComment = comment?.trim();
    if (trimmedComment) {
      const withoutOldReason = newRemark.replace(/\s*Reason from HR:.*$/s, '');
      newRemark = `${withoutOldReason} Reason from HR: ${trimmedComment}`;
    }
    const updated = await legalDocumentService.update(doc.id, { remark: newRemark });
    await auditService.logAction(
      'legal_documents',
      doc.id,
      'UPDATE',
      { status: doc.status, remark: oldRemark },
      { status, remark: newRemark }
    );
    const meta = parseIdCheckMetadata(updated.remark);
    const url =
      Array.isArray(updated.attachment) && updated.attachment.length > 0
        ? updated.attachment[0]
        : undefined;
    return {
      id: updated.id,
      typeLabel: meta.typeLabel || updated.documentType || 'ID document',
      category: meta.category,
      points: meta.points,
      status: meta.status,
      url,
      uploadedDate: updated.issueDate || undefined,
      remark: updated.remark
    };
  };

  const handleStartOnboarding = () => {
    setIsAdding(true);
  };

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    startDate: new Date().toISOString().split('T')[0],
    currentStage: 'Account Creation'
  });

  const autoAssignOnboardingCourses = async (employeeId: string, startDate: string) => {
    try {
      const mandatoryCourses = await learningService.getMandatoryOnboardingCourses();
      if (!mandatoryCourses || mandatoryCourses.length === 0) {
        return;
      }

      const existingEnrollments = await learningService.getEmployeeEnrollments(employeeId);
      const existingCourseIds = new Set(existingEnrollments.map(e => e.courseId));

      const coursesToAssign = mandatoryCourses.filter(c => !existingCourseIds.has(c.id));
      if (coursesToAssign.length === 0) {
        return;
      }

      const baseDate = new Date(startDate);
      if (isNaN(baseDate.getTime())) {
        console.warn('Invalid onboarding start date for auto-assign, skipping due date calculation');
      }
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + 14);
      const dueDateStr = isNaN(dueDate.getTime())
        ? undefined
        : dueDate.toISOString().split('T')[0];

      await Promise.all(
        coursesToAssign.map(course =>
          learningService.assignCourse({
            courseId: course.id,
            employeeIds: [employeeId],
            dueDate: dueDateStr,
            instructions: 'Onboarding mandatory course',
            assignedBy: employeeId
          })
        )
      );
      markMandatoryAssigned(employeeId);
    } catch (error) {
      console.error('Failed to auto-assign onboarding courses:', error);
      // Do not block onboarding workflow creation on learning assignment failure
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) return;

    try {
      const newProcess = await onboardingService.create({
        employeeId: formData.employeeId,
        startDate: formData.startDate,
        status: 'In Progress',
        progress: 0,
        currentStage: formData.currentStage,
        tasks: [
          { id: 'T1', name: 'Account Creation', completed: false },
          { id: 'T2', name: 'Document Submission', completed: false },
          { id: 'T3', name: 'Hardware Setup', completed: false },
          { id: 'T4', name: 'Client Onboarding Documents', completed: false },
          { id: 'T5', name: 'Mandatory Learning', completed: false }
        ]
      });

      const employee = getEmployee(formData.employeeId);
      if (employee?.userId) {
        await notificationService.createNotification(
          employee.userId,
          'Complete 100-Point ID Check',
          'Please complete your 100-point ID document submission to finish onboarding.',
          'warning'
        );

        await notificationService.createNotification(
          employee.userId,
          'Provide Client Onboarding Details',
          'Please enter your client name, manager email and upload any client onboarding documents in Self Service.',
          'info'
        );
      }

      setOnboardingList(prev => [...prev, newProcess]);
      setIsAdding(false);
      setFormData({
        employeeId: '',
        startDate: new Date().toISOString().split('T')[0],
        currentStage: 'Account Creation'
      });

      await autoAssignOnboardingCourses(newProcess.employeeId, formData.startDate);
    } catch (error) {
      console.error('Failed to start onboarding:', JSON.stringify(error, null, 2));
      alert('Failed to start onboarding. Please try again.');
    }
  };

  const [selectedTask, setSelectedTask] = useState<{processId: string, task: OnboardingTask} | null>(null);

  const handleAssignMandatoryCourse = async (courseId: string) => {
    if (!mandatoryModal) return;

    try {
      setMandatoryLoading(true);

      let dueDateStr: string | undefined;
      const process = onboardingList.find(p => p.id === mandatoryModal.processId);
      if (process) {
        const baseDate = new Date(process.startDate);
        if (!isNaN(baseDate.getTime())) {
          const dueDate = new Date(baseDate);
          dueDate.setDate(dueDate.getDate() + 14);
          dueDateStr = dueDate.toISOString().split('T')[0];
        }
      }

      await learningService.assignCourse({
        courseId,
        employeeIds: [mandatoryModal.employeeId],
        dueDate: dueDateStr,
        instructions: 'Onboarding mandatory course',
        assignedBy: mandatoryModal.employeeId
      });

      markMandatoryAssigned(mandatoryModal.employeeId);

      await openMandatoryLearningModal(
        mandatoryModal.processId,
        mandatoryModal.employeeId,
        mandatoryModal.employeeName
      );
    } catch (error) {
      console.error('Failed to assign mandatory onboarding course:', error);
      alert('Failed to assign course. Please try again.');
    } finally {
      setMandatoryLoading(false);
    }
  };

  const openMandatoryLearningModal = async (processId: string, employeeId: string, employeeName: string) => {
    setMandatoryLoading(true);
    try {
      const [mandatoryCourses, enrollments] = await Promise.all([
        learningService.getMandatoryOnboardingCourses(),
        learningService.getEmployeeEnrollments(employeeId)
      ]);

      const courses = mandatoryCourses.map(course => {
        const enrollment = enrollments.find(e => e.courseId === course.id);
        return {
          id: course.id,
          title: course.title,
          status: enrollment ? enrollment.status : 'Not Assigned',
          dueDate: enrollment?.dueDate
        };
      });

      if (courses.some(c => c.status !== 'Not Assigned')) {
        markMandatoryAssigned(employeeId);
      }

      setMandatoryModal({
        processId,
        employeeId,
        employeeName,
        courses
      });
    } catch (error) {
      console.error('Failed to load mandatory learning details:', error);
      alert('Failed to load mandatory learning details. Please try again.');
    } finally {
      setMandatoryLoading(false);
    }
  };

  const openClientDocsModal = async (processId: string, employeeId: string, employeeName: string) => {
    setClientDocsLoading(true);
    try {
      const docs = await legalDocumentService.getByEmployeeId(employeeId);
      const clientDocs = (docs || []).filter(
        (doc: LegalDocument) =>
          typeof doc.remark === 'string' && doc.remark.includes('[CLIENT_ONBOARDING]')
      );
      setClientDocsModal({
        processId,
        employeeId,
        employeeName,
        documents: clientDocs
      });
    } catch (error) {
      console.error('Failed to load client onboarding documents:', error);
      alert('Failed to load client onboarding documents. Please try again.');
    } finally {
      setClientDocsLoading(false);
    }
  };

  const openHardwareModal = async (processId: string, employeeId: string, employeeName: string) => {
    setHardwareLoading(true);
    try {
      const record = await hardwareOnboardingService.getLatestByEmployee(employeeId);
      if (!record) {
        setHardwareModal({
          processId,
          employeeId,
          employeeName,
          assets: []
        });
        return;
      }
      setHardwareModal({
        processId,
        employeeId,
        employeeName,
        clientName: record.clientName,
        clientManagerEmail: record.clientManagerEmail,
        assets: record.assets.map(a => ({
          assetTag: a.assetTag,
          assetType: a.assetType,
          serialNumber: a.serialNumber,
          model: a.model,
          status: a.status,
          assetId: a.assetCode || ''
        }))
      });
    } catch (error) {
      console.error('Failed to load hardware onboarding details:', error);
      alert('Failed to load hardware onboarding details. Please try again.');
    } finally {
      setHardwareLoading(false);
    }
  };

  const handleTaskClick = (processId: string, task: OnboardingTask) => {
    const lowerName = task.name.toLowerCase();
    if (lowerName.includes('mandatory learning')) {
      const process = onboardingList.find(p => p.id === processId);
      if (!process) return;
      const employee = getEmployee(process.employeeId);
      if (!employee) return;
      const employeeName = `${employee.firstName} ${employee.lastName}`;
      openMandatoryLearningModal(processId, process.employeeId, employeeName);
      return;
    }

    if (lowerName.includes('document submission')) {
      const process = onboardingList.find(p => p.id === processId);
      if (!process) return;
      const employee = getEmployee(process.employeeId);
      if (!employee) return;
      const employeeName = `${employee.firstName} ${employee.lastName}`;
      openIdCheckModalForEmployee(processId, process.employeeId, employeeName);
      return;
    }

    if (lowerName.includes('client onboarding')) {
      const process = onboardingList.find(p => p.id === processId);
      if (!process) return;
      const employee = getEmployee(process.employeeId);
      if (!employee) return;
      const employeeName = `${employee.firstName} ${employee.lastName}`;
      openClientDocsModal(processId, process.employeeId, employeeName);
      return;
    }

    if (lowerName.includes('hardware')) {
      const process = onboardingList.find(p => p.id === processId);
      if (!process) return;
      const employee = getEmployee(process.employeeId);
      if (!employee) return;
      const employeeName = `${employee.firstName} ${employee.lastName}`;
      openHardwareModal(processId, process.employeeId, employeeName);
      return;
    }

    setSelectedTask({ processId, task });
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;

    try {
      await onboardingService.updateTask(selectedTask.task.id, true);

      const process = onboardingList.find(p => p.id === selectedTask.processId);
      if (!process) return;

      const updatedTasks = process.tasks.map(t => 
        t.id === selectedTask.task.id ? { ...t, completed: true } : t
      );

      const completedCount = updatedTasks.filter(t => t.completed).length;
      const progress = Math.round((completedCount / updatedTasks.length) * 100);
      
      // Determine next stage
      let currentStage = process.currentStage;
      const nextIncompleteTask = updatedTasks.find(t => !t.completed);
      if (nextIncompleteTask) {
        currentStage = nextIncompleteTask.name;
      } else {
        currentStage = 'Completed';
      }

      const status = progress === 100 ? 'Completed' : 'In Progress';

      await onboardingService.updateWorkflow(process.id, {
        progress,
        currentStage,
        status
      });

      setOnboardingList(prev => prev.map(p => {
        if (p.id !== selectedTask.processId) return p;
        return {
          ...p,
          tasks: updatedTasks,
          progress,
          currentStage,
          status
        };
      }));

      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task status. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Onboarding</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage new hire onboarding workflows</p>
        </div>
        <button 
          onClick={handleStartOnboarding}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Start Onboarding
        </button>
      </div>

      {/* Task Completion Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Complete Task</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to mark <strong>{selectedTask.task.name}</strong> as completed?
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2"
                  onClick={handleCompleteTask}
                >
                  Mark as Completed
                </button>
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  onClick={() => setSelectedTask(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {idCheckModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[640px] shadow-lg rounded-md bg-white">
            <div className="mt-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-1">
                100-Point ID Check
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                Uploaded documents for {idCheckModal.employeeName}. Review the points and send back
                to the employee if changes are required.
              </p>
              {(() => {
                const resubCount = idCheckModal.docs.filter(doc => doc.isResubmission).length;
                if (!resubCount) return null;
                return (
                  <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-2">
                    This is a resubmitted 100-point ID application. {resubCount} document
                    {resubCount > 1 ? 's have' : ' has'} been uploaded as part of a resubmission.
                  </p>
                );
              })()}
              {idCheckLoading ? (
                <p className="text-sm text-gray-500">Loading ID documents...</p>
              ) : idCheckModal.docs.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No 100-point ID documents have been submitted yet. Ask the employee to complete
                  the check in Self Service.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Total Points
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {idCheckModal.totalPoints} points
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        idCheckModal.totalPoints >= 100
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {idCheckModal.totalPoints >= 100
                        ? 'Requirement met (100 points)'
                        : 'Less than 100 points'}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto mb-4 border border-gray-100 rounded-md">
                    <ul className="divide-y divide-gray-100">
                      {idCheckModal.docs.map(doc => (
                        <li key={doc.id} className="px-3 py-2 flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {doc.typeLabel}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(doc.category || 'Uncategorized')}{' '}
                              {typeof doc.points === 'number' && `• ${doc.points} points`}
                              {doc.uploadedDate &&
                                ` • Uploaded ${new Date(doc.uploadedDate).toLocaleDateString()}`}
                              {doc.isResubmission && ' • Resubmission'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                doc.status === 'Approved'
                                  ? 'bg-green-100 text-green-800'
                                  : doc.status === 'Rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {doc.status}
                            </span>
                            <div className="flex items-center gap-2">
                              {doc.url && (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-indigo-600 hover:text-indigo-800"
                                >
                                  View
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setIdCheckDocModal({
                                    doc,
                                    action: doc.status,
                                    comment: ''
                                  })
                                }
                                className="text-xs px-2 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                Review
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Message to employee (optional when sending back)
                    </label>
                    <textarea
                      rows={3}
                      value={idCheckComment}
                      onChange={(e) => setIdCheckComment(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Explain what needs to be updated or which documents are missing."
                    />
                  </div>
                </>
              )}
              <div className="flex justify-end mt-3 gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none"
                  onClick={() => setIdCheckModal(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={idCheckLoading || !idCheckModal}
                  onClick={async () => {
                    if (!idCheckModal) return;
                    const employee = getEmployee(idCheckModal.employeeId);
                    try {
                      setIdCheckLoading(true);
                      const updatedDocs: HRIdCheckDoc[] = [];
                      for (const doc of idCheckModal.docs) {
                        const updated = await updateIdCheckDocStatus(doc, 'Rejected', idCheckComment);
                        updatedDocs.push(updated);
                      }
                      if (employee && employee.userId) {
                        const docSummary = updatedDocs
                          .map(d => {
                            const label = d.typeLabel || d.id;
                            const categoryLabel = d.category ? `${d.category} (${d.points || 0} pts)` : 'Uncategorised';
                            return `${categoryLabel}: ${label}`;
                          })
                          .join('; ');
                        const reason =
                          idCheckComment.trim() ||
                          'HR has requested changes to your 100-point ID documents. Please review and upload updated documents.';
                        const message = docSummary
                          ? `The following documents need updates: ${docSummary}. Reason: ${reason}`
                          : reason;
                        await notificationService.createNotification(
                          employee.userId,
                          'Update 100-Point ID Documents',
                          message,
                          'warning'
                        );
                      }
                      setDocumentSubmissionStatus(prev => ({
                        ...prev,
                        [idCheckModal.processId]: deriveDocumentSubmissionStage(
                          updatedDocs,
                          updatedDocs.reduce((sum, item) => sum + (item.points || 0), 0)
                        )
                      }));
                      setIdCheckModal({
                        ...idCheckModal,
                        docs: updatedDocs,
                        totalPoints: updatedDocs.reduce(
                          (sum, item) => sum + (item.points || 0),
                          0
                        )
                      });
                    } catch (error) {
                      console.error('Failed to send ID check back to employee:', error);
                      alert('Failed to send back request. Please try again.');
                    } finally {
                      setIdCheckLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  Send Back To Employee
                </button>
                <button
                  type="button"
                  disabled={idCheckLoading || !idCheckModal}
                  onClick={async () => {
                    if (!idCheckModal) return;
                    try {
                      setIdCheckLoading(true);
                      const updatedDocs: HRIdCheckDoc[] = [];
                      for (const doc of idCheckModal.docs) {
                        const updated = await updateIdCheckDocStatus(doc, 'Approved');
                        updatedDocs.push(updated);
                      }

                      setDocumentSubmissionStatus(prev => ({
                        ...prev,
                        [idCheckModal.processId]: deriveDocumentSubmissionStage(
                          updatedDocs,
                          updatedDocs.reduce((sum, item) => sum + (item.points || 0), 0)
                        )
                      }));

                      const process = onboardingList.find(p => p.id === idCheckModal.processId);
                      if (process) {
                        const targetTask = process.tasks.find(t =>
                          t.name.toLowerCase().includes('document submission')
                        );
                        if (targetTask && !targetTask.completed) {
                          await onboardingService.updateTask(targetTask.id, true);

                          const updatedTasks = process.tasks.map(t =>
                            t.id === targetTask.id ? { ...t, completed: true } : t
                          );
                          const completedCount = updatedTasks.filter(t => t.completed).length;
                          const progress = Math.round(
                            (completedCount / updatedTasks.length) * 100
                          );
                          const nextIncomplete = updatedTasks.find(t => !t.completed);
                          const currentStage = nextIncomplete ? nextIncomplete.name : 'Completed';
                          const status = progress === 100 ? 'Completed' : 'In Progress';

                          await onboardingService.updateWorkflow(process.id, {
                            progress,
                            currentStage,
                            status
                          });

                          setOnboardingList(prev =>
                            prev.map(p =>
                              p.id === process.id
                                ? {
                                    ...p,
                                    tasks: updatedTasks,
                                    progress,
                                    currentStage,
                                    status
                                  }
                                : p
                            )
                          );
                        }
                      }

                      setIdCheckModal({
                        ...idCheckModal,
                        docs: updatedDocs,
                        totalPoints: updatedDocs.reduce(
                          (sum, item) => sum + (item.points || 0),
                          0
                        )
                      });
                    } catch (error) {
                      console.error('Failed to approve ID documents:', error);
                      alert('Failed to approve documents. Please try again.');
                    } finally {
                      setIdCheckLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-300"
                >
                  Approve Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {idCheckDocModal && idCheckModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[520px] shadow-lg rounded-md bg-white">
            <div className="mt-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-1">
                Review ID Document
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Set the status for this document and optionally add a message to the employee.
              </p>
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-900">
                  {idCheckDocModal.doc.typeLabel}
                </p>
                <p className="text-xs text-gray-500">
                  {(idCheckDocModal.doc.category || 'Uncategorized')}{' '}
                  {typeof idCheckDocModal.doc.points === 'number' &&
                    `• ${idCheckDocModal.doc.points} points`}
                  {idCheckDocModal.doc.uploadedDate &&
                    ` • Uploaded ${new Date(
                      idCheckDocModal.doc.uploadedDate
                    ).toLocaleDateString()}`}
                </p>
                {idCheckDocModal.doc.url && (
                  <a
                    href={idCheckDocModal.doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs text-indigo-600 hover:text-indigo-800 underline"
                  >
                    View attachment
                  </a>
                )}
              </div>
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  Status
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setIdCheckDocModal(prev =>
                        prev ? { ...prev, action: 'Approved' } : prev
                      )
                    }
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      idCheckDocModal.action === 'Approved'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setIdCheckDocModal(prev =>
                        prev ? { ...prev, action: 'Rejected' } : prev
                      )
                    }
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      idCheckDocModal.action === 'Rejected'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    Send Back
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Message to employee (required, minimum 10 characters)
                </label>
                <textarea
                  rows={3}
                  value={idCheckDocModal.comment}
                  onChange={e =>
                    setIdCheckDocModal(prev =>
                      prev ? { ...prev, comment: e.target.value } : prev
                    )
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Explain what needs to be updated or confirm the document is approved."
                />
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-[11px] text-gray-500">
                    {idCheckDocModal.comment.length} characters
                  </p>
                  {idCheckDocError && (
                    <p className="text-[11px] text-red-600">
                      {idCheckDocError}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none"
                  onClick={() => setIdCheckDocModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  disabled={idCheckLoading}
                  onClick={async () => {
                    if (!idCheckModal || !idCheckDocModal) return;
                    const trimmed = idCheckDocModal.comment.trim();
                    if (trimmed.length < 10) {
                      setIdCheckDocError('Remarks must be at least 10 characters.');
                      return;
                    }
                    const employee = getEmployee(idCheckModal.employeeId);
                    try {
                      setIdCheckLoading(true);
                      setIdCheckDocError(null);
                      const updated = await updateIdCheckDocStatus(
                        idCheckDocModal.doc,
                        idCheckDocModal.action,
                        idCheckDocModal.comment
                      );
                      const updatedDocs = idCheckModal.docs.map(d =>
                        d.id === updated.id ? updated : d
                      );
                      setDocumentSubmissionStatus(prev => ({
                        ...prev,
                        [idCheckModal.processId]: deriveDocumentSubmissionStage(
                          updatedDocs,
                          updatedDocs.reduce(
                            (sum, item) => sum + (item.points || 0),
                            0
                          )
                        )
                      }));
                      if (employee && employee.userId) {
                        const trimmed = idCheckDocModal.comment.trim();
                        const reason =
                          trimmed ||
                          (idCheckDocModal.action === 'Rejected'
                            ? 'HR has requested changes to one of your 100-point ID documents. Please review and upload an updated document.'
                            : 'HR has reviewed one of your 100-point ID documents.');
                        const message =
                          idCheckDocModal.action === 'Rejected'
                            ? `The document "${updated.typeLabel}" needs updates. Reason: ${reason}`
                            : `The document "${updated.typeLabel}" has been approved. Remarks: ${reason}`;
                        const type =
                          idCheckDocModal.action === 'Rejected' ? 'warning' : 'success';
                        await notificationService.createNotification(
                          employee.userId,
                          '100-Point ID Documents',
                          message,
                          type
                        );
                      }
                      setIdCheckModal({
                        ...idCheckModal,
                        docs: updatedDocs,
                        totalPoints: updatedDocs.reduce(
                          (sum, item) => sum + (item.points || 0),
                          0
                        )
                      });
                      setIdCheckDocModal(null);
                    } catch (error) {
                      console.error('Failed to update ID document status:', error);
                      alert('Failed to update document. Please try again.');
                    } finally {
                      setIdCheckLoading(false);
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {clientDocsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[640px] shadow-lg rounded-md bg-white">
            <div className="mt-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-1">
                Client Onboarding Documents
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Documents uploaded for {clientDocsModal.employeeName}. Review the client onboarding
                documents before completing this task.
              </p>
              {clientDocsLoading ? (
                <p className="text-sm text-gray-500">Loading client onboarding documents...</p>
              ) : clientDocsModal.documents.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No client onboarding documents have been uploaded yet for this employee.
                </p>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Client Name
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {clientDocsModal.documents[0]?.documentNumber || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Manager Email
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {clientDocsModal.documents[0]?.issuingAuthority || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto mb-4 border border-gray-100 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            Number / Reference
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Issued</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Expires</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Attachments</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {clientDocsModal.documents.map(doc => (
                          <tr key={doc.id}>
                            <td className="px-3 py-2 text-gray-900">{doc.documentType}</td>
                            <td className="px-3 py-2 text-gray-700">{doc.documentNumber || '-'}</td>
                            <td className="px-3 py-2 text-gray-700">
                              {doc.issueDate
                                ? new Date(doc.issueDate).toLocaleDateString()
                                : '-'}
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {doc.expiryDate
                                ? new Date(doc.expiryDate).toLocaleDateString()
                                : '-'}
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {Array.isArray(doc.attachment) && doc.attachment.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {doc.attachment.map((url, index) => (
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
                              ) : (
                                <span className="text-xs text-gray-400">No attachment</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <div className="flex justify-end mt-3 gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none"
                  onClick={() => setClientDocsModal(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={clientDocsLoading || !clientDocsModal}
                  onClick={async () => {
                    if (!clientDocsModal) return;
                    try {
                      const process = onboardingList.find(
                        p => p.id === clientDocsModal.processId
                      );
                      if (!process) {
                        setClientDocsModal(null);
                        return;
                      }
                      const targetTask = process.tasks.find(t =>
                        t.name.toLowerCase().includes('client onboarding')
                      );
                      if (!targetTask || targetTask.completed) {
                        setClientDocsModal(null);
                        return;
                      }

                      await onboardingService.updateTask(targetTask.id, true);

                      const updatedTasks = process.tasks.map(t =>
                        t.id === targetTask.id ? { ...t, completed: true } : t
                      );
                      const completedCount = updatedTasks.filter(t => t.completed).length;
                      const progress = Math.round(
                        (completedCount / updatedTasks.length) * 100
                      );
                      const nextIncomplete = updatedTasks.find(t => !t.completed);
                      const currentStage = nextIncomplete ? nextIncomplete.name : 'Completed';
                      const status = progress === 100 ? 'Completed' : 'In Progress';

                      await onboardingService.updateWorkflow(process.id, {
                        progress,
                        currentStage,
                        status
                      });

                      setOnboardingList(prev =>
                        prev.map(p =>
                          p.id === process.id
                            ? {
                                ...p,
                                tasks: updatedTasks,
                                progress,
                                currentStage,
                                status
                              }
                            : p
                        )
                      );

                      setClientDocsModal(null);
                    } catch (error) {
                      console.error(
                        'Failed to complete Client Onboarding Documents task:',
                        error
                      );
                      alert('Failed to update task status. Please try again.');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-300"
                >
                  Mark Task as Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hardwareModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[720px] shadow-lg rounded-md bg-white">
            <div className="mt-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-1">
                Hardware Onboarding
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Review the hardware assigned to {hardwareModal.employeeName} for this onboarding and complete the task when everything is correct.
              </p>
              {hardwareLoading ? (
                <p className="text-sm text-gray-500">Loading hardware onboarding details...</p>
              ) : hardwareModal.assets.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No hardware onboarding details have been provided yet for this employee.
                </p>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Employee
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {hardwareModal.employeeName}
                      </p>
                    </div>
                    {hardwareModal.clientName && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Client
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {hardwareModal.clientName}
                        </p>
                        {hardwareModal.clientManagerEmail && (
                          <p className="text-xs text-gray-500">
                            Manager Email: {hardwareModal.clientManagerEmail}
                          </p>
                        )}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Assets
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {hardwareModal.assets.length} item
                        {hardwareModal.assets.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto mb-4 border border-gray-100 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Asset ID</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Asset Tag</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Serial</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Model</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {hardwareModal.assets.map((asset, index) => (
                          <tr key={`${asset.assetId || asset.assetTag || index}`}>
                            <td className="px-3 py-2 text-gray-900">{asset.assetId || '-'}</td>
                            <td className="px-3 py-2 text-gray-700">{asset.assetTag || '-'}</td>
                            <td className="px-3 py-2 text-gray-700">{asset.assetType || '-'}</td>
                            <td className="px-3 py-2 text-gray-700">{asset.serialNumber || '-'}</td>
                            <td className="px-3 py-2 text-gray-700">{asset.model || '-'}</td>
                            <td className="px-3 py-2 text-gray-700">{asset.status || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <div className="flex justify-end mt-3 gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none"
                  onClick={() => setHardwareModal(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={hardwareLoading || !hardwareModal}
                  onClick={async () => {
                    if (!hardwareModal) return;
                    try {
                      const process = onboardingList.find(
                        p => p.id === hardwareModal.processId
                      );
                      if (!process) {
                        setHardwareModal(null);
                        return;
                      }
                      const targetTask = process.tasks.find(t =>
                        t.name.toLowerCase().includes('hardware')
                      );
                      if (!targetTask || targetTask.completed) {
                        setHardwareModal(null);
                        return;
                      }

                      await onboardingService.updateTask(targetTask.id, true);

                      const updatedTasks = process.tasks.map(t =>
                        t.id === targetTask.id ? { ...t, completed: true } : t
                      );
                      const completedCount = updatedTasks.filter(t => t.completed).length;
                      const progress = Math.round(
                        (completedCount / updatedTasks.length) * 100
                      );
                      const nextIncomplete = updatedTasks.find(t => !t.completed);
                      const currentStage = nextIncomplete ? nextIncomplete.name : 'Completed';
                      const status = progress === 100 ? 'Completed' : 'In Progress';

                      await onboardingService.updateWorkflow(process.id, {
                        progress,
                        currentStage,
                        status
                      });

                      setOnboardingList(prev =>
                        prev.map(p =>
                          p.id === process.id
                            ? {
                                ...p,
                                tasks: updatedTasks,
                                progress,
                                currentStage,
                                status
                              }
                            : p
                        )
                      );

                      setHardwareModal(null);
                    } catch (error) {
                      console.error('Failed to complete hardware onboarding task:', error);
                      alert('Failed to complete hardware onboarding task. Please try again.');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-300"
                >
                  Mark Task as Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Learning Modal */}
      {mandatoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[480px] shadow-lg rounded-md bg-white">
            <div className="mt-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-1">
                Mandatory Learning
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {mandatoryLoading
                  ? 'Loading mandatory courses...'
                  : `Mandatory onboarding courses for ${mandatoryModal.employeeName}.`}
              </p>
              {!mandatoryLoading && (
                <div className="max-h-64 overflow-y-auto mb-4">
                  {mandatoryModal.courses.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No mandatory onboarding courses are configured yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {mandatoryModal.courses.map(course => {
                        const isAssigned =
                          course.status !== 'Not Assigned' &&
                          course.status !== 'Completed';
                        const displayLabel = isAssigned
                          ? 'Mandatory Course Assigned'
                          : course.status;

                        return (
                          <li
                            key={course.id}
                            className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {course.title}
                              </p>
                              {course.dueDate && (
                                <p className="text-xs text-gray-500">
                                  Due: {new Date(course.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  course.status === 'Completed'
                                    ? 'bg-green-100 text-green-800'
                                    : isAssigned
                                    ? 'bg-blue-100 text-blue-800'
                                    : course.status === 'Overdue'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {displayLabel}
                              </span>
                              {course.status === 'Not Assigned' && (
                                <button
                                  onClick={() => handleAssignMandatoryCourse(course.id)}
                                  disabled={mandatoryLoading}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                  Assign
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex justify-end mt-2">
                <button
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  onClick={() => setMandatoryModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Start New Onboarding</h3>
              <form onSubmit={handleSubmit} className="mt-2 text-left">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="employee">
                    Select Employee
                  </label>
                  <select
                    id="employee"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    required
                  >
                    <option value="">Select an employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startDate">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>
                <div className="flex items-center justify-end mt-4">
                  <button
                    type="button"
                    className="mr-2 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none"
                    onClick={() => setIsAdding(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
                  >
                    Start
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 mb-8 md:grid-cols-3">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <ChartBarIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Onboarding</p>
              <p className="text-2xl font-semibold text-gray-900">
                {onboardingList.filter(o => o.status === 'In Progress').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Completed (YTD)</p>
              <p className="text-2xl font-semibold text-gray-900">
                {onboardingList.filter(o => o.status === 'Completed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
              <ClockIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Completion Time</p>
              <p className="text-2xl font-semibold text-gray-900">5 Days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {onboardingList.map((process) => {
            const employee = getEmployee(process.employeeId);
            if (!employee) return null;

            return (
              <li key={process.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600">
                        {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-blue-600 truncate">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.position} • {employee.department}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(process.status)}`}>
                        {process.status}
                      </span>
                      <div className="mt-1 text-xs text-gray-500">
                        Started: {new Date(process.startDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress: {process.currentStage}</span>
                      <span>{process.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${process.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pending Tasks</h4>
                    <div className="flex flex-wrap gap-2">
                      {process.tasks.map((task) => {
                        const isMandatoryTask = task.name.toLowerCase().includes('mandatory learning');
                        const isAssignedMandatory =
                          isMandatoryTask &&
                          !task.completed &&
                          mandatoryAssignedEmployees[process.employeeId];
                        const label = isAssignedMandatory ? 'Mandatory Course Assigned' : task.name;
                        const isDocumentSubmissionTask = task.name.toLowerCase().includes('document submission');
                        const documentStage =
                          documentSubmissionStatus[process.id] ||
                          (task.completed ? 'approved' : 'requested');
                        const isClientOnboardingTask = task.name.toLowerCase().includes('client onboarding');
                        const clientStage: ClientOnboardingStage =
                          clientOnboardingStatus[process.id] ||
                          (task.completed ? 'updated' : 'requested');
                        const isHardwareTask = task.name.toLowerCase().includes('hardware');
                        const hardwareStage: HardwareOnboardingStage =
                          hardwareOnboardingStatus[process.id] ||
                          (task.completed ? 'updated' : 'requested');
                        const commonClasses =
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors';
                        let pillClasses: string;
                        let pillTitle: string | undefined;
                        let pillLabel: string;

                        if (isDocumentSubmissionTask) {
                          pillClasses = `${commonClasses} ${getDocumentSubmissionClasses(documentStage, task.completed)}`;
                          pillTitle = getDocumentSubmissionTitle(documentStage);
                          pillLabel = `Document Submission${getDocumentSubmissionLabelSuffix(documentStage)}`;
                        } else if (isClientOnboardingTask) {
                          if (task.completed) {
                            pillClasses = `${commonClasses} bg-green-100 text-green-800 cursor-default`;
                            pillTitle = 'Client onboarding documents verified and approved.';
                            pillLabel = 'Client Onboarding Documents (Approved)';
                          } else {
                            pillClasses = `${commonClasses} bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 cursor-pointer`;
                            pillTitle =
                              clientStage === 'updated'
                                ? 'Employee has provided client details. Review and complete this task.'
                                : 'Client details not provided yet.';
                            const suffix =
                              clientStage === 'updated' ? ' (Updated)' : ' (Requested)';
                            pillLabel = `${task.name}${suffix}`;
                          }
                        } else if (isHardwareTask) {
                          if (task.completed) {
                            pillClasses = `${commonClasses} bg-green-100 text-green-800 cursor-default`;
                            pillTitle = 'Hardware setup completed.';
                            pillLabel = 'Hardware Setup';
                          } else {
                            pillClasses = `${commonClasses} bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 cursor-pointer`;
                            pillTitle =
                              hardwareStage === 'updated'
                                ? 'Employee has provided hardware onboarding details. Review and complete this task.'
                                : 'Hardware onboarding details not provided yet.';
                            const suffix =
                              hardwareStage === 'updated' ? ' (Updated)' : ' (Requested)';
                            pillLabel = `${task.name}${suffix}`;
                          }
                        } else {
                          pillClasses = `${commonClasses} ${
                            task.completed
                              ? 'bg-green-100 text-green-800 cursor-default'
                              : isAssignedMandatory
                              ? 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 cursor-pointer'
                              : isMandatoryTask
                              ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 cursor-pointer'
                              : 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 cursor-pointer'
                          }`;
                          pillTitle = undefined;
                          pillLabel = label;
                        }

                        return (
                          <button
                            key={task.id}
                            onClick={() => !task.completed && handleTaskClick(process.id, task)}
                            disabled={task.completed}
                            className={pillClasses}
                            title={pillTitle}
                          >
                            {task.completed && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                            {pillLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
