# Outbound AI telephone follow-up

Reviewed 24 October 2026 against the official provider documentation linked below.

## What exists today

- **Talk to AI** is a browser-guided questionnaire, not a free-form conversational sales agent and does not call a telephone number. The browser captures short audio clips with `MediaRecorder`; the server sends them to Sarvam Speech-to-Text using the selected English, Telugu or Hindi locale. The browser then maps the transcript to canonical questionnaire values. Sarvam text-to-speech reads the prompts and acknowledgements. The API key stays on the server.
- Enquiry submission saves a validated project brief, contact details and general contact consent. It sends an owner notification. Before this change there was no separate telephone-call consent or call lifecycle.
- The app runs its backend as Vercel serverless API handlers. It has no persistent voice/media server.

The enquiry form now has a separate, optional AI-call request checkbox. A phone number and preferred language are required only when it is selected. The server records the consent timestamp, preferred language code and a `requested` status with the existing enquiry; the owner dashboard displays consent, preferred language, status, provider call ID, summary and next action. **No outbound call is initiated yet.**

## Provider comparison

| Option | India outbound and number | Languages | Pricing found in official docs | Notes |
|---|---|---|---|---|
| **Sarvam Voice Agents (recommended to evaluate first)** | Outbound campaigns and an instant outbound-call API are documented. Use Sarvam-managed telephony or connect a supported provider. Sarvam-managed number rental requires KYC approval. | Telugu, Hindi and English are listed for the hosted voice agent. | Agent rates: ₹3.50/min pay-as-you-go (no minimum), ₹3.25/min Pro (₹9,999 minimum), ₹3.15/min Growth (₹49,999 minimum), ₹3.00/min Business (₹1,99,999 minimum); Enterprise is custom from 2 lakh minutes/month. Telephony is additional: Vobiz ₹0.20 per 30-second pulse; listed 11/79/80-series numbers ₹59 per 30 days. Calls round up to full agent minutes; GST excluded. Confirm number availability and plan eligibility. | Best fit for a hosted Indian-language agent, subject to getting a satisfactory answer on signed callbacks and call-creation idempotency. |
| **Sarvam agent + Exotel telephony** | Sarvam documents Exotel as an outbound-capable connection. Requires an active Exotel account, admin access and an Exophone. | Agent languages come from Sarvam. | No verified Exotel rate was available in the reviewed official integration docs; request a quote. Sarvam states BYOT telephony is billed separately by the carrier. | Reasonable if VNS already has an Exotel account/number. Callback signature verification was not established by the reviewed documentation. |
| **Sarvam agent + Twilio telephony** | Sarvam lists Twilio as an option, but Twilio's India guideline says calls to India can only originate from international (non-Indian) numbers; domestic calling is listed as unavailable. | Agent languages come from Sarvam. | The official India pricing page did not render numeric rates during review, so no per-minute amount is quoted. | Do not select without resolving the India caller-ID constraint and confirming the business accepts it. Twilio does document signed webhook requests. |

