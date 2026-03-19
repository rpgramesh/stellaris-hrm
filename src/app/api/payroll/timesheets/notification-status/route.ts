import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const HR_ADMIN_ROLES = new Set([
  'HR Admin',
  'HR Manager',
  'Employer Admin',
  'Administrator',
  'Super Admin',
]);

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const employeeIdsParam = (url.searchParams.get('employeeIds') || '').trim();
    const startDate = (url.searchParams.get('startDate') || '').trim();
    const endDate = (url.searchParams.get('endDate') || '').trim();
    if (!employeeIdsParam || !startDate || !endDate) return NextResponse.json({ statuses: {} });

    const employeeIds = employeeIdsParam
      .split(',')
      .map((s) => s.trim())
      .filter((s) => isUuid(s));
    if (employeeIds.length === 0) return NextResponse.json({ statuses: {} });

    const supabaseAuth = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const supabaseAdmin = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : null;

    const roleRow = await supabaseUser
      .from('employees')
      .select('role, system_access_role')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    const role = String((roleRow as any)?.data?.role || (roleRow as any)?.data?.system_access_role || '');
    if (!HR_ADMIN_ROLES.has(role) && !role.toLowerCase().includes('hr')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dataClient = supabaseAdmin || supabaseUser;
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: logs } = await dataClient
      .from('email_audit_log')
      .select('id, sent_at, email_type, status, dedupe_key, metadata')
      .in('email_type', ['TIMESHEET_MISSING', 'TIMESHEET_APPROVAL_REQUIRED'])
      .gte('sent_at', windowStart)
      .order('sent_at', { ascending: false })
      .limit(200);

    const statuses: Record<string, any> = {};
    for (const eid of employeeIds) {
      statuses[eid] = {};
    }

    for (const l of logs || []) {
      const meta = (l as any).metadata || {};
      const employeeId = String(meta.employeeId || '');
      if (!employeeId || !statuses[employeeId]) continue;
      if (meta.startDate !== startDate || meta.endDate !== endDate) continue;
      const type = String((l as any).email_type || '');
      if (!type) continue;
      if (statuses[employeeId][type]) continue;
      statuses[employeeId][type] = {
        status: (l as any).status,
        sentAt: (l as any).sent_at,
        logId: (l as any).id,
      };
    }

    return NextResponse.json({ statuses });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}

