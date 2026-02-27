import { supabase } from '@/lib/supabase';
import { auditService } from './auditService';

export interface PayrollReportFilters {
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
        return this.createEmptySummaryReport(filters);
      }

      // Calculate totals
      const totals = this.calculateTotals(payslips);
      
      // Calculate statistics
      const netPays = payslips.map(p => p.net_pay);
      const averagePay = netPays.reduce((sum, pay) => sum + pay, 0) / netPays.length;
      const medianPay = this.calculateMedian(netPays);
      
      // Generate pay distribution
      const payDistribution = this.generatePayDistribution(netPays);

      // Create audit log
      await auditService.logAction(
        'payroll_reports',
        'summary_report',
        'SYSTEM_ACTION',
        null,
        { filters, recordCount: payslips.length },
        'system'
      );

      return {
        period: {
          start: filters.startDate || payslips[0].period_start,
          end: filters.endDate || payslips[payslips.length - 1].period_end
        },
        totals,
        employeeCount: new Set(payslips.map(p => p.employee_id)).size,
        payrollRuns: new Set(payslips.map(p => p.payroll_run_id)).size,
        averagePay,
        medianPay,
        payDistribution
      };
    } catch (error) {
      console.error('Error generating payroll summary report:', error);
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
      const periodTotals = this.calculateTotals(payslips || []);
      
      // Calculate YTD totals (simplified - would need proper YTD calculation)
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
          periodStart: p.period_start,
          periodEnd: p.period_end,
          grossPay: p.gross_pay,
          netPay: p.net_pay,
          paymentDate: p.payment_date,
          status: p.status
        }))
      };
    } catch (error) {
      console.error('Error generating employee payroll report:', error);
      throw error;
    }
  },

  async generateTaxReport(filters: PayrollReportFilters): Promise<TaxReport> {
    try {
      const { data: payslips, error } = await this.getPayslipsWithDetails(filters);
      
      if (error) throw error;
      if (!payslips || payslips.length === 0) {
        return this.createEmptyTaxReport(filters);
      }

      // Get STP submissions for the period
      const { data: stpSubmissions } = await supabase
        .from('stp_submissions')
        .select('*')
        .gte('submission_date', filters.startDate)
        .lte('submission_date', filters.endDate);

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
          start: filters.startDate || payslips[0].period_start,
          end: filters.endDate || payslips[payslips.length - 1].period_end
        },
        totalTaxWithheld: payslips.reduce((sum, p) => sum + p.tax_withheld, 0),
        taxBreakdown,
        stpSubmissions: (stpSubmissions || []).map(s => ({
          id: s.id,
          submissionDate: s.submission_date,
          status: s.status,
          totalGross: s.total_gross,
          totalTax: s.total_tax,
          employeeCount: s.employee_count
        }))
      };
    } catch (error) {
      console.error('Error generating tax report:', error);
      throw error;
    }
  },

  async generateSuperannuationReport(filters: PayrollReportFilters): Promise<SuperannuationReport> {
    try {
      const { data: contributions, error } = await supabase
        .from('superannuation_contributions')
        .select(`
          *,
          super_funds:name,
          employees:employee_id (
            first_name,
            last_name
          )
        `)
        .gte('period_start', filters.startDate)
        .lte('period_end', filters.endDate);

      if (error) throw error;
      if (!contributions || contributions.length === 0) {
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
        return {
          employeeId: String(c.employee_id),
          employeeName: `${c.employees.first_name} ${c.employees.last_name}`,
          superMemberNumber: String(c.super_member_number || ''),
          fundName: String(c.super_funds.name || ''),
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
        totalContributions: contributions.reduce((sum, c) => sum + c.amount, 0),
        contributionsByFund,
        employeeContributions,
        complianceStatus
      };
    } catch (error) {
      console.error('Error generating superannuation report:', error);
      throw error;
    }
  },

  async generateComplianceReport(filters: PayrollReportFilters): Promise<PayrollComplianceReport> {
    try {
      const { data: payslips, error } = await this.getPayslipsWithDetails(filters);
      
      if (error) throw error;
      if (!payslips || payslips.length === 0) {
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
      const recommendations = this.generateComplianceRecommendations({
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
          start: filters.startDate || payslips[0].period_start,
          end: filters.endDate || payslips[payslips.length - 1].period_end
        },
        minimumWageCompliance,
        awardCompliance,
        taxCompliance,
        superannuationCompliance,
        overallComplianceRate,
        recommendations
      };
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  },

  // Public helper methods
  async getPayslipsWithDetails(filters: PayrollReportFilters) {
    let query = supabase
      .from('payslips')
      .select(`
        *,
        employees:employee_id (
          first_name,
          last_name,
          department_id,
          position_id
        ),
        pay_components(*),
        payroll_runs:payroll_run_id (
          pay_period_start,
          pay_period_end,
          pay_frequency,
          status
        )
      `);

    if (filters.startDate) {
      query = query.gte('period_start', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('period_end', filters.endDate);
    }
    if (filters.employeeIds && filters.employeeIds.length > 0) {
      query = query.in('employee_id', filters.employeeIds);
    }
    if (filters.payFrequency) {
      query = query.eq('pay_frequency', filters.payFrequency);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    return await query;
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
      (acc, p) => ({
        grossPay: acc.grossPay + (p.gross_pay || 0),
        tax: acc.tax + (p.tax_withheld || 0),
        netPay: acc.netPay + (p.net_pay || 0),
        superannuation: acc.superannuation + (p.superannuation || 0),
        allowances: acc.allowances + (p.allowances || 0),
        overtime: acc.overtime + (p.overtime || 0),
        deductions: acc.deductions + (p.deductions || 0)
      }),
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
      breakdown.push({
        employeeId: payslip.employee_id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        taxFileNumber: '*** *** ***', // Masked for privacy
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
    // Simplified YTD calculation - would need proper financial year logic
    const { data: ytdPayslips } = await supabase
      .from('payslips')
      .select('gross_pay, tax_withheld, net_pay, superannuation')
      .eq('employee_id', employeeId)
      .gte('period_start', '2024-07-01'); // Start of financial year

    if (!ytdPayslips || ytdPayslips.length === 0) {
      return { grossPay: 0, tax: 0, netPay: 0, superannuation: 0 };
    }

    return {
      grossPay: ytdPayslips.reduce((sum, p) => sum + (p.gross_pay || 0), 0),
      tax: ytdPayslips.reduce((sum, p) => sum + (p.tax_withheld || 0), 0),
      netPay: ytdPayslips.reduce((sum, p) => sum + (p.net_pay || 0), 0),
      superannuation: ytdPayslips.reduce((sum, p) => sum + (p.superannuation || 0), 0)
    };
  },

  groupContributionsByFund(contributions: any[]): any[] {
    const fundMap = new Map();
    
    for (const contribution of contributions) {
      const fundId = contribution.fund_id;
      if (!fundMap.has(fundId)) {
        fundMap.set(fundId, {
          fundId,
          fundName: contribution.super_funds.name,
          abn: contribution.super_funds.abn,
          totalContributions: 0,
          employeeCount: new Set(),
          unpaidContributions: 0
        });
      }
      
      const fundData = fundMap.get(fundId);
      fundData.totalContributions += contribution.amount;
      fundData.employeeCount.add(contribution.employee_id);
      if (!contribution.is_paid) {
        fundData.unpaidContributions += contribution.amount;
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
    const totalDue = contributions.reduce((sum, c) => sum + c.amount, 0);
    const totalPaid = contributions.filter(c => c.is_paid).reduce((sum, c) => sum + c.amount, 0);
    const overdueAmount = contributions.filter(c => !c.is_paid && c.payment_date < new Date().toISOString())
      .reduce((sum, c) => sum + c.amount, 0);
    
    const complianceRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 100;
    
    const issues: string[] = [];
    if (overdueAmount > 0) {
      issues.push(`${overdueAmount.toFixed(2)} in overdue superannuation contributions`);
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
    // Simplified minimum wage check - would need proper calculation
    const minimumWagePerHour = 23.23; // Current Australian minimum wage
    let compliantEmployees = 0;
    let nonCompliantEmployees = 0;
    let totalUnderpayment = 0;
    const issues: string[] = [];

    for (const payslip of payslips) {
      // This is a simplified check - real implementation would calculate based on hours worked
      const isCompliant = payslip.net_pay >= minimumWagePerHour * 38; // Assume 38-hour week
      
      if (isCompliant) {
        compliantEmployees++;
      } else {
        nonCompliantEmployees++;
        const underpayment = (minimumWagePerHour * 38) - payslip.net_pay;
        totalUnderpayment += underpayment;
        issues.push(`Employee ${payslip.employee_id} may be underpaid by $${underpayment.toFixed(2)}`);
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
    return {
      compliantEmployees: payslips.length,
      nonCompliantEmployees: 0,
      penaltyRateIssues: [],
      allowanceIssues: []
    };
  },

  async checkTaxCompliance(payslips: any[]): Promise<{
    compliantEmployees: number;
    issues: string[];
  }> {
    // Simplified tax compliance check
    return {
      compliantEmployees: payslips.length,
      issues: []
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

    const unpaidContributions = (contributions || []).filter(c => !c.is_paid).reduce((sum, c) => sum + c.amount, 0);
    const overdueContributions = (contributions || []).filter(c => !c.is_paid && c.payment_date < new Date().toISOString())
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      compliantEmployees: payslips.length,
      unpaidContributions,
      overdueContributions,
      issues: overdueContributions > 0 ? [`${overdueContributions.toFixed(2)} in overdue super contributions`] : []
    };
  },

  calculateOverallComplianceRate(compliances: any[]): number {
    // Simplified calculation
    return 95; // Placeholder
  },

  generateComplianceRecommendations(compliances: any): string[] {
    const recommendations: string[] = [];
    
    if (compliances.minimumWageCompliance.totalUnderpayment > 0) {
      recommendations.push('Review and adjust employee wages to meet minimum wage requirements');
    }
    
    if (compliances.superannuationCompliance.overdueContributions > 0) {
      recommendations.push('Process overdue superannuation contributions immediately');
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
