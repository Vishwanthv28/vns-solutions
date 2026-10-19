import test from 'node:test';
import assert from 'node:assert/strict';
import { createOwnerService } from '../server/owner-service.js';
import { followupState, localDateInput, replyDraft } from '../src/components/OwnerDashboard/pipeline.js';

const ownerId = '11111111-1111-4111-8111-111111111111';
const leadId = '22222222-2222-4222-8222-222222222222';
const user = { id: ownerId, email_confirmed_at: '2026-10-17' };
const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'test-public', SUPABASE_SERVICE_ROLE_KEY: 'test-secret', OWNER_USER_ID: ownerId };
const json = value => new Response(JSON.stringify(value), { status: 200 });

test('pipeline updates notes, priority and date without changing the brief or contact data', async () => {
  let written;
  const service = createOwnerService({ env, fetchImpl: async (url, options) => {
    if (url.endsWith('/user')) return json(user);
    written = JSON.parse(options.body);
    return json([{ id: leadId, status: 'new', ...written }]);
  } });
  const result = await service.update('token', { id: leadId, priority: 'high', owner_notes: '  Discuss menu structure.  ', next_followup_at: '2026-10-19T10:00:00.000Z' });
  assert.equal(written.owner_notes, 'Discuss menu structure.');
  assert.equal(written.priority, 'high');
  assert.equal(result.next_followup_at, '2026-10-19T10:00:00.000Z');
  assert.deepEqual(Object.keys(written).sort(), ['next_followup_at', 'owner_notes', 'priority', 'updated_at']);
});

test('pipeline rejects invalid field values and contact-data overposting', async () => {
  let databaseCalls = 0;
  const service = createOwnerService({ env, fetchImpl: async url => {
    if (url.endsWith('/user')) return json(user);
    databaseCalls++; return json([]);
  } });
  for (const fields of [{ owner_notes: 'x'.repeat(4001) }, { owner_notes: {} }, { priority: 'urgent' }, { next_followup_at: 'tomorrow' }, { next_followup_at: '1900-01-01T00:00:00Z' }, { brief: {} }, {}]) {
    await assert.rejects(service.update('token', { id: leadId, ...fields }), error => error.status === 400);
  }
  assert.equal(databaseCalls, 0);
});

test('pipeline can explicitly clear a follow-up date', async () => {
  const service = createOwnerService({ env, fetchImpl: async (url, options) => {
    if (url.endsWith('/user')) return json(user);
    const update = JSON.parse(options.body);
    assert.equal(update.next_followup_at, null);
    return json([{ id: leadId, ...update }]);
  } });
  assert.equal((await service.update('token', { id: leadId, next_followup_at: null })).next_followup_at, null);
});

test('search and due-follow-up filters apply in the database before pagination', async () => {
  const service = createOwnerService({ env, fetchImpl: async url => {
    if (url.endsWith('/user')) return json(user);
    const query = new URL(url).searchParams;
    assert.equal(query.get('priority'), 'eq.high');
    assert.match(query.get('next_followup_at'), /^lte\./);
    assert.equal(query.get('and'), '(status.neq.completed)');
    assert.equal(query.get('offset'), '25');
    assert.equal(query.get('or'), '(name.ilike."*owner@example.com*",email.ilike."*owner@example.com*")');
    return json([]);
  } });
  await service.list('token', { page: '2', search: 'owner@example.com', followup: 'due', priority: 'high' });
});

test('search rejects PostgREST control syntax and invalid follow-up filters', async () => {
  let databaseCalls = 0;
  const service = createOwnerService({ env, fetchImpl: async url => {
    if (url.endsWith('/user')) return json(user);
    databaseCalls++; return json([]);
  } });
  for (const filters of [{ search: 'x,or=(id.neq.0)' }, { search: '"*' }, { search: 'x'.repeat(81) }, { followup: 'injected' }, { priority: 'urgent' }]) {
    await assert.rejects(service.list('token', filters), error => error.status === 400);
  }
  assert.equal(databaseCalls, 0);
});

test('follow-up state excludes completed enquiries and handles unscheduled dates', () => {
  const now = Date.parse('2026-10-18T10:00:00Z');
  assert.equal(followupState({ status: 'new' }, now), 'unscheduled');
  assert.equal(followupState({ status: 'new', next_followup_at: '2026-10-17T10:00:00Z' }, now), 'due');
  assert.equal(followupState({ status: 'new', next_followup_at: '2026-10-19T10:00:00Z' }, now), 'upcoming');
  assert.equal(followupState({ status: 'completed', next_followup_at: '2026-10-17T10:00:00Z' }, now), 'completed');
  assert.equal(localDateInput(null), '');
  assert.equal(localDateInput('bad'), '');
  const value = '2026-10-18T10:00:00.000Z';
  assert.equal(new Date(localDateInput(value)).toISOString(), value);
});

test('reply drafts use saved services without inventing prices or sending messages', () => {
  const lead = { name: 'Asha', brief: { recommendedServices: [{ name: 'Conversion websites', reason: 'Relevant' }] } };
  const first = replyDraft(lead);
  assert.match(first, /^Hi Asha,/);
  assert.match(first, /conversion websites/);
  assert.match(first, /before proposing a scope, timeline and price/);
  assert.match(replyDraft(lead, 'followup'), /following up/);
  assert.ok(!first.includes('₹'));
});
