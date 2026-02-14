import { supabase } from '@/lib/supabase';
import { STPSubmission, STPPayeeData, PayrollRun } from '@/types/payroll';
import { auditService } from './auditService';

export class STPPhase2Service {
  private readonly ATO_ENDPOINT = process.env.NEXT_PUBLIC_ATO_STP_ENDPOINT || 'https://api.ato.gov.au/stp/v2';
  private readonly SOFTWARE_ID = process.env.NEXT_PUBLIC_STP_SOFTWARE_ID || 'SW123456789';
  private readonly SOFTWARE_VERSION = '1.0.0';

  async submitPayrollEvent(payrollRun: PayrollRun, payeeData: STPPayeeData[]): Promise<STPSubmission> {
    try {
      // Create STP submission record
      const submission = await this.createSTPSubmission(payrollRun, payeeData);
      
      // Prepare payload for ATO
      const payload = this.buildSTPPayload(payrollRun, payeeData);
      
      // Submit to ATO
      const response = await this.submitToATO(payload);
      
      // Update submission status based on response
      await this.updateSubmissionStatus(submission.id, response);
      
      // Create audit log
      await auditService.logAction(
        'stp_submissions',
        submission.id,
        'INSERT',
        null,
        { submission, response },
        payrollRun.processedBy || 'system'
      );

      return submission;
    } catch (error) {
      console.error('STP submission error:', error);
      throw new Error(`STP submission failed: ${error.message}`);
    }
  }

  async createSTPSubmission(payrollRun: PayrollRun, payeeData: STPPayeeData[]): Promise<STPSubmission> {
    const submissionData = {
      payroll_run_id: payrollRun.id,
      submission_type: 'PayEvent',
      status: 'Draft',
      submission_date: new Date().toISOString(),
      employee_count: payeeData.length,
      total_gross: payeeData.reduce((sum, p) => sum + p.grossAmount, 0),
      total_tax: payeeData.reduce((sum, p) => sum + p.taxAmount, 0),
      total_super: payeeData.reduce((sum, p) => sum + p.superAmount, 0)
    };

    const { data, error } = await supabase
      .from('stp_submissions')
      .insert([submissionData])
      .select()
      .single();

    if (error) throw error;

    // Create STP payee data records
    for (const payee of payeeData) {
      await supabase.from('stp_payee_data').insert([{
        stp_submission_id: data.id,
        employee_id: payee.employeeId,
        income_type: payee.incomeType,
        country_code: payee.countryCode,
        tax_treatment_code: payee.taxTreatmentCode,
        gross_amount: payee.grossAmount,
        tax_amount: payee.taxAmount,
        super_amount: payee.superAmount,
        ytd_gross: payee.ytdGross,
        ytd_tax: payee.ytdTax,
        ytd_super: payee.ytdSuper,
        pay_period_start: payee.payPeriodStart,
        pay_period_end: payee.payPeriodEnd,
        payment_date: payee.paymentDate
      }]);
    }

    return this.mapSTPSubmissionFromDb(data);
  }

  private buildSTPPayload(payrollRun: PayrollRun, payeeData: STPPayeeData[]): any {
    return {
      submissionType: 'PayEvent',
      softwareId: this.SOFTWARE_ID,
      softwareVersion: this.SOFTWARE_VERSION,
      submissionTimestamp: new Date().toISOString(),
      payrollRunId: payrollRun.id,
      payPeriodStart: payrollRun.payPeriodStart,
      payPeriodEnd: payrollRun.payPeriodEnd,
      paymentDate: payrollRun.paymentDate,
      employer: {
        abn: process.env.NEXT_PUBLIC_COMPANY_ABN || '12345678901',
        name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Stellaris HRM Pty Ltd'
      },
      payees: payeeData.map(payee => ({
        employeeId: payee.employeeId,
        incomeType: payee.incomeType,
        countryCode: payee.countryCode || 'AU',
        taxTreatmentCode: payee.taxTreatmentCode,
        grossAmount: payee.grossAmount,
        taxAmount: payee.taxAmount,
        superAmount: payee.superAmount,
        ytdGross: payee.ytdGross,
        ytdTax: payee.ytdTax,
        ytdSuper: payee.ytdSuper,
        payPeriodStart: payee.payPeriodStart,
        payPeriodEnd: payee.payPeriodEnd,
        paymentDate: payee.paymentDate,
        // STP Phase 2 additional fields
        incomeStream: {
          incomeType: payee.incomeType,
          taxTreatmentCode: payee.taxTreatmentCode,
          countryCode: payee.countryCode || 'AU'
        },
        deductions: [],
        allowances: [],
        leave: []
      })),
      totals: {
        gross: payrollRun.totalGrossPay,
        tax: payrollRun.totalTax,
        super: payrollRun.totalSuper
      }
    };
  }

