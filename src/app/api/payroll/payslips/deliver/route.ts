import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { generatePayslipPdfBuffer } from '@/lib/payroll/payslipPdf';

const HR_ADMIN_ROLES = new Set([
  'HR Admin',
  'HR Manager',
  'Employer Admin',
  'Administrator',
  'Super Admin',
]);

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const deriveKey = (password: string, salt: Buffer) => {
  return crypto.pbkdf2Sync(password, salt, 150_000, 32, 'sha256');
};

const encryptAttachment = (plain: Buffer, password: string) => {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  const header = Buffer.from('STLR1');
  return Buffer.concat([header, salt, iv, tag, ciphertext]);
};

const loadLogoDataUrl = () => {
  try {
    const filePath = path.join(process.cwd(), 'public', 'logo.png');
    const bytes = fs.readFileSync(filePath);
    return `data:image/png;base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
};

const getMailTransport = async (supabaseAdmin: any) => {
  const { data: cfg } = await supabaseAdmin.from('email_config').select('*').eq('id', 'default').maybeSingle();
  const host = cfg?.smtp_host || process.env.SMTP_HOST;
  const port = Number(cfg?.smtp_port || process.env.SMTP_PORT || 587);
  const user = cfg?.smtp_user || process.env.SMTP_USER;
  const pass = cfg?.smtp_password || process.env.SMTP_PASS;
  const fromAddress = cfg?.from_address || process.env.SMTP_FROM || user;
  const fromName = cfg?.from_name || 'Stellaris HRM';
  if (!host || !user || !pass || !fromAddress) throw new Error('Email delivery is not configured');
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: String(port) === '465',
    auth: { user, pass },
  });
  return { transporter, from: `${fromName} <${fromAddress}>` };
};

const logEmailAudit = async (supabaseAdmin: any, row: any) => {
  try {
    await supabaseAdmin.from('email_audit_log').insert(row);
  } catch {
  }
};

const ensureStorageBucket = async (supabaseAdmin: any, bucketId: string) => {
  if (!bucketId) return;
  const { data, error } = await supabaseAdmin.storage.getBucket(bucketId);
  if (!error && data) return;
  const msg = String((error as any)?.message || '');
  if (msg.toLowerCase().includes('not found') || String((error as any)?.statusCode || '').startsWith('4')) {
    const created = await supabaseAdmin.storage.createBucket(bucketId, { public: false });
    if (created?.error) {
      const cmsg = String((created.error as any)?.message || '');
      if (!cmsg.toLowerCase().includes('already exists')) throw created.error;
    }
    return;
  }
  if (error) throw error;
};

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

    const body = await request.json().catch(() => null);
    const payrollRunId = String(body?.payrollRunId || '').trim();
    const sendToEmployers = body?.sendToEmployers !== false;
    const sendToEmployees = body?.sendToEmployees !== false;
    const notifyInApp = body?.notifyInApp !== false;
    const rollbackOnFailure = body?.rollbackOnFailure !== false;
    const encryptAttachments = body?.encryptAttachments !== false;

    if (!payrollRunId || !isUuid(payrollRunId)) return NextResponse.json({ error: 'Invalid payrollRunId' }, { status: 400 });

    const supabaseAuth = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: employeeRow } = await supabaseUser
      .from('employees')
      .select('id, role, system_access_role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    const role = String(employeeRow?.role || employeeRow?.system_access_role || '');
    if (!HR_ADMIN_ROLES.has(role) && !role.toLowerCase().includes('hr')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: runRow, error: runErr } = await supabaseAdmin
      .from('payroll_runs')
      .select('*')
      .eq('id', payrollRunId)
      .maybeSingle();
    if (runErr) throw runErr;
    if (!runRow) return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });

    const { data: settingsRow } = await supabaseAdmin.from('system_settings').select('*').limit(1).maybeSingle();
    const companyName = String(settingsRow?.company_name || 'Stellaris HRM');
    const companyAddress = String(settingsRow?.company_address || '').split('\n').map((s: string) => s.trim()).filter(Boolean);
    const abn = settingsRow?.tax_id ? String(settingsRow.tax_id) : null;
    const logoDataUrl = loadLogoDataUrl();

    const { data: payslips, error: payslipErr } = await supabaseAdmin
      .from('payslips')
      .select('id, employee_id, payslip_number, payment_date, pay_period_start, pay_period_end, period_start, period_end, payment_reference, pdf_bucket, pdf_path, pdf_generated_at, employer_email')
      .eq('payroll_run_id', payrollRunId);
    if (payslipErr) throw payslipErr;

    const payslipRows = (payslips || []) as any[];
    if (payslipRows.length === 0) {
      return NextResponse.json({ error: 'No payslips found for payroll run' }, { status: 400 });
    }

    const employeeIds = Array.from(new Set(payslipRows.map((p) => String(p.employee_id)).filter(Boolean)));
    const { data: employees, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, user_id, first_name, last_name, employee_code, email, address, bank_name, bank_account_number, client_email, superannuation_fund_name, superannuation_member_number')
      .in('id', employeeIds);
    if (empErr) throw empErr;
    const employeesById = new Map<string, any>((employees || []).map((e: any) => [String(e.id), e]));

    const payslipIds = payslipRows.map((p) => String(p.id));
    const { data: components, error: compErr } = await supabaseAdmin
      .from('pay_components')
      .select('payslip_id, component_type, description, units, rate, amount, tax_treatment, stp_category, is_ytd')
      .in('payslip_id', payslipIds);
    if (compErr) throw compErr;
    const componentsByPayslipId = new Map<string, any[]>();
    for (const c of components || []) {
      const pid = String((c as any).payslip_id);
      const list = componentsByPayslipId.get(pid) || [];
      list.push(c);
      componentsByPayslipId.set(pid, list);
    }

    const { transporter, from } = await getMailTransport(supabaseAdmin);

    const uploaded: Array<{ bucket: string; path: string }> = [];
    const results: any[] = [];
    const pendingNotifications: Array<{ user_id: string; title: string; message: string; type: string }> = [];

    await ensureStorageBucket(supabaseAdmin, 'payslips');

    for (const p of payslipRows) {
      const employee = employeesById.get(String(p.employee_id));
      if (!employee) {
        results.push({ payslipId: p.id, status: 'FAILED', error: 'Employee not found' });
        continue;
      }

      const periodStart = String(p.period_start || p.pay_period_start || runRow.pay_period_start);
      const periodEnd = String(p.period_end || p.pay_period_end || runRow.pay_period_end);
      const paymentDate = String(p.payment_date || runRow.payment_date || '');

      const year = paymentDate ? new Date(paymentDate).getFullYear() : new Date().getFullYear();
      const yearStart = `${year}-01-01`;
      const { data: ytdRows } = await supabaseAdmin
        .from('payslips')
        .select('gross_pay, gross_earnings, net_pay, tax_withheld, income_tax, payg_tax, superannuation, payment_date, pay_period_start, pay_period_end, period_start, period_end')
        .eq('employee_id', employee.id)
        .gte('payment_date', yearStart)
        .lte('payment_date', paymentDate || '9999-12-31');

      const ytd = ((ytdRows as any[]) || []).reduce(
        (acc, r) => {
          const gross = Number(r.gross_pay ?? r.gross_earnings ?? 0);
          const tax = Number(r.tax_withheld ?? r.income_tax ?? r.payg_tax ?? 0);
          const net = Number(r.net_pay ?? 0);
          const sup = Number(r.superannuation ?? 0);
          return { gross: acc.gross + gross, tax: acc.tax + tax, net: acc.net + net, super: acc.super + sup };
        },
        { gross: 0, tax: 0, net: 0, super: 0 }
      );

      const paymentReference = String(p.payment_reference || `PAY-${p.payslip_number || p.id}`).slice(0, 80);
      const employerEmail = String(p.employer_email || employee.client_email || '').trim() || null;
      const pdfBucket = String(p.pdf_bucket || 'payslips');
      const pdfPath = `${employee.id}/${String(p.payslip_number || p.id)}.pdf`;

      await ensureStorageBucket(supabaseAdmin, pdfBucket);

      const pdf = generatePayslipPdfBuffer({
        payslip: { ...p, period_start: periodStart, period_end: periodEnd, payment_date: paymentDate, pay_frequency: runRow.pay_frequency },
        employee,
        payComponents: componentsByPayslipId.get(String(p.id)) || [],
        ytd,
        branding: {
          companyName,
          companyAddressLines: companyAddress,
          abn,
          logoDataUrl,
        },
        paymentReference,
        digitalSignatureText: `Digitally signed by ${companyName}`,
      });

      const { error: uploadErr } = await supabaseAdmin.storage.from(pdfBucket).upload(pdfPath, pdf, {
        contentType: 'application/pdf',
        upsert: true,
      });
      if (uploadErr) throw uploadErr;
      uploaded.push({ bucket: pdfBucket, path: pdfPath });

      await supabaseAdmin
        .from('payslips')
        .update({
          pdf_bucket: pdfBucket,
          pdf_path: pdfPath,
          pdf_generated_at: new Date().toISOString(),
          payment_reference: paymentReference,
          employer_email: employerEmail,
        })
        .eq('id', p.id);

      const password = crypto.randomBytes(10).toString('base64url');
      const attachment = encryptAttachments ? encryptAttachment(pdf, password) : pdf;
      const attachmentName = encryptAttachments ? `${String(p.payslip_number || 'payslip')}.pdf.enc` : `${String(p.payslip_number || 'payslip')}.pdf`;

      const subjectPeriod = `${periodStart} - ${periodEnd}`;
      const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();

      const hardFailures: string[] = [];
      const warnings: string[] = [];
      if (sendToEmployers && !employerEmail) warnings.push('missing_employer_email');
      if (sendToEmployees && !employee.email) hardFailures.push('missing_employee_email');
      if (notifyInApp && !employee.user_id) hardFailures.push('missing_employee_user_id');

      const emailTasks: Array<Promise<any>> = [];

      if (sendToEmployers && employerEmail) {
        const subject = `Payslip - ${employeeName} - ${subjectPeriod}`;
        const text = encryptAttachments
          ? `Hello,\n\nPlease find the encrypted payslip attached for ${employeeName} (${employee.employee_code || employee.id}) for ${subjectPeriod}.\n\nAttachment password: ${password}\n\nRegards,\n${companyName}`
          : `Hello,\n\nPlease find the payslip attached for ${employeeName} (${employee.employee_code || employee.id}) for ${subjectPeriod}.\n\nRegards,\n${companyName}`;

        emailTasks.push(
          transporter.sendMail({
            from,
            to: employerEmail,
            subject,
            text,
            attachments: [{ filename: attachmentName, content: attachment }],
          }).then((info) => ({
            type: 'EMPLOYER',
            ok: true,
            messageId: info.messageId,
          })).catch((err) => ({
            type: 'EMPLOYER',
            ok: false,
            error: String(err?.message || err),
          }))
        );
      }

      if (sendToEmployees && employee.email) {
        const subject = `Your payslip is available - ${subjectPeriod}`;
        const text = `Hello ${employeeName},\n\nYour payslip for ${subjectPeriod} is now available in Self Service.\n\nRegards,\n${companyName}`;
        emailTasks.push(
          transporter.sendMail({ from, to: employee.email, subject, text }).then((info) => ({
            type: 'EMPLOYEE',
            ok: true,
            messageId: info.messageId,
          })).catch((err) => ({
            type: 'EMPLOYEE',
            ok: false,
            error: String(err?.message || err),
          }))
        );
      }

      const emailResults = await Promise.all(emailTasks);
      for (const er of emailResults) {
        await logEmailAudit(supabaseAdmin, {
          recipient_email: er.type === 'EMPLOYER' ? employerEmail : employee.email,
          email_type: er.type === 'EMPLOYER' ? 'PAYSLIP_DELIVERY_EMPLOYER' : 'PAYSLIP_NOTIFICATION',
          template_id: null,
          template_name: null,
          subject: er.type === 'EMPLOYER' ? `Payslip - ${employeeName} - ${subjectPeriod}` : `Your payslip is available - ${subjectPeriod}`,
          status: er.ok ? 'SENT' : 'FAILED',
          error: er.ok ? null : er.error,
          triggered_by: userData.user.id,
          provider: 'SMTP',
          message_id: er.ok ? er.messageId : null,
          dedupe_key: `${er.type}:${p.id}:${subjectPeriod}`,
          metadata: {
            payrollRunId,
            payslipId: p.id,
            employeeId: employee.id,
            employeeName,
            periodStart,
            periodEnd,
            encrypted: encryptAttachments,
          },
        });
      }

      if (sendToEmployers && !employerEmail) {
        await logEmailAudit(supabaseAdmin, {
          recipient_email: null,
          email_type: 'PAYSLIP_DELIVERY_EMPLOYER',
          template_id: null,
          template_name: null,
          subject: `Payslip - ${employeeName} - ${subjectPeriod}`,
          status: 'SKIPPED',
          error: 'Missing employer email',
          triggered_by: userData.user.id,
          provider: 'SMTP',
          message_id: null,
          dedupe_key: `EMPLOYER:${p.id}:${subjectPeriod}:SKIPPED`,
          metadata: {
            payrollRunId,
            payslipId: p.id,
            employeeId: employee.id,
            employeeName,
            periodStart,
            periodEnd,
            encrypted: encryptAttachments,
          },
        });
      }

      if (sendToEmployers && employerEmail) {
        const r = emailResults.find((x) => x.type === 'EMPLOYER');
        if (!r) warnings.push('employer_email_not_sent');
        else if (!r.ok) warnings.push(`employer_email_failed:${String(r.error || 'unknown')}`);
      }
      if (sendToEmployees && employee.email) {
        const r = emailResults.find((x) => x.type === 'EMPLOYEE');
        if (!r) hardFailures.push('employee_email_not_sent');
        else if (!r.ok) hardFailures.push(`employee_email_failed:${String(r.error || 'unknown')}`);
      }

      if (notifyInApp && employee.user_id) {
        pendingNotifications.push({
          user_id: employee.user_id,
          title: 'Payslip available',
          message: `Your payslip for ${subjectPeriod} is now available.`,
          type: 'info',
        });
      }

      await supabaseAdmin.from('audit_logs').insert({
        table_name: 'payslips',
        record_id: p.id,
        action: 'SYSTEM_ACTION',
        old_data: null,
        new_data: { event: 'PDF_GENERATED_AND_DELIVERED', pdf_bucket: pdfBucket, pdf_path: pdfPath, employer_email: employerEmail },
        performed_by: userData.user.id,
      });

      results.push({
        payslipId: p.id,
        status: hardFailures.length === 0 ? 'OK' : 'FAILED',
        pdfBucket,
        pdfPath,
        employerEmail,
        employeeEmail: employee.email || null,
        errors: hardFailures,
        warnings,
      });
    }

    const failed = results.filter((r) => r.status !== 'OK');
    if (failed.length > 0 && rollbackOnFailure) {
      for (const u of uploaded) {
        try {
          await supabaseAdmin.storage.from(u.bucket).remove([u.path]);
        } catch {
        }
      }
      try {
        await supabaseAdmin.from('payslips').delete().eq('payroll_run_id', payrollRunId);
        await supabaseAdmin.from('payroll_runs').update({ status: 'Draft' }).eq('id', payrollRunId);
      } catch {
      }
      const samples = failed.slice(0, 5).map((r: any) => ({
        payslipId: r.payslipId,
        employerEmail: r.employerEmail,
        employeeEmail: r.employeeEmail,
        errors: r.errors,
      }));
      return NextResponse.json(
        {
          error: `Delivery failed for ${failed.length} payslips; payroll rolled back`,
          failedCount: failed.length,
          sampleFailures: samples,
          results,
        },
        { status: 500 }
      );
    }

    if (notifyInApp && pendingNotifications.length > 0) {
      const { error: nErr } = await supabaseAdmin.from('notifications').insert(pendingNotifications as any);
      if (nErr) {
        if (rollbackOnFailure) {
          for (const u of uploaded) {
            try {
              await supabaseAdmin.storage.from(u.bucket).remove([u.path]);
            } catch {
            }
          }
          try {
            await supabaseAdmin.from('payslips').delete().eq('payroll_run_id', payrollRunId);
            await supabaseAdmin.from('payroll_runs').update({ status: 'Draft' }).eq('id', payrollRunId);
          } catch {
          }
          return NextResponse.json({ error: `Notification delivery failed; payroll rolled back (${String((nErr as any).message || 'unknown')})`, results }, { status: 500 });
        }
      }
    }

    const pushUrl = process.env.PUSH_NOTIFICATION_WEBHOOK_URL;
    if (notifyInApp && pushUrl && pendingNotifications.length > 0) {
      try {
        await fetch(pushUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payrollRunId,
            type: 'PAYSLIPS_AVAILABLE',
            count: pendingNotifications.length,
          }),
        });
      } catch {
      }
    }

    await supabaseAdmin.from('payroll_runs').update({ status: 'Paid' }).eq('id', payrollRunId);

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}
