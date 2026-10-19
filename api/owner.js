import { createOwnerService, OwnerError } from '../server/owner-service.js';

export function createOwnerHandler(service = createOwnerService(), { secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL) } = {}) {
  const cookieName = secure ? '__Secure-vns_owner' : 'vns_owner';
  const cookie = (token = '', age = 0) => `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/api/owner; Max-Age=${Math.floor(age)}${secure ? '; Secure' : ''}`;
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    try {
      const url = new URL(req.url, 'http://local');
      const action = url.searchParams.get('action') || 'session';
      const methods = { login: 'POST', logout: 'POST', session: 'GET', leads: 'GET', status: 'PATCH' };
      if (!methods[action]) throw new OwnerError(404, 'Endpoint not found.');
      if (req.method !== methods[action]) {
        res.setHeader('Allow', methods[action]);
        throw new OwnerError(405, 'Method not allowed.');
      }
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const origin = req.headers.origin;
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new OwnerError(403, 'Request origin is not allowed.');
      if (origin) {
        let valid = false;
        try { const source = new URL(origin); valid = ['http:', 'https:'].includes(source.protocol) && source.host === host; } catch {}
        if (!valid) throw new OwnerError(403, 'Request origin is not allowed.');
      } else if (req.method !== 'GET') {
        throw new OwnerError(403, 'A same-origin browser request is required.');
      }
      const entry = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`));
      let token = '';
      try { token = entry ? decodeURIComponent(entry.slice(cookieName.length + 1)) : ''; } catch {}
      let body = {};
      if (req.method === 'POST' || req.method === 'PATCH') {
        if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new OwnerError(415, 'Send JSON.');
        const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
        if (Buffer.byteLength(raw) > 20000 || Number(req.headers['content-length'] || 0) > 20000) throw new OwnerError(413, 'Request is too large.');
        try { body = JSON.parse(raw); } catch { throw new OwnerError(400, 'Invalid JSON.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new OwnerError(400, 'Invalid request.');
      }
      if (action === 'login') {
        const session = await service.login(body);
        res.setHeader('Set-Cookie', cookie(session.token, session.expires));
        return res.status(200).json({ user: session.user });
      }
      if (action === 'logout') {
        res.setHeader('Set-Cookie', cookie());
        try { await service.logout(token); } catch { /* Always remove this browser session. */ }
        return res.status(200).json({ ok: true });
      }
      if (action === 'session') return res.status(200).json({ user: await service.verify(token) });
      if (action === 'leads') return res.status(200).json(await service.list(token, { page: url.searchParams.get('page') || '1', status: url.searchParams.get('status') || 'all', search: url.searchParams.get('search') || '', followup: url.searchParams.get('followup') || 'all', priority: url.searchParams.get('priority') || 'all' }));
      return res.status(200).json({ lead: await service.update(token, body) });
    } catch (error) {
      const status = error instanceof OwnerError ? error.status : 502;
      if (status === 401 || status === 403) res.setHeader('Set-Cookie', cookie());
      return res.status(status).json({ message: error instanceof OwnerError ? error.message : 'Owner request failed. Please retry.' });
    }
  };
}
export default createOwnerHandler();
