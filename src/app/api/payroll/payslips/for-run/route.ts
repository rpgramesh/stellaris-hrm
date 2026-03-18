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

    const url = new URL(request.url);
    const payrollRunId = (url.searchParams.get('payrollRunId') || '').trim();
    if (!payrollRunId) return NextResponse.json({ error: 'payrollRunId is required' }, { status: 400 });

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: employeeRow } = await supabaseAdmin
      .from('employees')
      .select('id, role, system_access_role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    const role = String(employeeRow?.role || employeeRow?.system_access_role || '');
    if (!HR_ADMIN_ROLES.has(role) && !role.toLowerCase().includes('hr')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: payslips, error: payslipErr } = await supabaseAdmin
      .from('payslips')
      .select(
        `
        id,
        payroll_run_id,
        employee_id,
        net_pay,
        hours_worked,
        superannuation,
        gross_earnings,
        gross_pay,
        income_tax,
        tax_withheld,
        employees:employee_id ( first_name, last_name )
      `
      )
      .eq('payroll_run_id', payrollRunId);

    if (payslipErr) throw payslipErr;

    await supabaseAdmin.from('audit_logs').insert({
      table_name: 'payroll_reports',
      record_id: `payslips_for_run_${payrollRunId}`,
      action: 'SYSTEM_ACTION',
      old_data: null,
      new_data: { payrollRunId, count: (payslips || []).length },
      performed_by: userData.user.id,
    });

    return NextResponse.json({ payslips: payslips || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}
