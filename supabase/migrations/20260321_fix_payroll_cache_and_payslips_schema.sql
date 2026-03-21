-- Ensure payroll report cache table exists (used by comprehensivePayrollService)
create table if not exists payroll_run_calculation_cache (
  payroll_run_id uuid primary key references payroll_runs(id) on delete cascade,
  report jsonb not null,
  report_version integer not null default 1,
  checksum text,
  is_valid boolean not null default true,
  invalid_reason text,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payroll_run_calculation_cache_validated_at
  on payroll_run_calculation_cache(validated_at desc);

-- Ensure dependent payroll tables exist for the processing engine
create table if not exists pay_components (
  id uuid primary key default uuid_generate_v4(),
  payslip_id uuid references payslips(id) on delete cascade,
  component_type text,
  description text,
  units numeric(8,2) default 0,
  rate numeric(10,2) default 0,
  amount numeric(12,2) default 0,
  tax_treatment text,
  stp_category text,
  is_ytd boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_pay_components_payslip_id on pay_components(payslip_id);

create table if not exists deduction_applications (
  id uuid primary key default uuid_generate_v4(),
  payslip_id uuid references payslips(id) on delete cascade,
  deduction_id uuid references deductions(id) on delete cascade,
  amount numeric(12,2) not null,
  ytd_amount numeric(14,2) default 0,
  created_at timestamptz default now()
);

create index if not exists idx_deduction_applications_payslip_id on deduction_applications(payslip_id);

-- Align payslips table to the processing engine expectations.
do $$
declare
  has_pay_period_start boolean;
  has_pay_period_end boolean;
  has_period_start boolean;
  has_period_end boolean;
  has_payment_date boolean;
  r record;
begin
  -- Core identifiers
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='payroll_run_id') then
    alter table payslips add column payroll_run_id uuid references payroll_runs(id) on delete cascade;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='payslip_number') then
    alter table payslips add column payslip_number varchar(50);
  end if;

  -- Dates
  select exists(select 1 from information_schema.columns where table_name='payslips' and column_name='pay_period_start') into has_pay_period_start;
  select exists(select 1 from information_schema.columns where table_name='payslips' and column_name='pay_period_end') into has_pay_period_end;
  select exists(select 1 from information_schema.columns where table_name='payslips' and column_name='period_start') into has_period_start;
  select exists(select 1 from information_schema.columns where table_name='payslips' and column_name='period_end') into has_period_end;
  select exists(select 1 from information_schema.columns where table_name='payslips' and column_name='payment_date') into has_payment_date;

  if not has_period_start then
    alter table payslips add column period_start date;
  end if;
  if not has_period_end then
    alter table payslips add column period_end date;
  end if;
  if not has_payment_date then
    alter table payslips add column payment_date date;
  end if;

  if has_pay_period_start then
    update payslips set period_start = pay_period_start where period_start is null;
  end if;
  if has_pay_period_end then
    update payslips set period_end = pay_period_end where period_end is null;
  end if;

  -- Monetary columns
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='gross_pay') then
    alter table payslips add column gross_pay numeric(12,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='taxable_income') then
    alter table payslips add column taxable_income numeric(12,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='tax_withheld') then
    alter table payslips add column tax_withheld numeric(12,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='payg_tax') then
    alter table payslips add column payg_tax numeric(12,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='allowances') then
    alter table payslips add column allowances numeric(12,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='overtime') then
    alter table payslips add column overtime numeric(12,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='superannuation') then
    alter table payslips add column superannuation numeric(12,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='net_pay') then
    alter table payslips add column net_pay numeric(12,2) default 0;
  end if;

  -- YTD + hours
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='ytd_gross') then
    alter table payslips add column ytd_gross numeric(14,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='ytd_tax') then
    alter table payslips add column ytd_tax numeric(14,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='ytd_super') then
    alter table payslips add column ytd_super numeric(14,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='hours_worked') then
    alter table payslips add column hours_worked numeric(6,2) default 0;
  end if;

  -- Metadata
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='pay_frequency') then
    alter table payslips add column pay_frequency text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='status') then
    alter table payslips add column status text default 'Draft';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='generated_at') then
    alter table payslips add column generated_at timestamptz default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_name='payslips' and column_name='corrected_from') then
    alter table payslips add column corrected_from uuid references payslips(id);
  end if;

  -- Backfill payslip_number for legacy rows
  update payslips
    set payslip_number = coalesce(payslip_number, ('PS-LEGACY-' || id::text))
    where payslip_number is null;

  -- Enforce not-null + uniqueness for payslip_number (safe after backfill)
  begin
    alter table payslips alter column payslip_number set not null;
  exception when others then
  end;

  create unique index if not exists idx_payslips_payslip_number_unique on payslips(payslip_number);

  -- Optional: relax/standardize status check constraints if one exists
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'payslips'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table payslips drop constraint %I', r.conname);
  end loop;

  begin
    alter table payslips
      add constraint payslips_status_check
      check (status in ('Draft','Final','Corrected','Published','Paid'));
  exception when duplicate_object then
  end;
end $$;
