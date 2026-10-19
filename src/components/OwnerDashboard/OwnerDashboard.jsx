import { useEffect, useRef, useState } from 'react';
import './OwnerDashboard.css';
import { followupState, localDateInput, replyDraft } from './pipeline.js';

const statuses = { new: 'New', contacted: 'Contacted', in_progress: 'In progress', completed: 'Completed' };
const date = value => value ? new Date(value).toLocaleString() : '—';

async function api(action, options = {}) {
  const response = await fetch(`/api/owner?action=${action}`, {
    credentials: 'same-origin', cache: 'no-store', ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => ({ message: 'Owner API unavailable. Use npm run dev locally.' }));
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function BriefSection({ title, items }) {
  if (!Array.isArray(items) || !items.length) return null;
  return <section className="owner-brief-section"><h3>{title}</h3><ul>{items.map((item, index) => <li key={index}>{typeof item === 'string' ? item : `${item.name}: ${item.reason}`}</li>)}</ul></section>;
}

export default function OwnerDashboard() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [followup, setFollowup] = useState('all');
  const [priority, setPriority] = useState('all');
  const [notesDraft, setNotesDraft] = useState('');
  const [dateDraft, setDateDraft] = useState('');
  const [priorityDraft, setPriorityDraft] = useState('normal');
  const [dirty, setDirty] = useState(false);
  const [replyKind, setReplyKind] = useState('first');
  const [draft, setDraft] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const detailRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('owner-mode');
    const oldTitle = document.title;
    document.title = 'Owner dashboard | VNS Solutions';
    const robots = document.createElement('meta');
    robots.name = 'robots'; robots.content = 'noindex,nofollow';
    document.head.appendChild(robots);
    const controller = new AbortController();
    api('session', { signal: controller.signal })
      .then(data => setUser(data.user))
      .catch(failure => { if (failure.name !== 'AbortError' && failure.status !== 401) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => { controller.abort(); document.body.classList.remove('owner-mode'); document.title = oldTitle; robots.remove(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setLeads([]); setSelected(null); setHasMore(false);
    const params = new URLSearchParams({ page: String(page), status: filter, search: searchQuery, followup, priority });
    api(`leads&${params}`, { signal: controller.signal })
      .then(data => { setLeads(data.leads); setHasMore(data.hasMore); })
      .catch(failure => {
        if (failure.name === 'AbortError') return;
        setError(failure.message);
        if ([401, 403].includes(failure.status)) setUser(null);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user, page, filter, searchQuery, followup, priority, refresh]);

  useEffect(() => {
    if (selected) {
      detailRef.current?.focus();
      setNotesDraft(selected.owner_notes || '');
      setDateDraft(localDateInput(selected.next_followup_at));
      setPriorityDraft(selected.priority || 'normal');
      setReplyKind('first'); setDraft(replyDraft(selected));
    } else { setNotesDraft(''); setDateDraft(''); setPriorityDraft('normal'); setDraft(''); }
    setDirty(false);
  }, [selected?.id]);

  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function signIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true); setError('');
    try {
      const data = await api('login', { method: 'POST', body: JSON.stringify({ email: fields.get('email'), password: fields.get('password') }) });
      form.reset(); setUser(data.user); setPage(1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true); setError('');
    try {
      await api('logout', { method: 'POST', body: '{}' });
      setUser(null); setLeads([]); setSelected(null); setSearch(''); setSearchQuery(''); setDirty(false); setNotice('Signed out.');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function changeStatus(event) {
    const status = event.target.value;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await api('status', { method: 'PATCH', body: JSON.stringify({ id: selected.id, status }) });
      setLeads(items => items.map(item => item.id === data.lead.id ? { ...item, ...data.lead } : item));
      setSelected(item => ({ ...item, ...data.lead }));
      setNotice(`Status saved: ${statuses[status]}.`);
    } catch (failure) {
      setError(failure.message);
      if ([401, 403].includes(failure.status)) { setUser(null); setLeads([]); setSelected(null); }
    } finally { setBusy(false); }
  }

  async function saveWorkflow(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await api('status', { method: 'PATCH', body: JSON.stringify({ id: selected.id, priority: priorityDraft, owner_notes: notesDraft, next_followup_at: dateDraft ? new Date(dateDraft).toISOString() : null }) });
      setLeads(items => items.map(item => item.id === data.lead.id ? { ...item, ...data.lead } : item));
      setSelected(item => ({ ...item, ...data.lead }));
      setNotesDraft(data.lead.owner_notes || '');
      setDirty(false); setNotice('Private notes, priority and follow-up saved.');
    } catch (failure) {
      setError(failure.message);
      if ([401, 403].includes(failure.status)) { setUser(null); setLeads([]); setSelected(null); setDirty(false); }
    } finally { setBusy(false); }
  }

  async function copyDraft() {
    try { await navigator.clipboard.writeText(draft); setNotice('Draft copied. Review it before sending to the client.'); }
    catch { setNotice('Select the draft text and copy it manually.'); }
  }

  const visible = leads.filter(lead => (filter === 'all' || lead.status === filter) && (priority === 'all' || lead.priority === priority) && (followup === 'all' || followupState(lead) === followup));
  const brief = selected?.brief || {};

  return <main className="owner-app">
    <header className="owner-header">
      <a href="/" className="owner-brand">VNS<span>Solutions</span></a>
      <div className="owner-header-right"><a href="/">View website ↗</a>{user && <button className="owner-button" type="button" onClick={signOut} disabled={busy}>Sign out</button>}</div>
    </header>
    {checking ? <p className="owner-wait" role="status">Checking your session…</p> : !user ?
      <section className="owner-login">
        <div className="owner-kicker">PRIVATE WORKSPACE</div>
        <h1>Your enquiries.<br /><em>One clear view.</em></h1>
        <p>Sign in with your authorised VNS owner account.</p>
        <form onSubmit={signIn}>
          <label htmlFor="owner-email">Email address</label>
          <input id="owner-email" name="email" type="email" autoComplete="username" required maxLength={254} />
          <label htmlFor="owner-password">Password</label>
          <input id="owner-password" name="password" type="password" autoComplete="current-password" required maxLength={1024} />
          <button className="owner-button owner-primary" disabled={busy}>{busy ? 'Signing in…' : 'Open dashboard →'}</button>
        </form>
        <p className="owner-small">Sessions last up to one hour. To reset your password, contact the Supabase project administrator.</p>
        {error && <p className="owner-error" role="alert">{error}</p>}
        {notice && <p className="owner-notice" role="status">{notice}</p>}
      </section> : <div className="owner-workspace">
        <div className="owner-intro"><div><p className="owner-kicker">CLIENT WORKSPACE</p><h1>Every lead. A next step<span>.</span></h1><p>Review enquiries, prepare a reply and keep follow-ups moving.</p></div><span className="owner-account">{user.email}</span></div>
        {error && <p className="owner-error" role="alert">{error}</p>}
        {notice && <p className="owner-notice" role="status">{notice}</p>}
        <div className="owner-overview" aria-label="Current page overview"><div><span>Enquiries on this page</span><strong>{loading ? '—' : leads.length}</strong></div><div><span>Need a first response</span><strong>{loading ? '—' : leads.filter(item => item.status === 'new').length}</strong></div><div><span>Follow-up due on this page</span><strong>{loading ? '—' : leads.filter(item => followupState(item) === 'due').length}</strong></div></div>
        <div className="owner-toolbar owner-pipeline-toolbar">
          <label>Status<select value={filter} disabled={busy || dirty} onChange={event => { setFilter(event.target.value); setPage(1); setNotice(''); }}><option value="all">All enquiries</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Follow-up<select value={followup} disabled={busy || dirty} onChange={event => { setFollowup(event.target.value); setPage(1); }}><option value="all">Any date</option><option value="due">Due now</option><option value="upcoming">Upcoming</option></select></label>
          <label>Priority<select value={priority} disabled={busy || dirty} onChange={event => { setPriority(event.target.value); setPage(1); }}><option value="all">Any priority</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label>
          <form className="owner-search-form" onSubmit={event => { event.preventDefault(); setSearchQuery(search.trim()); setPage(1); }}><label className="owner-search">Search all enquiries<input type="search" maxLength={80} value={search} disabled={busy || dirty} onChange={event => setSearch(event.target.value)} placeholder="Name or email" /></label><button className="owner-button" disabled={busy || dirty}>Search</button></form>
          <button className="owner-button" type="button" disabled={loading || busy || dirty} onClick={() => { setRefresh(value => value + 1); setNotice(''); }}>Refresh ↻</button>
        </div>
        <div className="owner-columns">
          <section className="owner-list" aria-label="Saved enquiries" aria-busy={loading}>
            <div className="owner-list-heading"><h2>Inbox</h2><span>{loading ? 'Loading…' : `${visible.length} on this page`}</span></div>
            {loading ? <p className="owner-empty" role="status">Loading enquiries…</p> : visible.length === 0 ? <p className="owner-empty">No enquiries match this view.</p> : visible.map(lead => <button type="button" disabled={busy || dirty} className={`owner-lead ${selected?.id === lead.id ? 'is-selected' : ''}`} key={lead.id} aria-pressed={selected?.id === lead.id} onClick={() => { setSelected(lead); setNotice(''); }}>
              <span className="owner-lead-top"><strong>{lead.name}</strong><span className={`owner-badge owner-status-${lead.status}`}>{statuses[lead.status]}</span></span>
              <span className="owner-lead-business">{lead.brief?.businessType || 'Project enquiry'}</span><span className="owner-lead-email">{lead.email}</span>
              <span className="owner-lead-signals">{lead.priority === 'high' && <span className="owner-priority">High priority</span>}{lead.next_followup_at && lead.status !== 'completed' && <span className={followupState(lead) === 'due' ? 'owner-due' : ''}>{followupState(lead) === 'due' ? 'Follow-up due' : 'Follow-up'} · {date(lead.next_followup_at)}</span>}</span>
              <span className="owner-lead-bottom">{date(lead.created_at)}<span>{lead.notification_sent ? 'Email sent' : 'Email pending'}</span></span>
            </button>)}
            <nav className="owner-pagination" aria-label="Enquiry pages"><button className="owner-button" disabled={page === 1 || loading || busy || dirty} onClick={() => setPage(value => value - 1)}>← Previous</button><span>Page {page}</span><button className="owner-button" disabled={!hasMore || loading || busy || dirty} onClick={() => setPage(value => value + 1)}>Next →</button></nav>
          </section>
          <section className="owner-detail" ref={detailRef} tabIndex={-1} aria-label="Selected enquiry">
            {!selected ? <div className="owner-empty-detail"><span>↗</span><h2>Every project starts<br />with a conversation.</h2><p>Select an enquiry to read the brief and update its status.</p></div> : <>
              <div className="owner-detail-heading"><p className="owner-kicker">PROJECT BRIEF</p><h2>{selected.name}</h2><p>{brief.businessType}</p></div>
              <div className="owner-contact"><a href={`mailto:${selected.email}`}>{selected.email} ↗</a><span>{selected.phone || 'Phone not provided'}</span><span>Received {date(selected.created_at)}</span><span className="owner-reference">Reference: {selected.id}</span></div>
              <label className="owner-status-control">Enquiry status<select value={selected.status} onChange={changeStatus} disabled={busy || dirty}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <p className="owner-small">{selected.notification_sent ? 'Notification accepted by the email service; inbox delivery is separate.' : 'Email notification is pending. The enquiry is saved.'}</p>
              <form className="owner-workflow-form" onSubmit={saveWorkflow}>
                <div className="owner-section-top"><h3>Plan the next conversation</h3>{dirty && <span className="owner-due">Unsaved changes</span>}</div>
                <div className="owner-workflow-fields"><label>Lead priority<select value={priorityDraft} disabled={busy} onChange={event => { setPriorityDraft(event.target.value); setDirty(true); }}><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></select></label><label>Next follow-up · your local time<input type="datetime-local" value={dateDraft} disabled={busy} onChange={event => { setDateDraft(event.target.value); setDirty(true); }} /></label></div>
                <label>Private owner notes<textarea rows={4} maxLength={4000} value={notesDraft} disabled={busy} onChange={event => { setNotesDraft(event.target.value); setDirty(true); }} placeholder="Discovery call notes, requirements or next action…" /></label>
                <p className="owner-small">{notesDraft.length}/4,000 characters. Follow-up dates organise this dashboard; they do not send reminders or contact clients.</p>
                <div className="owner-inline-actions"><button className="owner-button owner-primary" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save next step'}</button>{dirty && <button className="owner-button" type="button" disabled={busy} onClick={() => { setNotesDraft(selected.owner_notes || ''); setDateDraft(localDateInput(selected.next_followup_at)); setPriorityDraft(selected.priority || 'normal'); setDirty(false); }}>Discard edits</button>}{dateDraft && <button type="button" className="owner-text-button" disabled={busy} onClick={() => { setDateDraft(''); setDirty(true); }}>Clear date</button>}</div>
              </form>
              <section className="owner-reply"><div className="owner-section-top"><h3>Prepare a client reply</h3><span>Editable template</span></div><label>Message type<select value={replyKind} onChange={event => { setReplyKind(event.target.value); setDraft(replyDraft(selected, event.target.value)); }}><option value="first">First response</option><option value="followup">Follow-up</option></select></label><label>Review your draft<textarea value={draft} rows={8} maxLength={6000} onChange={event => setDraft(event.target.value)} /></label><div className="owner-inline-actions"><button className="owner-button" type="button" onClick={copyDraft}>Copy draft</button><a className="owner-button" href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent('Your project enquiry — VNS Solutions')}&body=${encodeURIComponent(draft)}`}>Open email draft ↗</a></div><p className="owner-small">Built from your saved brief using a template. Nothing is sent automatically.</p></section>
              <section className="owner-brief-section"><h3>Summary</h3><p>{brief.summary}</p></section>
              <BriefSection title="Goals" items={brief.goals} /><BriefSection title="Recommended services" items={brief.recommendedServices} /><BriefSection title="Suggested features" items={brief.suggestedFeatures} /><BriefSection title="Next steps" items={brief.nextSteps} />
              <details className="owner-answers"><summary>Original questionnaire</summary><dl>{Object.entries(selected.answers || {}).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{Array.isArray(value) ? value.join(', ') : value || 'Not provided'}</dd></div>)}</dl></details>
              <p className="owner-small">Contact consent: {selected.consent ? 'Provided' : 'Not recorded'}. AI suggestions require human review.</p>
            </>}
          </section>
        </div>
      </div>}
  </main>;
}
