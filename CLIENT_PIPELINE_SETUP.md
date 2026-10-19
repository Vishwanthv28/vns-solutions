# VNS client pipeline update — 18 October 2026

This package includes the original owner dashboard AND the new client pipeline.
It is an update for the existing VNS repository at commit 0916a8e, not a separate
standalone website. The public website and AI consultant are preserved.

## Added in this update

- Private owner notes, up to 4,000 characters per enquiry.
- Owner-assigned high / normal / low priority.
- Follow-up date and time, entered in your local timezone and stored as UTC.
- Due and upcoming follow-up queues, with completed enquiries excluded.
- Server-side name/email search across all pages.
- Editable first-response and follow-up templates, copy action and email drafts.
- Current-page overview counts, explicitly labelled as page counts.
- Save/discard controls for private notes; other enquiry navigation is disabled
  while there are unsaved notes. Refresh warns about unsaved changes.

Reply drafts are TEMPLATES based on saved services, not additional AI generation.
Nothing automatically sends customer messages. Dates organise the dashboard;
there is no background reminder job or automatic calling in this update.

## Apply in order

1. Copy this ZIP's contents into your ORIGINAL vns-solutions folder. Merge folders,
   replace matching files, and preserve other files and your .env.local.
2. You already ran supabase/owner-dashboard.sql. If setting up from scratch,
   run it after consultant-leads.sql first. It can be safely rerun.
3. Supabase SQL Editor: run all of supabase/client-pipeline.sql. Existing leads,
   answers, briefs and contact details remain. Defaults are normal priority,
   blank notes and no scheduled follow-up.
4. Keep the owner environment configuration from OWNER_DASHBOARD_SETUP.md.
   There are no additional keys for this update.
5. VS Code terminal, from original project:

```powershell
npm test
npm run build
npm run dev
```

6. Open http://localhost:5173/owner, sign in with your authorised owner account,
   open a lead, set a priority/date, write notes, and click Save next step.
7. Refresh and confirm all three persist. Test Due now, search and status filters.
8. Review and edit a reply template; Copy draft copies it locally. Open email draft
   opens your configured mail app. It does not send mail.

If there is an invalid search message, use letters, digits, spaces and ordinary
email characters (up to 80). A search term is only applied when Search is pressed.

## Publish after local verification

Add OWNER_USER_ID and SUPABASE_ANON_KEY to the Vercel PRODUCTION environment if
not already done; retain existing Supabase service role, Gemini and Resend config.
Never commit .env.local. Then:

```powershell
git add api/owner.js server/owner-service.js src/components/OwnerDashboard src/main.jsx scripts/dev.mjs vercel.json supabase/owner-dashboard.sql supabase/client-pipeline.sql tests/owner.test.js tests/pipeline.test.js .env.example OWNER_DASHBOARD_SETUP.md CLIENT_PIPELINE_SETUP.md
git commit -m "Add protected client pipeline and follow-up workspace"
git push origin main
```

Wait for Ready. Open https://vns-solutions-olive.vercel.app/owner and repeat the
local checks with your real account. Also verify the existing public enquiry and
AI brief flow. This package has not been pushed or deployed by the assistant.

## What comes next

1. Client-ready sales foundation: publish this pipeline, finalise your service
   offers, genuine work examples and a real discovery-call booking link.
2. Grounded service advisor: answer approved VNS service questions and hand off
   uncertain requests. Evaluate accuracy and escalation using representative
   customer questions before calling it production-ready.
3. Telugu/English browser voice: test STT/TTS, interruptions, latency and consent.
4. Phone agents: choose/configure telephony and voice providers, calling numbers,
   budgets and permitted workflows. No calling service exists in this package.
5. Client workspaces: separate each customer's data, approved knowledge, account
   permissions, usage and reporting before onboarding multiple businesses.

Outpero's public website advertises voice calls, multilingual conversations,
captured details, integrations and follow-ups. Those are vendor claims, not
independently verified performance. This package does not claim parity or that
VNS is faster/better. Compare using measured answer accuracy, Telugu clarity,
time-to-response, enquiry-to-meeting conversion and cost per qualified lead.

## Model / development workflow

For faster focused development tasks, official OpenAI model guidance recommends
Luna; for larger coding work, use GPT-6.1 Sol where available to your account.
Lower reasoning effort generally favours speed. Use medium for ordinary feature
work and increase effort for difficult authentication/data changes. Codex inside
VS Code can edit/test the actual project directly, reducing manual screenshots
and code copying. Account/model availability depends on your plan and client.
Changing the ChatGPT/Codex model does not change the site's Gemini API model.
This update does not change the Gemini model or claim a measured speedup.

Official/reference pages reviewed:
- https://learn.chatgpt.com/docs/models
- https://learn.chatgpt.com/docs/codex/ide
- https://developers.openai.com/api/docs/guides/reasoning
- https://www.outpero.com/

## Verification scope

40 mocked unit/API tests and the production build passed during preparation.
Browser tests with a mocked API passed for login, saving notes/priority/date,
status changes, refresh persistence, reply switching, mobile overflow and logout.
Desktop and mobile screenshots were inspected; there were zero browser errors.
Real Supabase SQL execution, real owner sign-in, email delivery, public deployment
and production response times must be verified in your account. No passwords,
API keys, customer records or production screenshots are included in this ZIP.
