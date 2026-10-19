-- Phase 5 upgrade: run after owner-dashboard.sql. Keeps all existing records.
begin;
alter table public.consultant_leads
  add column if not exists priority text not null default 'normal'
    check (priority in ('normal', 'high', 'low')),
  add column if not exists owner_notes text not null default ''
    check (char_length(owner_notes) <= 4000),
  add column if not exists next_followup_at timestamptz;
create index if not exists consultant_leads_followup_idx
  on public.consultant_leads (next_followup_at) where status <> 'completed';
commit;
