import test from 'node:test';
import assert from 'node:assert/strict';

import { createConsultantHandler } from '../api/consultant.js';
import {
  generateBrief,
  ConsultantError,
} from '../server/consultant-provider.js';
import { validateAnswers } from '../server/consultant-validation.js';

const answers = {
  businessType: ' restaurant ',
  websiteStatus: 'I do not have a website',
  mainGoal: 'More bookings',
  customers: 'Local families',
  capabilities: [
    'New business website',
    'Enquiry or booking flow',
  ],
  timeline: 'Within 1–2 months',
  notes: '',
};

const brief = {
  businessType: 'restaurant',
  summary:
    'Create a website for local families to explore the menu and request a table.',
  goals: ['Increase booking enquiries'],
  recommendedServices: [
    {
      name: 'Conversion websites',
      reason: 'Show the menu and simplify booking enquiries.',
    },
  ],
  suggestedFeatures: ['Menu page', 'Booking enquiry form'],
  nextSteps: ['Confirm menu and booking workflow'],
};

const env = {
  GEMINI_API_KEY: 'test-only-secret',
  CONSULTANT_MODEL: 'test-model',
};

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

async function call(
  body,
  generate,
  method = 'POST',
  headers = { host: 'localhost:5173' },
) {
  const res = response();

  await createConsultantHandler(generate)(
    { method, headers, body },
    res,
  );

  return res;
}

function googleResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('restaurant API success trims answers and returns structured brief', async () => {
  const res = await call({ answers }, async data => {
    assert.equal(data.businessType, 'restaurant');
    return brief;
  });

  assert.equal(res.code, 200);
  assert.deepEqual(res.data.brief, brief);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('rejects whitespace, tampered options, oversized text, duplicate capabilities', async () => {
  const invalidAnswers = [
    { businessType: '   ' },
    { mainGoal: 'invented' },
    { customers: 'x'.repeat(501) },
    {
      capabilities: [
        'New business website',
        'New business website',
      ],
    },
    { notes: 123 },
  ];

  for (const invalid of invalidAnswers) {
    let calls = 0;

    const res = await call(
      { answers: { ...answers, ...invalid } },
      async () => {
        calls++;
        return brief;
      },
    );

    assert.equal(res.code, 400);
    assert.equal(calls, 0);
  }
});

test('optional notes may be omitted', () => {
  const { notes, ...rest } = answers;
  assert.deepEqual(validateAnswers(rest).errors, {});
});

test('rejects invalid JSON, absent object, oversized bodies', async () => {
  assert.equal((await call('{broken')).code, 400);
  assert.equal((await call(null)).code, 400);
  assert.equal((await call(' '.repeat(16001))).code, 413);
});

test('rejects GET and foreign origin', async () => {
  const getResult = await call({}, undefined, 'GET');

  assert.equal(getResult.code, 405);
  assert.equal(getResult.headers.Allow, 'POST');

  const foreignResult = await call(
    { answers },
    undefined,
    'POST',
    {
      host: 'localhost:5173',
      origin: 'https://other.example',
    },
  );

  assert.equal(foreignResult.code, 403);
});

test('handler safely maps provider failure', async () => {
  const res = await call({ answers }, async () => {
    throw new ConsultantError(504, 'AI took too long.');
  });

  assert.equal(res.code, 504);
  assert.equal(res.data.message, 'AI took too long.');
});

test('missing provider configuration fails without network call', async () => {
  await assert.rejects(
    generateBrief(answers, {
      env: {},
      fetchImpl: async () => {
        throw new Error('must not call');
      },
    }),
    error =>
      error instanceof ConsultantError &&
      error.status === 503,
  );
});

test('Gemini adapter uses server key, schema, and validates output', async () => {
  const result = await generateBrief(answers, {
    env,
    fetchImpl: async (url, request) => {
      assert.match(url, /test-model:generateContent$/);
      assert.equal(
        request.headers['x-goog-api-key'],
        env.GEMINI_API_KEY,
      );

      const body = JSON.parse(request.body);

      assert.equal(
        body.generationConfig.responseMimeType,
        'application/json',
      );
      assert.ok(body.generationConfig.responseJsonSchema);
      assert.equal(
        body.generationConfig.responseFormat,
        undefined,
      );
      assert.ok(request.signal);

      return googleResponse({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [{ text: JSON.stringify(brief) }],
            },
          },
        ],
      });
    },
  });

  assert.deepEqual(result, brief);
});

test('provider busy response maps to retryable error without secrets', async () => {
  await assert.rejects(
    generateBrief(answers, {
      env,
      fetchImpl: async () =>
        googleResponse(
          {
            error: {
              code: 429,
              status: 'RESOURCE_EXHAUSTED',
              message: 'Rate limit exceeded.',
            },
          },
          429,
        ),
    }),
    error =>
      error instanceof ConsultantError &&
      error.status === 429 &&
      !error.message.includes(env.GEMINI_API_KEY),
  );
});

test('network failure maps to safe error', async () => {
  await assert.rejects(
    generateBrief(answers, {
      env,
      fetchImpl: async () => {
        throw new Error(env.GEMINI_API_KEY);
      },
    }),
    error =>
      error instanceof ConsultantError &&
      error.status === 502 &&
      !error.message.includes(env.GEMINI_API_KEY),
  );
});

test('provider timeout maps to 504', async () => {
  await assert.rejects(
    generateBrief(answers, {
      env,
      fetchImpl: async () => {
        const error = new Error('Request timed out');
        error.name = 'TimeoutError';
        throw error;
      },
    }),
    error =>
      error instanceof ConsultantError &&
      error.status === 504,
  );
});

test('rejects malformed, truncated, and unsupported service output', async () => {
  const candidates = [
    {
      content: {
        parts: [{ text: 'not JSON' }],
      },
    },
    {
      finishReason: 'MAX_TOKENS',
      content: {
        parts: [{ text: JSON.stringify(brief) }],
      },
    },
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              ...brief,
              recommendedServices: [
                {
                  name: 'Invented service',
                  reason: 'unsupported',
                },
              ],
            }),
          },
        ],
      },
    },
  ];

  for (const candidate of candidates) {
    await assert.rejects(
      generateBrief(answers, {
        env,
        fetchImpl: async () =>
          googleResponse({ candidates: [candidate] }),
      }),
      error =>
        error instanceof ConsultantError &&
        error.status === 502,
    );
  }
});