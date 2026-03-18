import { supabase } from '@/lib/supabase';
import { auditService } from './auditService';
import { comprehensivePayrollService } from './comprehensivePayrollService';

export function normalizePayrollRunStatusCandidates(status: string): string[] {
  const s = String(status || '').trim();
  if (!s) return [];
  const lower = s.toLowerCase();
  const upperFirst = lower.charAt(0).toUpperCase() + lower.slice(1);
  const allUpper = s.toUpperCase();
  return Array.from(new Set([s, lower, upperFirst, allUpper])).filter(Boolean);
}

export interface PayrollReportFilters {
  payrollRunId?: string;
  startDate?: string;
  endDate?: string;
  employeeIds?: string[];
  departments?: string[];
  payFrequency?: 'Weekly' | 'Fortnightly' | 'Monthly';
  status?: 'Draft' | 'Approved' | 'Processing' | 'Paid' | 'STPSubmitted';
}

export interface PayrollSummaryReport {
  period: {
    start: string;
    end: string;
  };
  totals: {
    grossPay: number;
    tax: number;
    netPay: number;
    superannuation: number;
    allowances: number;
    overtime: number;
    deductions: number;
  };
  employeeCount: number;
  payrollRuns: number;
  averagePay: number;
  medianPay: number;
  payDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

export interface EmployeePayrollReport {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  employmentType: string;
  payFrequency: string;
  periodTotals: {
    grossPay: number;
    tax: number;
    netPay: number;
    superannuation: number;
    hoursWorked: number;
  };
  ytdTotals: {
    grossPay: number;
    tax: number;
    netPay: number;
    superannuation: number;
  };
  payslips: {
    id: string;
    periodStart: string;
    periodEnd: string;
    grossPay: number;
    netPay: number;
    paymentDate: string;
    status: string;
  }[];
}

export interface TaxReport {
  period: {
    start: string;
    end: string;
  };
  totalTaxWithheld: number;
  taxBreakdown: {
    employeeId: string;
    employeeName: string;
    taxFileNumber: string;
    grossPay: number;
    taxWithheld: number;
    superannuation: number;
  }[];
  stpSubmissions: {
    id: string;
    submissionDate: string;
    status: string;
    totalGross: number;
    totalTax: number;
    employeeCount: number;
  }[];
}

export interface SuperannuationReport {
  period: {
    start: string;
    end: string;
  };
  totalContributions: number;
  contributionsByFund: {
    fundId: string;
    fundName: string;
    abn: string;
    totalContributions: number;
    employeeCount: number;
    unpaidContributions: number;
  }[];
  employeeContributions: {
    employeeId: string;
    employeeName: string;
    superMemberNumber: string;
    fundName: string;
    contributions: number;
    paymentStatus: 'Paid' | 'Pending' | 'Overdue';
  }[];
  complianceStatus: {
    totalDue: number;
    totalPaid: number;
    overdueAmount: number;
    complianceRate: number;
    issues: string[];
  };
}

export interface PayrollComplianceReport {
  period: {
    start: string;
    end: string;
  };
  minimumWageCompliance: {
    compliantEmployees: number;
    nonCompliantEmployees: number;
    totalUnderpayment: number;
    issues: string[];
  };
  awardCompliance: {
    compliantEmployees: number;
    nonCompliantEmployees: number;
    penaltyRateIssues: string[];
    allowanceIssues: string[];
  };
  taxCompliance: {
    compliantEmployees: number;
    issues: string[];
  };
  superannuationCompliance: {
    compliantEmployees: number;
    unpaidContributions: number;
    overdueContributions: number;
    issues: string[];
  };
  overallComplianceRate: number;
  recommendations: string[];
}

export const payrollReportingService = {
  async generatePayrollSummaryReport(filters: PayrollReportFilters): Promise<PayrollSummaryReport> {
    try {
      const { data: payslips, error } = await this.getPayslipsWithDetails(filters);

      if (error) throw error;
      if (!payslips || payslips.length === 0) {
        const preview = await this.tryBuildPreviewPayrollReport(filters);
        if (preview) {
          await auditService.logAction(
            'payroll_reports',
            `summary_report_preview_${filters.payrollRunId}`,
            'SYSTEM_ACTION',
            null,
            { filters, source: 'preview', employeeCount: preview.totalEmployees },
            'system'
          );
          return this.buildSummaryFromPreview(filters, preview);
        }
        return this.createEmptySummaryReport(filters);
      }

      // Calculate totals
      const totals = this.calculateTotals(payslips);

      // Calculate statistics
      const netPays = payslips.map((p) => Number(p.net_pay || 0));
      const averagePay = netPays.reduce((sum, pay) => sum + pay, 0) / (netPays.length || 1);
      const medianPay = this.calculateMedian(netPays);

      // Generate pay distribution
      const payDistribution = this.generatePayDistribution(netPays);

      // Create audit log
      await auditService.logAction(
        "payroll_reports",
        "summary_report",
        "SYSTEM_ACTION",
        null,
        { filters, recordCount: payslips.length },
        "system"
      );

      return {
        period: {
          start: filters.startDate || payslips[0].pay_period_start || payslips[0].period_start,
          end: filters.endDate || payslips[payslips.length - 1].pay_period_end || payslips[payslips.length - 1].period_end,
        },
        totals,
        employeeCount: new Set(payslips.map((p) => p.employee_id)).size,
        payrollRuns: new Set(payslips.map((p) => p.payroll_run_id)).size,
        averagePay,
        medianPay,
        payDistribution,
      };
    } catch (error: any) {
      console.error("Error generating payroll summary report:", JSON.stringify(error, null, 2) || error.message || error);
      throw error;
    }
  },

  async generateEmployeePayrollReport(
    employeeId: string,
    filters: PayrollReportFilters
  ): Promise<EmployeePayrollReport> {
    try {
      const employeeFilters = { ...filters, employeeIds: [employeeId] };
      const { data: payslips, error } = await this.getPayslipsWithDetails(employeeFilters);
      
      if (error) throw error;

      // Get employee details
      const { data: employee } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          department_id,
          position_id
        `)
        .eq('id', employeeId)
        .single();

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Fetch additional details from payroll_employees
      const { data: payrollEmp } = await supabase
        .from('payroll_employees')
        .select('employment_type, pay_frequency')
        .eq('employee_id', employeeId)
        .single();

      // Fetch department and position names
      const { data: dept } = employee.department_id 
        ? await supabase.from('departments').select('name').eq('id', employee.department_id).single()
        : { data: null };
      
      const { data: pos } = employee.position_id
        ? await supabase.from('job_positions').select('title').eq('id', employee.position_id).single()
        : { data: null };

      // Calculate period totals
      const totals = this.calculateTotals(payslips || []);
      const periodTotals = {
        grossPay: totals.grossPay,
        tax: totals.tax,
        netPay: totals.netPay,
        superannuation: totals.superannuation,
        hoursWorked: (payslips || []).reduce((sum, p) => sum + (Number(p.hours_logged) || 0), 0)
      };
      
      // Calculate YTD totals
      const ytdTotals = await this.calculateYTDTotals(employeeId, filters);

      // Create audit log
      await auditService.logAction(
        'payroll_reports',
        `employee_report_${employeeId}`,
        'SYSTEM_ACTION',
        null,
        { employeeId, filters },
        'system'
      );

      return {
        employeeId: employee.id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        department: dept?.name || 'Unknown',
        position: pos?.title || 'Unknown',
        employmentType: payrollEmp?.employment_type || 'FullTime',
        payFrequency: payrollEmp?.pay_frequency || 'Monthly',
        periodTotals,
        ytdTotals,
        payslips: (payslips || []).map(p => ({
          id: p.id,
          periodStart: p.pay_period_start || p.period_start,
          periodEnd: p.pay_period_end || p.period_end,
          grossPay: Number(p.gross_earnings || p.gross_pay || 0),
          netPay: Number(p.net_pay || 0),
          paymentDate: p.payment_date,
          status: p.status
        }))
      };
    } catch (error: any) {
      console.error('Error generating employee payroll report:', JSON.stringify(error, null, 2) || error.message || error);
      throw error;
    }
  },

  async generateTaxReport(filters: PayrollReportFilters): Promise<TaxReport> {
    try {
      const { data: payslips, error } = await this.getPayslipsWithDetails(filters);
      
      if (error) throw error;
      if (!payslips || payslips.length === 0) {
        const preview = await this.tryBuildPreviewPayrollReport(filters);
        if (preview) {
          await auditService.logAction(
            'payroll_reports',
            `tax_report_preview_${filters.payrollRunId}`,
            'SYSTEM_ACTION',
            null,
            { filters, source: 'preview', employeeCount: preview.totalEmployees },
            'system'
          );
          return await this.buildTaxFromPreview(filters, preview);
        }
        return this.createEmptyTaxReport(filters);
      }

      // Get STP submissions for the period
      const { data: stpSubmissions } = await supabase
        .from('stp_submissions')
        .select('*')
        .gte('submission_date', filters.startDate || '1970-01-01')
        .lte('submission_date', filters.endDate || new Date().toISOString());

      // Build tax breakdown
      const taxBreakdown = await this.buildTaxBreakdown(payslips);

      // Create audit log
      await auditService.logAction(
        'payroll_reports',
        'tax_report',
        'SYSTEM_ACTION',
        null,
        { filters, recordCount: payslips.length },
        'system'
      );

      return {
        period: {
          start: filters.startDate || payslips[0].pay_period_start || payslips[0].period_start,
          end: filters.endDate || payslips[payslips.length - 1].pay_period_end || payslips[payslips.length - 1].period_end
        },
        totalTaxWithheld: payslips.reduce((sum, p) => sum + (Number(p.income_tax || p.tax_withheld) || 0), 0),
        taxBreakdown,
        stpSubmissions: (stpSubmissions || []).map(s => ({
          id: s.id,
          submissionDate: s.submission_date,
          status: s.status,
          totalGross: Number(s.total_gross || 0),
          totalTax: Number(s.total_tax || 0),
          employeeCount: Number(s.employee_count || 0)
        }))
      };
    } catch (error: any) {
      console.error('Error generating tax report:', JSON.stringify(error, null, 2) || error.message || error);
      throw error;
    }
  },

  async generateSuperannuationReport(filters: PayrollReportFilters): Promise<SuperannuationReport> {
    try {
      const { data: contributions, error } = await supabase
        .from('superannuation_contributions')
        .select(`
          *,
          employees:employee_id (
            first_name,
            last_name,
            payroll_employees (
              super_member_number
            )
          )
        `)
        .gte('period_start', filters.startDate || '1970-01-01')
        .lte('period_end', filters.endDate || new Date().toISOString());

      if (error) throw error;
      if (!contributions || contributions.length === 0) {
        const preview = await this.tryBuildPreviewPayrollReport(filters);
        if (preview) {
          await auditService.logAction(
            'payroll_reports',
            `super_report_preview_${filters.payrollRunId}`,
            'SYSTEM_ACTION',
            null,
            { filters, source: 'preview', employeeCount: preview.totalEmployees },
            'system'
          );
          return await this.buildSuperFromPreview(filters, preview);
        }
        return this.createEmptySuperReport(filters);
      }

      // Group by fund
      const contributionsByFund = this.groupContributionsByFund(contributions);
      
      // Employee contributions
      const employeeContributions = contributions.map(c => {
        let status: 'Paid' | 'Pending' | 'Overdue' = 'Pending';
        if (c.is_paid) {
          status = 'Paid';
        } else if (c.payment_date && c.payment_date < new Date().toISOString()) {
          status = 'Overdue';
        }
        
        // Try to get fund name from fund_id or other fields if relation failed
        const fundName = c.fund_name || String(c.fund_id || 'Unknown Fund');
        
        // Try to get super member number from payroll_employees array or direct field if available
        const payrollEmp = c.employees?.payroll_employees?.[0];
        const memberNumber = String(payrollEmp?.super_member_number || c.super_member_number || '');
        
        return {
          employeeId: String(c.employee_id),
          employeeName: `${c.employees?.first_name || 'Unknown'} ${c.employees?.last_name || ''}`,
          superMemberNumber: memberNumber,
          fundName: fundName,
          contributions: Number(c.amount || 0),
          paymentStatus: status
        };
      });

      // Compliance status
      const complianceStatus = this.calculateSuperCompliance(contributions);

      // Create audit log
      await auditService.logAction(
        'payroll_reports',
        'superannuation_report',
        'SYSTEM_ACTION',
        null,
        { filters, recordCount: contributions.length },
        'system'
      );

      return {
        period: {
          start: filters.startDate || contributions[0].period_start,
          end: filters.endDate || contributions[contributions.length - 1].period_end
        },
        totalContributions: contributions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
        contributionsByFund,
        employeeContributions,
        complianceStatus
      };
    } catch (error: any) {
      console.error('Error generating superannuation report:', JSON.stringify(error, null, 2) || error.message || error);
      throw error;
    }
  },

  async generateComplianceReport(filters: PayrollReportFilters): Promise<PayrollComplianceReport> {
    try {
      const { data: payslips, error } = await this.getPayslipsWithDetails(filters);
      
      if (error) throw error;
      if (!payslips || payslips.length === 0) {
        const preview = await this.tryBuildPreviewPayrollReport(filters);
        if (preview) {
          await auditService.logAction(
            'payroll_reports',
            `compliance_report_preview_${filters.payrollRunId}`,
            'SYSTEM_ACTION',
            null,
            { filters, source: 'preview', employeeCount: preview.totalEmployees },
            'system'
          );
          return this.buildComplianceFromPreview(filters, preview);
        }
        return this.createEmptyComplianceReport(filters);
      }

      // Minimum wage compliance
      const minimumWageCompliance = await this.checkMinimumWageCompliance(payslips);
      
      // Award compliance (simplified)
      const awardCompliance = await this.checkAwardCompliance(payslips);
      
      // Tax compliance
      const taxCompliance = await this.checkTaxCompliance(payslips);
      
      // Superannuation compliance
      const superannuationCompliance = await this.checkSuperannuationCompliance(payslips);

      // Calculate overall compliance rate
      const overallComplianceRate = this.calculateOverallComplianceRate([
        minimumWageCompliance,
        awardCompliance,
        taxCompliance,
        superannuationCompliance
      ]);

      // Generate recommendations
      const recommendations = await this.generateComplianceRecommendations({
        minimumWageCompliance,
        awardCompliance,
        taxCompliance,
        superannuationCompliance
      });

      // Create audit log
      await auditService.logAction(
        'payroll_reports',
        'compliance_report',
        'SYSTEM_ACTION',
        null,
        { filters, recordCount: payslips.length },
        'system'
      );

      return {
        period: {
          start: filters.startDate || payslips[0].pay_period_start || payslips[0].period_start,
          end: filters.endDate || payslips[payslips.length - 1].pay_period_end || payslips[payslips.length - 1].period_end
        },
        minimumWageCompliance,
        awardCompliance,
        taxCompliance,
        superannuationCompliance,
        overallComplianceRate,
        recommendations
      };
    } catch (error: any) {
      console.error('Error generating compliance report:', JSON.stringify(error, null, 2) || error.message || error);
      throw error;
    }
  },

  // Public helper methods
  async getPayslipsWithDetails(filters: PayrollReportFilters) {
    let employeeIds = filters.employeeIds;
    if (filters.departments && filters.departments.length > 0) {
      const { data: emps, error: empErr } = await supabase
        .from('employees')
        .select('id')
        .in('department_id', filters.departments);
      if (empErr) return { data: null, error: empErr } as any;
      const deptEmployeeIds = (emps || []).map((e: any) => e.id);
      employeeIds = employeeIds && employeeIds.length > 0
        ? employeeIds.filter((id) => deptEmployeeIds.includes(id))
        : deptEmployeeIds;
    }

    if (filters.payrollRunId) {
      let query = supabase
        .from('payslips')
        .select(`
          *,
          employees:employee_id (
            first_name,
            last_name,
            employee_code,
            department_id,
            position_id,
            remark
          ),
          pay_components(*),
          payroll_runs:payroll_run_id (
            pay_period_start,
            pay_period_end,
            status
          )
        `)
        .eq('payroll_run_id', filters.payrollRunId);

      if (employeeIds && employeeIds.length > 0) query = query.in('employee_id', employeeIds);
      return await query;
    }

    let runQuery = supabase
      .from('payroll_runs')
      .select('id')
      .order('pay_period_start', { ascending: true });

    if (filters.startDate) runQuery = runQuery.gte('pay_period_start', filters.startDate);
    if (filters.endDate) runQuery = runQuery.lte('pay_period_end', filters.endDate);
    if (filters.payFrequency) runQuery = runQuery.eq('pay_frequency', filters.payFrequency);

    if (filters.status) {
      runQuery = runQuery.in('status', normalizePayrollRunStatusCandidates(filters.status));
    } else {
      runQuery = runQuery.in('status', ['Paid', 'paid']);
    }

    const { data: runs, error: runErr } = await runQuery;
    if (runErr) return { data: null, error: runErr } as any;

    const runIds = (runs || []).map((r: any) => r.id).filter(Boolean);
    if (runIds.length === 0) return { data: [], error: null } as any;

    let query = supabase
      .from('payslips')
      .select(`
        *,
        employees:employee_id (
          first_name,
          last_name,
          employee_code,
          department_id,
          position_id,
          remark
        ),
        pay_components(*),
        payroll_runs:payroll_run_id (
          pay_period_start,
          pay_period_end,
          status
        )
      `)
      .in('payroll_run_id', runIds);

    if (employeeIds && employeeIds.length > 0) query = query.in('employee_id', employeeIds);

    return await query;
  },

  async tryBuildPreviewPayrollReport(filters: PayrollReportFilters) {
    if (!filters.payrollRunId) return null;
    try {
      const selectedIds = filters.employeeIds || [];
      const preview = await comprehensivePayrollService.calculatePayrollPreview(filters.payrollRunId, selectedIds);
      if (!preview) return null;
      if (!preview.employeeBreakdown || preview.employeeBreakdown.length === 0) return null;
      return preview;
    } catch {
      return null;
    }
  },

  buildSummaryFromPreview(filters: PayrollReportFilters, preview: any): PayrollSummaryReport {
    const netPays = (preview.employeeBreakdown || []).map((e: any) => Number(e.netPay || 0));
    const totals = {
      grossPay: Number(preview.totalGrossPay || 0),
      tax: Number(preview.totalTax || 0),
      netPay: Number(preview.totalNetPay || 0),
      superannuation: Number(preview.totalSuper || 0),
      allowances: 0,
      overtime: 0,
      deductions: 0,
    };

    const averagePay = netPays.reduce((sum: number, pay: number) => sum + pay, 0) / (netPays.length || 1);
    const medianPay = this.calculateMedian(netPays);
    const payDistribution = this.generatePayDistribution(netPays);

    return {
      period: {
        start: filters.startDate || preview.periodStart,
        end: filters.endDate || preview.periodEnd,
      },
      totals,
      employeeCount: new Set((preview.employeeBreakdown || []).map((e: any) => e.employeeId)).size,
      payrollRuns: 1,
      averagePay,
      medianPay,
      payDistribution,
    };
  },

  async buildTaxFromPreview(filters: PayrollReportFilters, preview: any): Promise<TaxReport> {
    const employeeIds = Array.from(new Set((preview.employeeBreakdown || []).map((e: any) => e.employeeId).filter(Boolean)));
    const { data: employees } = employeeIds.length
      ? await supabase
          .from('employees')
          .select('id, tfn')
          .in('id', employeeIds)
      : { data: [] as any[] };

    const tfnById = new Map<string, string>();
    for (const e of employees || []) {
      tfnById.set(e.id, e.tfn || '');
    }

    const taxBreakdown = (preview.employeeBreakdown || []).map((e: any) => ({
      employeeId: e.employeeId,
      employeeName: e.employeeName,
      taxFileNumber: tfnById.get(e.employeeId) || '',
      grossPay: Number(e.grossPay || 0),
      taxWithheld: Number(e.tax || 0),
      superannuation: Number(e.super || 0),
    }));

    return {
      period: {
        start: filters.startDate || preview.periodStart,
        end: filters.endDate || preview.periodEnd,
      },
      totalTaxWithheld: Number(preview.totalTax || 0),
      taxBreakdown,
      stpSubmissions: [],
    };
  },

  async buildSuperFromPreview(filters: PayrollReportFilters, preview: any): Promise<SuperannuationReport> {
    const employeeIds = Array.from(new Set((preview.employeeBreakdown || []).map((e: any) => e.employeeId).filter(Boolean)));
    const { data: employees } = employeeIds.length
      ? await supabase
          .from('employees')
          .select('id, superannuation_fund_name, superannuation_member_number')
          .in('id', employeeIds)
      : { data: [] as any[] };

    const byId = new Map<string, any>();
    for (const e of employees || []) byId.set(e.id, e);

    const employeeContributions = (preview.employeeBreakdown || []).map((e: any) => {
      const emp = byId.get(e.employeeId);
      return {
        employeeId: e.employeeId,
        employeeName: e.employeeName,
        superMemberNumber: emp?.superannuation_member_number || '',
        fundName: emp?.superannuation_fund_name || 'Unknown Fund',
        contributions: Number(e.super || 0),
        paymentStatus: 'Pending',
      };
    });

    const totalContributions = employeeContributions.reduce((sum: number, c: any) => sum + Number(c.contributions || 0), 0);

    return {
      period: {
        start: filters.startDate || preview.periodStart,
        end: filters.endDate || preview.periodEnd,
      },
      totalContributions,
      contributionsByFund: [],
      employeeContributions,
      complianceStatus: {
        totalDue: totalContributions,
        totalPaid: 0,
        overdueAmount: 0,
        complianceRate: 100,
        issues: [],
      },
    };
  },

  buildComplianceFromPreview(filters: PayrollReportFilters, preview: any): PayrollComplianceReport {
    const issues: string[] = [];
    for (const emp of preview.employeeBreakdown || []) {
      for (const err of emp.errors || []) issues.push(`${emp.employeeName}: ${err}`);
      for (const warn of emp.warnings || []) issues.push(`${emp.employeeName}: ${warn}`);
    }

    const clean = issues.length === 0;

    return {
      period: {
        start: filters.startDate || preview.periodStart,
        end: filters.endDate || preview.periodEnd,
      },
      minimumWageCompliance: {
        compliantEmployees: clean ? (preview.totalEmployees || 0) : 0,
        nonCompliantEmployees: clean ? 0 : (preview.totalEmployees || 0),
        totalUnderpayment: 0,
        issues: clean ? [] : issues,
      },
      awardCompliance: {
        compliantEmployees: clean ? (preview.totalEmployees || 0) : 0,
        nonCompliantEmployees: clean ? 0 : (preview.totalEmployees || 0),
        penaltyRateIssues: clean ? [] : issues,
        allowanceIssues: [],
      },
      taxCompliance: {
        compliantEmployees: clean ? (preview.totalEmployees || 0) : 0,
        issues: clean ? [] : issues,
      },
      superannuationCompliance: {
        compliantEmployees: clean ? (preview.totalEmployees || 0) : 0,
        unpaidContributions: clean ? 0 : Number(preview.totalSuper || 0),
        overdueContributions: 0,
        issues: clean ? [] : issues,
      },
      overallComplianceRate: clean ? 100 : 80,
      recommendations: clean ? [] : ['Review payroll warnings/errors before finalising this run.'],
    };
  },
  calculateTotals(payslips: any[]): {
    grossPay: number;
    tax: number;
    netPay: number;
    superannuation: number;
    allowances: number;
    overtime: number;
    deductions: number;
  } {
    return payslips.reduce(
      (acc, p) => {
        // Calculate allowances and overtime from components if available
        const allowances = p.pay_components 
          ? p.pay_components.filter((c: any) => c.component_type === 'Allowance').reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0)
          : (Number(p.allowances) || 0);
        
        const overtime = p.pay_components
          ? p.pay_components.filter((c: any) => c.component_type === 'Overtime').reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0)
          : (Number(p.overtime_amount || p.overtime) || 0);

        // Map column names based on available data
        const grossEarnings = Number(p.gross_earnings || p.gross_pay || 0);
        const incomeTax = Number(p.income_tax || p.tax_withheld || 0);
        const superannuation = Number(p.superannuation || p.pf_deduction || 0);
        const totalDeductions = Number(p.total_deductions || p.deductions || 0);
        const netPay = Number(p.net_pay || 0);

        return {
          grossPay: acc.grossPay + grossEarnings,
          tax: acc.tax + incomeTax,
          netPay: acc.netPay + netPay,
          superannuation: acc.superannuation + superannuation,
          allowances: acc.allowances + allowances,
          overtime: acc.overtime + overtime,
          deductions: acc.deductions + totalDeductions
        };
      },
      { grossPay: 0, tax: 0, netPay: 0, superannuation: 0, allowances: 0, overtime: 0, deductions: 0 }
    );
  },

  calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  },

  generatePayDistribution(netPays: number[]): {
    range: string;
    count: number;
    percentage: number;
  }[] {
    const ranges = [
      { min: 0, max: 1000, label: '$0 - $1,000' },
      { min: 1000, max: 2000, label: '$1,000 - $2,000' },
      { min: 2000, max: 3000, label: '$2,000 - $3,000' },
      { min: 3000, max: 4000, label: '$3,000 - $4,000' },
      { min: 4000, max: Infinity, label: '$4,000+' }
    ];

    const distribution = ranges.map(range => {
      const count = netPays.filter(pay => pay >= range.min && pay < range.max).length;
      return {
        range: range.label,
        count,
        percentage: (count / netPays.length) * 100
      };
    });

    return distribution;
  },

  async buildTaxBreakdown(payslips: any[]): Promise<any[]> {
    const breakdown: any[] = [];
    
    for (const payslip of payslips) {
      const employee = payslip.employees;
      
      // Attempt to get TFN from remark or metadata if not directly available
      let tfn = '*** *** ***';
      if (employee.remark && employee.remark.includes('TFN:')) {
         // This is a simplified extraction
      }

      breakdown.push({
        employeeId: payslip.employee_id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        taxFileNumber: tfn,
        grossPay: payslip.gross_pay,
        taxWithheld: payslip.tax_withheld,
        superannuation: payslip.superannuation
      });
    }

    return breakdown;
  },

  async calculateYTDTotals(employeeId: string, filters: PayrollReportFilters): Promise<{
    grossPay: number;
    tax: number;
    netPay: number;
    superannuation: number;
  }> {
    // Determine financial year based on end date
    const date = filters.endDate ? new Date(filters.endDate) : new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const fyStart = month >= 6 ? `${year}-07-01` : `${year-1}-07-01`;

    const { data: ytdPayslips } = await supabase
      .from('payslips')
      .select('gross_earnings, gross_pay, income_tax, tax_withheld, net_pay, superannuation, pf_deduction')
      .eq('employee_id', employeeId)
      .or(`pay_period_start.gte.${fyStart},period_start.gte.${fyStart}`)
      .or(`pay_period_end.lte.${filters.endDate || new Date().toISOString()},period_end.lte.${filters.endDate || new Date().toISOString()}`);

    if (!ytdPayslips || ytdPayslips.length === 0) {
      return { grossPay: 0, tax: 0, netPay: 0, superannuation: 0 };
    }

    return {
      grossPay: ytdPayslips.reduce((sum, p) => sum + (Number(p.gross_earnings || p.gross_pay) || 0), 0),
      tax: ytdPayslips.reduce((sum, p) => sum + (Number(p.income_tax || p.tax_withheld) || 0), 0),
      netPay: ytdPayslips.reduce((sum, p) => sum + (Number(p.net_pay) || 0), 0),
      superannuation: ytdPayslips.reduce((sum, p) => sum + (Number(p.superannuation || p.pf_deduction) || 0), 0)
    };
  },

  groupContributionsByFund(contributions: any[]): any[] {
    const fundMap = new Map();
    
    for (const contribution of contributions) {
      const fundId = contribution.fund_id || 'DEFAULT';
      const fundName = contribution.super_funds?.name || 'Default Fund';
      const fundABN = contribution.super_funds?.abn || '';
      const amount = Number(contribution.amount) || 0;

      if (!fundMap.has(fundId)) {
        fundMap.set(fundId, {
          fundId,
          fundName: fundName,
          abn: fundABN,
          totalContributions: 0,
          employeeCount: new Set(),
          unpaidContributions: 0
        });
      }
      
      const fundData = fundMap.get(fundId);
      fundData.totalContributions += amount;
      fundData.employeeCount.add(contribution.employee_id);
      if (!contribution.is_paid) {
        fundData.unpaidContributions += amount;
      }
    }

    return Array.from(fundMap.values()).map(fund => ({
      ...fund,
      employeeCount: fund.employeeCount.size
    }));
  },

  calculateSuperCompliance(contributions: any[]): {
    totalDue: number;
    totalPaid: number;
    overdueAmount: number;
    complianceRate: number;
    issues: string[];
  } {
    const totalDue = contributions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalPaid = contributions.filter(c => c.is_paid).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const overdueAmount = contributions.filter(c => !c.is_paid && c.payment_date && c.payment_date < new Date().toISOString())
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    
    const complianceRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 100;
    
    const issues: string[] = [];
    if (overdueAmount > 0) {
      issues.push(`$${overdueAmount.toFixed(2)} in overdue superannuation contributions`);
    }
    if (complianceRate < 95) {
      issues.push(`Superannuation compliance rate is ${complianceRate.toFixed(1)}%`);
    }

    return {
      totalDue,
      totalPaid,
      overdueAmount,
      complianceRate,
      issues
    };
  },

  async checkMinimumWageCompliance(payslips: any[]): Promise<{
    compliantEmployees: number;
    nonCompliantEmployees: number;
    totalUnderpayment: number;
    issues: string[];
  }> {
    const minimumWagePerHour = 23.23; // Current Australian minimum wage
    let compliantEmployees = 0;
    let nonCompliantEmployees = 0;
    let totalUnderpayment = 0;
    const issues: string[] = [];

    for (const payslip of payslips) {
      // Calculate hourly rate if hours logged is available
      const hoursLogged = Number(payslip.hours_logged) || 38; // Default to 38 if not available
      const grossPay = Number(payslip.gross_pay) || 0;
      const hourlyRate = grossPay / hoursLogged;
      
      const isCompliant = hourlyRate >= minimumWagePerHour;
      
      if (isCompliant) {
        compliantEmployees++;
      } else {
        nonCompliantEmployees++;
        const underpayment = (minimumWagePerHour - hourlyRate) * hoursLogged;
        totalUnderpayment += underpayment;
        issues.push(`Employee ${payslip.employees?.first_name} ${payslip.employees?.last_name} (${payslip.employee_id}) may be underpaid by $${underpayment.toFixed(2)}`);
      }
    }

    return {
      compliantEmployees,
      nonCompliantEmployees,
      totalUnderpayment,
      issues
    };
  },

  async checkAwardCompliance(payslips: any[]): Promise<{
    compliantEmployees: number;
    nonCompliantEmployees: number;
    penaltyRateIssues: string[];
    allowanceIssues: string[];
  }> {
    // Simplified award compliance check
    const nonCompliant = payslips.filter(p => !p.pay_components || p.pay_components.length === 0).length;
    return {
      compliantEmployees: payslips.length - nonCompliant,
      nonCompliantEmployees: nonCompliant,
      penaltyRateIssues: nonCompliant > 0 ? [`${nonCompliant} employees missing pay components`] : [],
      allowanceIssues: []
    };
  },

  async checkTaxCompliance(payslips: any[]): Promise<{
    compliantEmployees: number;
    issues: string[];
  }> {
    // Simplified tax compliance check
    const issues: string[] = [];
    let compliant = 0;

    for (const payslip of payslips) {
      const taxWithheld = Number(payslip.tax_withheld) || 0;
      const grossPay = Number(payslip.gross_pay) || 0;
      
      // Very basic check: tax should usually be between 0% and 45%
      if (grossPay > 0 && (taxWithheld <= 0 || taxWithheld > grossPay * 0.47)) {
        issues.push(`Tax withheld ($${taxWithheld}) for ${payslip.employees?.first_name} seems incorrect for gross pay $${grossPay}`);
      } else {
        compliant++;
      }
    }

    return {
      compliantEmployees: compliant,
      issues
    };
  },

  async checkSuperannuationCompliance(payslips: any[]): Promise<{
    compliantEmployees: number;
    unpaidContributions: number;
    overdueContributions: number;
    issues: string[];
  }> {
    // Get super contributions for these payslips
    const payslipIds = payslips.map(p => p.id);
    const { data: contributions } = await supabase
      .from('superannuation_contributions')
      .select('*')
      .in('payslip_id', payslipIds);

    const unpaidContributions = (contributions || []).filter(c => !c.is_paid).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const overdueContributions = (contributions || []).filter(c => !c.is_paid && c.payment_date && c.payment_date < new Date().toISOString())
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    const nonCompliant = (contributions || []).filter(c => !c.is_paid && c.payment_date && c.payment_date < new Date().toISOString()).length;

    return {
      compliantEmployees: payslips.length - nonCompliant,
      unpaidContributions,
      overdueContributions,
      issues: overdueContributions > 0 ? [`$${overdueContributions.toFixed(2)} in overdue super contributions across ${nonCompliant} records`] : []
    };
  },

  calculateOverallComplianceRate(compliances: any[]): number {
    if (!compliances || compliances.length === 0) return 0;
    
    const totalRates = compliances.map(c => {
      if (c.compliantEmployees !== undefined && (c.compliantEmployees + (c.nonCompliantEmployees || 0)) > 0) {
        return (c.compliantEmployees / (c.compliantEmployees + (c.nonCompliantEmployees || 0))) * 100;
      }
      return 100; // Assume compliant if no data
    });

    return totalRates.reduce((sum, r) => sum + r, 0) / totalRates.length;
  },

  async generateComplianceRecommendations(compliances: any): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (compliances.minimumWageCompliance.nonCompliantEmployees > 0) {
      recommendations.push(`Review and adjust wages for ${compliances.minimumWageCompliance.nonCompliantEmployees} employees to meet minimum wage requirements ($${compliances.minimumWageCompliance.totalUnderpayment.toFixed(2)} total underpayment detected).`);
    }
    
    if (compliances.superannuationCompliance.overdueContributions > 0) {
      recommendations.push(`Process $${compliances.superannuationCompliance.overdueContributions.toFixed(2)} in overdue superannuation contributions immediately to avoid penalties.`);
    }

    if (compliances.taxCompliance.issues.length > 0) {
      recommendations.push(`Review tax withholding settings for ${compliances.taxCompliance.issues.length} employees with potentially incorrect withholding.`);
    }

    if (compliances.awardCompliance.nonCompliantEmployees > 0) {
      recommendations.push(`Assign pay components to ${compliances.awardCompliance.nonCompliantEmployees} employees to ensure award compliance.`);
    }

    return recommendations;
  },

  createEmptySummaryReport(filters: PayrollReportFilters): PayrollSummaryReport {
    return {
      period: {
        start: filters.startDate || new Date().toISOString().split('T')[0],
        end: filters.endDate || new Date().toISOString().split('T')[0]
      },
      totals: {
        grossPay: 0,
        tax: 0,
        netPay: 0,
        superannuation: 0,
        allowances: 0,
        overtime: 0,
        deductions: 0
      },
      employeeCount: 0,
      payrollRuns: 0,
      averagePay: 0,
      medianPay: 0,
      payDistribution: []
    };
  },

  createEmptyTaxReport(filters: PayrollReportFilters): TaxReport {
    return {
      period: {
        start: filters.startDate || new Date().toISOString().split('T')[0],
        end: filters.endDate || new Date().toISOString().split('T')[0]
      },
      totalTaxWithheld: 0,
      taxBreakdown: [],
      stpSubmissions: []
    };
  },

  createEmptySuperReport(filters: PayrollReportFilters): SuperannuationReport {
    return {
      period: {
        start: filters.startDate || new Date().toISOString().split('T')[0],
        end: filters.endDate || new Date().toISOString().split('T')[0]
      },
      totalContributions: 0,
      contributionsByFund: [],
      employeeContributions: [],
      complianceStatus: {
        totalDue: 0,
        totalPaid: 0,
        overdueAmount: 0,
        complianceRate: 100,
        issues: []
      }
    };
  },

  createEmptyComplianceReport(filters: PayrollReportFilters): PayrollComplianceReport {
    return {
      period: {
        start: filters.startDate || new Date().toISOString().split('T')[0],
        end: filters.endDate || new Date().toISOString().split('T')[0]
      },
      minimumWageCompliance: {
        compliantEmployees: 0,
        nonCompliantEmployees: 0,
        totalUnderpayment: 0,
        issues: []
      },
      awardCompliance: {
        compliantEmployees: 0,
        nonCompliantEmployees: 0,
        penaltyRateIssues: [],
        allowanceIssues: []
      },
      taxCompliance: {
        compliantEmployees: 0,
        issues: []
      },
      superannuationCompliance: {
        compliantEmployees: 0,
        unpaidContributions: 0,
        overdueContributions: 0,
        issues: []
      },
      overallComplianceRate: 100,
      recommendations: []
    };
  }
};
