import type { RequestInit } from 'next/dist/server/web/spec-extension/request';

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

const getWelcomeEmailWebhook = () => {
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
  sendWelcomeEmail: async (payload: WelcomeEmailPayload) => {
    const webhookUrl = getWelcomeEmailWebhook();
    if (!webhookUrl) {
      return;
    }

    const { email, fullName, username, temporaryPassword } = payload;

    const appBase = getAppBaseUrl();
    const changePasswordUrl = appBase
      ? `${appBase}/change-password`
      : '/change-password';

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
      'First-time login steps:',
      '1. Go to the Employee login page in Stellaris HRM.',
      '2. Sign in using the username and temporary password above.',
      `3. You will be redirected to the Change Password page (${changePasswordUrl}).`,
      '4. Choose a new password that meets the password policy:',
      '   - At least 12 characters',
      '   - At least one uppercase letter',
      '   - At least one lowercase letter',
      '   - At least one number',
      '   - At least one special character (e.g. ! @ # $ %).',
      '',
      'Security reminders:',
      '- Do not share your password with anyone.',
      '- Do not reuse this temporary password elsewhere.',
      '- If you suspect your account is compromised, contact HR immediately.',
      '',
      'Thank you,',
      'Stellaris HRM System',
    ].join('\n');

    const body = JSON.stringify({
      to: email,
      subject,
      text: textBody,
    });

    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    };

    try {
      await fetch(webhookUrl, requestInit);
    } catch (error) {
      console.error('Failed to send welcome email (no sensitive body logged).', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
