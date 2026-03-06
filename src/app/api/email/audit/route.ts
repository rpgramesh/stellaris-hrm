import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    const supabaseAdmin = createClient(url, serviceRoleKey || anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await request.json();
    const payload = {
      sent_at: body.sent_at || new Date().toISOString(),
      recipient_email: body.recipient_email,
      email_type: body.email_type || null,
      template_id: body.template_id || null,
      template_name: body.template_name || null,
      subject: body.subject || null,
      status: body.status || 'SENT',
      error: body.error || null,
      triggered_by: body.triggered_by || null,
      provider: body.provider || null,
      message_id: body.message_id || null
    };

    if (!payload.recipient_email) {
      return NextResponse.json({ error: 'recipient_email required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('email_audit_log').insert(payload);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}

