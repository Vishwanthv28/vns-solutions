import {
  ConsultantError,
  generateAgentReply,
} from '../server/consultant-provider.js';

const attempts = new Map();
const maxRequestBytes = 16000;

function consumeAttempt(request) {
  const now = Date.now();
  for (const [ip, entry] of attempts) {
    if (entry.until <= now) attempts.delete(ip);
  }
  const ip = String(
    request.headers['x-forwarded-for'] ||
    request.socket?.remoteAddress ||
    'unknown',
  ).split(',')[0].trim();
  const entry = attempts.get(ip) || { count: 0, until: now + 60000 };
  if (entry.count >= 8 || (attempts.size >= 1000 && !attempts.has(ip))) return false;
  entry.count += 1;
  attempts.set(ip, entry);
  return true;
}

export function createPlatformDemoChatHandler(
  generate = generateAgentReply,
  { limit = true } = {},
) {
  return async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store, private');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return response.status(405).json({ message: 'Method not allowed.' });
    }

    const origin = request.headers.origin;
    const host = request.headers['x-forwarded-host'] || request.headers.host;
    if (origin) {
      try {
        const url = new URL(origin);
        if (!['http:', 'https:'].includes(url.protocol) || url.host !== host) throw new Error();
      } catch {
        return response.status(403).json({ message: 'Request origin is not allowed.' });
      }
    } else {
      return response.status(403).json({ message: 'A same-origin browser request is required.' });
    }

    let body;
    try {
      const raw = typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body ?? null);
      if (Buffer.byteLength(raw, 'utf8') > maxRequestBytes ||
          Number(request.headers['content-length'] || 0) > maxRequestBytes) {
        return response.status(413).json({ message: 'Request is too large.' });
      }
      body = JSON.parse(raw);
    } catch {
      return response.status(400).json({ message: 'Invalid JSON.' });
    }

    if (limit && !consumeAttempt(request)) {
      response.setHeader('Retry-After', '60');
      return response.status(429).json({ message: 'Please wait one minute before trying the demo again.' });
    }

    try {
      const result = await generate(body);
      return response.status(200).json({ ok: true, ...result });
    } catch (error) {
      return response.status(
        error instanceof ConsultantError ? error.status : 502,
      ).json({
        message: error instanceof ConsultantError
          ? error.message
          : 'AI could not continue the conversation. Please retry.',
      });
    }
  };
}

export default createPlatformDemoChatHandler();
