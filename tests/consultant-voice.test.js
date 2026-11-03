import test from 'node:test';
import assert from 'node:assert/strict';

import { createConsultantVoiceHandler } from '../api/consultant-voice.js';
import {
  ConsultantVoiceError,
  synthesizeSpeech,
  transcribeSpeech,
} from '../server/consultant-voice-provider.js';

const env = { SARVAM_API_KEY: 'test-sarvam-secret' };
const audioBase64 = Buffer.from('sample audio').toString('base64');

function response() {
  return {
    code: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
}

async function call(body, handlers, method = 'POST', headers = { host: 'localhost:5173' }) {
  const res = response();
  await createConsultantVoiceHandler(handlers)(
    { method, headers, body },
    res,
  );
  return res;
}

test('transcription sends the selected language and audio to Sarvam server-side', async () => {
  const result = await transcribeSpeech({
    audioBase64,
    mimeType: 'audio/webm;codecs=opus',
    language: 'te-IN',
  }, {
    env,
    fetchImpl: async (url, request) => {
      assert.equal(url, 'https://api.sarvam.ai/speech-to-text');
      assert.equal(request.headers['api-subscription-key'], env.SARVAM_API_KEY);
      assert.ok(request.signal);
      assert.equal(request.body.get('model'), 'saaras:v4');
      assert.equal(request.body.get('language_code'), 'te-IN');
      assert.equal(request.body.get('file').type, 'audio/webm');
      return new Response(JSON.stringify({ transcript: 'నా వ్యాపారం' }), { status: 200 });
    },
  });

  assert.deepEqual(result, { transcript: 'నా వ్యాపారం' });
});

test('transcription MIME types are normalized consistently with their upload filenames', async () => {
  for (const [mimeType, contentType, filename] of [
    ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'recording.m4a'],
    ['audio/ogg;codecs=opus', 'audio/ogg', 'recording.ogg'],
    ['audio/webm;codecs=opus', 'audio/webm', 'recording.webm'],
  ]) {
    await transcribeSpeech({
      audioBase64,
      mimeType,
      language: 'en-IN',
    }, {
      env,
      fetchImpl: async (url, request) => {
        assert.equal(url, 'https://api.sarvam.ai/speech-to-text');
        const file = request.body.get('file');
        assert.equal(file.type, contentType);
        assert.equal(file.name, filename);
        return new Response(JSON.stringify({ transcript: 'Restaurant' }), { status: 200 });
      },
    });
  }
});

test('empty provider transcripts have a distinct error code from service failures', async () => {
  await assert.rejects(
    transcribeSpeech({
      audioBase64,
      mimeType: 'audio/mp4',
      language: 'en-IN',
    }, {
      env,
      fetchImpl: async () => new Response(JSON.stringify({ transcript: '' }), { status: 200 }),
    }),
    error => error instanceof ConsultantVoiceError &&
      error.code === 'EMPTY_TRANSCRIPT' &&
      error.message.includes('Check your microphone'),
  );
});

test('provider rate limits and timeouts preserve their distinct failure codes', async () => {
  for (const [status, code] of [[429, 'PROVIDER_RATE_LIMITED'], [504, 'PROVIDER_UNAVAILABLE']]) {
    await assert.rejects(
      transcribeSpeech({
        audioBase64,
        mimeType: 'audio/webm',
        language: 'en-IN',
      }, {
        env,
        fetchImpl: async () => new Response('{}', { status }),
      }),
      error => error instanceof ConsultantVoiceError && error.code === code,
    );
  }
});

test('voice API exposes stable provider error codes without provider details', async () => {
  const result = await call({
    action: 'transcribe',
    language: 'en-IN',
    audioBase64,
    mimeType: 'audio/mp4',
  }, {
    transcribe: async () => {
      throw new ConsultantVoiceError(
        429,
        'Voice service is busy. Please wait a moment and retry.',
        'PROVIDER_RATE_LIMITED',
      );
    },
  });

  assert.equal(result.code, 429);
  assert.deepEqual(result.data, {
    message: 'Voice service is busy. Please wait a moment and retry.',
    code: 'PROVIDER_RATE_LIMITED',
  });
});

