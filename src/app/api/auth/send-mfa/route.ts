import { NextResponse } from 'next/server';
import { emailService } from '@/services/emailService';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return new NextResponse('Email and code are required', { status: 400 });
    }

    // Send the MFA code using our email service
    // We use a simple template or raw text for now
    const ok = await emailService.sendEmailByType('MFA_CODE', email, {
      code: code
    });

    if (!ok) {
      return NextResponse.json(
        {
          error: 'Failed to send verification code.',
          code: 'EMAIL_SEND_FAILED',
          details:
            'Check SMTP configuration (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS), or configure WELCOME_EMAIL_WEBHOOK_URL, and ensure an enabled email template assignment exists for MFA_CODE.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('MFA Email API error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
