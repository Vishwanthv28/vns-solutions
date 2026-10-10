import { validateLead } from '../server/lead-validation.js';
import { saveAndNotifyLead, LeadError } from '../server/lead-provider.js';
const attempts = new Map();
export function createLeadHandler(submit = saveAndNotifyLead, { limit = true } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ message: 'Method not allowed.' }); }
    const origin = req.headers.origin, host = req.headers['x-forwarded-host'] || req.headers.host;
    if (origin) {
      try { const u = new URL(origin); if (!['http:', 'https:'].includes(u.protocol) || u.host !== host) throw new Error(); }
      catch { return res.status(403).json({ message: 'Request origin is not allowed.' }); }
    }
    let body;
    try {
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? null);
      if (Buffer.byteLength(raw) > 65000 || Number(req.headers['content-length'] || 0) > 65000) return res.status(413).json({ message: 'Submission is too large.' });
      body = JSON.parse(raw);
    } catch { return res.status(400).json({ message: 'Invalid JSON.' }); }
    if (body?.website) return res.status(400).json({ message: 'Unable to submit this form.' });
    let lead;
    try { lead = validateLead(body); } catch (error) { return res.status(400).json({ message: error.message }); }
    if (limit) {
      const now = Date.now();
      for (const [key, entry] of attempts) if (entry.until < now) attempts.delete(key);
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      const entry = attempts.get(ip) || { count: 0, until: now + 60000 };
      if (entry.count >= 5 || (attempts.size >= 1000 && !attempts.has(ip))) { res.setHeader('Retry-After', '60'); return res.status(429).json({ message: 'Please wait one minute before submitting again.' }); }
      entry.count += 1; attempts.set(ip, entry);
    }
    try { return res.status(200).json(await submit(lead)); }
    catch (error) {
      console.error('Lead submission failed', error instanceof LeadError ? error.status : 'provider connection');
      return res.status(error instanceof LeadError ? error.status : 502).json({ message: error instanceof LeadError ? error.message : 'We could not confirm your submission. Your form is preserved; please retry.' });
    }
  };
}
export default createLeadHandler();
