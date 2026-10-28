import {
  ConsultantVoiceError,
  synthesizeSpeech,
  transcribeSpeech,
  voiceLanguages,
} from '../server/consultant-voice-provider.js';

const maxRequestBytes = 3_000_000;

export function createConsultantVoiceHandler(
  { transcribe = transcribeSpeech, speak = synthesizeSpeech } = {},
) {
  return async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return response.status(405).json({ message: 'Method not allowed.' });
    }

    const origin = request.headers.origin;
    const host = request.headers['x-forwarded-host'] || request.headers.host;
    if (origin) {
      try {
        const url = new URL(origin);
        if (!['http:', 'https:'].includes(url.protocol) || url.host !== host) {
          throw new Error();
        }
      } catch {
        return response.status(403).json({ message: 'Request origin is not allowed.' });
      }
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

    if (!voiceLanguages[body?.language]) {
      return response.status(400).json({ message: 'Choose English, Hindi, or Telugu.' });
    }

    try {
      if (body.action === 'transcribe') {
        return response.status(200).json({
          ok: true,
          ...(await transcribe({
            audioBase64: body.audioBase64,
            mimeType: body.mimeType,
            language: body.language,
          })),
        });
      }
      if (body.action === 'speak') {
        return response.status(200).json({
          ok: true,
          ...(await speak({ text: body.text, language: body.language })),
        });
      }
      return response.status(400).json({ message: 'Choose a supported voice action.' });
    } catch (error) {
      return response.status(
        error instanceof ConsultantVoiceError ? error.status : 502,
      ).json({
        message: error instanceof ConsultantVoiceError
          ? error.message
          : 'Voice service could not complete the request. Please retry.',
      });
    }
  };
}

export default createConsultantVoiceHandler();