test('speech synthesis uses the selected language and returns only audio data', async () => {
  const audio = Buffer.from('wav audio').toString('base64');
  const result = await synthesizeSpeech({
    text: 'ನಮಸ್ಕಾರ',
    language: 'te-IN',
  }, {
    env,
    fetchImpl: async (url, request) => {
      assert.equal(url, 'https://api.sarvam.ai/text-to-speech');
      assert.equal(request.headers['api-subscription-key'], env.SARVAM_API_KEY);
      const body = JSON.parse(request.body);
      assert.equal(body.language_code, 'te-IN');
      assert.equal(body.model, 'bulbul:v3');
      assert.equal(body.speaker, 'kavitha');
      return new Response(JSON.stringify({ audios: [audio] }), { status: 200 });
    },
  });

  assert.deepEqual(result, { audioBase64: audio, mimeType: 'audio/wav' });
});

test('voice providers reject missing configuration and invalid inputs before network calls', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    throw new Error('unexpected request');
  };

  await assert.rejects(
    transcribeSpeech({ audioBase64, mimeType: 'audio/webm', language: 'en-IN' }, { env: {}, fetchImpl }),
    error => error instanceof ConsultantVoiceError && error.status === 503,
  );
  await assert.rejects(
    transcribeSpeech({ audioBase64: 'not base64', mimeType: 'audio/webm', language: 'en-IN' }, { env, fetchImpl }),
    error => error instanceof ConsultantVoiceError && error.status === 400,
  );
  await assert.rejects(
    synthesizeSpeech({ text: 'Hello', language: 'fr-FR' }, { env, fetchImpl }),
    error => error instanceof ConsultantVoiceError && error.status === 400,
  );
  assert.equal(calls, 0);
});

test('voice API validates origin and method and does not expose provider failures', async () => {
  const handlers = {
    transcribe: async () => { throw new Error(env.SARVAM_API_KEY); },
  };
  const getResult = await call({}, handlers, 'GET');
  assert.equal(getResult.code, 405);
  assert.equal(getResult.headers.Allow, 'POST');

  const foreignOrigin = await call(
    { action: 'transcribe', language: 'en-IN' },
    handlers,
    'POST',
    { host: 'localhost:5173', origin: 'https://other.example' },
  );
  assert.equal(foreignOrigin.code, 403);

  const failed = await call(
    { action: 'transcribe', language: 'en-IN', audioBase64, mimeType: 'audio/webm' },
    handlers,
  );
  assert.equal(failed.code, 502);
  assert.equal(failed.data.code, 'VOICE_REQUEST_FAILED');
  assert.ok(!JSON.stringify(failed.data).includes(env.SARVAM_API_KEY));
  assert.equal(failed.headers['Cache-Control'], 'no-store');
});

test('voice API rejects malformed, unsupported, and oversized requests', async () => {
  const handlers = {
    transcribe: async () => assert.fail('transcriber called'),
    speak: async () => assert.fail('synthesizer called'),
  };

  assert.equal((await call('{broken', handlers)).code, 400);
  assert.equal((await call({ action: 'invalid', language: 'en-IN' }, handlers)).code, 400);
  assert.equal((await call({ action: 'speak', language: 'fr-FR' }, handlers)).code, 400);
  const oversized = await call(' '.repeat(3_000_001), handlers);
  assert.equal(oversized.code, 413);
});

test('voice API preserves successful transcripts and synthesized audio', async () => {
  const handlers = {
    transcribe: async input => ({ transcript: `heard ${input.language}` }),
    speak: async input => ({ audioBase64: audioBase64, mimeType: 'audio/wav', language: input.language }),
  };
  const transcript = await call({
    action: 'transcribe',
    language: 'hi-IN',
    audioBase64,
    mimeType: 'audio/webm',
  }, handlers);
  assert.equal(transcript.code, 200);
  assert.deepEqual(transcript.data, { ok: true, transcript: 'heard hi-IN' });

  const spoken = await call({ action: 'speak', language: 'en-IN', text: 'Hello' }, handlers);
  assert.equal(spoken.code, 200);
  assert.deepEqual(spoken.data, {
    ok: true,
    audioBase64,
    mimeType: 'audio/wav',
    language: 'en-IN',
  });
});
