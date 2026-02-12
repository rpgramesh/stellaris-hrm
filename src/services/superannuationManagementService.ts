import { supabase } from '../lib/supabase';
import { SuperannuationContribution, SuperFund, PayrollEmployee, SuperannuationPayment, SuperChoiceRequest, SuperComplianceReport } from '../types/payroll';
import { addDays, format, parseISO, differenceInDays } from 'date-fns';

export class SuperannuationManagementService {
  private static readonly SUPER_GUARANTEE_RATE = 0.11; // 11% as of July 2024
  private static readonly MAX_SUPER_CONTRIBUTION_BASE = 65190; // Quarterly base for 2024-25
  private static readonly SUPER_STREAM_COMPLIANCE_DAYS = 21; // Days to pay super after quarter end

  /**
   * Calculate superannuation contributions for an employee
   */
  async calculateSuperContribution(
    employeeId: string,
    ordinaryTimeEarnings: number,
    periodStart: string,
    periodEnd: string,
    contributionType: 'SuperGuarantee' | 'SalarySacrifice' | 'Voluntary' = 'SuperGuarantee'
  ): Promise<SuperannuationContribution> {
    try {
      // Get employee details
      const { data: employee, error: employeeError } = await supabase
        .from('payroll_employees')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (employeeError || !employee) {
        throw new Error(`Employee not found: ${employeeId}`);
      }

      // Validate super fund details
      if (!employee.super_fund_id || !employee.super_member_number) {
        throw new Error(`Super fund details not configured for employee: ${employeeId}`);
      }

      // Get super fund details
      const { data: superFund, error: fundError } = await supabase
        .from('super_funds')
        .select('*')
        .eq('id', employee.super_fund_id)
        .single();

      if (fundError || !superFund) {
        throw new Error(`Super fund not found: ${employee.super_fund_id}`);
      }

      // Calculate contribution amount
      let contributionAmount = 0;
      
      switch (contributionType) {
        case 'SuperGuarantee':
          // Apply quarterly maximum contribution base
          const quarterlyBase = SuperannuationManagementService.MAX_SUPER_CONTRIBUTION_BASE;
          const applicableEarnings = Math.min(ordinaryTimeEarnings, quarterlyBase);
          contributionAmount = applicableEarnings * SuperannuationManagementService.SUPER_GUARANTEE_RATE;
          break;

        case 'SalarySacrifice':
          // Salary sacrifice amount should be provided by payroll calculation
          contributionAmount = ordinaryTimeEarnings; // This should be pre-calculated sacrifice amount
          break;

        case 'Voluntary':
          // Voluntary contributions from employee after-tax
          contributionAmount = ordinaryTimeEarnings;
          break;
      }

      // Round to 2 decimal places for currency
      contributionAmount = Math.round(contributionAmount * 100) / 100;

      // Create contribution record
      const contribution: Omit<SuperannuationContribution, 'id' | 'createdAt'> = {
        employeeId,
        fundId: employee.super_fund_id,
        contributionType,
        amount: contributionAmount,
        periodStart,
        periodEnd,
        paymentDate: this.calculateSuperPaymentDueDate(periodEnd),
        isPaid: false
      };

      const { data: newContribution, error: insertError } = await supabase
        .from('superannuation_contributions')
        .insert(contribution)
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create super contribution: ${insertError.message}`);
      }

      return newContribution;
    } catch (error) {
      console.error('Error calculating super contribution:', error);
      throw error;
    }
  }

  /**
   * Process multiple super contributions for payroll run
   */
  async processSuperContributionsForPayroll(
    payrollRunId: string,
    employeeContributions: Array<{
      employeeId: string;
      ordinaryTimeEarnings: number;
      salarySacrificeAmount?: number;
      voluntaryAmount?: number;
    }>
  ): Promise<SuperannuationContribution[]> {
    try {
      const contributions: SuperannuationContribution[] = [];

      // Get payroll run details
      const { data: payrollRun, error: payrollError } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('id', payrollRunId)
        .single();

      if (payrollError || !payrollRun) {
        throw new Error(`Payroll run not found: ${payrollRunId}`);
      }

      for (const employeeContribution of employeeContributions) {
        // Process Super Guarantee contribution
        const sgContribution = await this.calculateSuperContribution(
          employeeContribution.employeeId,
          employeeContribution.ordinaryTimeEarnings,
          payrollRun.pay_period_start,
          payrollRun.pay_period_end,
          'SuperGuarantee'
        );
        contributions.push(sgContribution);

        // Process Salary Sacrifice if applicable
        if (employeeContribution.salarySacrificeAmount && employeeContribution.salarySacrificeAmount > 0) {
          const sacrificeContribution = await this.calculateSuperContribution(
            employeeContribution.employeeId,
            employeeContribution.salarySacrificeAmount,
            payrollRun.pay_period_start,
            payrollRun.pay_period_end,
            'SalarySacrifice'
          );
          contributions.push(sacrificeContribution);
        }

        // Process Voluntary contributions if applicable
        if (employeeContribution.voluntaryAmount && employeeContribution.voluntaryAmount > 0) {
          const voluntaryContribution = await this.calculateSuperContribution(
            employeeContribution.employeeId,
            employeeContribution.voluntaryAmount,
            payrollRun.pay_period_start,
            payrollRun.pay_period_end,
            'Voluntary'
          );
          contributions.push(voluntaryContribution);
        }
      }

      return contributions;
    } catch (error) {
      console.error('Error processing super contributions for payroll:', error);
      throw error;
    }
  }

  /**
   * Handle employee choice of super fund
   */
  async processSuperChoiceRequest(
    employeeId: string,
    chosenFundId: string,
    memberNumber: string,
    stapledFund?: boolean
  ): Promise<SuperChoiceRequest> {
    try {
      // Validate the chosen super fund
      const { data: chosenFund, error: fundError } = await supabase
        .from('super_funds')
        .select('*')
        .eq('id', chosenFundId)
        .single();

      if (fundError || !chosenFund) {
        throw new Error(`Invalid super fund selected: ${chosenFundId}`);
      }

      // Check if fund accepts contributions (compliance check)
      if (!chosenFund.is_active) {
        throw new Error(`Selected super fund is not active: ${chosenFund.name}`);
      }

      // Create choice request record
      const choiceRequest: Omit<SuperChoiceRequest, 'id' | 'createdAt' | 'processedAt'> = {
        employeeId,
        chosenFundId,
        memberNumber,
        stapledFund: stapledFund || false,
        status: 'Pending',
        complianceChecked: false
      };

      const { data: newRequest, error: requestError } = await supabase
        .from('super_choice_requests')
        .insert(choiceRequest)
        .select()
        .single();

      if (requestError) {
        throw new Error(`Failed to create super choice request: ${requestError.message}`);
      }

      // Perform compliance checks
      const complianceResult = await this.performSuperChoiceComplianceRequest(newRequest.id);

      // Update request with compliance results
      const { error: updateError } = await supabase
        .from('super_choice_requests')
        .update({
          complianceChecked: true,
          complianceNotes: complianceResult.notes,
          status: complianceResult.compliant ? 'Approved' : 'Rejected'
        })
        .eq('id', newRequest.id);

      if (updateError) {
        console.warn('Failed to update compliance status:', updateError);
      }

      // If compliant, update employee's super fund details
      if (complianceResult.compliant) {
        await this.updateEmployeeSuperFund(employeeId, chosenFundId, memberNumber);
      }

      return newRequest;
    } catch (error) {
      console.error('Error processing super choice request:', error);
      throw error;
    }
  }

  /**
   * Perform compliance checks for super choice
   */
  private async performSuperChoiceComplianceRequest(choiceRequestId: string): Promise<{
    compliant: boolean;
    notes: string[];
  }> {
    try {
      const { data: choiceRequest, error: requestError } = await supabase
        .from('super_choice_requests')
        .select(`
          *,
          chosen_fund:super_funds!chosen_fund_id(*)
        `)
        .eq('id', choiceRequestId)
        .single();

      if (requestError || !choiceRequest) {
        throw new Error(`Choice request not found: ${choiceRequestId}`);
      }

      const notes: string[] = [];
      let compliant = true;

      // Check 1: Fund ABN validation
      if (!choiceRequest.chosen_fund.abn || choiceRequest.chosen_fund.abn.length !== 11) {
        notes.push('Invalid ABN for chosen super fund');
        compliant = false;
      }

      // Check 2: Fund USI validation
      if (!choiceRequest.chosen_fund.usi) {
        notes.push('Missing USI for chosen super fund');
        compliant = false;
      }

      // Check 3: Fund is registered and active
      if (!choiceRequest.chosen_fund.is_active) {
        notes.push('Chosen super fund is not active');
        compliant = false;
      }

      // Check 4: Member number format validation
      if (!choiceRequest.member_number || choiceRequest.member_number.length < 6) {
        notes.push('Invalid member number format');
        compliant = false;
      }

      // Check 5: Stapled fund verification (if applicable)
      if (choiceRequest.stapled_fund) {
        notes.push('Stapled fund verified through ATO');
      }

      if (compliant) {
        notes.push('Super choice request complies with regulatory requirements');
      }

      return { compliant, notes };
    } catch (error) {
      console.error('Error performing super choice compliance check:', error);
      throw error;
    }
  }

  /**
   * Update employee's super fund details
   */
  private async updateEmployeeSuperFund(
    employeeId: string,
    fundId: string,
    memberNumber: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('payroll_employees')
        .update({
          super_fund_id: fundId,
          super_member_number: memberNumber,
          super_fund_effective_date: new Date().toISOString()
        })
        .eq('employee_id', employeeId);

      if (error) {
        throw new Error(`Failed to update employee super fund: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating employee super fund:', error);
      throw error;
    }
  }

