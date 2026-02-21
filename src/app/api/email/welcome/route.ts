import type { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM;

    if (!host || !port || !user || !pass || !fromEmail) {
      return new Response('SMTP not configured', { status: 500 });
    }

    const body = await request.json();
    const to = body.to as string | undefined;
    const subject = body.subject as string | undefined;
    const text = body.text as string | undefined;

    if (!to || !subject || !text) {
      return new Response('Missing email payload', { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
    });

    return new Response('Email sent', { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Unexpected error sending email: ${message}`, {
      status: 500,
    });
  }
}
