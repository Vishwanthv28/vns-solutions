-- Run AFTER consultant-leads.sql in the same Supabase project's SQL Editor.
-- Keeps existing leads and public-access restrictions intact.
begin;
alter table public.consultant_leads
  add column if not exists status text not null default 'new'
    check (status in ('new', 'contacted', 'in_progress', 'completed')),
  add column if not exists updated_at timestamptz not null default now();
create index if not exists consultant_leads_created_at_idx
  on public.consultant_leads (created_at desc);
create index if not exists consultant_leads_status_created_at_idx
  on public.consultant_leads (status, created_at desc);
alter table public.consultant_leads enable row level security;
revoke all on public.consultant_leads from anon, authenticated;
grant select, insert, update on public.consultant_leads to service_role;
commit;
