import { supabase } from '@/lib/supabase';
import type { RequestInit } from 'next/dist/server/web/spec-extension/request';

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

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateAssignment {
  id: string;
  email_type: EmailType;
  template_id: string;
  is_default: boolean;
  is_enabled: boolean;
  template?: EmailTemplate;
}

export interface EmailAuditLogEntry {
  id: string;
  sent_at: string;
  recipient_email: string;
  email_type: EmailType | null;
  template_id: string | null;
  template_name: string | null;
  subject: string | null;
  status: 'SENT' | 'FAILED';
  error: string | null;
  triggered_by: string | null;
  provider: string | null;
  message_id: string | null;
  user?: {
    first_name: string;
    last_name: string;
  };
}

interface EmailPayload {
  email: string;
  templateName: string;
  variables: Record<string, string>;
}

interface WelcomeEmailPayload {
  email: string;
  fullName: string;
  username: string;
  temporaryPassword: string;
}

const getAppBaseUrl = () => {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  return '';
};

const getEmailWebhook = () => {
  const url = process.env.WELCOME_EMAIL_WEBHOOK_URL;
  if (!url) {
    return null;
  }
  if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
    return null;
  }
  return url;
};

export const emailService = {
  getEmailTypes: (): EmailType[] => [
    'WELCOME',
    'PASSWORD_RESET',
    'PAYSLIP_NOTIFICATION',
    'LEAVE_REQUEST_APPROVAL',
    'LEAVE_REQUEST_REJECTION',
    'DOCUMENT_SUBMISSION_REMINDER',
    'PERFORMANCE_REVIEW_NOTIFICATION',
    'POLICY_UPDATE_NOTIFICATION',
    'ACCOUNT_CREATION',
    'JOB_APPLICATION_RECEIVED',
    'INTERVIEW_INVITATION',
    'INTERVIEW_REJECTION'
  ],

  resolveTemplateByType: async (emailType: EmailType): Promise<EmailTemplate | null> => {
    const { data: assignment, error: assignErr } = await supabase
      .from('email_template_assignments')
      .select('template_id, is_enabled')
      .eq('email_type', emailType)
      .maybeSingle();

    if (assignErr || !assignment?.template_id || assignment.is_enabled === false) return null;

    const { data: template, error: tplErr } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', assignment.template_id)
      .maybeSingle();

    if (tplErr || !template) return null;
    return template as EmailTemplate;
  },

  getTemplateAssignments: async (): Promise<EmailTemplateAssignment[]> => {
    const { data, error } = await supabase
      .from('email_template_assignments')
      .select(`
        *,
        template:email_templates(*)
      `);
    if (error) throw error;
    return data as EmailTemplateAssignment[];
  },

  assignTemplate: async (emailType: EmailType, templateId: string): Promise<void> => {
    const { error } = await supabase
      .from('email_template_assignments')
      .upsert({
        email_type: emailType,
        template_id: templateId,
        is_default: true,
        is_enabled: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email_type' });
    if (error) throw error;
  },

  /**
   * Toggles the enabled status of an email type.
   * If disabled, 'resolveTemplateByType' will return null, preventing the email from being sent.
   */
  toggleEmailTypeEnabled: async (emailType: EmailType, enabled: boolean): Promise<void> => {
    const { error } = await supabase
      .from('email_template_assignments')
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('email_type', emailType);
    if (error) throw error;
  },

  validateTemplateContent: (subject: string, body: string, expectedVariables: string[]): { missing: string[] } => {
    const missing = expectedVariables.filter(v => {
      const re = new RegExp(`{{${v}}}`, 'g');
      return !re.test(subject) && !re.test(body);
    });
    return { missing };
  },

  getAllTemplates: async (): Promise<EmailTemplate[]> => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as EmailTemplate[];
  },

  createTemplate: async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<EmailTemplate> => {
    const { data, error } = await supabase
      .from('email_templates')
      .insert([template])
      .select()
      .single();
    if (error) throw error;
    return data as EmailTemplate;
  },

  updateTemplate: async (id: string, updates: Partial<Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>>): Promise<EmailTemplate> => {
    const { data, error } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as EmailTemplate;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  getAuditLogs: async (filters?: {
    startDate?: string;
    endDate?: string;
    emailType?: string;
    recipient?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: EmailAuditLogEntry[]; total: number }> => {
    let query = supabase
      .from('email_audit_log')
      .select(`*`, { count: 'exact' });

    if (filters?.startDate) query = query.gte('sent_at', filters.startDate);
    if (filters?.endDate) query = query.lte('sent_at', filters.endDate);
    if (filters?.emailType) query = query.eq('email_type', filters.emailType);
    if (filters?.recipient) query = query.ilike('recipient_email', `%${filters.recipient}%`);
    if (filters?.status) query = query.eq('status', filters.status);

    query = query.order('sent_at', { ascending: false });

    if (filters?.limit) {
      const offset = filters.offset || 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('Audit log fetch error:', error);
      throw error;
    }

    const logs = data as any[] || [];
    
    // Fetch user details for the logs if we have any triggered_by IDs
    const userIds = Array.from(new Set(logs.map(l => l.triggered_by).filter(Boolean)));
    if (userIds.length > 0) {
      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);
      
      if (!empErr && employees) {
        const employeeMap = employees.reduce((acc: any, emp: any) => {
          acc[emp.user_id] = { first_name: emp.first_name, last_name: emp.last_name };
          return acc;
        }, {});
        
        logs.forEach(log => {
          if (log.triggered_by && employeeMap[log.triggered_by]) {
            log.user = employeeMap[log.triggered_by];
          }
        });
      }
    }

    return { logs, total: count || 0 };
  },

  writeAuditLog: async (entry: {
    recipient: string;
    emailType?: EmailType;
    templateId?: string | null;
    templateName?: string | null;
    subject?: string;
    status: 'SENT' | 'FAILED';
    error?: string | null;
    provider?: string;
    messageId?: string | null;
  }) => {
    const { data: userData } = await supabase.auth.getUser();
    const triggeredBy = userData?.user?.id || null;
    const payload = {
      recipient_email: entry.recipient,
      email_type: entry.emailType || null,
      template_id: entry.templateId || null,
      template_name: entry.templateName || null,
      subject: entry.subject || null,
      status: entry.status,
      error: entry.error || null,
      triggered_by: triggeredBy,
      provider: entry.provider || (process.env.WELCOME_EMAIL_WEBHOOK_URL ? 'Webhook' : 'SMTP'),
      message_id: entry.messageId || null
    };

    try {
      const { error } = await supabase.from('email_audit_log').insert(payload as any);
      if (!error) return;
      console.warn('Audit log failed via client, trying fallback API...', error.message);
    } catch (e) {
      console.warn('Audit log insert exception:', e);
    }

    const appBase = getAppBaseUrl();
    const url = `${appBase || ''}/api/email/audit`;
    const attempts = [0, 300, 1000];
    let lastErr: any = null;
    for (const wait of attempts) {
      if (wait) await new Promise(res => setTimeout(res, wait));
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) return;
        lastErr = await res.text();
      } catch (e: any) {
        lastErr = e?.message || 'fetch failed';
      }
    }
    console.warn('Audit log fallback failed:', lastErr);
  },

  sendEmailByType: async (emailType: EmailType, to: string, variables: Record<string, string>) => {
    const webhookUrl = getEmailWebhook();
    const appBase = getAppBaseUrl();
    try {
      const template = await emailService.resolveTemplateByType(emailType);
      if (!template) {
        await emailService.writeAuditLog({
          recipient: to,
          emailType,
          templateId: null,
          templateName: null,
          subject: '',
          status: 'FAILED',
          error: `No template assignment for ${emailType}`,
          provider: webhookUrl ? 'Webhook' : 'SMTP'
        });
        return false;
      }

      let subject = template.subject as string;
      let bodyText = template.body as string;
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(placeholder, value);
        bodyText = bodyText.replace(placeholder, value);
      });

      const requestBody = JSON.stringify({ to, subject, text: bodyText });
      const requestInit: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      };

      let response;
      if (webhookUrl) {
        response = await fetch(webhookUrl, requestInit);
      } else {
        const base = appBase || '';
        const fallbackUrl = `${base}/api/email/send`;
        response = await fetch(fallbackUrl, requestInit);
      }

      if (!response.ok) {
        const errorText = await response.text();
        await emailService.writeAuditLog({
          recipient: to,
          emailType,
          templateId: template.id,
          templateName: template.name,
          subject,
          status: 'FAILED',
          error: `HTTP ${response.status}: ${errorText}`,
          provider: webhookUrl ? 'Webhook' : 'SMTP'
        });
        return false;
      }

      let messageId: string | null = null;
      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          messageId = json?.messageId || null;
        }
      } catch {}

      await emailService.writeAuditLog({
        recipient: to,
        emailType,
        templateId: template.id,
        templateName: template.name,
        subject,
        status: 'SENT',
        error: null,
        provider: webhookUrl ? 'Webhook' : 'SMTP',
        messageId
      });
      return true;
    } catch (err: any) {
      await emailService.writeAuditLog({
        recipient: to,
        emailType,
        templateId: null,
        templateName: null,
        subject: '',
        status: 'FAILED',
        error: err?.message || 'Unknown error',
        provider: webhookUrl ? 'Webhook' : 'SMTP'
      });
      return false;
    }
  },

  sendTemplatedEmail: async (payload: EmailPayload) => {
    const { email, templateName, variables } = payload;
    const webhookUrl = getEmailWebhook();
    const appBase = getAppBaseUrl();

    try {
      const { data: template, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('name', templateName)
        .single();

      if (error || !template) {
        console.warn(`Template "${templateName}" not found in database, falling back to basic formatting.`);
        await emailService.writeAuditLog({
          recipient: email,
          templateName,
          subject: '',
          status: 'FAILED',
          error: `Template "${templateName}" not found`,
          provider: webhookUrl ? 'Webhook' : 'SMTP'
        });
        return false;
      }

      let subject = template.subject;
      let bodyText = template.body;

      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(placeholder, value);
        bodyText = bodyText.replace(placeholder, value);
      });

      const requestBody = JSON.stringify({ to: email, subject, text: bodyText });
      const requestInit: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      };

      let response;
      if (webhookUrl) {
        response = await fetch(webhookUrl, requestInit);
      } else {
        const base = appBase || '';
        const fallbackUrl = `${base}/api/email/send`;
        response = await fetch(fallbackUrl, requestInit);
      }

      if (!response.ok) {
        const errorText = await response.text();
        await emailService.writeAuditLog({
          recipient: email,
          templateId: template.id,
          templateName: template.name,
          subject,
          status: 'FAILED',
          error: `HTTP ${response.status}: ${errorText}`,
          provider: webhookUrl ? 'Webhook' : 'SMTP'
        });
        return false;
      }

      let messageId: string | null = null;
      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          messageId = json?.messageId || null;
        }
      } catch {}

      await emailService.writeAuditLog({
        recipient: email,
        templateId: template.id,
        templateName: template.name,
        subject,
        status: 'SENT',
        error: null,
        provider: webhookUrl ? 'Webhook' : 'SMTP',
        messageId
      });

      return true;
    } catch (error) {
      console.error(`Failed to send templated email: ${templateName}`, error);
      return false;
    }
  },

  sendWelcomeEmail: async (payload: WelcomeEmailPayload) => {
    const { email, fullName, username, temporaryPassword } = payload;
    const appBase = getAppBaseUrl();
    const changePasswordUrl = appBase
      ? `${appBase}/change-password?email=${encodeURIComponent(email)}`
      : `/change-password?email=${encodeURIComponent(email)}`;

    const success = await emailService.sendEmailByType('WELCOME', email, {
      fullName: fullName || username,
      username,
      temporaryPassword,
      changePasswordUrl,
      loginUrl: `${appBase}/login`
    });

    if (!success) {
      const webhookUrl = getEmailWebhook();
      const subject = 'Welcome to Stellaris HRM – Your Account Details';
      const textBody = [
        `Hi ${fullName || username},`,
        '',
        'Welcome to Stellaris HRM.',
        '',
        'Your employee self-service account has been created. Here are your initial login details:',
        '',
        `Username: ${username}`,
        `Temporary password: ${temporaryPassword}`,
        '',
        'For security reasons, you must change this temporary password when you first log in.',
        '',
        `Change Password Link: ${changePasswordUrl}`,
        '',
        'Thank you,',
        'Stellaris HRM System',
      ].join('\n');

      const body = JSON.stringify({ to: email, subject, text: textBody });
      const requestInit: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      };

      try {
        if (webhookUrl) {
          await fetch(webhookUrl, requestInit);
        } else {
          const base = appBase || '';
          const fallbackUrl = `${base}/api/email/welcome`;
          await fetch(fallbackUrl, requestInit);
        }
        await emailService.writeAuditLog({
          recipient: email,
          emailType: 'WELCOME',
          templateName: 'Fallback: Welcome',
          subject,
          status: 'SENT',
          error: null
        });
      } catch (error) {
        console.error('Failed to send fallback welcome email.', error);
        await emailService.writeAuditLog({
          recipient: email,
          emailType: 'WELCOME',
          templateName: 'Fallback: Welcome',
          subject,
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  },

  sendPasswordResetEmail: async (email: string, fullName: string, resetLink: string) => {
    let success = await emailService.sendEmailByType('PASSWORD_RESET', email, {
      fullName,
      resetLink
    });

    if (!success) {
      const subject = 'Password Reset Request';
      const textBody = [
        `Hi ${fullName},`,
        '',
        'We received a request to reset your password.',
        '',
        `Click here to reset your password: ${resetLink}`,
        '',
        'If you did not request this, please ignore this email.',
        '',
        'Thank you,',
        'Stellaris HRM System',
      ].join('\n');

      const body = JSON.stringify({ to: email, subject, text: textBody });
      const webhookUrl = getEmailWebhook();
      const appBase = getAppBaseUrl();

      const requestInit: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      };

      try {
        if (webhookUrl) {
          await fetch(webhookUrl, requestInit);
        } else {
          const base = appBase || '';
          const fallbackUrl = `${base}/api/email/send`;
          await fetch(fallbackUrl, requestInit);
        }
        await emailService.writeAuditLog({
          recipient: email,
          emailType: 'PASSWORD_RESET',
          templateName: 'Fallback: Password Reset',
          subject,
          status: 'SENT',
          error: null
        });
      } catch (error) {
        console.error('Failed to send fallback password reset email.', error);
        await emailService.writeAuditLog({
          recipient: email,
          emailType: 'PASSWORD_RESET',
          templateName: 'Fallback: Password Reset',
          subject,
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return success;
  },

  sendTestEmail: async (templateName: string, employee: any, customVariables: Record<string, string> = {}) => {
    const variables = {
      fullName: `${employee.firstName} ${employee.lastName}`,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      username: employee.email,
      department: employee.department || 'Unknown',
      position: employee.position || 'Unknown',
      employeeCode: employee.employeeCode || '',
      ...customVariables
    };

    return emailService.sendTemplatedEmail({
      email: employee.email,
      templateName,
      variables
    });
  }
};
