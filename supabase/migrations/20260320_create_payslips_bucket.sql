insert into storage.buckets (id, name, public)
values ('payslips', 'payslips', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='payslips_select_own_or_hr') then
    create policy payslips_select_own_or_hr
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'payslips'
        and (
          exists (
            select 1
            from employees e
            where e.user_id = auth.uid()
              and storage.objects.name like ('payslips/' || e.id::text || '/%')
          )
          or exists (
            select 1
            from employees e2
            where e2.user_id = auth.uid()
              and e2.role in ('Administrator','Super Admin','Employer Admin','HR Manager','HR Admin')
          )
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='payslips_insert_hr') then
    create policy payslips_insert_hr
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'payslips'
        and exists (
          select 1
          from employees e
          where e.user_id = auth.uid()
            and e.role in ('Administrator','Super Admin','Employer Admin','HR Manager','HR Admin')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='payslips_update_hr') then
    create policy payslips_update_hr
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'payslips'
        and exists (
          select 1
          from employees e
          where e.user_id = auth.uid()
            and e.role in ('Administrator','Super Admin','Employer Admin','HR Manager','HR Admin')
        )
      )
      with check (
        bucket_id = 'payslips'
        and exists (
          select 1
          from employees e
          where e.user_id = auth.uid()
            and e.role in ('Administrator','Super Admin','Employer Admin','HR Manager','HR Admin')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='payslips_delete_hr') then
    create policy payslips_delete_hr
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'payslips'
        and exists (
          select 1
          from employees e
          where e.user_id = auth.uid()
            and e.role in ('Administrator','Super Admin','Employer Admin','HR Manager','HR Admin')
        )
      );
  end if;
end $$;

