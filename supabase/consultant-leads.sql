-- Run once in your Supabase project's SQL Editor. Never add public read policies.
create table if not exists public.consultant_leads (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null default '',
  consent boolean not null check (consent = true),
  answers jsonb not null,
  brief jsonb not null,
  payload_hash text not null,
  notification_sent boolean not null default false
);
alter table public.consultant_leads enable row level security;
revoke all on public.consultant_leads from anon, authenticated;
grant select, insert, update on public.consultant_leads to service_role;
