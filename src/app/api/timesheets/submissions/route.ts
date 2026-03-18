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

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
    }
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key missing' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      .select('id, role, system_access_role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    const role = (employeeRow?.role || employeeRow?.system_access_role || '').toString();
    if (!HR_ADMIN_ROLES.has(role) && !role.toLowerCase().includes('hr')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || '20')));
    const status = url.searchParams.get('status') || 'All';
    const department = url.searchParams.get('department') || 'All';
    const search = (url.searchParams.get('search') || '').trim();
    const payPeriodStart = url.searchParams.get('payPeriodStart') || '';
    const payPeriodEnd = url.searchParams.get('payPeriodEnd') || '';
    const sortByParam = url.searchParams.get('sortBy') || 'week_start_date';
    const sortDir = (url.searchParams.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const sortBy = (['week_start_date', 'status', 'total_hours'] as const).includes(sortByParam as any)
      ? (sortByParam as 'week_start_date' | 'status' | 'total_hours')
      : 'week_start_date';

    let employeeIds: string[] | null = null;

    if (department !== 'All' || search !== '') {
      let deptId: string | null = null;
      if (department !== 'All') {
        const { data: deptRow } = await supabaseAdmin
          .from('departments')
          .select('id')
          .eq('name', department)
          .limit(1)
          .maybeSingle();
        deptId = deptRow?.id || null;
        if (!deptId) return NextResponse.json({ rows: [], total: 0 });
      }

      let empQuery = supabaseAdmin.from('employees').select('id');
      if (deptId) empQuery = empQuery.eq('department_id', deptId);
      if (search) {
        const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search);
        if (uuid) {
          empQuery = empQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,id.eq.${search}`);
        } else {
          const parts = search.split(/\s+/).filter(Boolean).slice(0, 5);
          const orClauses = parts.flatMap((p) => [`first_name.ilike.%${p}%`, `last_name.ilike.%${p}%`]).join(',');
          empQuery = empQuery.or(orClauses || `first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
        }
      }
      const { data: emps, error: empErr } = await empQuery.limit(2000);
      if (empErr) throw empErr;
      employeeIds = (emps || []).map((e: any) => e.id);
      if (employeeIds.length === 0) {
        return NextResponse.json({ rows: [], total: 0 });
      }
    }

    let tsQuery = supabaseAdmin
      .from('timesheets')
      .select('id, employee_id, week_start_date, status, total_hours, updated_at', { count: 'exact' });

    if (status !== 'All') tsQuery = tsQuery.eq('status', status);
    if (employeeIds) tsQuery = tsQuery.in('employee_id', employeeIds);
    if (payPeriodStart) tsQuery = tsQuery.gte('week_start_date', payPeriodStart);
    if (payPeriodEnd) tsQuery = tsQuery.lte('week_start_date', payPeriodEnd);

    let headcountTotal = 0;
    try {
      const statusParam = status !== 'All' ? status : null;
      const { data: hc, error: hcErr } = await supabaseAdmin.rpc('timesheets_count_distinct_employees', {
        p_status: statusParam,
        p_employee_ids: employeeIds || null,
        p_week_start_from: payPeriodStart || null,
        p_week_start_to: payPeriodEnd || null,
      } as any);
      if (hcErr) throw hcErr;
      headcountTotal = typeof hc === 'number' ? hc : 0;
    } catch {
      headcountTotal = 0;
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: timesheets, count, error: tsErr } = await tsQuery
      .order(sortBy, { ascending: sortDir === 'asc' })
      .range(from, to);
    if (tsErr) throw tsErr;

    const rows = timesheets || [];
    const ids = Array.from(new Set(rows.map((t: any) => t.employee_id))).filter(Boolean);

    const employeesById: Record<string, any> = {};
    if (ids.length > 0) {
      const { data: emps, error: eErr } = await supabaseAdmin
        .from('employees')
        .select('id, first_name, last_name, email, phone, start_date, employment_status, department:departments!employees_department_id_fkey(name), position:job_positions(title)')
        .in('id', ids);
      if (eErr) throw eErr;
      for (const e of emps || []) employeesById[e.id] = e;
    }

    const approvedIds = rows.filter((t: any) => t.status === 'Approved').map((t: any) => t.id);
    const approvedHoursByTimesheetId: Record<string, number> = {};
    if (approvedIds.length > 0) {
      const { data: rowsWithEntries, error: rowsErr } = await supabaseAdmin
        .from('timesheet_rows')
        .select('timesheet_id, timesheet_entries(hours)')
        .in('timesheet_id', approvedIds);
      if (rowsErr) throw rowsErr;
      for (const r of rowsWithEntries || []) {
        const tid = r.timesheet_id;
        const sum = (r.timesheet_entries || []).reduce((acc: number, e: any) => acc + Number(e.hours || 0), 0);
        approvedHoursByTimesheetId[tid] = (approvedHoursByTimesheetId[tid] || 0) + sum;
      }
    }

    const mapped = rows.map((t: any) => {
      const e = employeesById[t.employee_id] || {};
      const name = [e.first_name, e.last_name].filter(Boolean).join(' ') || t.employee_id;
      const startDate = new Date(t.week_start_date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      const payPeriod = `${startDate.toISOString().slice(0, 10)} - ${endDate.toISOString().slice(0, 10)}`;
      const derivedApprovedHours = approvedHoursByTimesheetId[t.id];
      return {
        id: t.id,
        employeeId: t.employee_id,
        employeeName: name,
        department: e?.department?.name || 'N/A',
        jobTitle: e?.position?.title,
        email: e?.email,
        phone: e?.phone,
        hireDate: e?.start_date,
        empStatus: e?.employment_status,
        status: t.status,
        submittedAt: t.status && t.status !== 'Draft' ? (t.updated_at || undefined) : undefined,
        payPeriod,
        hoursLogged: t.status === 'Approved'
          ? Number(derivedApprovedHours ?? t.total_hours ?? 0)
          : Number(t.total_hours || 0),
      };
    });

    return NextResponse.json({ rows: mapped, total: count || 0, headcountTotal });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}
