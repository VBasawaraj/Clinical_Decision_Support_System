create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid references auth.users(id) on delete set null,
  submission_id uuid references public.medical_submissions(id) on delete cascade,
  submission_type text not null,
  prediction text not null,
  confidence numeric,
  model text,
  report jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.ai_reports enable row level security;

drop policy if exists "Patients can view own ai reports" on public.ai_reports;
create policy "Patients can view own ai reports"
on public.ai_reports
for select
to authenticated
using (patient_id = auth.uid());

drop policy if exists "Doctors can view patient ai reports" on public.ai_reports;
create policy "Doctors can view patient ai reports"
on public.ai_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'doctor'
  )
);

drop policy if exists "Doctors can create ai reports" on public.ai_reports;
create policy "Doctors can create ai reports"
on public.ai_reports
for insert
to authenticated
with check (
  doctor_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'doctor'
  )
);

create index if not exists ai_reports_patient_created_idx
on public.ai_reports (patient_id, created_at desc);

create index if not exists ai_reports_submission_created_idx
on public.ai_reports (submission_id, created_at desc);
