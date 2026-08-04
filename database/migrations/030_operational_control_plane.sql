-- Operational control plane for canonical daily/weekly pipelines.
create table if not exists public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null check (run_type in ('daily','weekly','verify','manual')),
  trigger_type text not null default 'manual',
  status text not null default 'running' check (status in ('running','succeeded','failed','cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds integer,
  discovered_count integer not null default 0,
  accepted_count integer not null default 0,
  published_count integer not null default 0,
  rejected_count integer not null default 0,
  error_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  error_message text
);

create index if not exists pipeline_runs_started_at_idx on public.pipeline_runs(started_at desc);
create index if not exists pipeline_runs_status_idx on public.pipeline_runs(status, started_at desc);

alter table public.source_health
  add column if not exists consecutive_failures integer not null default 0,
  add column if not exists last_success_at timestamptz,
  add column if not exists last_notification_found_at timestamptz,
  add column if not exists parser_success_rate numeric(5,2),
  add column if not exists active_job_count integer not null default 0,
  add column if not exists is_paused boolean not null default false;

create table if not exists public.recruitments (
  id uuid primary key default gen_random_uuid(),
  canonical_slug text not null unique,
  organization text not null,
  title text not null,
  state_codes text[] not null default '{}',
  status text not null default 'active' check (status in ('draft','active','completed','cancelled','archived')),
  primary_job_id uuid references public.jobs(id) on delete set null,
  official_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recruitment_events (
  id uuid primary key default gen_random_uuid(),
  recruitment_id uuid not null references public.recruitments(id) on delete cascade,
  event_type text not null check (event_type in ('notification','application_open','application_close','fee_deadline','correction_window','exam_date','admit_card','answer_key','result','document_verification','final_result')),
  event_date date,
  title text,
  official_url text,
  document_url text,
  status text not null default 'announced' check (status in ('expected','announced','active','completed','cancelled')),
  source_evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(recruitment_id, event_type, event_date, official_url)
);

create index if not exists recruitment_events_recruitment_idx on public.recruitment_events(recruitment_id, event_date);

alter table public.pipeline_runs enable row level security;
alter table public.recruitments enable row level security;
alter table public.recruitment_events enable row level security;

-- Public users may read only active recruitment lifecycle information.
drop policy if exists public_read_active_recruitments on public.recruitments;
create policy public_read_active_recruitments on public.recruitments for select using (status in ('active','completed'));
drop policy if exists public_read_recruitment_events on public.recruitment_events;
create policy public_read_recruitment_events on public.recruitment_events for select using (
  exists(select 1 from public.recruitments r where r.id = recruitment_id and r.status in ('active','completed'))
);

revoke all on public.pipeline_runs from anon, authenticated;
grant select on public.recruitments, public.recruitment_events to anon, authenticated;
