-- Fix RLS policies for payroll tables so HR users can process payroll from the app.

-- Helper predicate used inline in policies:
-- HR if user has an employee row with HR role.

-- Payslips
alter table if exists payslips enable row level security;

drop policy if exists "HR can view all payslips" on payslips;
create policy "HR can view all payslips"
  on payslips
  for select
  to authenticated
  using (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin','Manager')
    )
  );

drop policy if exists "HR can manage payslips" on payslips;
create policy "HR can manage payslips"
  on payslips
  for all
  to authenticated
  using (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin')
    )
  )
  with check (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin')
    )
  );

grant select, insert, update, delete on table payslips to authenticated;

-- Pay components
alter table if exists pay_components enable row level security;

drop policy if exists "HR can view pay components" on pay_components;
create policy "HR can view pay components"
  on pay_components
  for select
  to authenticated
  using (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin','Manager')
    )
    or exists (
      select 1
      from payslips p
      join employees e on e.id = p.employee_id
      where p.id = pay_components.payslip_id
        and e.user_id = auth.uid()
    )
  );

drop policy if exists "HR can manage pay components" on pay_components;
create policy "HR can manage pay components"
  on pay_components
  for all
  to authenticated
  using (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin')
    )
  )
  with check (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin')
    )
  );

grant select, insert, update, delete on table pay_components to authenticated;

-- Deduction applications (payroll processing writes these too)
alter table if exists deduction_applications enable row level security;

drop policy if exists "HR can view deduction applications" on deduction_applications;
create policy "HR can view deduction applications"
  on deduction_applications
  for select
  to authenticated
  using (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin','Manager')
    )
    or exists (
      select 1
      from payslips p
      join employees e on e.id = p.employee_id
      where p.id = deduction_applications.payslip_id
        and e.user_id = auth.uid()
    )
  );

drop policy if exists "HR can manage deduction applications" on deduction_applications;
create policy "HR can manage deduction applications"
  on deduction_applications
  for all
  to authenticated
  using (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin')
    )
  )
  with check (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin')
    )
  );

grant select, insert, update, delete on table deduction_applications to authenticated;

-- Payroll errors (engine logs these on failures)
alter table if exists payroll_errors enable row level security;

drop policy if exists "HR/Admins can view all payroll errors" on payroll_errors;
drop policy if exists "HR/Admins can insert payroll errors" on payroll_errors;
drop policy if exists "HR/Admins can update payroll errors" on payroll_errors;

create policy "HR/Admins can view all payroll errors"
  on payroll_errors
  for select
  to authenticated
  using (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin')
    )
  );

create policy "HR/Admins can insert payroll errors"
  on payroll_errors
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin')
    )
  );

create policy "HR/Admins can update payroll errors"
  on payroll_errors
  for update
  to authenticated
  using (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin')
    )
  )
  with check (
    exists (
      select 1
      from employees me
      where me.user_id = auth.uid()
        and coalesce(me.role, me.system_access_role) in ('HR Admin','HR Manager','Employer Admin','Administrator','Super Admin')
    )
  );

grant select, insert, update, delete on table payroll_errors to authenticated;
