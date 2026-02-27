import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create a transporter using the SMTP settings from .env.local
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { to, subject, text } = payload;

    if (!to || !subject || !text) {
      return new NextResponse('Missing required fields: to, subject, or text', { status: 400 });
    }

    console.log('--- ATTEMPTING TO SEND SYSTEM EMAIL ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Using SMTP:', process.env.SMTP_HOST);

    // Send the email
    const info = await transporter.sendMail({
      from: `Stellaris HRM <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });

    console.log('Email sent successfully:', info.messageId);
    console.log('--------------------------------');

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully via SMTP' 
    });
  } catch (error: any) {
    console.error('--- EMAIL SMTP ERROR ---');
    console.error('Error details:', error);
    console.log('--------------------------------');
    
    return new NextResponse(
      JSON.stringify({
        error: error.message || 'Internal Server Error',
        code: error.code,
        command: error.command
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
