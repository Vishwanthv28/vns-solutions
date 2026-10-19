const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const LEAD_STATUSES = ['new', 'contacted', 'in_progress', 'completed'];
export const LEAD_PRIORITIES = ['normal', 'high', 'low'];
export class OwnerError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function createOwnerService({ env = process.env, fetchImpl = fetch } = {}) {
  function config() {
    let url;
    try {
      url = new URL(env.SUPABASE_URL);
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.username || url.password || url.port) throw new Error();
    } catch { throw new OwnerError(503, 'Owner access is not configured. Follow OWNER_DASHBOARD_SETUP.md.'); }
    const publicKey = env.SUPABASE_ANON_KEY?.trim();
    const secret = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const ownerId = env.OWNER_USER_ID?.trim();
    if (!publicKey || !secret || !UUID.test(ownerId || '')) throw new OwnerError(503, 'Owner access is not configured. Follow OWNER_DASHBOARD_SETUP.md.');
    return { base: url.origin, publicKey, secret, ownerId };
  }

  async function request(url, options, failureStatus = 502) {
    let result;
    try { result = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(8000) }); }
    catch { throw new OwnerError(502, 'The owner service could not connect. Please retry.'); }
    if (!result.ok) {
      if (result.status === 429) throw new OwnerError(429, 'Too many requests. Please wait and retry.');
      // Do not log credentials, tokens, or customer data.
      throw new OwnerError(failureStatus, failureStatus === 401 ? 'Sign-in failed or your session expired.' : 'Could not load or update enquiries. Check the dashboard SQL migration.');
    }
    if (result.status === 204) return null;
    try { return await result.json(); }
    catch { throw new OwnerError(502, 'The owner service returned an invalid response.'); }
  }

  async function verify(token) {
    const c = config();
    if (typeof token !== 'string' || token.length > 16000 || !token) throw new OwnerError(401, 'Sign in to view enquiries.');
    const user = await request(`${c.base}/auth/v1/user`, {
      headers: { apikey: c.publicKey, Authorization: `Bearer ${token}` },
    }, 401);
    if (!user?.email_confirmed_at || user.id !== c.ownerId) throw new OwnerError(403, 'This account does not have owner access.');
    return { id: user.id, email: user.email };
  }

  async function login({ email, password }) {
    const c = config();
    if (typeof email !== 'string' || email.length > 254 || !email.includes('@') || typeof password !== 'string' || !password || password.length > 1024) throw new OwnerError(400, 'Enter your owner email and password.');
    const data = await request(`${c.base}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: c.publicKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    }, 401);
    if (typeof data?.access_token !== 'string' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new OwnerError(502, 'Sign-in returned an invalid session.');
    const user = await verify(data.access_token);
    return { token: data.access_token, expires: Math.min(data.expires_in, 3600), user };
  }

  async function database(query, options = {}) {
    const c = config();
    return request(`${c.base}/rest/v1/consultant_leads?${query}`, {
      ...options,
      headers: { apikey: c.secret, Authorization: `Bearer ${c.secret}`, 'Content-Type': 'application/json', ...options.headers },
    });
  }

  async function list(token, { page = '1', status = 'all', search = '', followup = 'all', priority = 'all' } = {}) {
    await verify(token);
    const number = Number(page);
    if (!Number.isInteger(number) || number < 1 || number > 100000 || (status !== 'all' && !LEAD_STATUSES.includes(status))) throw new OwnerError(400, 'Invalid page or status filter.');
    if (typeof search !== 'string' || !/^[\p{L}\p{N}\s@.+_-]{0,80}$/u.test(search) || !['all', 'due', 'upcoming'].includes(followup) || (priority !== 'all' && !LEAD_PRIORITIES.includes(priority))) throw new OwnerError(400, 'Use up to 80 letters, numbers, spaces or email characters for search. Choose valid filters.');
    const query = new URLSearchParams({
      select: 'id,created_at,name,email,phone,answers,brief,consent,notification_sent,status,updated_at,priority,owner_notes,next_followup_at',
      order: 'created_at.desc,id.desc', offset: String((number - 1) * 25), limit: '26',
    });
    if (status !== 'all') query.set('status', `eq.${status}`);
    if (priority !== 'all') query.set('priority', `eq.${priority}`);
    if (search.trim()) query.set('or', `(name.ilike."*${search.trim()}*",email.ilike."*${search.trim()}*")`);
    if (followup !== 'all') {
      query.set('next_followup_at', `${followup === 'due' ? 'lte' : 'gt'}.${new Date().toISOString()}`);
      // A completed enquiry is never in the active follow-up queue.
      query.set('and', '(status.neq.completed)');
      query.set('order', 'next_followup_at.asc,id.asc');
    }
    const rows = await database(query);
    if (!Array.isArray(rows)) throw new OwnerError(502, 'The enquiries response was invalid.');
    return { leads: rows.slice(0, 25), page: number, hasMore: rows.length > 25 };
  }

  async function update(token, body) {
    await verify(token);
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['id', 'status', 'priority', 'owner_notes', 'next_followup_at'].includes(key)) || !UUID.test(body.id || '')) throw new OwnerError(400, 'Choose a valid enquiry and permitted update fields.');
    const update = {};
    if (Object.hasOwn(body, 'status')) {
      if (!LEAD_STATUSES.includes(body.status)) throw new OwnerError(400, 'Choose a valid enquiry status.');
      update.status = body.status;
    }
    if (Object.hasOwn(body, 'priority')) {
      if (!LEAD_PRIORITIES.includes(body.priority)) throw new OwnerError(400, 'Choose a valid priority.');
      update.priority = body.priority;
    }
    if (Object.hasOwn(body, 'owner_notes')) {
      if (typeof body.owner_notes !== 'string' || body.owner_notes.length > 4000) throw new OwnerError(400, 'Notes must be text of at most 4,000 characters.');
      update.owner_notes = body.owner_notes.trim();
    }
    if (Object.hasOwn(body, 'next_followup_at')) {
      if (body.next_followup_at === null) update.next_followup_at = null;
      else {
        if (typeof body.next_followup_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(body.next_followup_at) || !Number.isFinite(Date.parse(body.next_followup_at)) || !/^20\d{2}-/.test(body.next_followup_at)) throw new OwnerError(400, 'Choose a valid follow-up date.');
        update.next_followup_at = new Date(body.next_followup_at).toISOString();
      }
    }
    if (!Object.keys(update).length) throw new OwnerError(400, 'Choose at least one field to update.');
    const query = new URLSearchParams({ id: `eq.${body.id}`, select: 'id,status,updated_at,priority,owner_notes,next_followup_at' });
    const rows = await database(query, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ ...update, updated_at: new Date().toISOString() }),
    });
    if (!Array.isArray(rows) || !rows.length) throw new OwnerError(404, 'Enquiry not found.');
    return rows[0];
  }

  async function logout(token) {
    const c = config();
    if (token) await request(`${c.base}/auth/v1/logout?scope=local`, {
      method: 'POST', headers: { apikey: c.publicKey, Authorization: `Bearer ${token}` },
    }, 401);
  }
  return { login, verify, list, update, logout };
}
