'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileText,
  Settings,
  Play,
  RefreshCw,
  Download,
  Eye,
  LayoutGrid,
  List,
  ArrowDown,
  Edit,
  X
} from 'lucide-react';
import { comprehensivePayrollService, PayrollProcessingOptions } from '@/services/comprehensivePayrollService';
import { payrollReportingService } from '@/services/payrollReportingService';
import { payrollErrorHandlingService } from '@/services/payrollErrorHandlingService';
import { pdfGeneratorService } from '@/services/pdfGeneratorService';
import { supabase } from '@/lib/supabase';
import { subscribeToTableWithClient } from '@/lib/realtime';
import { clampIsoDate } from '@/lib/payroll/periodClamp';
import { PayrollConfigurationModal } from '@/components/payroll/PayrollConfigurationModal';
import { ReportDownloadModal } from '@/components/payroll/ReportDownloadModal';
import EmployeeUpdateModal from '@/components/payroll/EmployeeUpdateModal';

interface PayrollRun {
  id: string;
  pay_period_start: string;
  pay_period_end: string;
  payment_date: string;
  pay_frequency: 'Weekly' | 'Fortnightly' | 'Monthly';
  status: 'Draft' | 'Approved' | 'Processing' | 'Paid' | 'STPSubmitted';
  total_gross_pay: number;
  total_tax: number;
  total_net_pay: number;
  total_super: number;
  employee_count: number;
  processed_at?: string;
  created_at?: string;
}

interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  employee_code?: string;
  employment_type: string;
  pay_frequency: string;
  employment_status?: string;
  selected: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingTimesheets: string[];
  unapprovedTimesheets: string[];
  incompleteTimesheets: string[];
}

interface PayrollReport {
  payrollRunId: string;
  periodStart: string;
  periodEnd: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalTax: number;
  totalNetPay: number;
  totalSuper: number;
  employeeBreakdown: {
    employeeId: string;
    employeeName: string;
    grossPay: number;
    tax: number;
    netPay: number;
    super: number;
    hoursWorked: number;
    status: 'Processed' | 'Error' | 'Warning';
    errors: string[];
    warnings: string[];
  }[];
  complianceStatus?: {
    minimumWageCompliant: boolean;
    superCompliant: boolean;
    taxCompliant: boolean;
    issues: string[];
  };
}

interface TimesheetPeriodRow {
  id: string;
  employee_id: string;
  week_start_date: string;
  status: string;
  total_hours?: number;
  approved_hours?: number;
}

type PayslipForRunRow = {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  net_pay: number | null;
  superannuation: number | null;
  gross_earnings: number | null;
  gross_pay: number | null;
  income_tax: number | null;
  tax_withheld: number | null;
  hours_worked: number | null;
  employees?: { first_name?: string | null; last_name?: string | null } | null;
};

