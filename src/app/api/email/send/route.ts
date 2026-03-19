import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const loadEmailConfig = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data } = await supabaseAdmin.from('email_config').select('*').eq('id', 'default').maybeSingle();
    return data || null;
  } catch {
    return null;
  }
};

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

    const cfg: any = await loadEmailConfig();
    const useWebhook = !!cfg?.use_webhook && typeof cfg?.webhook_url === 'string' && cfg.webhook_url.trim().length > 0;

    if (useWebhook) {
      const res = await fetch(cfg.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, text }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => 'Webhook send failed');
        return new NextResponse(JSON.stringify({ error: errText }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      return NextResponse.json({
        success: true,
        messageId: null,
        message: 'Email sent successfully via webhook',
      });
    }

    const host = cfg?.smtp_host || process.env.SMTP_HOST;
    const port = Number(cfg?.smtp_port || process.env.SMTP_PORT || 587);
    const user = cfg?.smtp_user || process.env.SMTP_USER;
    const pass = cfg?.smtp_password || process.env.SMTP_PASS;
    const fromAddress = cfg?.from_address || process.env.SMTP_FROM || user;
    const fromName = cfg?.from_name || 'Stellaris HRM';

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: String(port) === '465',
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `${fromName} <${fromAddress}>`,
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