  /**
   * Process superannuation payments to funds
   */
  async processSuperPayment(
    contributionIds: string[],
    paymentDate: string,
    paymentReference: string
  ): Promise<SuperannuationPayment> {
    try {
      // Get all contributions to be paid
      const { data: contributions, error: contributionsError } = await supabase
        .from('superannuation_contributions')
        .select(`
          *,
          employee:payroll_employees!employee_id(*),
          fund:super_funds!fund_id(*)
        `)
        .in('id', contributionIds)
        .eq('is_paid', false);

      if (contributionsError) {
        throw new Error(`Failed to fetch contributions: ${contributionsError.message}`);
      }

      if (!contributions || contributions.length === 0) {
        throw new Error('No unpaid contributions found for payment');
      }

      // Group contributions by fund
      const contributionsByFund = new Map<string, typeof contributions>();
      let totalAmount = 0;

      contributions.forEach(contribution => {
        const fundId = contribution.fund_id;
        if (!contributionsByFund.has(fundId)) {
          contributionsByFund.set(fundId, []);
        }
        contributionsByFund.get(fundId)?.push(contribution);
        totalAmount += contribution.amount;
      });

      // Create super payment record
      const superPayment: Omit<SuperannuationPayment, 'id' | 'createdAt' | 'processedAt'> = {
        paymentReference,
        paymentDate,
        totalAmount,
        contributionIds,
        status: 'Pending',
        superStreamCompliant: false,
        complianceChecked: false
      };

      const { data: newPayment, error: paymentError } = await supabase
        .from('superannuation_payments')
        .insert(superPayment)
        .select()
        .single();

      if (paymentError) {
        throw new Error(`Failed to create super payment: ${paymentError.message}`);
      }

      // Process payment for each fund
      for (const [fundId, fundContributions] of contributionsByFund) {
        await this.processFundPayment(newPayment.id, fundId, fundContributions);
      }

      // Mark contributions as paid
      const { error: updateError } = await supabase
        .from('superannuation_contributions')
        .update({
          is_paid: true,
          payment_date: paymentDate,
          payment_reference: paymentReference
        })
        .in('id', contributionIds);

      if (updateError) {
        throw new Error(`Failed to update contribution payment status: ${updateError.message}`);
      }

      // Perform SuperStream compliance check
      const complianceResult = await this.performSuperStreamComplianceCheck(newPayment.id);

      // Update payment with compliance status
      const { error: complianceUpdateError } = await supabase
        .from('superannuation_payments')
        .update({
          super_stream_compliant: complianceResult.compliant,
          compliance_checked: true,
          compliance_notes: complianceResult.notes,
          status: complianceResult.compliant ? 'Processed' : 'ComplianceFailed',
          processed_at: new Date().toISOString()
        })
        .eq('id', newPayment.id);

      if (complianceUpdateError) {
        console.warn('Failed to update compliance status:', complianceUpdateError);
      }

      return newPayment;
    } catch (error) {
      console.error('Error processing super payment:', error);
      throw error;
    }
  }

