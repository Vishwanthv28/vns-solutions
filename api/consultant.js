import { validateAnswers } from '../server/consultant-validation.js';
import { generateBrief, ConsultantError } from '../server/consultant-provider.js';

export function createConsultantHandler(generate = generateBrief) {
  return async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return response.status(405).json({ message: 'Method not allowed.' }); }
    const origin = request.headers.origin;
    const host = request.headers['x-forwarded-host'] || request.headers.host;
    if (origin) {
      try { const url = new URL(origin); if (!['http:', 'https:'].includes(url.protocol) || url.host !== host) throw new Error(); }
      catch { return response.status(403).json({ message: 'Request origin is not allowed.' }); }
    }
    let body;
    try {
      const raw = typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? null);
      if (Buffer.byteLength(raw, 'utf8') > 16000 || Number(request.headers['content-length'] || 0) > 16000) return response.status(413).json({ message: 'Request is too large.' });
      body = JSON.parse(raw);
    } catch { return response.status(400).json({ message: 'Invalid JSON.' }); }
    const { answers, errors } = validateAnswers(body?.answers);
    if (Object.keys(errors).length) return response.status(400).json({ message: 'Please review your answers.', errors });
    try { return response.status(200).json({ ok: true, brief: await generate(answers) }); }
    catch (error) { return response.status(error instanceof ConsultantError ? error.status : 502).json({ message: error instanceof ConsultantError ? error.message : 'Unable to generate the brief. Please retry.' }); }
  };
}
export default createConsultantHandler();
