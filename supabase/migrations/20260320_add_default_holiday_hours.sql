do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_name = 'system_settings'
      and column_name = 'default_holiday_hours'
  ) then
    alter table system_settings
      add column default_holiday_hours numeric default 8;
  end if;
end $$;

