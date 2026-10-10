# VNS AI Consultant: brief and lead submission

## What is included
- Existing questionnaire and Gemini brief generation, with the corrected JSON request format.
- After a valid brief: **Send my project brief to VNS**.
- Required name/email, optional phone, and permission to contact.
- Server-side contact/questionnaire/brief validation, same-origin checks, request size limit, honeypot and basic per-instance throttling.
- Supabase lead storage before the Resend notification.
- Success confirmation with a reference only after storage and notification acceptance.
- On failure, form details remain available. A retry uses the same submission ID so it does not add another database row.
- Contact details are not sent to Gemini. Emails contain plain text to avoid HTML injection.

This package does not add voice, user login, an admin dashboard, visitor confirmation emails or automatic deployment.

## 1. Open and run the project
1. Extract the ZIP into a new folder and open the `vns-solutions` folder in VS Code.
2. Copy `.env.example` to `.env.local` in the project root, beside `package.json`.
3. Keep your real keys only in `.env.local`. Do not upload or commit that file.
4. Use your current Gemini key and working model:

```env
CONSULTANT_PROVIDER=gemini
GEMINI_API_KEY=YOUR_PRIVATE_GEMINI_KEY
CONSULTANT_MODEL=gemini-3.8-flash
```

The ZIP contains no real keys. If moving into your existing working folder, back it up first, replace the source/config files from this package, and retain your existing `.env.local`. Add the new variables below to it.

## 2. Create the lead table
1. Open https://supabase.com/dashboard and create/open your VNS project.
2. In SQL Editor, create a new query.
3. Copy everything from `supabase/consultant-leads.sql` and run it once.
4. Find your Project URL in the project API settings.
5. In API Keys, copy the backend **service_role** key (legacy JWT key). This implementation uses it only on the server. Do not use an anon/publishable key here.
6. Add to `.env.local`:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_PRIVATE_SERVICE_ROLE_KEY
```

The table enables row level security and revokes access for public visitor roles. Do not add public read/write policies. View leads through Supabase Table Editor as the project owner. The `brief` JSON is visitor-submitted and must be reviewed; validation checks shape and allowed service names, not AI provenance.

## 3. Configure the owner email
1. Open https://resend.com/api-keys and use your private Resend key.
2. Add:

```env
RESEND_API_KEY=YOUR_PRIVATE_RESEND_KEY
LEAD_EMAIL_FROM=VNS Solutions <onboarding@resend.dev>
LEAD_EMAIL_TO=YOUR_RESEND_ACCOUNT_EMAIL
```

For testing with `onboarding@resend.dev`, use the email address associated with your Resend account as the recipient. To notify another recipient, verify your sending domain in Resend and set `LEAD_EMAIL_FROM` to an address on that domain. The example recipient is the existing VNS address; change it if your Resend account uses another address.

No email is sent merely by opening the page or generating a brief. The visitor must submit the contact form. This sends a notification to VNS, not an automatic email to the visitor. Replying to the notification addresses the visitor's email.

## 4. Start and test
Use Node 22 or later. In the VS Code terminal:

```bash
npm install
npm run dev
```

Open http://localhost:5173. Run the development server in one terminal only. After editing `.env.local`, stop the running node terminal with Ctrl+C and run `npm run dev` again; Vite's reload alone does not reload the Node environment.

1. Answer all questions and generate a brief.
2. Scroll below **Next steps** to **Send my project brief to VNS**.
3. Click it, enter your name/email, leave phone empty if desired, and tick permission to contact.
4. Click **Submit details and brief**.
5. Verify success reference, a row in Supabase `consultant_leads`, and the notification in your inbox/Resend logs.
6. In the table, `notification_sent=true` means Resend accepted the notification; it does not prove inbox delivery. Check spam and Resend logs if needed.

If storage/email is not configured, the UI shows a configuration error, not fake success. If email fails after storage succeeds, the row remains with `notification_sent=false`; retry with unchanged details. Reopening the modal preserves the draft during the same page session. Reloading the page or starting a new brief resets the draft/submission ID. Retrying from a new page session can create a new lead. Resend's idempotency keys have a retention window; prolonged ambiguous email failures should be checked in Resend logs before retrying.

## 5. Publish later
Add the same backend environment variables to your Vercel project and redeploy. `api/consultant-lead.js` is the new server endpoint; `npm run dev` serves it locally. `npm run preview` is a frontend-only preview and does not serve these APIs. Never prefix private keys with `VITE_`.

Before a public launch, add deployment-level bot protection/rate limiting for BOTH Gemini generation and lead submission. The lead endpoint's small in-memory throttle is basic protection only: it is not shared across serverless instances. No automatic retention deletion or admin access workflow is included; restrict project-owner access and establish how to remove old leads.

## Verification provided
Run `npm test` and `npm run build`. Automated tests mock external services and cover success, optional phone, invalid inputs, origin/body checks, database failures, notification failures, retry deduplication and ID conflicts. They do not verify your Supabase project, permissions, real API keys or inbox delivery. Finish the manual submission test above with your own accounts.

Official references:
- https://supabase.com/docs/guides/database/secure-data
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/knowledge-base/403-error-resend-dev-domain
