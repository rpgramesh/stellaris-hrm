create extension if not exists pgcrypto;

create table if not exists email_audit_log (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz not null default now(),
  recipient_email text not null,
  email_type text,
  template_id uuid references email_templates(id) on delete set null,
  template_name text,
  subject text,
  status text not null check (status in ('SENT','FAILED')),
  error text,
  triggered_by uuid,
  provider text,
  message_id text
);

create table if not exists email_template_assignments (
  id uuid primary key default gen_random_uuid(),
  email_type text not null,
  template_id uuid not null references email_templates(id) on delete restrict,
  is_default boolean not null default true,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_email_template_assignment_type
  on email_template_assignments(email_type);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_email_template_assignments_updated_at on email_template_assignments;
create trigger trg_update_email_template_assignments_updated_at
before update on email_template_assignments
for each row execute function update_updated_at_column();

do $$
declare
  welcome_id uuid;
  reset_id uuid;
begin
  select id into welcome_id from email_templates where name = 'Welcome Email' limit 1;
  select id into reset_id from email_templates where name = 'Reset Password' limit 1;

  if welcome_id is not null and not exists (select 1 from email_template_assignments where email_type = 'WELCOME') then
    insert into email_template_assignments (email_type, template_id, is_default) values ('WELCOME', welcome_id, true);
  end if;

  if reset_id is not null and not exists (select 1 from email_template_assignments where email_type = 'PASSWORD_RESET') then
    insert into email_template_assignments (email_type, template_id, is_default) values ('PASSWORD_RESET', reset_id, true);
  end if;
end $$;
