import test from 'node:test';
import assert from 'node:assert/strict';
import { logSupabaseFailure } from '../server/supabase-error.js';

test('database diagnostics report missing columns without logging raw details', async () => {
  const calls = [];
  const original = console.error;
  console.error = (...args) => calls.push(args);
  try {
    await logSupabaseFailure('Lead database request failed', new Response(JSON.stringify({
      code: '42703',
      message: 'column consultant_leads.ai_call_consent does not exist',
      hint: 'private customer data',
    }), { status: 400 }));
  } finally {
    console.error = original;
  }
  assert.deepEqual(calls, [[
    'Lead database request failed',
    400,
    '42703',
    'Missing column consultant_leads.ai_call_consent',
  ]]);
});
