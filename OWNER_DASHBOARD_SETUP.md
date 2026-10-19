# VNS owner dashboard — Phase 5

For the newer client-pipeline package, follow CLIENT_PIPELINE_SETUP.md first.
It adds a second migration, cross-page search and follow-up features. This file
still describes the original account/environment setup.

Prepared against GitHub main commit `0916a8e`. Your public website and existing
consultant endpoints are preserved. The dashboard is at `/owner`.

## 1. Apply the code

Copy the files from this update into your existing `vns-solutions` folder,
preserving the folders and replacing matching files. Do not delete the original
project. No package changes or new dependencies are required.

Changed files:

- `src/main.jsx`
- `scripts/dev.mjs`
- `vercel.json`
- `.env.example` (template only; your `.env.local` is not included)

New files:

- `api/owner.js`
- `server/owner-service.js`
- `src/components/OwnerDashboard/OwnerDashboard.jsx`
- `src/components/OwnerDashboard/OwnerDashboard.css`
- `supabase/owner-dashboard.sql`
- `tests/owner.test.js`
- this setup guide

## 2. Add the database columns

In the SAME Supabase project that holds `consultant_leads`:

1. Open SQL Editor and create a new query.
2. Paste the ENTIRE contents of `supabase/owner-dashboard.sql`.
3. Click Run.

This adds `status` and `updated_at` and indexes; existing rows remain. Existing
leads start as `new`. It keeps RLS enabled and denies direct public table access.
Do not add an anonymous or general signed-in SELECT policy.

## 3. Create your owner sign-in

1. Supabase → Authentication → Users → Add user → Create new user.
2. Enter an email you control and a strong password. Enable Auto Confirm User
   if creating this trusted account manually. This is a NEW website login,
   not your Supabase dashboard password.
3. Copy the created user's UUID. Do not use a lead record ID.
4. Keep email/password authentication enabled in Supabase Auth providers.

There is no public registration screen. Even another authenticated Supabase user
cannot view leads unless their UUID matches `OWNER_USER_ID` on the server.

## 4. Configure environment variables

Keep your existing Gemini, Supabase and Resend variables. Add ONLY:

```dotenv
SUPABASE_ANON_KEY=your_same_project_publishable_or_legacy_anon_key
OWNER_USER_ID=your_authentication_user_uuid
```

Find the publishable/legacy anon key in Supabase project Settings → API Keys.
All owner variables are backend-only. Do not use `VITE_` prefixes. Never put the
service role key, tokens, or your password in React, SQL files, Git, or chat.

For local testing, add the two variables to `.env.local`, then restart
`npm run dev`. Existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are reused.

For production, add the two variables in Vercel → project Settings → Environment
Variables, select Production, and save BEFORE triggering the deployment.
There is no password environment variable; Supabase verifies the sign-in.

## 5. Test locally and publish

Run these TERMINAL COMMANDS from your existing project, one at a time:

```powershell
npm test
npm run build
npm run dev
```

Open `http://localhost:5173/owner` (use the port printed by your server if changed).
Sign in, open a lead, and update a status. Refresh to check the saved status.

After verification, stage only the dashboard files:

```powershell
git add api/owner.js server/owner-service.js src/components/OwnerDashboard src/main.jsx scripts/dev.mjs vercel.json supabase/owner-dashboard.sql tests/owner.test.js .env.example OWNER_DASHBOARD_SETUP.md
git commit -m "Add protected owner enquiry dashboard"
git push origin main
```

Wait for the deployment to show Ready. Open:

`https://vns-solutions-olive.vercel.app/owner`

If automatic production promotion is disabled, promote the tested deployment in
Vercel as you did previously. The new variables only apply to new deployments.

## 6. Verify the live dashboard

- Signed out: opening `/owner` shows sign-in and no customer details.
- Wrong credentials/non-owner account: sign-in cannot grant lead access.
- Owner: newest leads, contact details, questionnaire and full briefs load.
- Change status → refresh: the new status remains.
- Status filter applies across all pages. Search applies to the displayed page
  (up to 25 leads), as labelled. Pagination allows access to older records.
- Sign out: customer records disappear; a reload stays signed out.
- Generate/submit a new brief from the public website: it appears on Refresh list.
- Check mobile: list above detail; no horizontal overflow.

## Session behaviour and limits

The server verifies the Supabase access token and authorised UUID on each read
and write. Tokens are held in an HttpOnly, SameSite=Strict cookie (Secure in
production); they are not returned in JSON or put in localStorage. Owner queries
use the service role key only after authorisation. Sessions expire after up to
one hour; sign in again. No automatic refresh or cross-device sign-out is added.
Sign out clears this browser cookie and requests local Supabase sign-out. A
previously copied access token may remain valid until Supabase expires it.

Password reset/account recovery is managed through your Supabase project for
this first version. Login also relies on Supabase's authentication rate limits;
no new distributed application rate limiter is included.

Notification status means the email API accepted the notification, not proof
that it reached the inbox. This dashboard does not resend emails, delete leads,
send customer messages, or export records. Status updates are last-write-wins.

## Validation performed for this package

Result: 40 automated tests passed, zero failed. `npm run build` passed. A local
HTTP check confirmed `/owner` loads and the unconfigured API denies access.
Browser checks against a mocked API passed for login, saving workflow fields,
status changes, refresh persistence, reply switching and logout. Desktop and
mobile layouts were inspected; mobile had no horizontal overflow. Real account
verification remains required.

Automated tests include existing consultant/lead tests plus owner authorisation,
wrong-user denial, secure cookie handling, cross-origin request rejection,
pagination, allowed status changes and safe error responses. These use mocked
provider responses. No real account login, database migration, live lead update,
email delivery, GitHub push, or Vercel deployment has been performed for you.

Official references:

- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/guides/database/postgres/row-level-security
