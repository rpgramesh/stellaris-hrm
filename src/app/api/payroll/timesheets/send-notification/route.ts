import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { renderEmailTemplate } from '@/lib/email/templateRender';

const HR_ADMIN_ROLES = new Set([
  'HR Admin',
  'HR Manager',
  'Employer Admin',
  'Administrator',
  'Super Admin',
]);

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizeStatus = (s: any) => String(s || '').trim();

const weekStartMondays = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const firstMonday = new Date(start);
  const day = firstMonday.getUTCDay();
  const diff = firstMonday.getUTCDate() - day + (day === 0 ? -6 : 1);
  firstMonday.setUTCDate(diff);
  const out: string[] = [];
  for (let d = new Date(firstMonday); d <= end; d.setUTCDate(d.getUTCDate() + 7)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

const formatWeekRange = (weekStart: string, periodStart: string, periodEnd: string) => {
  const ws = new Date(`${weekStart}T00:00:00.000Z`);
  const we = new Date(ws);
  we.setUTCDate(we.getUTCDate() + 6);
  const ps = new Date(`${periodStart}T00:00:00.000Z`);
  const pe = new Date(`${periodEnd}T00:00:00.000Z`);
  const displayStart = ws < ps ? ps : ws;
  const displayEnd = we > pe ? pe : we;
  return `${displayStart.toISOString().slice(0, 10)} to ${displayEnd.toISOString().slice(0, 10)}`;
};

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const kindRaw = String(body?.kind || '').trim().toUpperCase();
    const employeeIdsRaw = body?.employeeIds;
    const startDate = body?.startDate;
    const endDate = body?.endDate;

    if (!['MISSING', 'UNAPPROVED'].includes(kindRaw)) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    if (!Array.isArray(employeeIdsRaw) || typeof startDate !== 'string' || typeof endDate !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const employeeIds = employeeIdsRaw.filter((id: any) => typeof id === 'string' && isUuid(id));
    if (employeeIds.length === 0) return NextResponse.json({ results: [] });

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

    const { data: employees, error: empErr } = await dataClient
      .from('employees')
      .select('id, first_name, last_name, employee_code, line_manager_id')
      .in('id', employeeIds);
    if (empErr) throw empErr;

    const employeeRows = (employees || []) as any[];
    const managerIds = Array.from(new Set(employeeRows.map((e) => String(e.line_manager_id || '')).filter((v) => isUuid(v))));
    const { data: managers } = managerIds.length
      ? await dataClient.from('employees').select('id, first_name, last_name, email').in('id', managerIds)
      : ({ data: [] } as any);
    const managersById = new Map<string, any>((managers || []).map((m: any) => [String(m.id), m]));

    const weeks = weekStartMondays(startDate, endDate);
    const { data: timesheets, error: tsErr } = await dataClient
      .from('timesheets')
      .select('employee_id, week_start_date, status, total_hours')
      .in('employee_id', employeeIds)
      .in('week_start_date', weeks);
    if (tsErr) throw tsErr;

    const timesheetsByEmployee = new Map<string, any[]>();
    for (const ts of timesheets || []) {
      const eid = String((ts as any).employee_id || '');
      const list = timesheetsByEmployee.get(eid) || [];
      list.push(ts);
      timesheetsByEmployee.set(eid, list);
    }

    const emailType = kindRaw === 'MISSING' ? 'TIMESHEET_MISSING' : 'TIMESHEET_APPROVAL_REQUIRED';

    const assignment = await dataClient
      .from('email_template_assignments')
      .select('template_id, is_enabled')
      .eq('email_type', emailType)
      .maybeSingle();
    const templateId = (assignment as any)?.data?.template_id;
    const isEnabled = (assignment as any)?.data?.is_enabled !== false;
    if (!templateId || !isEnabled) {
      return NextResponse.json({ error: `Email type ${emailType} is not enabled or has no template` }, { status: 400 });
    }

    const templateRes = await dataClient.from('email_templates').select('id, name, subject, body').eq('id', templateId).maybeSingle();
    const template = (templateRes as any)?.data;
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 400 });

    const origin = new URL(request.url).origin;
    const now = new Date();
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const results: any[] = [];

    for (const emp of employeeRows) {
      const manager = managersById.get(String(emp.line_manager_id || ''));
      const managerEmail = String(manager?.email || '').trim();
      if (!managerEmail) {
        results.push({ employeeId: emp.id, status: 'FAILED', error: 'Missing manager email' });
        continue;
      }

      const dedupeKey = `${emailType}:${emp.id}:${startDate}:${endDate}`;
      const { data: recent } = await dataClient
        .from('email_audit_log')
        .select('id, status, sent_at')
        .eq('email_type', emailType)
        .eq('recipient_email', managerEmail)
        .eq('dedupe_key', dedupeKey)
        .eq('status', 'SENT')
        .gte('sent_at', windowStart)
        .order('sent_at', { ascending: false })
        .limit(1);

      if (Array.isArray(recent) && recent.length > 0) {
        results.push({ employeeId: emp.id, status: 'SKIPPED_DUPLICATE', sentAt: recent[0].sent_at, logId: recent[0].id });
        continue;
      }

      const employeeName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.id;
      const employeeCode = String(emp.employee_code || '').trim() || emp.id;
      const managerName = `${manager?.first_name || ''} ${manager?.last_name || ''}`.trim() || 'Manager';
      const period = `${startDate} to ${endDate}`;

      const tsRows = timesheetsByEmployee.get(String(emp.id)) || [];
      const byWeek = new Map<string, any>();
      for (const t of tsRows) byWeek.set(String((t as any).week_start_date || '').slice(0, 10), t);

      const missingWeeks = weeks.filter((ws) => !byWeek.has(ws)).map((ws) => formatWeekRange(ws, startDate, endDate));
      const unapprovedWeeks = weeks
        .filter((ws) => byWeek.has(ws))
        .filter((ws) => normalizeStatus(byWeek.get(ws)?.status).toLowerCase() !== 'approved')
        .map((ws) => `${formatWeekRange(ws, startDate, endDate)} (${normalizeStatus(byWeek.get(ws)?.status) || 'Unknown'})`);

      if (kindRaw === 'MISSING' && missingWeeks.length === 0) {
        results.push({ employeeId: emp.id, status: 'SKIPPED', reason: 'No missing timesheets detected' });
        continue;
      }
      if (kindRaw === 'UNAPPROVED' && unapprovedWeeks.length === 0) {
        results.push({ employeeId: emp.id, status: 'SKIPPED', reason: 'No unapproved timesheets detected' });
        continue;
      }

      const timesheetLink = `${origin}/attendance/timesheets?payPeriodStart=${encodeURIComponent(startDate)}&payPeriodEnd=${encodeURIComponent(endDate)}`;
      const approvalLink = timesheetLink;

      const variables: Record<string, string> = kindRaw === 'MISSING'
        ? {
            employee_name: employeeName,
            employee_code: employeeCode,
            period,
            missing_weeks: missingWeeks.join(', '),
            manager_name: managerName,
            timesheet_link: timesheetLink,
          }
        : {
            employee_name: employeeName,
            employee_code: employeeCode,
            period,
            pending_count: String(unapprovedWeeks.length),
            pending_weeks: unapprovedWeeks.join(', '),
            manager_name: managerName,
            approval_link: approvalLink,
          };

      const rendered = renderEmailTemplate({ subject: String(template.subject || ''), body: String(template.body || ''), variables });

      const res = await fetch(`${origin}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: managerEmail, subject: rendered.subject, text: rendered.body }),
      });

      const ok = res.ok;
      const responseText = ok ? null : await res.text().catch(() => null);
      const messageId = ok
        ? await res
            .json()
            .then((j) => j?.messageId || null)
            .catch(() => null)
        : null;

      const logPayload: any = {
        recipient_email: managerEmail,
        email_type: emailType,
        template_id: template.id,
        template_name: template.name,
        subject: rendered.subject,
        status: ok ? 'SENT' : 'FAILED',
        error: ok ? null : responseText,
        triggered_by: userData.user.id,
        provider: process.env.WELCOME_EMAIL_WEBHOOK_URL ? 'Webhook' : 'SMTP',
        message_id: messageId,
        dedupe_key: dedupeKey,
        metadata: {
          kind: kindRaw,
          employeeId: emp.id,
          employeeName,
          employeeCode,
          managerId: manager?.id || null,
          managerEmail,
          startDate,
          endDate,
          missingWeeks,
          unapprovedWeeks,
        },
      };

      try {
        const client = supabaseAdmin || dataClient;
        await client.from('email_audit_log').insert(logPayload as any);
      } catch {
      }

      results.push({
        employeeId: emp.id,
        status: ok ? 'SENT' : 'FAILED',
        error: ok ? null : responseText,
        messageId,
      });
    }

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}
