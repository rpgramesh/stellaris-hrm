-- Timesheet email notifications: template defaults + audit metadata + dedupe

alter table if exists email_audit_log
  add column if not exists metadata jsonb,
  add column if not exists dedupe_key text;

create index if not exists idx_email_audit_log_dedupe
  on email_audit_log (email_type, recipient_email, dedupe_key, sent_at desc);

do $$
declare
  missing_tpl_id uuid;
  unapproved_tpl_id uuid;
begin
  if not exists (select 1 from email_templates where name = 'Timesheet Missing Notification') then
    insert into email_templates (name, subject, body, category, variables)
    values (
      'Timesheet Missing Notification',
      'Missing Timesheet Notification - {{employee_name}} - {{period}}',
      'Hello {{manager_name}},\n\nThis is a notification that {{employee_name}} ({{employee_code}}) is missing timesheet entries for the payroll period {{period}}.\n\nMissing week(s): {{missing_weeks}}\n\nPlease ensure the timesheet(s) are completed as soon as possible so payroll can be processed.\n\nOpen timesheets: {{timesheet_link}}\n\nRegards,\nStellaris HRM',
      'Timesheets',
      '["employee_name","employee_code","period","missing_weeks","manager_name","timesheet_link"]'
    )
    returning id into missing_tpl_id;
  else
    select id into missing_tpl_id from email_templates where name = 'Timesheet Missing Notification' limit 1;
  end if;

  if not exists (select 1 from email_templates where name = 'Timesheet Approval Required') then
    insert into email_templates (name, subject, body, category, variables)
    values (
      'Timesheet Approval Required',
      'Timesheet Approval Required - {{employee_name}} - {{pending_count}} entries pending',
      'Hello {{manager_name}},\n\n{{employee_name}} ({{employee_code}}) has timesheet entries that require approval for the payroll period {{period}}.\n\nPending week(s): {{pending_weeks}}\n\nPlease review and approve the timesheets so payroll can be processed.\n\nOpen approval page: {{approval_link}}\n\nRegards,\nStellaris HRM',
      'Timesheets',
      '["employee_name","employee_code","period","pending_count","pending_weeks","manager_name","approval_link"]'
    )
    returning id into unapproved_tpl_id;
  else
    select id into unapproved_tpl_id from email_templates where name = 'Timesheet Approval Required' limit 1;
  end if;

  if missing_tpl_id is not null and not exists (select 1 from email_template_assignments where email_type = 'TIMESHEET_MISSING') then
    insert into email_template_assignments (email_type, template_id, is_default)
    values ('TIMESHEET_MISSING', missing_tpl_id, true);
  end if;

  if unapproved_tpl_id is not null and not exists (select 1 from email_template_assignments where email_type = 'TIMESHEET_APPROVAL_REQUIRED') then
    insert into email_template_assignments (email_type, template_id, is_default)
    values ('TIMESHEET_APPROVAL_REQUIRED', unapproved_tpl_id, true);
  end if;
end $$;