  private async submitToATO(payload: any): Promise<any> {
    // In a real implementation, this would make an actual API call to the ATO
    // For now, we'll simulate a successful submission
    
    console.log('Submitting to ATO:', JSON.stringify(payload, null, 2));
    
    // Simulate ATO response
    return {
      submissionId: `STP-${Date.now()}`,
      status: 'Accepted',
      timestamp: new Date().toISOString(),
      processingTime: '2.5s',
      validationErrors: [],
      warnings: []
    };
  }

  private async updateSubmissionStatus(submissionId: string, response: any): Promise<void> {
    const { error } = await supabase
      .from('stp_submissions')
      .update({
        status: response.status === 'Accepted' ? 'Accepted' : 'Rejected',
        submission_id: response.submissionId,
        response_message: response.validationErrors?.join(', ') || 'Submission processed successfully'
      })
      .eq('id', submissionId);

    if (error) throw error;
  }

  async getSTPSubmissionStatus(submissionId: string): Promise<STPSubmission | null> {
    const { data, error } = await supabase
      .from('stp_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (error) return null;
    return this.mapSTPSubmissionFromDb(data);
  }

  async getSTPSubmissionsForPayrollRun(payrollRunId: string): Promise<STPSubmission[]> {
    const { data, error } = await supabase
      .from('stp_submissions')
      .select('*')
      .eq('payroll_run_id', payrollRunId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data?.map(this.mapSTPSubmissionFromDb) || [];
  }

  async createUpdateEvent(originalSubmissionId: string, updatedPayeeData: STPPayeeData[]): Promise<STPSubmission> {
    const originalSubmission = await this.getSTPSubmissionStatus(originalSubmissionId);
    if (!originalSubmission) {
      throw new Error('Original submission not found');
    }

    const updateSubmissionData = {
      payroll_run_id: originalSubmission.payrollRunId,
      submission_type: 'UpdateEvent',
      status: 'Draft',
      submission_date: new Date().toISOString(),
      employee_count: updatedPayeeData.length,
      total_gross: updatedPayeeData.reduce((sum, p) => sum + p.grossAmount, 0),
      total_tax: updatedPayeeData.reduce((sum, p) => sum + p.taxAmount, 0),
      total_super: updatedPayeeData.reduce((sum, p) => sum + p.superAmount, 0)
    };

    const { data, error } = await supabase
      .from('stp_submissions')
      .insert([updateSubmissionData])
      .select()
      .single();

    if (error) throw error;

    // Create updated payee data
    for (const payee of updatedPayeeData) {
      await supabase.from('stp_payee_data').insert([{
        stp_submission_id: data.id,
        employee_id: payee.employeeId,
        income_type: payee.incomeType,
        country_code: payee.countryCode,
        tax_treatment_code: payee.taxTreatmentCode,
        gross_amount: payee.grossAmount,
        tax_amount: payee.taxAmount,
        super_amount: payee.superAmount,
        ytd_gross: payee.ytdGross,
        ytd_tax: payee.ytdTax,
        ytd_super: payee.ytdSuper,
        pay_period_start: payee.payPeriodStart,
        pay_period_end: payee.payPeriodEnd,
        payment_date: payee.paymentDate
      }]);
    }

    return this.mapSTPSubmissionFromDb(data);
  }

  async validateSTPData(payeeData: STPPayeeData[]): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const payee of payeeData) {
      // Validate income type
      const validIncomeTypes = ['SAW', 'WHM', 'IAA', 'SWP', 'JSP', 'FEI', 'CDP', 'SIP', 'RAP'];
      if (!validIncomeTypes.includes(payee.incomeType)) {
        errors.push(`Invalid income type for employee ${payee.employeeId}: ${payee.incomeType}`);
      }

      // Validate tax treatment code
      if (!payee.taxTreatmentCode || payee.taxTreatmentCode.length < 3) {
        errors.push(`Invalid tax treatment code for employee ${payee.employeeId}`);
      }

      // Validate amounts
      if (payee.grossAmount < 0) {
        errors.push(`Negative gross amount for employee ${payee.employeeId}`);
      }

      if (payee.taxAmount < 0) {
        errors.push(`Negative tax amount for employee ${payee.employeeId}`);
      }

      if (payee.superAmount < 0) {
        errors.push(`Negative super amount for employee ${payee.employeeId}`);
      }

      // Validate dates
      if (new Date(payee.payPeriodStart) > new Date(payee.payPeriodEnd)) {
        errors.push(`Invalid pay period dates for employee ${payee.employeeId}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private mapSTPSubmissionFromDb(data: any): STPSubmission {
    return {
      id: data.id,
      payrollRunId: data.payroll_run_id,
      submissionType: data.submission_type,
      submissionId: data.submission_id,
      status: data.status,
      submissionDate: data.submission_date,
      employeeCount: data.employee_count,
      totalGross: Number(data.total_gross) || 0,
      totalTax: Number(data.total_tax) || 0,
      totalSuper: Number(data.total_super) || 0,
      responseMessage: data.response_message,
      errorDetails: data.error_details,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const stpService = new STPPhase2Service();