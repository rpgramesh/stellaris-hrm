create extension if not exists "uuid-ossp";

create table if not exists public.interviews (
  id uuid primary key default uuid_generate_v4(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  type text not null,
  scheduled_date timestamptz not null,
  duration integer,
  interviewer_id uuid references public.employees(id),
  location text,
  meeting_link text,
  status text not null default 'Scheduled',
  feedback text,
  rating integer,
  recommendation text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_interviews_applicant_id
  on public.interviews(applicant_id);

alter table public.interviews enable row level security;

drop policy if exists "Enable access for authenticated users" on public.interviews;
create policy "Enable access for authenticated users" on public.interviews
  for all
  to authenticated
  using (true)
  with check (true);

create table if not exists public.assessments (
  id uuid primary key default uuid_generate_v4(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  type text not null,
  name text not null,
  scheduled_date timestamptz,
  completed_date timestamptz,
  duration integer,
  score numeric,
  max_score numeric,
  status text not null default 'Pending',
  result text,
  notes text,
  attachment_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_assessments_applicant_id
  on public.assessments(applicant_id);

alter table public.assessments enable row level security;

drop policy if exists "Enable access for authenticated users" on public.assessments;
create policy "Enable access for authenticated users" on public.assessments
  for all
  to authenticated
  using (true)
  with check (true);

