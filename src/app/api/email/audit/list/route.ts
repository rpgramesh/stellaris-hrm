import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '20');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');
    const emailType = url.searchParams.get('type') || '';
    const recipient = url.searchParams.get('recipient') || '';
    const status = url.searchParams.get('status') || '';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let query = supabase
      .from('email_audit_log')
      .select('*', { count: 'exact' });

    if (fromDate) query = query.gte('sent_at', fromDate);
    if (toDate) query = query.lte('sent_at', toDate);
    if (emailType) query = query.eq('email_type', emailType);
    if (recipient) query = query.ilike('recipient_email', `%${recipient}%`);
    if (status) query = query.eq('status', status);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('sent_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rows: data || [], total: count || 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}

