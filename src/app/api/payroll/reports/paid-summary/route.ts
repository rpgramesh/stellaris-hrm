import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildPaidPayrollSummary } from '@/lib/payroll/paidPayrollSummary';

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

    const role = (employeeRow?.role || employeeRow?.system_access_role || '').toString();
    if (!HR_ADMIN_ROLES.has(role) && !role.toLowerCase().includes('hr')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const startDate = (url.searchParams.get('startDate') || '').trim();
    const endDate = (url.searchParams.get('endDate') || '').trim();
    const payFrequency = (url.searchParams.get('payFrequency') || '').trim();
    const includeReady = (url.searchParams.get('includeReady') || '').toLowerCase() === 'true';
    const statuses = includeReady ? ['Paid', 'Processing', 'Approved', 'Draft'] : ['Paid'];

    let runsQuery = supabaseAdmin
      .from('payroll_runs')
      .select('id, pay_period_start, pay_period_end, payment_date, pay_frequency, status, employee_count, total_gross_pay, total_tax, total_net_pay, total_super')
      .in('status', statuses)
      .order('pay_period_start', { ascending: true });

    if (startDate) runsQuery = runsQuery.gte('pay_period_start', startDate);
    if (endDate) runsQuery = runsQuery.lte('pay_period_end', endDate);
    if (payFrequency) runsQuery = runsQuery.eq('pay_frequency', payFrequency);

    const { data: runs, error: runsErr } = await runsQuery;
    if (runsErr) throw runsErr;

    const runIds = (runs || []).map((r: any) => r.id);
    if (runIds.length === 0) {
      const empty = buildPaidPayrollSummary({ runs: [], payslips: [], startDate: startDate || undefined, endDate: endDate || undefined, statuses });
      await supabaseAdmin.from('audit_logs').insert({
        table_name: 'payroll_reports',
        record_id: 'paid_summary',
        action: 'SYSTEM_ACTION',
        old_data: null,
        new_data: { startDate: startDate || null, endDate: endDate || null, payFrequency: payFrequency || null, statuses, payrollRuns: 0 },
        performed_by: userData.user.id,
      });
      return NextResponse.json(empty, { headers: { 'Cache-Control': 'no-store' } });
    }

    const { data: payslips, error: psErr } = await supabaseAdmin
      .from('payslips')
      .select(
        `
        id,
        payroll_run_id,
        employee_id,
        pay_period_start,
        pay_period_end,
        payment_date,
        gross_pay,
        gross_earnings,
        net_pay,
        tax_withheld,
        income_tax,
        superannuation,
        total_deductions,
        deductions,
        employees:employee_id ( first_name, last_name, employee_code ),
        pay_components ( component_type, amount, description ),
        deduction_applications ( amount ),
        payroll_runs:payroll_run_id ( pay_period_start, pay_period_end, status )
      `
      )
      .in('payroll_run_id', runIds);

    if (psErr) throw psErr;

    const report = buildPaidPayrollSummary({
      runs: (runs || []) as any,
      payslips: (payslips || []) as any,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      statuses,
    });

    await supabaseAdmin.from('audit_logs').insert({
      table_name: 'payroll_reports',
      record_id: 'paid_summary',
      action: 'SYSTEM_ACTION',
      old_data: null,
      new_data: {
        startDate: startDate || null,
        endDate: endDate || null,
        payFrequency: payFrequency || null,
        statuses,
        payrollRuns: report.payrollRuns,
        employeeCount: report.employeeCount,
      },
      performed_by: userData.user.id,
    });

    return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}