Sources: [Sarvam campaigns](https://docs.sarvam.ai/voice-agents/deploy/campaigns), [campaign DND/compliance](https://docs.sarvam.ai/voice-agents/deploy/campaigns/dnd.md), [instant outbound API](https://docs.sarvam.ai/voice-agents/api/instant-outbound/create.md), [instant-call webhook payload](https://docs.sarvam.ai/voice-agents/api/instant-outbound/webhook-payload.md), [Sarvam pricing](https://docs.sarvam.ai/voice-agents/pricing.md), [language and conversation settings](https://docs.sarvam.ai/voice-agents/build/conversation-settings.md), [Sarvam telephony choices](https://docs.sarvam.ai/voice-agents/deploy/telephony.md), [Sarvam number rental/KYC](https://docs.sarvam.ai/voice-agents/deploy/telephony/rent-from-sarvam.md), [Sarvam Exotel setup](https://docs.sarvam.ai/voice-agents/deploy/telephony/exotel.md), [Exotel status callback](https://developer.exotel.com/docs/voice-v1/api-reference/status-callback), [Sarvam Twilio setup](https://docs.sarvam.ai/voice-agents/deploy/telephony/twilio.md), [Twilio India voice guidelines](https://www.twilio.com/en-us/guidelines/in/voice), [Twilio India pricing](https://www.twilio.com/en-us/voice/pricing/in), [Twilio webhook security](https://www.twilio.com/docs/usage/webhooks/webhooks-security).

## Proposed implementation

1. **Create and commit the hosted agent** with an explicit AI identity; use the submitted brief only as call context. Instruct it to ask about website requirements, not invent prices/timelines or make promises, and offer a human discovery call. Support English, Telugu and Hindi, let the person switch language, and honor opt-out immediately.
2. **Enqueue only after explicit consent.** The consent evidence is now stored as `ai_call_consent` and server-generated `ai_call_consent_at`. The submitted enquiry brief is already stored on the same row. Use an atomic database claim/outbox keyed uniquely by enquiry ID before any provider request. Pass that stable ID as the provider idempotency key if supported. Do not automatically retry an ambiguous provider timeout until the provider can be queried/reconciled; otherwise a crash after call creation but before saving its ID could cause a duplicate.
3. **Keep provider credentials server-only.** Add them only to local ignored `.env.local` and Vercel encrypted environment variables, never to client variables or browser requests. Send a minimal, validated call context rather than the whole form unless each field is needed.
4. **Persist lifecycle data against the enquiry.** The schema now has consent timestamp, call status, provider name/ID, summary, next action and update timestamp. The initial status is `requested`; move it to pending/initiating only when an atomic claim actually starts the provider workflow. Update final status and concise summary/next action from authenticated provider events.
5. **Authenticate callbacks before trusting them.** Sarvam's reviewed webhook docs describe status and transcript/final-variable payloads and delivery records, but do not document a signature header or verification procedure. Do not accept an unsigned callback as authoritative. Ask Sarvam to provide its official signing scheme, secret provisioning/rotation, exact signed bytes, timestamp/replay protections and delivery retry behavior. Implement verification over the raw request body and make event handling idempotent only after that is documented and tested. Exotel's reviewed status-callback reference also did not establish signature verification; Twilio documents `X-Twilio-Signature`, but has the India-originating-number limitation above.
6. **Run from Vercel if the provider hosts telephony/media.** Sarvam's documented REST initiation and webhook model implies VNS does not need a persistent WebSocket/media server; the provider carries the live audio. This is an architectural conclusion, not an explicit Vercel compatibility guarantee. Confirm callback reachability, request timing, retries and deployment limits with a staging account. If VNS must host the live audio stream itself, use a separate persistent voice service rather than a Vercel function.
7. **Protect consent and suppressions.** Retain the separate opt-in evidence, offer a clear opt-out in the call, maintain provider/global suppression rules and respect documented calling windows. Sarvam puts consent, DND and local telemarketing compliance responsibility on the customer. Obtain compliance advice for the intended Indian use case before production.

The existing `ai_call_status` check constraint and its values are in [the enquiry SQL](../supabase/consultant-leads.sql). Its migration is safe to re-run. The consent is a request record only; it does not enqueue or place a call until a provider, signed callback approach and duplicate-call safeguards are implemented.

### Preferred language mapping

The selected preference is stored as `ai_call_language` using the app's locale codes. Sarvam's documented outbound request supports `app_config.app_overrides.initial_language_name`; the server-side mapping prepared in `server/sarvam-language.js` is:

| Stored preference | Sarvam `initial_language_name` |
|---|---|
| `en-IN` | `English` |
| `te-IN` | `Telugu` |
| `hi-IN` | `Hindi` |

This mapping is validated and covered by tests, but it is not yet sent to a provider because outbound calling remains disabled. The enum is documented in the [instant outbound API reference](https://docs.sarvam.ai/voice-agents/api/instant-outbound/create.md).

## Still needed from VNS / provider

- Choose Sarvam-managed telephony or bring an existing Exotel number; confirm Indian caller identity, KYC, number availability, calling-hour/DND settings and all setup/recurring/per-minute charges.
- Create the Sarvam workspace/agent and obtain server-side API credentials. For Exotel, obtain an active account, Exophone, Account SID, API key/token and the correct regional API base URL.
- Get written provider confirmation of webhook signature verification and call-request idempotency/reconciliation semantics. These are production blockers for the requested webhook authenticity and duplicate-call guarantee.
- Add encrypted production secrets and configure the public webhook URL only after verification is designed. No account, number purchase or call was made during this work.
- Run the Supabase migration again to add `ai_call_language` before deploying the updated owner lead query.