export default function PayrollProcessingPage() {
  const router = useRouter();
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [payrollReport, setPayrollReport] = useState<PayrollReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [requestingApprovals, setRequestingApprovals] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [isHrAdmin, setIsHrAdmin] = useState(false);
  const [paidEmployeeIdsForPeriod, setPaidEmployeeIdsForPeriod] = useState<Set<string>>(new Set());
  
  // Report Generation State
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatedReportData, setGeneratedReportData] = useState<any>(null);
  const [currentReportType, setCurrentReportType] = useState<string | null>(null);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  
  // Employee Update Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [approvedHoursByEmployeeId, setApprovedHoursByEmployeeId] = useState<Record<string, number>>({});
  const [loadingApprovedHours, setLoadingApprovedHours] = useState(false);
  const [timesheetPopupEmployee, setTimesheetPopupEmployee] = useState<Employee | null>(null);
  const [timesheetPopupRows, setTimesheetPopupRows] = useState<TimesheetPeriodRow[]>([]);
  const [timesheetPopupOpen, setTimesheetPopupOpen] = useState(false);
  const [timesheetPopupLoading, setTimesheetPopupLoading] = useState(false);
  const [timesheetPopupError, setTimesheetPopupError] = useState<string | null>(null);
  const [timesheetEmailStatuses, setTimesheetEmailStatuses] = useState<Record<string, Record<string, any>>>({});
  const [sendingTimesheetEmails, setSendingTimesheetEmails] = useState<Record<string, boolean>>({});
  const [autoRefreshTick, setAutoRefreshTick] = useState(0);
  const [lastPreviewUpdatedAt, setLastPreviewUpdatedAt] = useState<string | null>(null);

  const [options, setOptions] = useState<PayrollProcessingOptions>({
    validateTimesheets: true,
    requireManagerApproval: true,
    generatePayslips: true,
    sendNotifications: true
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const hasSelectedEmployees = useMemo(() => employees.some((e) => e.selected), [employees]);

  const mergeEmployeeSelection = (prev: Employee[], next: Employee[]) => {
    const selectedByEmployeeId = new Set(prev.filter((e) => e.selected).map((e) => e.employee_id));
    const selectedByPayrollEmployeeId = new Set(prev.filter((e) => e.selected).map((e) => e.id));
    return next.map((e) => ({
      ...e,
      selected: selectedByEmployeeId.has(e.employee_id) || selectedByPayrollEmployeeId.has(e.id),
    }));
  };

  const loadSelectedEmployeeIdsForRun = async (payrollRunId: string): Promise<Set<string>> => {
    try {
      const { data, error } = await supabase
        .from('payslips')
        .select('employee_id')
        .eq('payroll_run_id', payrollRunId);
      if (error) return new Set();
      return new Set((data || []).map((r: any) => String(r.employee_id || '')).filter(Boolean));
    } catch {
      return new Set();
    }
  };

  const selectRun = async (run: PayrollRun) => {
    setSelectedRun(run);
    const emps = await loadEmployees(run.pay_frequency);
    setValidationResult(null);
    setEmployees(emps.map((e) => ({ ...e, selected: false })));
    const selectedEmployeeIds = await loadSelectedEmployeeIdsForRun(run.id);
    if (selectedEmployeeIds.size > 0) {
      setEmployees((prev) =>
        prev.map((e) => ({
          ...e,
          selected: selectedEmployeeIds.has(e.employee_id),
        }))
      );
    }
  };

  const normalizeStatus = (s: unknown) => String(s || '').trim().toLowerCase();
  const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const isPaidRun = selectedRun ? normalizeStatus(selectedRun.status) === 'paid' : false;
  const isFinalisedRun = selectedRun ? ['paid', 'stpsubmitted'].includes(normalizeStatus(selectedRun.status)) : false;

  const employeeIdsKey = useMemo(() => {
    return employees
      .map((e) => e.employee_id)
      .filter(Boolean)
      .sort()
      .join('|');
  }, [employees]);

  const loadReportFromPayslips = async (payrollRunId: string, selectedEmployeeIds: string[]): Promise<PayrollReport | null> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return null;

      const res = await fetch(`/api/payroll/payslips/for-run?payrollRunId=${encodeURIComponent(payrollRunId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const raw = await res.text().catch(() => '');
      const json = (() => {
        try {
          return raw ? JSON.parse(raw) : {};
        } catch {
          return { raw };
        }
      })();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return null;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[payroll-process] failed to load payslips for run', {
            payrollRunId,
            status: res.status,
            body: json,
          });
        }
        return null;
      }

      const payslips = Array.isArray(json?.payslips) ? (json.payslips as PayslipForRunRow[]) : [];
      const filtered =
        selectedEmployeeIds && selectedEmployeeIds.length > 0
          ? payslips.filter((p) => selectedEmployeeIds.includes(String(p.employee_id)))
          : payslips;

      const sum = (arr: PayslipForRunRow[], pick: (p: PayslipForRunRow) => number) =>
        arr.reduce((acc, p) => acc + pick(p), 0);

      const totalGrossPay = sum(filtered, (p) => Number(p.gross_earnings ?? p.gross_pay ?? 0));
      const totalTax = sum(filtered, (p) => Number(p.income_tax ?? p.tax_withheld ?? 0));
      const totalNetPay = sum(filtered, (p) => Number(p.net_pay ?? 0));
      const totalSuper = sum(filtered, (p) => Number(p.superannuation ?? 0));

      const employeeBreakdown = filtered.map((p) => {
        const first = p.employees?.first_name || '';
        const last = p.employees?.last_name || '';
        const employeeName = `${first} ${last}`.trim() || 'Unknown';
        const employeeId = String(p.employee_id);
        const hoursWorked = Number(p.hours_worked ?? approvedHoursByEmployeeId[employeeId] ?? 0);

        return {
          employeeId,
          employeeName,
          grossPay: Number(p.gross_earnings ?? p.gross_pay ?? 0),
          tax: Number(p.income_tax ?? p.tax_withheld ?? 0),
          netPay: Number(p.net_pay ?? 0),
          super: Number(p.superannuation ?? 0),
          hoursWorked: Number.isFinite(hoursWorked) ? hoursWorked : 0,
          status: 'Processed' as const,
          errors: [],
          warnings: [],
        };
      });

      return {
        payrollRunId,
        periodStart: selectedRun?.pay_period_start || '',
        periodEnd: selectedRun?.pay_period_end || '',
        totalEmployees: employeeBreakdown.length,
        totalGrossPay,
        totalTax,
        totalNetPay,
        totalSuper,
        employeeBreakdown,
        complianceStatus: { minimumWageCompliant: true, superCompliant: true, taxCompliant: true, issues: [] },
      };
    } catch (error) {
      console.error('[payroll-process] error loading payslips for run', error);
      return null;
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const resolveRole = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) return;
        const { data: emp } = await supabase
          .from('employees')
          .select('role, system_access_role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        const role = String((emp as any)?.role || (emp as any)?.system_access_role || '');
        const admin = ['HR Admin', 'HR Manager', 'Employer Admin', 'Administrator', 'Super Admin'].includes(role) || role.toLowerCase().includes('hr');
        setIsHrAdmin(admin);
      } catch {
      }
    };
    resolveRole();
  }, []);

  useEffect(() => {
    if (!selectedRun) return;
    if (!hasSelectedEmployees) return;
    if (isFinalisedRun) return;
    if (validationResult?.isValid !== true) return;

    const id = window.setInterval(() => {
      setAutoRefreshTick((t) => t + 1);
    }, 20000);

    return () => window.clearInterval(id);
  }, [selectedRun?.id, hasSelectedEmployees, validationResult?.isValid]);

  // Trigger recalculation when employee selection changes
  useEffect(() => {
    if (!selectedRun) return;

    if (!isPaidRun) {
      setPayrollReport(null);
      return;
    }

    const selectedPayrollEmployeeIds = employees.filter(e => e.selected).map(e => e.id);
    const selectedEmployeeIds = employees.filter(e => e.selected).map(e => e.employee_id);

    const effectivePayrollEmployeeIds = employees.map((e) => e.id);

    setCalculating(true);
    const timer = setTimeout(async () => {
      try {
        console.info('[payroll-process] recalculating payroll preview', {
          payrollRunId: selectedRun.id,
          selectedCount: effectivePayrollEmployeeIds.length,
          finalised: true,
        });

        const expected = {
          totalGrossPay: Number(selectedRun.total_gross_pay || 0),
          totalTax: Number(selectedRun.total_tax || 0),
          totalNetPay: Number(selectedRun.total_net_pay || 0),
          totalSuper: Number(selectedRun.total_super || 0),
          employeeCount: Number(selectedRun.employee_count || 0),
        };

        const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();

        const cached = await comprehensivePayrollService.getCachedPayrollReport(selectedRun.id, expected);
        if (cached) {
          const endedAt = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
          console.info('[payroll-cache] preview cache hit', { payrollRunId: selectedRun.id, ms: Math.round((endedAt as any) - (startedAt as any)) });
          setPayrollReport(cached as any);
        } else {
          console.info('[payroll-cache] preview cache miss; rebuilding from payslips', { payrollRunId: selectedRun.id });
          const rebuilt = isHrAdmin ? await loadReportFromPayslips(selectedRun.id, []) : null;
          if (rebuilt) {
            try {
              await comprehensivePayrollService.upsertCachedPayrollReport(selectedRun.id, rebuilt as any);
            } catch (e: any) {
              console.error('[payroll-cache] failed to persist rebuilt cache', e?.message || e);
            }
            setPayrollReport(rebuilt);
          } else {
            const fallback = await comprehensivePayrollService.calculatePayrollPreview(selectedRun.id, effectivePayrollEmployeeIds);
            setPayrollReport(fallback as any);
          }
        }
        setLastPreviewUpdatedAt(new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Error recalculating payroll:', error);
      } finally {
        setCalculating(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [employees, selectedRun, autoRefreshTick, approvedHoursByEmployeeId, isPaidRun, isHrAdmin]);

  useEffect(() => {
    if (!selectedRun) {
      setApprovedHoursByEmployeeId({});
      return;
    }
    if (!isHrAdmin) {
      setApprovedHoursByEmployeeId({});
      return;
    }

    const employeeIds = employees.map((e) => e.employee_id).filter(Boolean);
    if (employeeIds.length === 0) {
      setApprovedHoursByEmployeeId({});
      return;
    }

    let cancelled = false;

    const loadApprovedHours = async () => {
      try {
        setLoadingApprovedHours(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;

        const res = await fetch('/api/payroll/timesheets/for-period', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employeeIds,
            startDate: selectedRun.pay_period_start,
            endDate: selectedRun.pay_period_end,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error('[payroll-process] failed to load approved hours', {
            status: res.status,
            body,
          });
          return;
        }

        const json = await res.json().catch(() => null);
        const rows = Array.isArray(json?.rows) ? json.rows : [];

        const start = new Date(`${selectedRun.pay_period_start}T00:00:00.000Z`);
        const end = new Date(`${selectedRun.pay_period_end}T23:59:59.999Z`);

        const next: Record<string, number> = {};
        for (const r of rows) {
          const empId = String(r.employee_id || '');
          if (!empId) continue;
          if (String(r.status || '') !== 'Approved') continue;

          const weekStartStr = String(r.week_start_date || '').slice(0, 10);
          if (!weekStartStr) continue;
          const weekStart = new Date(`${weekStartStr}T00:00:00.000Z`);
          if (Number.isNaN(weekStart.getTime())) continue;
          const weekEnd = new Date(weekStart);
          weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

          if (weekStart > end || weekEnd < start) continue;

          const hours = Number((r as any).approved_hours ?? r.total_hours ?? 0);
          next[empId] = (next[empId] || 0) + (Number.isFinite(hours) ? hours : 0);
        }

        if (!cancelled) {
          setApprovedHoursByEmployeeId(next);
          console.info('[payroll-process] loaded approved hours', {
            payrollRunId: selectedRun.id,
            employeeCount: employeeIds.length,
            withHours: Object.keys(next).length,
          });
        }
      } catch (error) {
        console.error('[payroll-process] error loading approved hours', error);
      } finally {
        if (!cancelled) setLoadingApprovedHours(false);
      }
    };

    loadApprovedHours();
    return () => {
      cancelled = true;
    };
  }, [selectedRun?.id, selectedRun?.pay_period_start, selectedRun?.pay_period_end, employeeIdsKey, isHrAdmin, autoRefreshTick]);

  useEffect(() => {
    if (!timesheetPopupOpen || !timesheetPopupEmployee || !selectedRun) return;
    if (!isHrAdmin) {
      setTimesheetPopupError('Read-only access. Only HR administrators can view approved timesheets.');
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        setTimesheetPopupLoading(true);
        setTimesheetPopupError(null);
        setTimesheetPopupRows([]);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setTimesheetPopupError('Not authenticated');
          return;
        }

        const res = await fetch('/api/payroll/timesheets/for-period', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employeeIds: [timesheetPopupEmployee.employee_id],
            startDate: selectedRun.pay_period_start,
            endDate: selectedRun.pay_period_end,
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setTimesheetPopupError(String(json?.error || 'Failed to load timesheets'));
          return;
        }

        const rows = Array.isArray(json?.rows) ? (json.rows as TimesheetPeriodRow[]) : [];
        const filtered = rows
          .filter((r) => String(r.employee_id) === timesheetPopupEmployee.employee_id)
          .sort((a, b) => String(a.week_start_date).localeCompare(String(b.week_start_date)));

        if (!cancelled) {
          setTimesheetPopupRows(filtered);
        }
      } catch (e: any) {
        if (!cancelled) setTimesheetPopupError(e?.message || 'Failed to load timesheets');
      } finally {
        if (!cancelled) setTimesheetPopupLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [timesheetPopupOpen, timesheetPopupEmployee?.employee_id, selectedRun?.id, isHrAdmin]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load payroll runs
      const runs = await loadPayrollRuns();
      setPayrollRuns(runs);
      
      // Auto-select the most recent draft run
      const draftRun = runs.find(run => run.status === 'Draft');
      if (draftRun) {
        setSelectedRun(draftRun);
        // Load employees matching the pay frequency of the draft run
        const emps = await loadEmployees(draftRun.pay_frequency);
        setEmployees(emps);
        setValidationResult(null);
      } else {
        // Load all active employees if no draft run is selected
        const emps = await loadEmployees();
        setEmployees(emps);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollRuns = async (): Promise<PayrollRun[]> => {
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .order('pay_period_start', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading payroll runs:', error);
      return [];
    }
  };

  const loadEmployees = async (payFrequency?: string): Promise<Employee[]> => {
    try {
      let query = supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          employee_code,
          employment_status,
          payroll_employees!inner (
            id,
            employment_type,
            pay_frequency
          )
        `)
        .eq('employment_status', 'Active')
        .eq('payroll_employees.is_active', true);

      if (payFrequency) {
        query = query.eq('payroll_employees.pay_frequency', payFrequency);
      }

      const { data, error } = await query.order('first_name', { ascending: true });

      if (error) throw error;
      
      const mapped = (data || []).map((emp: any) => {
        const payrollInfo = emp.payroll_employees?.[0] || {};
        return {
          id: payrollInfo.id || emp.id, // Use payroll_employees.id for processing
          employee_id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          employee_code: emp.employee_code,
          employment_type: payrollInfo.employment_type || 'Unknown',
          pay_frequency: payrollInfo.pay_frequency || 'Unknown',
          employment_status: emp.employment_status,
          selected: false
        };
      });

      return mapped;
    } catch (error: any) {
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
      return [];
    }
  };

  const validatePayrollRun = async (payrollRunId: string, selectedEmployeeIds?: string[]) => {
    try {
      setValidating(true);
      setValidationError(null);
      const result = await comprehensivePayrollService.validatePayrollRun(payrollRunId, selectedEmployeeIds);
      setValidationResult(result);
    } catch (error) {
      console.error('Error validating payroll run:', error);
      setValidationError('Validation failed due to a network or server error. Please retry.');
    } finally {
      setValidating(false);
    }
  };

  const requestManagerApprovals = async () => {
    if (!selectedRun) return;
    if (!isHrAdmin) {
      alert('Read-only access. Only HR administrators can request approvals.');
      return;
    }

    const employeeIds = (validationResult?.unapprovedTimesheets || []).filter(Boolean);
    if (employeeIds.length === 0) {
      alert('No unapproved timesheets found for the current selection.');
      return;
    }

    try {
      setRequestingApprovals(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        alert('Not authenticated');
        return;
      }

      const res = await fetch('/api/payroll/timesheets/request-approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeIds,
          startDate: selectedRun.pay_period_start,
          endDate: selectedRun.pay_period_end,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(String(json?.error || 'Failed to send approval requests'));
        return;
      }

      const sent = Number(json?.sent || 0);
      alert(sent > 0 ? `Sent ${sent} approval request(s) to managers.` : 'No manager requests were sent (missing line manager assignments).');
    } finally {
      setRequestingApprovals(false);
    }
  };

  const loadTimesheetEmailStatuses = async () => {
    if (!selectedRun) return;
    if (!isHrAdmin) return;
    if (!showErrorDetails) return;

    const rawIds = [
      ...(validationResult?.missingTimesheets || []),
      ...(validationResult?.unapprovedTimesheets || []),
      ...(validationResult?.incompleteTimesheets || []),
    ]
      .map(String)
      .filter(Boolean);

    const employeeIds = Array.from(
      new Set(
        rawIds
          .map((msg) => {
            const emp = employees.find((e) => e.employee_id === msg || e.id === msg);
            return emp?.employee_id || (isUuid(msg) ? msg : null);
          })
          .filter(Boolean) as string[]
      )
    );

    if (employeeIds.length === 0) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const qs = new URLSearchParams();
    qs.set('employeeIds', employeeIds.join(','));
    qs.set('startDate', selectedRun.pay_period_start);
    qs.set('endDate', selectedRun.pay_period_end);

    const res = await fetch(`/api/payroll/timesheets/notification-status?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = await res.json().catch(() => ({}));
    const statuses = json?.statuses || {};
    setTimesheetEmailStatuses(statuses);
  };

  const sendTimesheetNotifications = async (kind: 'MISSING' | 'UNAPPROVED', employeeIds: string[]) => {
    if (!selectedRun) return;
    if (!isHrAdmin) return;
    const ids = Array.from(new Set(employeeIds.filter(Boolean)));
    if (ids.length === 0) return;

    const confirmMsg =
      kind === 'MISSING'
        ? `Send missing timesheet email(s) to managers for ${ids.length} employee(s)?`
        : `Send approval required email(s) to managers for ${ids.length} employee(s)?`;
    if (!confirm(confirmMsg)) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      alert('Not authenticated');
      return;
    }

    setSendingTimesheetEmails((prev) => {
      const next = { ...prev };
      for (const id of ids) next[`${kind}:${id}`] = true;
      return next;
    });

    try {
      const res = await fetch('/api/payroll/timesheets/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kind,
          employeeIds: ids,
          startDate: selectedRun.pay_period_start,
          endDate: selectedRun.pay_period_end,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(String(json?.error || 'Failed to send email notifications'));
        return;
      }

      const emailType = kind === 'MISSING' ? 'TIMESHEET_MISSING' : 'TIMESHEET_APPROVAL_REQUIRED';
      const results = Array.isArray(json?.results) ? json.results : [];

      setTimesheetEmailStatuses((prev) => {
        const next = { ...prev };
        for (const r of results) {
          const employeeId = String(r?.employeeId || '');
          if (!employeeId) continue;
          if (!next[employeeId]) next[employeeId] = {};
          next[employeeId][emailType] = {
            status: r.status,
            sentAt: r.sentAt || null,
            error: r.error || null,
            logId: r.logId || null,
          };
        }
        return next;
      });
    } finally {
      setSendingTimesheetEmails((prev) => {
        const next = { ...prev };
        for (const id of ids) next[`${kind}:${id}`] = false;
        return next;
      });
    }
  };

  useEffect(() => {
    if (!selectedRun) return;
    if (!isHrAdmin) {
      setValidationResult(null);
      return;
    }
    if (selectedRun.status === 'Paid') return;

    const selectedIds = employees.filter((e) => e.selected && !isEmployeeLocked(e)).map((e) => e.id);
    if (selectedIds.length === 0) {
      setValidationResult(null);
      return;
    }

    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      validatePayrollRun(selectedRun.id, selectedIds);
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [selectedRun?.id, selectedRun?.status, isHrAdmin, employees]);

  useEffect(() => {
    if (!selectedRun) return;
    if (!isHrAdmin) return;
    if (selectedRun.status === 'Paid') return;

    const selected = employees.filter((e) => e.selected && !isEmployeeLocked(e));
    const payrollEmployeeIds = selected.map((e) => e.id);
    const employeeIds = selected.map((e) => e.employee_id).filter(Boolean);
    if (employeeIds.length === 0) return;

    const limited = employeeIds.slice(0, 10);
    let cancelled = false;
    let timer: number | null = null;

    const trigger = () => {
      if (cancelled) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        validatePayrollRun(selectedRun.id, payrollEmployeeIds);
      }, 300);
    };

    const subs = limited.map((employeeId) =>
      subscribeToTableWithClient(
        supabase as any,
        { table: 'timesheets', filter: [{ column: 'employee_id', value: employeeId }] },
        { onInsert: trigger, onUpdate: trigger, onDelete: trigger }
      )
    );

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      subs.forEach((s) => s.unsubscribe());
    };
  }, [selectedRun?.id, selectedRun?.status, isHrAdmin, employees]);

  useEffect(() => {
    if (!selectedRun) return;
    if (!isHrAdmin) return;
    if (selectedRun.status === 'Paid') return;

    const hasUnapproved = (validationResult?.unapprovedTimesheets || []).length > 0;
    const hasMissing = (validationResult?.missingTimesheets || []).length > 0;
    const hasIncomplete = (validationResult?.incompleteTimesheets || []).length > 0;
    if (!hasUnapproved && !hasMissing && !hasIncomplete) return;

    const id = window.setInterval(() => {
      const selectedIds = employees.filter((e) => e.selected && !isEmployeeLocked(e)).map((e) => e.id);
      if (selectedIds.length === 0) return;
      validatePayrollRun(selectedRun.id, selectedIds);
    }, 10000);

    return () => window.clearInterval(id);
  }, [
    selectedRun?.id,
    selectedRun?.status,
    isHrAdmin,
    employees,
    validationResult?.unapprovedTimesheets?.length,
    validationResult?.missingTimesheets?.length,
    validationResult?.incompleteTimesheets?.length,
  ]);

  useEffect(() => {
    loadTimesheetEmailStatuses();
  }, [
    showErrorDetails,
    selectedRun?.id,
    selectedRun?.pay_period_start,
    selectedRun?.pay_period_end,
    isHrAdmin,
    employees,
    validationResult?.missingTimesheets?.length,
    validationResult?.unapprovedTimesheets?.length,
    validationResult?.incompleteTimesheets?.length,
  ]);

  useEffect(() => {
    const loadPaidLocks = async () => {
      if (!selectedRun) return;
      if (!isHrAdmin) {
        setPaidEmployeeIdsForPeriod(new Set());
        return;
      }

      try {
        const { data: paidRuns } = await supabase
          .from('payroll_runs')
          .select('id')
          .eq('pay_period_start', selectedRun.pay_period_start)
          .eq('pay_period_end', selectedRun.pay_period_end)
          .eq('status', 'Paid');

        const paidRunIds = (paidRuns || []).map((r: any) => r.id).filter(Boolean);
        if (paidRunIds.length === 0) {
          setPaidEmployeeIdsForPeriod(new Set());
          return;
        }

        const { data: payslips } = await supabase
          .from('payslips')
          .select('employee_id, payroll_run_id')
          .in('payroll_run_id', paidRunIds);

        const ids = new Set((payslips || []).map((p: any) => p.employee_id).filter(Boolean));
        setPaidEmployeeIdsForPeriod(ids);
      } catch {
        setPaidEmployeeIdsForPeriod(new Set());
      }
    };

    loadPaidLocks();
  }, [selectedRun, isHrAdmin]);

  const isEmployeeLocked = (employee: Employee) => {
    if (!selectedRun) return false;
    if (!isHrAdmin) return true;
    if (selectedRun.status === 'Paid') return true;
    return paidEmployeeIdsForPeriod.has(employee.employee_id);
  };

  const processPayroll = async () => {
    if (!selectedRun) return;
    if (!isHrAdmin) {
      alert('Read-only access. Only HR administrators can process payroll.');
      return;
    }
    if (!options.generatePayslips) {
      alert('Payslip generation is required before payroll can be marked Paid.');
      return;
    }
    if (!options.sendNotifications) {
      alert('Employee notifications are required before payroll can be marked Paid.');
      return;
    }

    try {
      setProcessing(true);

      try {
        const { error: schemaErr } = await supabase
          .from('loan_repayments')
          .select('updated_at')
          .limit(1);
        if (schemaErr) {
          const msg = String(schemaErr.message || '');
          const lower = msg.toLowerCase();
          if (lower.includes('schema cache') && lower.includes('updated_at')) {
            alert("Supabase schema cache is stale (loan_repayments.updated_at exists in DB but PostgREST hasn't reloaded). In Supabase SQL Editor run: NOTIFY pgrst, 'reload schema'; then refresh the browser and try again.");
          } else if (lower.includes('updated_at') && (lower.includes('does not exist') || lower.includes('could not find'))) {
            alert('Database schema mismatch detected (loan_repayments.updated_at missing). Please apply the latest payroll migrations and try again.');
            return;
          }
        }
      } catch {
      }
      
      const selectedEmployeeIds = employees
        .filter(emp => emp.selected && !isEmployeeLocked(emp))
        .map(emp => emp.id);
      
      if (selectedEmployeeIds.length === 0) {
        alert('Please select at least one employee to process payroll.');
        setProcessing(false);
        return;
      }

      const gate = await comprehensivePayrollService.validatePayrollRun(selectedRun.id, selectedEmployeeIds);
      setValidationResult(gate);
      if (!gate.isValid) {
        const resolveName = (msg: string) => {
          const emp = employees.find((e) => e.employee_id === msg || e.id === msg);
          if (emp) return `${emp.first_name} ${emp.last_name}`.trim();
          return msg;
        };
        const missing = (gate.missingTimesheets || []).map(resolveName);
        const unapproved = (gate.unapprovedTimesheets || []).map(resolveName);
        const incomplete = ((gate as any).incompleteTimesheets || []).map(resolveName);
        const parts = [
          missing.length > 0 ? `Missing timesheets: ${missing.join(', ')}` : null,
          incomplete.length > 0 ? `Incomplete timesheets: ${incomplete.join(', ')}` : null,
          unapproved.length > 0 ? `Unapproved timesheets: ${unapproved.join(', ')}` : null,
          gate.errors?.length ? `Errors: ${gate.errors.join(' • ')}` : null,
        ].filter(Boolean);
        alert(`Payment blocked. Fix timesheet issues before completing payroll.\n\n${parts.join('\n')}`);
        setProcessing(false);
        return;
      }
      
      const processingOptions: PayrollProcessingOptions = {
        ...options,
        selectedEmployeeIds
      };

      const report = await comprehensivePayrollService.processPayrollRun(
        selectedRun.id,
        'current-user', // Would get from auth context
        processingOptions
      );

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        alert('Not authenticated');
        setProcessing(false);
        return;
      }

      const res = await fetch('/api/payroll/payslips/deliver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payrollRunId: selectedRun.id,
          sendToEmployers: true,
          sendToEmployees: true,
          notifyInApp: true,
          rollbackOnFailure: true,
          encryptAttachments: true,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(String(j?.error || 'Payslip delivery failed. Payroll has been rolled back.'));
        const updatedRuns = await loadPayrollRuns();
        setPayrollRuns(updatedRuns);
        const updated = updatedRuns.find((r) => r.id === selectedRun.id);
        if (updated) setSelectedRun(updated);
        setProcessing(false);
        return;
      }

      setSelectedRun((prev) => (prev && prev.id === selectedRun.id ? { ...prev, status: 'Paid' as any } : prev));
      
      // Refresh payroll runs
      const updatedRuns = await loadPayrollRuns();
      setPayrollRuns(updatedRuns);
      const updated = updatedRuns.find((r) => r.id === selectedRun.id);
      if (updated) setSelectedRun(updated);
      setPayrollReport(report);
      
    } catch (error: any) {
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
      
      // Handle specific error types
      if (error.message?.includes('validation failed')) {
        alert('Payroll validation failed. Please review errors and try again.');
      } else if (error.message?.includes('timesheet')) {
        alert('Timesheet validation error. Please ensure all timesheets are approved.');
      } else if (error.message?.includes('record "new" has no field "updated_at"')) {
        alert('Database schema mismatch detected (missing updated_at column on a payroll table). Please apply the latest payroll migrations (loan_repayments.updated_at) and try again.');
      } else {
        const extra = [
          error?.code ? `code=${error.code}` : null,
          error?.hint ? `hint=${error.hint}` : null,
          error?.details ? `details=${error.details}` : null,
        ].filter(Boolean).join(' | ');
        alert(`Error processing payroll: ${error.message || 'Unknown error'}${extra ? ` (${extra})` : ''}. Please contact support.`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const generateReport = async (type: string) => {
    if (!selectedRun) return;

    try {
      const filters = {
        payrollRunId: selectedRun.id,
        startDate: selectedRun.pay_period_start,
        endDate: selectedRun.pay_period_end,
        payFrequency: selectedRun.pay_frequency as any,
        employeeIds: employees.filter(emp => emp.selected).map(emp => emp.employee_id),
        status: selectedRun.status as any
      };

      let report;
      // Fallback to DB fetching (e.g., for historical runs or compliance)
      switch (type) {
        case 'summary':
          report = await payrollReportingService.generatePayrollSummaryReport(filters);
          break;
        case 'tax':
          report = await payrollReportingService.generateTaxReport(filters);
          break;
        case 'super':
          report = await payrollReportingService.generateSuperannuationReport(filters);
          break;
        case 'compliance':
          report = await payrollReportingService.generateComplianceReport(filters);
          break;
      }

      setGeneratedReportData(report);
      setCurrentReportType(type);
      setShowReportModal(true);

      try {
        const selectedCount = employees.filter(emp => emp.selected).length;
        if (type === 'summary' && selectedCount > 0 && Number((report as any)?.employeeCount || 0) === 0) {
          console.warn('[payroll-process] report generated with zero employees', {
            type,
            payrollRunId: selectedRun.id,
            selectedCount,
            report,
          });
        }
      } catch {
      }
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    }
  };

  const handleDownloadReport = async (format: 'xlsx' | 'pdf') => {
    if (!generatedReportData || !currentReportType) return;

    try {
      setIsDownloadingReport(true);
      if (format === 'pdf') {
        switch (currentReportType) {
          case 'summary':
            pdfGeneratorService.generatePayrollSummaryReport(generatedReportData);
            break;
          case 'tax':
            pdfGeneratorService.generateTaxReport(generatedReportData);
            break;
          case 'super':
            pdfGeneratorService.generateSuperReport(generatedReportData);
            break;
          case 'compliance':
            pdfGeneratorService.generateComplianceReport(generatedReportData);
            break;
          default:
            alert('PDF generation not supported for this report type yet.');
        }
        alert('PDF download started.');
        return;
      }

      const report = generatedReportData;

      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      if (currentReportType === 'summary') {
        const rows = [
          { Field: 'Period Start', Value: report.period?.start || '' },
          { Field: 'Period End', Value: report.period?.end || '' },
          { Field: 'Total Gross', Value: report.totals?.grossPay ?? 0 },
          { Field: 'Total Tax', Value: report.totals?.tax ?? 0 },
          { Field: 'Total Net', Value: report.totals?.netPay ?? 0 },
          { Field: 'Total Super', Value: report.totals?.superannuation ?? 0 },
          { Field: 'Employee Count', Value: report.employeeCount ?? 0 },
          { Field: 'Payroll Runs', Value: report.payrollRuns ?? 0 },
        ];
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Summary');

        const dist = (report.payDistribution || []).map((d: any) => ({
          Range: d.range,
          Count: d.count,
          Percentage: d.percentage,
        }));
        const ws2 = XLSX.utils.json_to_sheet(dist);
        XLSX.utils.book_append_sheet(wb, ws2, 'Distribution');
      } else if (currentReportType === 'tax') {
        const breakdown = (report.taxBreakdown || []).map((t: any) => ({
          'Employee ID': t.employeeId,
          Employee: t.employeeName,
          TFN: t.taxFileNumber,
          'Gross Pay': t.grossPay,
          'Tax Withheld': t.taxWithheld,
          Super: t.superannuation,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(breakdown), 'Tax Breakdown');

        const stp = (report.stpSubmissions || []).map((s: any) => ({
          'Submission Date': s.submissionDate,
          Status: s.status,
          'Total Gross': s.totalGross,
          'Total Tax': s.totalTax,
          'Employee Count': s.employeeCount,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stp), 'STP');
      } else if (currentReportType === 'super') {
        const funds = (report.contributionsByFund || []).map((f: any) => ({
          Fund: f.fundName,
          ABN: f.abn,
          'Total Contributions': f.totalContributions,
          'Employee Count': f.employeeCount,
          'Unpaid Contributions': f.unpaidContributions,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(funds), 'By Fund');

        const employees = (report.employeeContributions || []).map((c: any) => ({
          'Employee ID': c.employeeId,
          Employee: c.employeeName,
          'Member #': c.superMemberNumber,
          Fund: c.fundName,
          Contributions: c.contributions,
          Status: c.paymentStatus,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(employees), 'Employees');
      } else if (currentReportType === 'compliance') {
        const overview = [
          { Field: 'Overall Compliance Rate', Value: report.overallComplianceRate ?? 0 },
          { Field: 'Min Wage Non-Compliant', Value: report.minimumWageCompliance?.nonCompliantEmployees ?? 0 },
          { Field: 'Award Non-Compliant', Value: report.awardCompliance?.nonCompliantEmployees ?? 0 },
          { Field: 'Tax Issues', Value: (report.taxCompliance?.issues || []).length },
          { Field: 'Overdue Super', Value: report.superannuationCompliance?.overdueContributions ?? 0 },
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overview), 'Overview');

        const recs = (report.recommendations || []).map((r: any) => ({ Recommendation: r }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recs), 'Recommendations');
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Report: JSON.stringify(report) }]), 'Report');
      }

      const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${currentReportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      alert('Excel download started.');
    } catch (err) {
      console.error('Error creating Excel:', err);
      alert('Failed to create Excel download.');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'text-green-600 bg-green-100';
      case 'Processing':
        return 'text-blue-600 bg-blue-100';
      case 'Approved':
        return 'text-purple-600 bg-purple-100';
      case 'Draft':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId ? (isEmployeeLocked(emp) ? { ...emp, selected: false } : { ...emp, selected: !emp.selected }) : emp
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Processing</h1>
          <p className="text-gray-600 mt-1">Process payroll runs and manage employee payments</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/payroll/runs/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Calendar className="h-4 w-4" />
            <span>New Payroll Run</span>
          </button>
        </div>
      </div>

      {/* Payroll Run Selection */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Select Payroll Run</h2>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
            {payrollRuns.map((run) => (
              <div
                key={run.id}
                data-testid={`payroll-run-${run.id}`}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedRun?.id === run.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  selectRun(run);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900">
                    {new Date(run.pay_period_start).toLocaleDateString()} - {new Date(run.pay_period_end).toLocaleDateString()}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    run.status === 'Paid' ? 'bg-green-100 text-green-800' :
                    run.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {run.status}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-500">
                  <p>{run.pay_frequency}</p>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span>{run.employee_count} employees selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    <span>${(run.total_net_pay || 0).toLocaleString()} net pay</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                    <Clock className="h-3 w-3" />
                    <span>Created: {new Date(run.created_at || '').toLocaleDateString()} {new Date(run.created_at || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg max-h-[600px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employees</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group" onClick={() => {
                    const sorted = [...payrollRuns].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                    setPayrollRuns(sorted);
                  }}>
                    <div className="flex items-center gap-1">
                      Created Date
                      <ArrowDown className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrollRuns.map((run) => (
                  <tr 
                    key={run.id}
                    data-testid={`payroll-run-${run.id}`}
                    onClick={() => {
                      selectRun(run);
                    }}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedRun?.id === run.id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(run.pay_period_start).toLocaleDateString()} - {new Date(run.pay_period_end).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {run.pay_frequency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        run.status === 'Paid' ? 'bg-green-100 text-green-800' :
                        run.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {run.employee_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${(run.total_net_pay || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(run.created_at || '').toLocaleDateString()} <span className="text-xs text-gray-400">{new Date(run.created_at || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showErrorDetails && validationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                Payroll Validation Errors
              </h2>
              <button 
                onClick={() => setShowErrorDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {validationResult.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <h3 className="text-lg font-medium text-red-800 mb-3">Critical Errors ({validationResult.errors.length})</h3>
                  <div className="space-y-2">
                    {validationResult.errors.map((error, idx) => (
                      <div key={idx} className="flex items-start bg-white p-3 rounded border border-red-200 shadow-sm">
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-red-700">{error}</span>
                        {employees.find(e => error.includes(e.first_name) || error.includes(e.last_name)) && (
                          <button
                             onClick={() => {
                               const emp = employees.find(e => error.includes(e.first_name) || error.includes(e.last_name));
                               if (emp) {
                                 setSelectedEmployeeId(emp.employee_id);
                                 setIsUpdateModalOpen(true);
                               }
                             }}
                             className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                          >
                            Fix Employee
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationResult.missingTimesheets.length > 0 && (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-lg font-medium text-orange-800">
                      Missing Timesheets ({validationResult.missingTimesheets.length})
                    </h3>
                    {isHrAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const ids = validationResult.missingTimesheets
                            .map((msg) => {
                              const emp = employees.find((e) => e.employee_id === msg || e.id === msg);
                              return emp?.employee_id || (isUuid(msg) ? msg : null);
                            })
                            .filter(Boolean) as string[];
                          sendTimesheetNotifications('MISSING', ids);
                        }}
                        className="text-sm text-orange-800 hover:text-orange-900 font-medium whitespace-nowrap"
                      >
                        Send all emails
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {validationResult.missingTimesheets.map((msg, idx) => (
                      <div key={idx} className="flex items-start bg-white p-3 rounded border border-orange-200 shadow-sm">
                        <Clock className="h-5 w-5 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-orange-700">
                          {(() => {
                            const emp = employees.find(e => e.employee_id === msg || e.id === msg);
                            if (emp) return `${emp.first_name} ${emp.last_name}`;
                            if (isUuid(msg)) return 'Unknown employee';
                            return msg;
                          })()}
                        </span>
                        {(() => {
                          if (!isHrAdmin) return null;
                          const emp = employees.find(e => e.employee_id === msg || e.id === msg);
                          const employeeId = emp?.employee_id || (isUuid(msg) ? msg : '');
                          if (!employeeId) return null;
                          const status = timesheetEmailStatuses?.[employeeId]?.TIMESHEET_MISSING;
                          const sending = !!sendingTimesheetEmails?.[`MISSING:${employeeId}`];
                          if (!status?.status) return (
                            <button
                              type="button"
                              disabled={sending}
                              onClick={() => sendTimesheetNotifications('MISSING', [employeeId])}
                              className="ml-auto mr-3 text-sm text-orange-800 hover:text-orange-900 font-medium whitespace-nowrap disabled:opacity-60"
                            >
                              {sending ? 'Sending…' : 'Send Email'}
                            </button>
                          );
                          return (
                            <div className="ml-auto mr-3 flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-1 rounded border ${
                                  status.status === 'SENT'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : status.status === 'FAILED'
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-gray-50 text-gray-700 border-gray-200'
                                }`}
                              >
                                {status.status === 'SKIPPED_DUPLICATE' ? 'Sent recently' : String(status.status)}
                              </span>
                              <button
                                type="button"
                                disabled={sending}
                                onClick={() => sendTimesheetNotifications('MISSING', [employeeId])}
                                className="text-sm text-orange-800 hover:text-orange-900 font-medium whitespace-nowrap disabled:opacity-60"
                              >
                                {sending ? 'Sending…' : 'Resend'}
                              </button>
                            </div>
                          );
                        })()}
                        <button
                           onClick={() => {
                             setShowErrorDetails(false);
                             const params = new URLSearchParams();
                             if (selectedRun?.pay_period_start) params.set('payPeriodStart', selectedRun.pay_period_start);
                             if (selectedRun?.pay_period_end) params.set('payPeriodEnd', selectedRun.pay_period_end);
                             router.push(`/attendance/timesheets${params.toString() ? `?${params.toString()}` : ''}`);
                           }}
                           className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                        >
                          Manage Timesheets
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
               {validationResult.unapprovedTimesheets.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-lg font-medium text-yellow-800">
                      Unapproved Timesheets ({validationResult.unapprovedTimesheets.length})
                    </h3>
                    {isHrAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const ids = validationResult.unapprovedTimesheets
                            .map((msg) => {
                              const emp = employees.find((e) => e.employee_id === msg || e.id === msg);
                              return emp?.employee_id || (isUuid(msg) ? msg : null);
                            })
                            .filter(Boolean) as string[];
                          sendTimesheetNotifications('UNAPPROVED', ids);
                        }}
                        className="text-sm text-yellow-800 hover:text-yellow-900 font-medium whitespace-nowrap"
                      >
                        Send all emails
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {validationResult.unapprovedTimesheets.map((msg, idx) => (
                      <div key={idx} className="flex items-start bg-white p-3 rounded border border-yellow-200 shadow-sm">
                        <Clock className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-yellow-700">
                          {(() => {
                            if (isUuid(msg)) {
                              const emp = employees.find(e => e.employee_id === msg || e.id === msg);
                              if (emp) return `${emp.first_name} ${emp.last_name}`;
                              return 'Unknown employee';
                            }
                            return msg;
                          })()}
                        </span>
                        {(() => {
                          if (!isHrAdmin) return null;
                          const emp = employees.find(e => e.employee_id === msg || e.id === msg);
                          const employeeId = emp?.employee_id || (isUuid(msg) ? msg : '');
                          if (!employeeId) return null;
                          const status = timesheetEmailStatuses?.[employeeId]?.TIMESHEET_APPROVAL_REQUIRED;
                          const sending = !!sendingTimesheetEmails?.[`UNAPPROVED:${employeeId}`];
                          if (!status?.status) return (
                            <button
                              type="button"
                              disabled={sending}
                              onClick={() => sendTimesheetNotifications('UNAPPROVED', [employeeId])}
                              className="ml-auto mr-3 text-sm text-yellow-800 hover:text-yellow-900 font-medium whitespace-nowrap disabled:opacity-60"
                            >
                              {sending ? 'Sending…' : 'Send Email'}
                            </button>
                          );
                          return (
                            <div className="ml-auto mr-3 flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-1 rounded border ${
                                  status.status === 'SENT'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : status.status === 'FAILED'
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-gray-50 text-gray-700 border-gray-200'
                                }`}
                              >
                                {status.status === 'SKIPPED_DUPLICATE' ? 'Sent recently' : String(status.status)}
                              </span>
                              <button
                                type="button"
                                disabled={sending}
                                onClick={() => sendTimesheetNotifications('UNAPPROVED', [employeeId])}
                                className="text-sm text-yellow-800 hover:text-yellow-900 font-medium whitespace-nowrap disabled:opacity-60"
                              >
                                {sending ? 'Sending…' : 'Resend'}
                              </button>
                            </div>
                          );
                        })()}
                         <button
                           onClick={() => {
                             setShowErrorDetails(false);
                             const params = new URLSearchParams();
                             if (selectedRun?.pay_period_start) params.set('payPeriodStart', selectedRun.pay_period_start);
                             if (selectedRun?.pay_period_end) params.set('payPeriodEnd', selectedRun.pay_period_end);
                             router.push(`/attendance/timesheets${params.toString() ? `?${params.toString()}` : ''}`);
                           }}
                           className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                        >
                          Approve Timesheets
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowErrorDetails(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRun && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-4 lg:col-span-3 bg-gray-50 border border-gray-100 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h2 className="text-base font-semibold text-gray-900">
                        Validation {validating && <span className="text-sm text-gray-500 font-normal">(Validating...)</span>}
                      </h2>
                      {validationError && !validationResult && (
                        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          <div className="text-sm font-medium text-red-800">Validation error</div>
                          <div className="text-sm text-red-700">{validationError}</div>
                        </div>
                      )}
                      {validationResult ? (
                        validationResult.isValid ? (
                          <div className="flex items-center text-green-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            <span className="text-sm">Ready to process.</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-700">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            <span className="text-sm">Needs attention before processing.</span>
                          </div>
                        )
                      ) : (
                        <div className="text-sm text-gray-600">No validation results yet.</div>
                      )}
                    </div>

                    {validationResult && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            validationResult.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {validationResult.isValid ? 'Valid' : 'Invalid'}
                        </span>
                        {!validationResult.isValid && (
                          <button
                            onClick={() => setShowErrorDetails(true)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {validationResult && (
                    <div className="space-y-2">
                      {validationError && (
                        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          <div className="text-sm font-medium text-red-800">Validation error</div>
                          <div className="text-sm text-red-700">{validationError}</div>
                        </div>
                      )}

                      {(() => {
                        if (validationResult.isValid) return null;
                        const ids = Array.from(
                          new Set([
                            ...(validationResult.missingTimesheets || []),
                            ...(validationResult.unapprovedTimesheets || []),
                            ...(validationResult.incompleteTimesheets || []),
                          ].map(String))
                        );
                        if (ids.length === 0) return null;
                        const names = ids
                          .map((id) => {
                            const emp = employees.find((e) => e.employee_id === id || e.id === id);
                            return emp ? `${emp.first_name} ${emp.last_name}`.trim() : id;
                          })
                          .filter(Boolean);
                        const shown = names.slice(0, 8);
                        const more = names.length > 8 ? ` (+${names.length - 8} more)` : '';
                        return (
                          <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2" data-testid="timesheet-issues-warning">
                            <div className="text-sm font-medium text-orange-800">Timesheet issues detected</div>
                            <div className="text-sm text-orange-700">
                              {shown.join(', ')}
                              {more}
                            </div>
                            <div className="text-xs text-orange-700 mt-1">
                              Fix missing/incomplete entries and ensure timesheets are Approved for this pay period.
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const params = new URLSearchParams();
                                if (selectedRun?.pay_period_start) params.set('payPeriodStart', selectedRun.pay_period_start);
                                if (selectedRun?.pay_period_end) params.set('payPeriodEnd', selectedRun.pay_period_end);
                                router.push(`/attendance/timesheets${params.toString() ? `?${params.toString()}` : ''}`);
                              }}
                              className="mt-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 px-3 py-2 w-full"
                            >
                              Open Timesheets to fix
                            </button>
                          </div>
                        );
                      })()}

                      {validationResult.errors.length > 0 && (
                        <details className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          <summary className="cursor-pointer text-sm font-medium text-red-800">
                            Errors ({validationResult.errors.length})
                          </summary>
                          <ul className="mt-2 list-disc list-inside text-sm text-red-700 space-y-1">
                            {validationResult.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </details>
                      )}

                      {validationResult.warnings.length > 0 && (
                        <details className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                          <summary className="cursor-pointer text-sm font-medium text-yellow-800">
                            Warnings ({validationResult.warnings.length})
                          </summary>
                          <ul className="mt-2 list-disc list-inside text-sm text-yellow-700 space-y-1">
                            {validationResult.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </details>
                      )}

                      {validationResult.missingTimesheets.length > 0 && (
                        <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                          <div className="text-sm font-medium text-orange-800">Missing Timesheets</div>
                          <div className="text-sm text-orange-700">{validationResult.missingTimesheets.length} employees</div>
                        </div>
                      )}

                      {validationResult.incompleteTimesheets.length > 0 && (
                        <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                          <div className="text-sm font-medium text-orange-800">Incomplete Timesheets</div>
                          <div className="text-sm text-orange-700">{validationResult.incompleteTimesheets.length} employees</div>
                        </div>
                      )}

                      {validationResult.unapprovedTimesheets.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                          <div className="text-sm font-medium text-yellow-800">Unapproved Timesheets</div>
                          <div className="text-sm text-yellow-700">{validationResult.unapprovedTimesheets.length} employees</div>
                        </div>
                      )}

                      {validationResult.unapprovedTimesheets.length > 0 && isHrAdmin && selectedRun.status !== 'Paid' && (
                        <button
                          type="button"
                          onClick={requestManagerApprovals}
                          disabled={requestingApprovals}
                          className="w-full mt-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 disabled:opacity-60"
                        >
                          {requestingApprovals ? 'Requesting approvals...' : 'Request manager approvals'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-8 lg:col-span-6 bg-white border border-gray-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-base font-semibold text-gray-900">Employees</h2>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                      <button
                        onClick={() => setEmployees(prev => prev.map(emp => isEmployeeLocked(emp) ? { ...emp, selected: false } : { ...emp, selected: true }))}
                        disabled={!isHrAdmin || selectedRun.status === 'Paid'}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setEmployees(prev => prev.map(emp => ({ ...emp, selected: false })))}
                        disabled={!isHrAdmin || selectedRun.status === 'Paid'}
                        className="text-sm text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Deselect All
                      </button>
                      <button
                        onClick={() => setShowAddEmployeeModal(true)}
                        disabled={!isHrAdmin || selectedRun.status === 'Paid'}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center disabled:text-gray-400 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
                        title={!isHrAdmin ? 'Read-only access' : selectedRun.status === 'Paid' ? "This payroll run is already paid and locked" : undefined}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Add Employee
                      </button>
                    </div>
                  </div>

                  {employees.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-lg">
                      <Users className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium">No active employees found</p>
                      <p className="text-gray-500 text-sm mt-1">
                        There are no active employees configured with <strong>{selectedRun.pay_frequency}</strong> pay frequency.
                      </p>
                      <button
                        onClick={() => router.push('/payroll/employees')}
                        className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Configure employee payroll settings →
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                      {employees.map((employee) => (
                        (() => {
                          const locked = isEmployeeLocked(employee);
                          const lockedReason = selectedRun.status === 'Paid' || paidEmployeeIdsForPeriod.has(employee.employee_id)
                            ? "This employee's payroll is already processed and paid"
                            : 'Read-only access';
                          return (
                        <div
                          key={employee.id}
                          className={`p-4 border rounded-lg transition-colors ${
                            locked
                              ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                              : employee.selected ? 'border-blue-500 bg-blue-50 cursor-pointer' : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                          }`}
                          onClick={() => {
                            if (locked) return;
                            toggleEmployeeSelection(employee.id);
                          }}
                          title={locked ? lockedReason : undefined}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={employee.selected}
                                disabled={locked}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => {
                                  if (locked) return;
                                  toggleEmployeeSelection(employee.id);
                                }}
                                className="mt-1"
                                title={locked ? lockedReason : undefined}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="font-medium text-gray-900 leading-5">
                                      {employee.first_name} {employee.last_name}
                                    </p>
                                    {employee.employee_code && (
                                      <p className="text-xs text-gray-500 whitespace-nowrap">{employee.employee_code}</p>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {employee.employment_type} • {employee.pay_frequency} • {employee.employment_status || 'Unknown'}
                                  </p>
                                </div>

                                {(() => {
                                  const hours = approvedHoursByEmployeeId[employee.employee_id];
                                  if (typeof hours === 'number') {
                                    return (
                                      <div className="mt-2 flex flex-col gap-1">
                                        <p className="text-xs text-gray-500">Approved Hours: {hours.toFixed(1)}</p>
                                        <div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setTimesheetPopupEmployee(employee);
                                              setTimesheetPopupOpen(true);
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                          >
                                            View timesheets
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }
                                  if (loadingApprovedHours) {
                                    return <p className="mt-2 text-xs text-gray-400">Approved Hours: ...</p>;
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>

                            <div className="flex items-center justify-end pt-2 border-t border-gray-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isHrAdmin || selectedRun.status === 'Paid') return;
                                  setSelectedEmployeeId(employee.employee_id);
                                  setIsUpdateModalOpen(true);
                                }}
                                disabled={!isHrAdmin || selectedRun.status === 'Paid'}
                                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors disabled:hover:text-gray-500 disabled:hover:bg-transparent disabled:cursor-not-allowed inline-flex items-center gap-2"
                                title={!isHrAdmin ? 'Read-only access' : selectedRun.status === 'Paid' ? "This payroll run is already paid and locked" : 'Update Employee Details'}
                              >
                                <Edit className="w-4 h-4" />
                                Update
                              </button>
                            </div>
                          </div>
                        </div>
                          );
                        })()
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-12 lg:col-span-3 bg-gray-50 border border-gray-100 rounded-lg p-4">
                <div className="space-y-3">
                  <h2 className="text-base font-semibold text-gray-900">Processing</h2>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">Validate timesheets before processing</span>
                    </label>
                    <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">Require manager approval for processing</span>
                    </label>
                    <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
                      <input
                        type="checkbox"
                        checked={options.generatePayslips}
                        onChange={(e) => setOptions(prev => ({ ...prev, generatePayslips: e.target.checked }))}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">Generate payslips automatically</span>
                    </label>
                    <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
                      <input
                        type="checkbox"
                        checked={options.sendNotifications}
                        onChange={(e) => setOptions(prev => ({ ...prev, sendNotifications: e.target.checked }))}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">Send notifications to employees</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {selectedRun && validationResult && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={processPayroll}
              disabled={processing || !validationResult.isValid || !isHrAdmin || selectedRun.status === 'Paid'}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              title={!isHrAdmin ? 'Read-only access' : selectedRun.status === 'Paid' ? "This payroll run is already paid and locked" : undefined}
            >
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Process Payroll</span>
                </>
              )}
            </button>

            <button
              onClick={() => generateReport('summary')}
              disabled={processing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Summary Report</span>
            </button>

            <button
              onClick={() => generateReport('tax')}
              disabled={processing}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Tax Report</span>
            </button>

            <button
              onClick={() => generateReport('super')}
              disabled={processing}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Super Report</span>
            </button>

            <button
              onClick={() => generateReport('compliance')}
              disabled={processing}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Compliance Report</span>
            </button>
          </div>
        </div>
      )}

      {/* Payroll Report */}
      {isPaidRun && payrollReport && (
        <div className="bg-white p-6 rounded-lg shadow-sm border relative transition-opacity duration-200" data-testid="payroll-summary-panel">
          {calculating && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-lg backdrop-blur-[1px]">
              <div className="bg-white p-3 rounded-full shadow-lg border border-gray-100">
                <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Payroll Summary</h2>
            <div className="flex items-center gap-3">
              {lastPreviewUpdatedAt && (
                <span className="text-xs text-gray-500">Last updated: {lastPreviewUpdatedAt}</span>
              )}
              {calculating && <span className="text-xs text-blue-600 font-medium animate-pulse">Recalculating totals...</span>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-700">Total Employees</p>
              <p className="text-2xl font-bold text-green-900">{payrollReport.totalEmployees}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-700">Total Gross Pay</p>
              <p className="text-2xl font-bold text-blue-900">${payrollReport.totalGrossPay.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-700">Total Tax</p>
              <p className="text-2xl font-bold text-purple-900">${payrollReport.totalTax.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-700">Total Net Pay</p>
              <p className="text-2xl font-bold text-green-900">${payrollReport.totalNetPay.toLocaleString()}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Super</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrollReport.employeeBreakdown.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-500" colSpan={7}>
                      {employees.some(e => e.selected)
                        ? 'Unable to load employee breakdown for the selected employees.'
                        : 'No employee breakdown available for this run.'}
                    </td>
                  </tr>
                ) : payrollReport.employeeBreakdown.map((emp, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {emp.employeeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${emp.grossPay.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${emp.tax.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${emp.netPay.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${emp.super.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const approved = approvedHoursByEmployeeId[emp.employeeId];
                        const value = typeof approved === 'number' && Number.isFinite(approved) ? approved : emp.hoursWorked;
                        return Number(value || 0).toFixed(1);
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        emp.status === 'Processed' ? 'text-green-600 bg-green-100' :
                        emp.status === 'Error' ? 'text-red-600 bg-red-100' :
                        'text-yellow-600 bg-yellow-100'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      <PayrollConfigurationModal 
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        defaultPayFrequency={selectedRun?.pay_frequency}
        onSave={() => {
          // Refresh employee list after adding
          if (selectedRun) {
            loadEmployees(selectedRun.pay_frequency).then((emps) => setEmployees((prev) => mergeEmployeeSelection(prev, emps)));
          } else {
            loadEmployees().then((emps) => setEmployees((prev) => mergeEmployeeSelection(prev, emps)));
          }
        }}
      />

      {/* Report Download Modal */}
      <ReportDownloadModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportType={currentReportType}
        reportData={generatedReportData}
        onDownload={handleDownloadReport}
        isDownloading={isDownloadingReport}
      />

      {/* Employee Update Modal */}
      <EmployeeUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        employeeId={selectedEmployeeId || ''}
        onSuccess={() => {
          // Optionally refresh employee list or show toast
          if (selectedRun) {
            loadEmployees(selectedRun.pay_frequency).then(emps => {
               // Preserve selection state
               const currentSelection = new Set(employees.filter(e => e.selected).map(e => e.id));
               const updatedEmps = emps.map(e => ({
                 ...e,
                 selected: currentSelection.has(e.id)
               }));
               setEmployees(updatedEmps);

               // Always re-validate for the selected run
               if (selectedRun) {
                 validatePayrollRun(selectedRun.id);
               }
            });
          }
        }}
      />

      {timesheetPopupOpen && timesheetPopupEmployee && selectedRun && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[900px] shadow-lg rounded-md bg-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Approved Timesheets</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {timesheetPopupEmployee.first_name} {timesheetPopupEmployee.last_name} • {selectedRun.pay_period_start} to {selectedRun.pay_period_end}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTimesheetPopupOpen(false);
                  setTimesheetPopupEmployee(null);
                  setTimesheetPopupRows([]);
                  setTimesheetPopupError(null);
                }}
                className="ml-4 text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              {timesheetPopupError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
                  {timesheetPopupError}
                </div>
              )}

              {!timesheetPopupError && timesheetPopupLoading && (
                <div className="p-6 text-sm text-gray-500">Loading timesheets...</div>
              )}

              {!timesheetPopupError && !timesheetPopupLoading && (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Approved Hours</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {timesheetPopupRows.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                            No approved timesheets found for this period.
                          </td>
                        </tr>
                      ) : (
                        timesheetPopupRows.map((r) => {
                          const weekStart = String(r.week_start_date || '').slice(0, 10);
                          const d = new Date(`${weekStart}T00:00:00.000Z`);
                          const end = new Date(d);
                          end.setUTCDate(end.getUTCDate() + 6);
                          const weekEnd = Number.isNaN(end.getTime()) ? '' : end.toISOString().slice(0, 10);
                          const displayStart = selectedRun?.pay_period_start
                            ? clampIsoDate(weekStart, selectedRun.pay_period_start, weekStart)
                            : weekStart;
                          const displayEnd = selectedRun?.pay_period_end
                            ? clampIsoDate(weekEnd, weekEnd, selectedRun.pay_period_end)
                            : weekEnd;
                          const approved = Number((r as any).approved_hours ?? 0);
                          const total = Number((r as any).total_hours ?? 0);
                          return (
                            <tr key={r.id}>
                              <td className="px-4 py-3 text-sm text-gray-900">{displayStart}{displayEnd ? ` - ${displayEnd}` : ''}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{String(r.status || '')}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{Number.isFinite(approved) ? approved.toFixed(1) : '0.0'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{Number.isFinite(total) ? total.toFixed(1) : '0.0'}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('payPeriodStart', selectedRun.pay_period_start);
                                    params.set('payPeriodEnd', selectedRun.pay_period_end);
                                    params.set('search', timesheetPopupEmployee.employee_id);
                                    router.push(`/attendance/timesheets?${params.toString()}`);
                                    setTimesheetPopupOpen(false);
                                  }}
                                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Open dashboard
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setTimesheetPopupOpen(false);
                  setTimesheetPopupEmployee(null);
                  setTimesheetPopupRows([]);
                  setTimesheetPopupError(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
