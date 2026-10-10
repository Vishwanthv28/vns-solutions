import { useEffect, useRef } from 'react';
export const emptyLeadDraft = { expanded: false, name: '', email: '', phone: '', consent: false, website: '', submissionId: null, status: 'idle', error: '', reference: '' };
export default function LeadSubmission({ answers, brief, draft, setDraft }) {
  const active = useRef(null);
  useEffect(() => () => {
    active.current?.abort();
    setDraft(current => current.status === 'sending' ? { ...current, status: 'idle' } : current);
  }, [setDraft]);
  const busy = draft.status === 'sending';
  function change(key, value) {
    setDraft(current => ({ ...current, [key]: value, submissionId: null, status: 'idle', error: '' }));
  }
  async function submit(event) {
    event.preventDefault();
    if (active.current || draft.status === 'sent') return;
    const submissionId = draft.submissionId || crypto.randomUUID();
    const controller = new AbortController(); active.current = controller;
    setDraft(current => ({ ...current, submissionId, status: 'sending', error: '' }));
    const timer = window.setTimeout(() => controller.abort(), 40000);
    try {
      const response = await fetch('/api/consultant-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ submissionId, name: draft.name, email: draft.email, phone: draft.phone, consent: draft.consent, website: draft.website, answers, brief }) });
      const data = await response.json();
      if (!response.ok || data.ok !== true) throw new Error(data.message || 'Unable to confirm your submission. Please retry.');
      if (!controller.signal.aborted) setDraft(current => ({ ...current, status: 'sent', reference: data.reference, error: '' }));
    } catch (error) {
      if (!controller.signal.aborted) setDraft(current => ({ ...current, status: 'idle', error: error.message || 'Connection failed. Please retry.' }));
      else setDraft(current => ({ ...current, status: 'idle', error: 'We could not confirm your submission. Please retry with the same details.' }));
    } finally { window.clearTimeout(timer); active.current = null; }
  }
  if (draft.status === 'sent') return <section className="ai-lead-card" role="status"><h4>Your project brief was submitted.</h4><p>Thank you. Your contact details and project brief have been received. VNS can contact you about your project.</p><small>Reference: {draft.reference}</small></section>;
  if (!draft.expanded) return <section className="ai-lead-card"><h4>Ready to discuss your project?</h4><p>Send your brief and contact details to VNS Solutions.</p><button className="button" type="button" onClick={() => setDraft(current => ({ ...current, expanded: true }))}>Send my project brief to VNS <b>→</b></button></section>;
  return <section className="ai-lead-card"><h4>Send your project brief to VNS</h4><form onSubmit={submit} aria-busy={busy}>
    <label htmlFor="ai-lead-name">Name <span>(required)</span></label><input id="ai-lead-name" name="name" autoComplete="name" required minLength={2} maxLength={80} value={draft.name} disabled={busy} onChange={e => change('name', e.target.value)} />
    <label htmlFor="ai-lead-email">Email <span>(required)</span></label><input id="ai-lead-email" name="email" type="email" autoComplete="email" required maxLength={160} value={draft.email} disabled={busy} onChange={e => change('email', e.target.value)} />
    <label htmlFor="ai-lead-phone">Phone <span>(optional)</span></label><input id="ai-lead-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} value={draft.phone} disabled={busy} onChange={e => change('phone', e.target.value)} />
    <div className="ai-lead-trap" aria-hidden="true"><label htmlFor="ai-lead-website">Website</label><input id="ai-lead-website" tabIndex={-1} autoComplete="off" value={draft.website} onChange={e => change('website', e.target.value)} /></div>
    <label className="ai-lead-consent"><input type="checkbox" required checked={draft.consent} disabled={busy} onChange={e => change('consent', e.target.checked)} /><span>I agree that VNS Solutions may store my details and brief and contact me about this project.</span></label>
    <p className="ai-data-note">Your questionnaire and brief will be included. Your contact details are used for this enquiry and are not sent to Gemini.</p>
    {draft.error && <p className="ai-error" role="alert">{draft.error}</p>}
    <button className="button" type="submit" disabled={busy}>{busy ? 'Submitting…' : draft.error ? 'Retry submission' : 'Submit details and brief'} <b>→</b></button>
  </form></section>;
}
