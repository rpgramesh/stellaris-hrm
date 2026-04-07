import { supabase } from '@/lib/supabase';

export type EmailType =
  | 'WELCOME'
  | 'PASSWORD_RESET'
  | 'PAYSLIP_NOTIFICATION'
  | 'LEAVE_REQUEST_APPROVAL'
  | 'LEAVE_REQUEST_REJECTION'
  | 'DOCUMENT_SUBMISSION_REMINDER'
  | 'PERFORMANCE_REVIEW_NOTIFICATION'
  | 'POLICY_UPDATE_NOTIFICATION'
  | 'ACCOUNT_CREATION'
  | 'JOB_APPLICATION_RECEIVED'
  | 'INTERVIEW_INVITATION'
  | 'INTERVIEW_REJECTION'
  | 'MFA_CODE';

export interface EmailTemplateAssignment {
  id: string;
  email_type: EmailType;
  template_id: string;
  is_default: boolean;
  updated_at: string;
  updated_by?: string | null;
}

export interface EmailAuditLog {
  id: string;
  sent_at: string;
  recipient_email: string;
  email_type?: EmailType | null;
  template_id?: string | null;
  template_name?: string | null;
  subject?: string | null;
  status: 'SENT' | 'FAILED';
  error?: string | null;
  triggered_by?: string | null;
  provider?: string | null;
  message_id?: string | null;
}

export const AVAILABLE_EMAIL_TYPES: { value: EmailType; label: string }[] = [
  { value: 'WELCOME', label: 'Welcome Email' },
  { value: 'PASSWORD_RESET', label: 'Password Reset' },
  { value: 'PAYSLIP_NOTIFICATION', label: 'Payslip Notification' },
  { value: 'LEAVE_REQUEST_APPROVAL', label: 'Leave Request Approved' },
  { value: 'LEAVE_REQUEST_REJECTION', label: 'Leave Request Rejected' },
  { value: 'DOCUMENT_SUBMISSION_REMINDER', label: 'Document Submission Reminder' },
  { value: 'PERFORMANCE_REVIEW_NOTIFICATION', label: 'Performance Review Notification' },
  { value: 'POLICY_UPDATE_NOTIFICATION', label: 'Policy Update Notification' },
  { value: 'ACCOUNT_CREATION', label: 'Account Creation' },
  { value: 'JOB_APPLICATION_RECEIVED', label: 'Job Application Received' },
  { value: 'INTERVIEW_INVITATION', label: 'Interview Invitation' },
  { value: 'INTERVIEW_REJECTION', label: 'Interview Rejection' },
  { value: 'MFA_CODE', label: 'MFA Code' }
];

export const emailConfigService = {
  async getAssignments(): Promise<EmailTemplateAssignment[]> {
    const { data, error } = await supabase
      .from('email_template_assignments')
      .select('*')
      .order('email_type');
    if (error) throw error;
    return data || [];
  },

  async upsertAssignment(emailType: EmailType, templateId: string): Promise<void> {
    const { data, error } = await supabase
      .from('email_template_assignments')
      .upsert(
        { email_type: emailType, template_id: templateId, is_default: true },
        { onConflict: 'email_type' }
      )
      .select()
      .maybeSingle();
    if (error) throw error;
    return;
  },

  async validateTemplateContent(subject: string, body: string, expectedVariables: string[]): Promise<{ missing: string[] }> {
    const missing = expectedVariables.filter(v => {
      const re = new RegExp(`{{${v}}}`, 'g');
      return !re.test(subject) && !re.test(body);
    });
    return { missing };
  },

  async fetchAuditLogs(params: {
    page?: number;
    pageSize?: number;
    fromDate?: string | null;
    toDate?: string | null;
    emailType?: EmailType | '';
    recipient?: string;
    status?: 'SENT' | 'FAILED' | '';
  }): Promise<{ rows: EmailAuditLog[]; total: number }> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    
    let query = supabase
      .from('email_audit_log')
      .select('*', { count: 'exact' });

    if (params.fromDate) query = query.gte('sent_at', params.fromDate);
    if (params.toDate) query = query.lte('sent_at', params.toDate);
    if (params.emailType) query = query.eq('email_type', params.emailType);
    if (params.recipient) query = query.ilike('recipient_email', `%${params.recipient}%`);
    if (params.status) query = query.eq('status', params.status);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('sent_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message || 'Failed to fetch audit logs');
    }

    return { rows: (data as any) || [], total: count || 0 };
  },
};