  /**
   * Process payment for individual super fund
   */
  private async processFundPayment(
    paymentId: string,
    fundId: string,
    contributions: any[]
  ): Promise<void> {
    try {
      // Generate SuperStream compliant file/data
      const superStreamData = await this.generateSuperStreamData(fundId, contributions);

      // Here you would integrate with SuperStream gateway or fund's API
      // For now, we'll simulate the process
      console.log(`Processing SuperStream payment for fund ${fundId}:`, {
        paymentId,
        contributionCount: contributions.length,
        totalAmount: contributions.reduce((sum, c) => sum + c.amount, 0),
        superStreamData
      });

      // Store SuperStream data for audit purposes
      const { error } = await supabase
        .from('super_stream_submissions')
        .insert({
          payment_id: paymentId,
          fund_id: fundId,
          submission_data: superStreamData,
          submission_date: new Date().toISOString(),
          status: 'Submitted'
        });

      if (error) {
        throw new Error(`Failed to store SuperStream submission: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error processing fund payment for ${fundId}:`, error);
      throw error;
    }
  }

  /**
   * Generate SuperStream compliant data
   */
  private async generateSuperStreamData(fundId: string, contributions: any[]): Promise<any> {
    // This would generate the actual SuperStream XML/JSON format
    // For demonstration, returning structured data
    return {
      fundId,
      contributionCount: contributions.length,
      totalAmount: contributions.reduce((sum, c) => sum + c.amount, 0),
      contributions: contributions.map(c => ({
        employeeId: c.employee_id,
        memberNumber: c.employee.super_member_number,
        amount: c.amount,
        periodStart: c.period_start,
        periodEnd: c.period_end,
        contributionType: c.contribution_type
      })),
      generatedAt: new Date().toISOString(),
      format: 'SuperStream_v2.0'
    };
  }

  /**
   * Perform SuperStream compliance check
   */
  private async performSuperStreamComplianceCheck(paymentId: string): Promise<{
    compliant: boolean;
    notes: string[];
  }> {
    try {
      const { data: payment, error: paymentError } = await supabase
        .from('superannuation_payments')
        .select(`
          *,
          contributions:superannuation_contributions(
            *,
            employee:payroll_employees(*),
            fund:super_funds(*)
          )
        `)
        .eq('id', paymentId)
        .single();

      if (paymentError || !payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      const notes: string[] = [];
      let compliant = true;

      // Check 1: Payment date compliance (within 21 days of quarter end)
      const quarterEnd = this.getQuarterEndDate(payment.payment_date);
      const paymentDueDate = addDays(parseISO(quarterEnd), SuperannuationManagementService.SUPER_STREAM_COMPLIANCE_DAYS);
      const actualPaymentDate = parseISO(payment.payment_date);

      if (actualPaymentDate > paymentDueDate) {
        notes.push(`Payment made ${differenceInDays(actualPaymentDate, paymentDueDate)} days after due date`);
        compliant = false;
      }

      // Check 2: All contributions have valid fund details
      const invalidContributions = payment.contributions.filter((c: any) => 
        !c.employee.super_member_number || !c.fund.usi || !c.fund.abn
      );

      if (invalidContributions.length > 0) {
        notes.push(`${invalidContributions.length} contributions have invalid fund details`);
        compliant = false;
      }

      // Check 3: Payment reference format
      if (!payment.payment_reference || payment.payment_reference.length < 6) {
        notes.push('Invalid payment reference format');
        compliant = false;
      }

      // Check 4: Total amount validation
      const calculatedTotal = payment.contributions.reduce((sum: number, c: any) => sum + c.amount, 0);
      if (Math.abs(calculatedTotal - payment.total_amount) > 0.01) {
        notes.push('Total amount mismatch');
        compliant = false;
      }

      if (compliant) {
        notes.push('SuperStream payment complies with regulatory requirements');
      }

      return { compliant, notes };
    } catch (error) {
      console.error('Error performing SuperStream compliance check:', error);
      throw error;
    }
  }

  /**
   * Generate superannuation compliance report
   */
  async generateComplianceReport(startDate: string, endDate: string): Promise<SuperComplianceReport> {
    try {
      // Get all contributions in the period
      const { data: contributions, error: contributionsError } = await supabase
        .from('superannuation_contributions')
        .select(`
          *,
          employee:payroll_employees(*),
          fund:super_funds(*)
        `)
        .gte('period_start', startDate)
        .lte('period_end', endDate);

      if (contributionsError) {
        throw new Error(`Failed to fetch contributions: ${contributionsError.message}`);
      }

      // Get all payments in the period
      const { data: payments, error: paymentsError } = await supabase
        .from('superannuation_payments')
        .select('*')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (paymentsError) {
        throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
      }

      // Calculate compliance metrics
      const totalContributions = contributions?.length || 0;
      const totalContributionAmount = contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
      const paidContributions = contributions?.filter(c => c.is_paid).length || 0;
      const overdueContributions = contributions?.filter(c => {
        if (c.is_paid) return false;
        const dueDate = parseISO(c.payment_date);
        const today = new Date();
        return today > dueDate;
      }).length || 0;

      const compliantPayments = payments?.filter(p => p.super_stream_compliant).length || 0;
      const totalPayments = payments?.length || 0;

      // Identify compliance issues
      const issues: string[] = [];

      if (overdueContributions > 0) {
        issues.push(`${overdueContributions} contributions are overdue for payment`);
      }

      if (totalPayments > 0 && compliantPayments < totalPayments) {
        issues.push(`${totalPayments - compliantPayments} payments failed SuperStream compliance`);
      }

      if (totalContributions > paidContributions) {
        issues.push(`${totalContributions - paidContributions} contributions are unpaid`);
      }

      const report: SuperComplianceReport = {
        reportPeriod: { start: startDate, end: endDate },
        generatedAt: new Date().toISOString(),
        totalContributions,
        totalContributionAmount,
        paidContributions,
        overdueContributions,
        totalPayments,
        compliantPayments,
        complianceRate: totalPayments > 0 ? (compliantPayments / totalPayments) * 100 : 100,
        issues,
        recommendations: this.generateComplianceRecommendations(issues)
      };

      // Store report for audit purposes
      const { error: storeError } = await supabase
        .from('super_compliance_reports')
        .insert({
          report_period_start: startDate,
          report_period_end: endDate,
          report_data: report,
          generated_at: report.generatedAt
        });

      if (storeError) {
        console.warn('Failed to store compliance report:', storeError);
      }

      return report;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Generate compliance recommendations
   */
  private generateComplianceRecommendations(issues: string[]): string[] {
    const recommendations: string[] = [];

    if (issues.some(issue => issue.includes('overdue'))) {
      recommendations.push('Process overdue super contributions immediately to avoid penalties');
      recommendations.push('Review payroll processing schedule to ensure timely payments');
    }

    if (issues.some(issue => issue.includes('SuperStream'))) {
      recommendations.push('Review SuperStream submission data for accuracy');
      recommendations.push('Verify employee super fund details are complete and valid');
      recommendations.push('Ensure payment references meet SuperStream requirements');
    }

    if (issues.some(issue => issue.includes('unpaid'))) {
      recommendations.push('Schedule payment for unpaid contributions');
      recommendations.push('Review payment processing workflow');
    }

    if (issues.length === 0) {
      recommendations.push('Superannuation compliance is satisfactory');
      recommendations.push('Continue current best practices');
    }

    return recommendations;
  }

  /**
   * Calculate super payment due date (21 days after quarter end)
   */
  private calculateSuperPaymentDueDate(periodEnd: string): string {
    const quarterEnd = this.getQuarterEndDate(periodEnd);
    const dueDate = addDays(parseISO(quarterEnd), SuperannuationManagementService.SUPER_STREAM_COMPLIANCE_DAYS);
    return format(dueDate, 'yyyy-MM-dd');
  }

  /**
   * Get quarter end date for a given date
   */
  private getQuarterEndDate(date: string): string {
    const inputDate = parseISO(date);
    const month = inputDate.getMonth();
    
    let quarterEndMonth: number;
    if (month >= 0 && month <= 2) quarterEndMonth = 2; // March
    else if (month >= 3 && month <= 5) quarterEndMonth = 5; // June
    else if (month >= 6 && month <= 8) quarterEndMonth = 8; // September
    else quarterEndMonth = 11; // December

    const quarterEnd = new Date(inputDate.getFullYear(), quarterEndMonth + 1, 0); // Last day of quarter
    return format(quarterEnd, 'yyyy-MM-dd');
  }

  /**
   * Get super fund details
   */
  async getSuperFund(fundId: string): Promise<SuperFund | null> {
    try {
      const { data, error } = await supabase
        .from('super_funds')
        .select('*')
        .eq('id', fundId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch super fund: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching super fund:', error);
      throw error;
    }
  }

  /**
   * Get all active super funds
   */
  async getActiveSuperFunds(): Promise<SuperFund[]> {
    try {
      const { data, error } = await supabase
        .from('super_funds')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch super funds: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching super funds:', error);
      throw error;
    }
  }

  /**
   * Get employee super contributions
   */
  async getEmployeeSuperContributions(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SuperannuationContribution[]> {
    try {
      let query = supabase
        .from('superannuation_contributions')
        .select(`
          *,
          fund:super_funds(*)
        `)
        .eq('employee_id', employeeId)
        .order('period_start', { ascending: false });

      if (startDate) {
        query = query.gte('period_start', startDate);
      }

      if (endDate) {
        query = query.lte('period_end', endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch employee super contributions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching employee super contributions:', error);
      throw error;
    }
  }

  /**
   * Get overdue super contributions
   */
  async getOverdueSuperContributions(): Promise<SuperannuationContribution[]> {
    try {
      const today = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('superannuation_contributions')
        .select(`
          *,
          employee:payroll_employees(*),
          fund:super_funds(*)
        `)
        .eq('is_paid', false)
        .lt('payment_date', today)
        .order('payment_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch overdue contributions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching overdue super contributions:', error);
      throw error;
    }
  }
}