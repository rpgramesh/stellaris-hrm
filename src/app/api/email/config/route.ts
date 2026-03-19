import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const HR_ADMIN_ROLES = new Set([
  'HR Admin',
  'HR Manager',
  'Employer Admin',
  'Administrator',
  'Super Admin',
]);

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
    if (!serviceRoleKey) return NextResponse.json({ error: 'Service role key missing' }, { status: 500 });

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAuth = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: employeeRow } = await supabaseUser
      .from('employees')
      .select('role, system_access_role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    const role = String(employeeRow?.role || employeeRow?.system_access_role || '');
    if (!HR_ADMIN_ROLES.has(role) && !role.toLowerCase().includes('hr')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data } = await supabaseAdmin.from('email_config').select('*').eq('id', 'default').maybeSingle();

    if (!data) return NextResponse.json({ config: null });

    const { smtp_password, ...safe } = data as any;
    return NextResponse.json({ config: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
    if (!serviceRoleKey) return NextResponse.json({ error: 'Service role key missing' }, { status: 500 });

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAuth = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: employeeRow } = await supabaseUser
      .from('employees')
      .select('role, system_access_role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    const role = String(employeeRow?.role || employeeRow?.system_access_role || '');
    if (!HR_ADMIN_ROLES.has(role) && !role.toLowerCase().includes('hr')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const next: any = {
      id: 'default',
      smtp_host: typeof body?.smtp_host === 'string' ? body.smtp_host : null,
      smtp_port: typeof body?.smtp_port === 'number' ? body.smtp_port : null,
      smtp_user: typeof body?.smtp_user === 'string' ? body.smtp_user : null,
      from_address: typeof body?.from_address === 'string' ? body.from_address : null,
      from_name: typeof body?.from_name === 'string' ? body.from_name : null,
      use_webhook: typeof body?.use_webhook === 'boolean' ? body.use_webhook : null,
      webhook_url: typeof body?.webhook_url === 'string' ? body.webhook_url : null,
      updated_by: userData.user.id,
    };
    if (typeof body?.smtp_password === 'string' && body.smtp_password.trim()) {
      next.smtp_password = body.smtp_password;
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await supabaseAdmin.from('email_config').upsert(next, { onConflict: 'id' });
    if (error) throw error;

    const { smtp_password, ...safe } = next;
    return NextResponse.json({ config: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}

