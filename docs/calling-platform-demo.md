# Calling platform demo

The calling platform demo is available at `/platform/demo`. It is separate from the public VNS site and from the existing single-owner dashboard.

## What works in the demo

- Per-tab browser-session workspaces with separate agent settings, imported contacts, campaign records, results, and usage counters.
- CSV import for `name,email,phone`, with validation, duplicate handling, and a 500-contact / 1 MB limit.
- An editable agent brief and optional browser-native speech preview. Playback waits briefly for the browser's voice list and reports loading or playback errors in the Agent panel.
- A real text/browser-voice conversation with the configured agent. Recognized browser speech becomes a user transcript turn; the same-origin `/api/consultant-chat` endpoint sends the agent configuration, recent turns, and known requirements to the configured Gemini model and returns a reply plus structured requirement fields, including explicit callback preference. The agent uses existing answers to skip resolved questions, incorporates corrections, asks one relevant question at a time, and summarizes when its configured goal is met or the visitor asks to finish. Closing summaries include all captured requirements and state callback/follow-up preferences without implying that anything was scheduled. The transcript and extracted requirements are saved per workspace in `sessionStorage` and survive navigation, workspace switching, and refresh within the same tab.
- Campaign processing in a Web Worker, with progress and stop controls. Each generated conversation and outcome is synthetic and visibly labelled as simulated.
- Structured result details and session-only usage counters.

The browser conversation is a real AI interaction and can consume the configured Gemini model quota. Browser speech recognition is controlled by the browser and may process microphone audio using its own speech service; recognized text is sent to the VNS server endpoint, which keeps the Gemini credential server-side. Do not speak or enter confidential data.

Campaign execution is separate: no campaign calls a telephone number, contacts a person, invokes an integration, or writes to Supabase. Synthetic results are not actual conversation transcripts. Imported contacts and conversation transcripts are stored only in this tab's `sessionStorage`; they are not persisted to a database. They are cleared when the tab's session ends. Browser storage is accessible to scripts running on the site and is not encrypted, secure tenant isolation, or suitable for real client or customer data. The demo asks users to use sample data only. If the tab is refreshed while a simulation is running, its status is restored as stopped because the worker does not persist or resume.

An in-memory per-IP limit of eight chat requests per minute is applied by the demo API handler. This is a basic demo safeguard, not a distributed production quota or client authentication boundary.

The workspace switcher demonstrates separate per-workspace browser state, not a production security boundary. Clearing a conversation resets only the selected workspace's transcript and captured requirements. Do not use the demo to store or process client data. The existing owner session is restricted to `OWNER_USER_ID`; reusing it for multiple clients would be unsafe.

## Proposed production database change — not applied

Keep the public website and `consultant_leads` table separate. Add a dedicated platform schema after client identity and authorization are designed:

- `client_workspaces`: workspace ID, display name, owner Supabase Auth user ID, created/updated timestamps.
- `workspace_members`: workspace ID, Auth user ID, role, and membership status; unique workspace/user pair.
- `voice_agents`: workspace ID, editable prompt/config JSON, schema version, and active/version fields.
- `contacts`: workspace ID, normalized contact fields, import batch ID, consent/provenance metadata, and timestamps.
- `campaigns`: workspace ID, agent version ID, execution mode, status, schedule, creator, and timestamps.
- `campaign_contacts`: workspace ID, campaign ID, contact ID, deduplication key, job status, attempts, and lease/lock fields.
- `conversation_results`: workspace ID, campaign/contact IDs, structured JSON result, transcript reference/retention metadata, outcome, and timestamps.
- `integrations`: workspace ID, adapter type, enabled state, and secret reference (never plaintext credentials in client-readable rows).
- `action_events`: workspace ID, result/action IDs, idempotency key, status, and audit timestamps.
- `usage_events`: workspace ID, campaign/job IDs, event type, units, billable flag, and timestamp.

Every tenant-owned row must have a non-null `workspace_id`; foreign keys should include workspace identity where practical. Enable and force Row Level Security for each tenant table. Policies must derive membership from `auth.uid()` and `workspace_members`, never trust a workspace ID supplied by the browser. Restrict service-role access to server jobs that verify workspace membership or own an explicit job claim; never ship service-role keys to the browser. Add indexes for workspace-scoped lookups and unique idempotency constraints for campaign/contact jobs and external actions.

Use the existing Supabase Auth provider only after allowing verified, invited client users instead of the current single `OWNER_USER_ID` gate. Production background work needs a durable queue/outbox with atomic claims, leases, bounded retries, dead-letter visibility, and cancellation. Real telephone providers and paid action adapters remain disabled until consent, opt-out/suppression, secrets management, callback authenticity, idempotency, and usage limits are reviewed.

No Supabase migration has been created or applied as part of this demo. The list above is the proposed schema and security boundary for a later reviewed migration.
