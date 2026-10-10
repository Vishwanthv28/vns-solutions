import { createHash } from 'node:crypto';
export class LeadError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export async function saveAndNotifyLead(lead, { env = process.env, fetchImpl = fetch } = {}) {
  let base;
  try { base = new URL(env.SUPABASE_URL); if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co') || base.username || base.password) throw new Error(); }
  catch { throw new LeadError(503, 'Project submissions are not configured yet. Please contact VNS directly.'); }
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key || !env.RESEND_API_KEY?.trim() || !env.LEAD_EMAIL_FROM?.trim() || !env.LEAD_EMAIL_TO?.trim()) throw new LeadError(503, 'Project submissions are not configured yet. Please contact VNS directly.');
  const { id, ...payload } = lead;
  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const endpoint = `${base.origin}/rest/v1/consultant_leads`;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const db = async (url, options) => {
    const result = await fetchImpl(url, { ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(8000) });
    if (!result.ok) { console.error('Lead database request failed', result.status); throw new LeadError(502, 'We could not confirm your submission. Your form is preserved; please retry.'); }
    return result;
  };
  await db(`${endpoint}?on_conflict=id`, { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ id, ...payload, payload_hash: hash }) });
  const lookup = await db(`${endpoint}?id=eq.${id}&select=payload_hash,notification_sent`, { method: 'GET' });
  const rows = await lookup.json();
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].payload_hash !== hash) throw new LeadError(409, 'This submission changed. Please reopen the contact form and submit again.');
  if (rows[0].notification_sent) return { ok: true, reference: id };
  const { brief, answers } = lead;
  const text = [
    'New VNS AI Consultant project submission', `Reference: ${id}`, `Name: ${lead.name}`, `Email: ${lead.email}`, `Phone: ${lead.phone || 'Not provided'}`, 'Permission to contact: Yes', '',
    'Visitor questionnaire:', ...Object.entries(answers).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v || 'Skipped'}`), '',
    'Visitor-submitted AI brief (starting point for review):', brief.businessType, brief.summary, '', 'Goals:', ...brief.goals.map(v => `- ${v}`), '',
    'Recommended services:', ...brief.recommendedServices.map(v => `- ${v.name}: ${v.reason}`), '', 'Suggested features:', ...brief.suggestedFeatures.map(v => `- ${v}`), '', 'Next steps:', ...brief.nextSteps.map(v => `- ${v}`),
  ].join('\n');
  const result = await fetchImpl('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(8000), headers: { Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`, 'Content-Type': 'application/json', 'Idempotency-Key': `consultant-lead/${id}` }, body: JSON.stringify({ from: env.LEAD_EMAIL_FROM.trim(), to: [env.LEAD_EMAIL_TO.trim()], reply_to: lead.email, subject: 'New VNS AI project brief', text }) });
  if (!result.ok) { console.error('Lead notification rejected', result.status); throw new LeadError(502, 'Your project was saved, but the notification failed. Please retry with the same details.'); }
  await db(`${endpoint}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ notification_sent: true }) });
  return { ok: true, reference: id };
}
