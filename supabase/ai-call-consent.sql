-- Add AI-call request fields without changing existing leads or access controls.
-- Historical consent, status, timestamp, and language remain unknown (NULL).
begin;

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

commit;
