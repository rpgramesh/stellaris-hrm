do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'payslips' and column_name = 'pdf_path'
  ) then
    alter table payslips add column pdf_path text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'payslips' and column_name = 'pdf_bucket'
  ) then
    alter table payslips add column pdf_bucket text default 'payslips';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'payslips' and column_name = 'pdf_generated_at'
  ) then
    alter table payslips add column pdf_generated_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'payslips' and column_name = 'payment_reference'
  ) then
    alter table payslips add column payment_reference text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'payslips' and column_name = 'employer_email'
  ) then
    alter table payslips add column employer_email text;
  end if;
end $$;

create index if not exists idx_payslips_pdf_path on payslips(pdf_path);
create index if not exists idx_payslips_employer_email on payslips(employer_email);

