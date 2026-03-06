-- Enforce singleton row and seed initial record for system_settings
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name='system_settings' and column_name='singleton'
  ) then
    alter table system_settings add column singleton boolean not null default true;
    create unique index if not exists uniq_system_settings_singleton on system_settings(singleton);
  end if;
end $$;

insert into system_settings (company_name, tax_id, company_address, currency, time_zone, date_format, email_notifications, push_notifications, two_factor_auth, session_timeout, singleton)
select 'Your Company', null, null, 'AUD ($)', 'Australia/Sydney', 'YYYY-MM-DD', true, false, false, '30m', true
where not exists (select 1 from system_settings);

