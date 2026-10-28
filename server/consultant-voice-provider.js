export class ConsultantVoiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ConsultantVoiceError';
    this.status = status;
  }
}

export const voiceLanguages = {
  'en-IN': 'English',
  'hi-IN': 'Hindi',
  'te-IN': 'Telugu',
};

const audioTypes = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/aac': 'aac',
};

const maxAudioBytes = 2_000_000;

function requireLanguage(language) {
  if (!Object.hasOwn(voiceLanguages, language)) {
    throw new ConsultantVoiceError(400, 'Choose English, Hindi, or Telugu.');
  }
}

function requireApiKey(env) {
  const key = (env.SARVAM_API_KEY || '').trim();
  if (!key) {
    throw new ConsultantVoiceError(
      503,
      'Voice support is not configured yet. Please contact VNS Solutions.',
    );
  }
  return key;
}

function providerStatus(status) {
  if (status === 429) return 429;
  if (status === 503 || status === 504) return 503;
  return 502;
}

async function providerJson(response) {
  if (!response.ok) {
    throw new ConsultantVoiceError(
      providerStatus(response.status),
      response.status === 429
        ? 'Voice service is busy. Please wait a moment and retry.'
        : 'Voice service could not complete the request. Please retry.',
    );
  }

  try {
    return await response.json();
  } catch {
    throw new ConsultantVoiceError(
      502,
      'Voice service returned an invalid response. Please retry.',
    );
  }
}

function validateAudio(audioBase64, mimeType) {
  const contentType = typeof mimeType === 'string'
    ? mimeType.split(';', 1)[0].trim().toLowerCase()
    : '';
  const extension = audioTypes[contentType];

  if (!extension || typeof audioBase64 !== 'string' ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(audioBase64)) {
    throw new ConsultantVoiceError(400, 'Record audio in a supported format and try again.');
  }

  const audio = Buffer.from(audioBase64, 'base64');
  if (!audio.length || audio.length > maxAudioBytes ||
      audio.toString('base64') !== audioBase64) {
    throw new ConsultantVoiceError(400, 'The recording is empty or too large. Please record a shorter answer.');
  }

  return { audio, contentType, extension };
}

export async function transcribeSpeech(
  { audioBase64, mimeType, language },
  { env = process.env, fetchImpl = fetch } = {},
) {
  requireLanguage(language);
  const key = requireApiKey(env);
  const { audio, contentType, extension } = validateAudio(audioBase64, mimeType);
  const form = new FormData();
  form.append(
    'file',
    new Blob([audio], { type: contentType }),
    `recording.${extension}`,
  );
  form.append('model', 'saaras:v4');
  form.append('language_code', language);

  let response;
  try {
    response = await fetchImpl('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: { 'api-subscription-key': key },
      body: form,
    });
  } catch (error) {
    if (['TimeoutError', 'AbortError'].includes(error?.name)) {
      throw new ConsultantVoiceError(504, 'Voice transcription took too long. Please retry.');
    }
    throw new ConsultantVoiceError(502, 'Voice transcription failed. Please retry.');
  }

  const data = await providerJson(response);
  if (typeof data.transcript !== 'string' || !data.transcript.trim() ||
      data.transcript.length > 2000) {
    throw new ConsultantVoiceError(
      502,
      'No usable speech was found. Please try a shorter recording.',
    );
  }

  return { transcript: data.transcript.trim() };
}

export async function synthesizeSpeech(
  { text, language },
  { env = process.env, fetchImpl = fetch } = {},
) {
  requireLanguage(language);
  const key = requireApiKey(env);
  const spokenText = typeof text === 'string' ? text.trim() : '';
  if (!spokenText || spokenText.length > 2500) {
    throw new ConsultantVoiceError(400, 'Choose text of up to 2,500 characters to read aloud.');
  }

  let response;
  try {
    response = await fetchImpl('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: {
        'api-subscription-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'bulbul:v3',
        text: spokenText,
        language_code: language,
        speaker: language === 'te-IN' ? 'kavitha' : 'shubh',
      }),
    });
  } catch (error) {
    if (['TimeoutError', 'AbortError'].includes(error?.name)) {
      throw new ConsultantVoiceError(504, 'Read aloud took too long. Please retry.');
    }
    throw new ConsultantVoiceError(502, 'Read aloud failed. Please retry.');
  }

  const data = await providerJson(response);
  const audioBase64 = data.audios?.[0];
  if (typeof audioBase64 !== 'string' ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(audioBase64) ||
      !audioBase64.length ||
      Buffer.from(audioBase64, 'base64').toString('base64') !== audioBase64) {
    throw new ConsultantVoiceError(502, 'Voice service returned invalid audio. Please retry.');
  }

  return { audioBase64, mimeType: 'audio/wav' };
}
