import { supabase } from '@/lib/supabase';
import type { RequestInit } from 'next/dist/server/web/spec-extension/request';

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
  /**
   * General method to send an email using a template from the database
   */
  sendTemplatedEmail: async (payload: EmailPayload) => {
    const { email, templateName, variables } = payload;
    const webhookUrl = getEmailWebhook();
    const appBase = getAppBaseUrl();

    try {
      // 1. Fetch template from database
      const { data: template, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('name', templateName)
        .single();

      if (error || !template) {
        console.warn(`Template "${templateName}" not found in database, falling back to basic formatting.`);
        return false;
      }

      // 2. Replace variables in subject and body
      let subject = template.subject;
      let bodyText = template.body;

      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(placeholder, value);
        bodyText = bodyText.replace(placeholder, value);
      });

      // 3. Prepare payload for webhook
      const requestBody = JSON.stringify({ 
        to: email, 
        subject, 
        text: bodyText 
      });

      const requestInit: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      };

      // 4. Send via webhook or fallback API
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
        throw new Error(`Email server responded with ${response.status}: ${errorText}`);
      }

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

    // Try to use the database template first
    const success = await emailService.sendTemplatedEmail({
      email,
      templateName: 'Welcome Email',
      variables: {
        fullName: fullName || username,
        username,
        temporaryPassword,
        changePasswordUrl,
        loginUrl: `${appBase}/login`
      }
    });

    // Fallback if template doesn't exist or fails
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      } catch (error) {
        console.error('Failed to send fallback welcome email.', error);
      }
    }
  },

  sendPasswordResetEmail: async (email: string, fullName: string, resetLink: string) => {
    // Try "Forgot Employee Password" template name first (matching user's screenshot)
    let success = await emailService.sendTemplatedEmail({
      email,
      templateName: 'Forgot Employee Password',
      variables: {
        fullName,
        resetLink
      }
    });

    // Fallback to "Reset Password" if "Forgot Employee Password" doesn't exist
    if (!success) {
      success = await emailService.sendTemplatedEmail({
        email,
        templateName: 'Reset Password',
        variables: {
          fullName,
          resetLink
        }
      });
    }

    if (!success) {
      // Fallback
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      } catch (error) {
        console.error('Failed to send fallback password reset email.', error);
      }
    }
    return success;
  },

  /**
   * Sends a test email for a specific template to a specific employee
   */
  sendTestEmail: async (templateName: string, employee: any, customVariables: Record<string, string> = {}) => {
    // Merge standard employee variables with custom ones
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
