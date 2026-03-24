-- Ensure menu_item_configurations is readable even when the client is unauthenticated
-- (menu rendering can happen before session hydration on the client).

create table if not exists menu_item_configurations (
  id uuid primary key default gen_random_uuid(),
  menu_key text unique not null,
  display_name text not null,
  updated_at timestamptz default current_timestamp,
  updated_by uuid references auth.users(id),
  constraint display_name_length check (char_length(display_name) <= 50),
  constraint display_name_validation check (display_name ~ '^[a-zA-Z0-9 -]+$')
);

alter table menu_item_configurations enable row level security;

drop policy if exists "Allow authenticated read access" on menu_item_configurations;
drop policy if exists "Allow public read access" on menu_item_configurations;
create policy "Allow public read access"
  on menu_item_configurations
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow admins to update menu configs" on menu_item_configurations;
create policy "Allow admins to update menu configs"
  on menu_item_configurations
  for all
  to authenticated
  using (
    exists (
      select 1
      from employees e
      where e.user_id = auth.uid()
        and coalesce(e.role, e.system_access_role) in ('Super Admin', 'Administrator', 'HR Admin', 'HR Manager', 'Employer Admin')
    )
  )
  with check (
    exists (
      select 1
      from employees e
      where e.user_id = auth.uid()
        and coalesce(e.role, e.system_access_role) in ('Super Admin', 'Administrator', 'HR Admin', 'HR Manager', 'Employer Admin')
    )
  );

grant select on table menu_item_configurations to anon, authenticated;
grant insert, update, delete on table menu_item_configurations to authenticated;

