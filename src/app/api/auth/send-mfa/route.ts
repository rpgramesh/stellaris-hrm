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
    await emailService.sendEmailByType('MFA_CODE', email, {
      code: code
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('MFA Email API error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
