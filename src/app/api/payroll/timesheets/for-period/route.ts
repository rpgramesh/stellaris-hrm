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
    if (employeeIds.length === 0) {
      return NextResponse.json({ rows: [] });
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
    }

    const startMinus6 = new Date(start);
    startMinus6.setUTCDate(startMinus6.getUTCDate() - 6);
    const startMinus6Str = startMinus6.toISOString().slice(0, 10);

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

    const { data: rows, error } = await supabaseAdmin
      .from('timesheets')
      .select('id, employee_id, week_start_date, status, total_hours')
      .in('employee_id', employeeIds)
      .gte('week_start_date', startMinus6Str)
      .lte('week_start_date', endDate);

    if (error) throw error;

    const baseRows = rows || [];
    const approvedIds = baseRows.filter((r: any) => String(r.status || '') === 'Approved').map((r: any) => r.id).filter(Boolean);

    const approvedHoursByTimesheetId: Record<string, number> = {};
    if (approvedIds.length > 0) {
      const { data: rowEntries, error: rowErr } = await supabaseAdmin
        .from('timesheet_rows')
        .select('timesheet_id, timesheet_entries(hours)')
        .in('timesheet_id', approvedIds);

      if (rowErr) {
        throw rowErr;
      }

      for (const r of rowEntries || []) {
        const tid = String((r as any).timesheet_id || '');
        if (!tid) continue;
        const sum = ((r as any).timesheet_entries || []).reduce((acc: number, e: any) => acc + Number(e.hours || 0), 0);
        approvedHoursByTimesheetId[tid] = (approvedHoursByTimesheetId[tid] || 0) + sum;
      }
    }

    const enriched = baseRows.map((r: any) => {
      const totalHours = Number(r.total_hours || 0);
      const derived = approvedHoursByTimesheetId[r.id];
      const approvedHours = Number.isFinite(Number(derived)) ? Number(derived) : totalHours;
      return {
        ...r,
        approved_hours: approvedHours
      };
    });

    return NextResponse.json({ rows: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}
