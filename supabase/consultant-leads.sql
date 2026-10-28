-- Safe to re-run in your Supabase project's SQL Editor. Never add public read policies.
create table if not exists public.consultant_leads (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null default '',
  consent boolean not null check (consent = true),
  ai_call_consent boolean,
  ai_call_consent_at timestamptz,
  ai_call_language text,
  ai_call_status text,
  ai_call_provider text,
  ai_call_provider_id text,
  ai_call_summary text,
  ai_call_next_action text,
  ai_call_updated_at timestamptz,
  answers jsonb not null,
  brief jsonb not null,
  payload_hash text not null,
  notification_sent boolean not null default false
);
alter table public.consultant_leads
  add column if not exists ai_call_consent boolean,
  add column if not exists ai_call_consent_at timestamptz,
  add column if not exists ai_call_language text,
  add column if not exists ai_call_status text,
  add column if not exists ai_call_provider text,
  add column if not exists ai_call_provider_id text,
  add column if not exists ai_call_summary text,
  add column if not exists ai_call_next_action text,
  add column if not exists ai_call_updated_at timestamptz;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'consultant_leads_ai_call_status_check'
      and conrelid = 'public.consultant_leads'::regclass
  ) then
    alter table public.consultant_leads
      add constraint consultant_leads_ai_call_status_check
      check (ai_call_status in ('not_requested', 'requested', 'pending', 'initiating', 'queued', 'in_progress', 'completed', 'failed', 'cancelled'));
  end if;
end;
$$;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'consultant_leads_ai_call_language_check'
      and conrelid = 'public.consultant_leads'::regclass
  ) then
    alter table public.consultant_leads
      add constraint consultant_leads_ai_call_language_check
      check (ai_call_language is null or ai_call_language in ('en-IN', 'te-IN', 'hi-IN'));
  end if;
end;
$$;
alter table public.consultant_leads enable row level security;
revoke all on public.consultant_leads from anon, authenticated;
grant select, insert, update on public.consultant_leads to service_role;
