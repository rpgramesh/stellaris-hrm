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

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
    }
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key missing' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const employeeIdsRaw = body?.employeeIds;
    const startDate = body?.startDate;
    const endDate = body?.endDate;

    if (!Array.isArray(employeeIdsRaw) || typeof startDate !== 'string' || typeof endDate !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const employeeIds = employeeIdsRaw.filter((id: any) => typeof id === 'string' && isUuid(id));
    if (employeeIds.length === 0) return NextResponse.json({ sent: 0 });

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: employeeRow } = await supabaseAdmin
      .from('employees')
      .select('role, system_access_role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    const role = (employeeRow?.role || employeeRow?.system_access_role || '').toString();
    if (!HR_ADMIN_ROLES.has(role) && !role.toLowerCase().includes('hr')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: emps, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, line_manager_id')
      .in('id', employeeIds);

    if (empErr) throw empErr;

    const employees = (emps || []).filter((e: any) => e?.line_manager_id);
    const managerIds = Array.from(new Set(employees.map((e: any) => String(e.line_manager_id)).filter(Boolean)));
    if (managerIds.length === 0) {
      return NextResponse.json({ sent: 0, skipped: employeeIds.length });
    }

    const { data: managers, error: mgrErr } = await supabaseAdmin
      .from('employees')
      .select('id, user_id, first_name, last_name')
      .in('id', managerIds);
    if (mgrErr) throw mgrErr;

    const managersByEmployeeId = new Map<string, any>();
    for (const m of managers || []) managersByEmployeeId.set(String((m as any).id), m);

    const employeesByManagerUserId = new Map<string, any[]>();
    for (const e of employees) {
      const mgr = managersByEmployeeId.get(String((e as any).line_manager_id));
      const managerUserId = String(mgr?.user_id || '');
      if (!isUuid(managerUserId)) continue;
      const list = employeesByManagerUserId.get(managerUserId) || [];
      list.push(e);
      employeesByManagerUserId.set(managerUserId, list);
    }

    const inserts: Array<{ user_id: string; title: string; message: string; type: string }> = [];
    for (const [managerUserId, team] of employeesByManagerUserId.entries()) {
      const employeeNames = team
        .map((e: any) => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.id)
        .slice(0, 20)
        .join(', ');
      const more = team.length > 20 ? ` (+${team.length - 20} more)` : '';
      inserts.push({
        user_id: managerUserId,
        title: 'Timesheet approval required',
        message: `Please approve timesheets for ${startDate} to ${endDate}. Employees: ${employeeNames}${more}`,
        type: 'warning',
      });
    }

    if (inserts.length > 0) {
      const { error: insErr } = await supabaseAdmin.from('notifications').insert(inserts as any);
      if (insErr) throw insErr;
    }

    return NextResponse.json({ sent: inserts.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}

