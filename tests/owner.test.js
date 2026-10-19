import test from 'node:test';
import assert from 'node:assert/strict';
import { createOwnerService, OwnerError } from '../server/owner-service.js';
import { createOwnerHandler } from '../api/owner.js';

const ownerId = '11111111-1111-4111-8111-111111111111';
const leadId = '22222222-2222-4222-8222-222222222222';
const env = { SUPABASE_URL: 'https://unit.supabase.co', SUPABASE_ANON_KEY: 'test-public', SUPABASE_SERVICE_ROLE_KEY: 'test-server-secret', OWNER_USER_ID: ownerId };
const user = { id: ownerId, email: 'owner@example.com', email_confirmed_at: '2026-10-17T00:00:00Z' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

test('owner verification rejects missing or forged sessions before database access', async () => {
  let calls = 0;
  const service = createOwnerService({ env, fetchImpl: async () => { calls++; return json({}, 401); } });
  await assert.rejects(service.list('', {}), error => error.status === 401);
  assert.equal(calls, 0);
  await assert.rejects(service.list('forged', {}), error => error.status === 401);
  assert.equal(calls, 1);
});

test('valid Supabase users without owner ID and unconfirmed owners cannot access leads', async () => {
  for (const candidate of [{ ...user, id: leadId }, { ...user, email_confirmed_at: null }]) {
    const paths = [];
    const service = createOwnerService({ env, fetchImpl: async url => { paths.push(url); return json(candidate); } });
    await assert.rejects(service.list('token', {}), error => error.status === 403);
    assert.equal(paths.length, 1);
    assert.match(paths[0], /\/auth\/v1\/user$/);
  }
});

test('login verifies owner identity against Auth and does not use server key in password request', async () => {
  const paths = [];
  const service = createOwnerService({ env, fetchImpl: async (url, options) => {
    paths.push(url);
    assert.equal(options.headers.apikey, env.SUPABASE_ANON_KEY);
    if (url.includes('/token?')) return json({ access_token: 'session-token', expires_in: 7200 });
    assert.equal(options.headers.Authorization, 'Bearer session-token');
    return json(user);
  } });
  const session = await service.login({ email: 'owner@example.com', password: 'test-password' });
  assert.equal(session.expires, 3600);
  assert.equal(session.user.id, ownerId);
  assert.equal(paths.length, 2);
});

test('owner list authenticates first, applies pagination and excludes internal payload hash', async () => {
  const paths = [];
  const service = createOwnerService({ env, fetchImpl: async (url, options) => {
    paths.push(url);
    if (url.endsWith('/user')) return json(user);
    const query = new URL(url).searchParams;
    assert.equal(query.get('status'), 'eq.contacted');
    assert.equal(query.get('offset'), '25');
    assert.equal(query.get('limit'), '26');
    assert.ok(!query.get('select').includes('payload_hash'));
    assert.equal(options.headers.apikey, env.SUPABASE_SERVICE_ROLE_KEY);
    return json(Array.from({ length: 26 }, (_, i) => ({ id: i })));
  } });
  const result = await service.list('token', { page: '2', status: 'contacted' });
  assert.equal(result.leads.length, 25);
  assert.equal(result.hasMore, true);
  assert.match(paths[0], /\/user$/);
});

test('owner cannot change arbitrary columns or inject a status filter', async () => {
  let databaseCalls = 0;
  const service = createOwnerService({ env, fetchImpl: async url => {
    if (url.endsWith('/user')) return json(user);
    databaseCalls++; return json([]);
  } });
  for (const body of [{ id: leadId, status: 'new', email: 'attacker@example.com' }, { id: 'bad', status: 'new' }, { id: leadId, status: 'invented' }]) {
    await assert.rejects(service.update('token', body), error => error.status === 400);
  }
  await assert.rejects(service.list('token', { status: 'new,or=(id.neq.0)' }), error => error.status === 400);
  assert.equal(databaseCalls, 0);
});

test('status update writes only status and timestamp to selected lead', async () => {
  const service = createOwnerService({ env, fetchImpl: async (url, options) => {
    if (url.endsWith('/user')) return json(user);
    assert.equal(new URL(url).searchParams.get('id'), `eq.${leadId}`);
    assert.equal(options.method, 'PATCH');
    const body = JSON.parse(options.body);
    assert.deepEqual(Object.keys(body).sort(), ['status', 'updated_at']);
    assert.equal(body.status, 'contacted');
    return json([{ id: leadId, ...body }]);
  } });
  assert.equal((await service.update('token', { id: leadId, status: 'contacted' })).status, 'contacted');
});

test('missing owner configuration and network errors fail closed without exposing secrets', async () => {
  await assert.rejects(createOwnerService({ env: {} }).verify('token'), error => error.status === 503);
  const service = createOwnerService({ env, fetchImpl: async () => { throw new Error(env.SUPABASE_SERVICE_ROLE_KEY); } });
  await assert.rejects(service.verify('token'), error => error.status === 502 && !error.message.includes(env.SUPABASE_SERVICE_ROLE_KEY));
});

async function call(action, { method = 'GET', body, headers = {}, service = {}, secure = true } = {}) {
  const res = { code: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await createOwnerHandler(service, { secure })({ url: `/api/owner?action=${action}`, method, body, headers: { host: 'vns.example', origin: 'https://vns.example', 'content-type': 'application/json', ...headers } }, res);
  return res;
}

test('owner login uses HttpOnly secure cookie and never returns tokens in JSON', async () => {
  const result = await call('login', { method: 'POST', body: { email: user.email, password: 'test-only' }, service: { login: async () => ({ token: 'test-session', expires: 3600, user }) } });
  assert.equal(result.code, 200);
  assert.match(result.headers['Set-Cookie'], /^__Secure-vns_owner=test-session;/);
  for (const flag of ['HttpOnly', 'SameSite=Strict', 'Secure', 'Path=/api/owner', 'Max-Age=3600']) assert.ok(result.headers['Set-Cookie'].includes(flag));
  assert.ok(!JSON.stringify(result.data).includes('test-session'));
  assert.match(result.headers['Cache-Control'], /no-store/);
});

test('rejects cross-site or missing-origin writes, wrong methods, malformed and oversized JSON', async () => {
  let calls = 0;
  const service = { login: async () => { calls++; } };
  assert.equal((await call('login', { service })).code, 405);
  for (const origin of ['https://evil.example', undefined]) {
    assert.equal((await call('login', { method: 'POST', body: {}, headers: { origin }, service })).code, 403);
  }
  assert.equal((await call('login', { method: 'POST', body: '{broken', service })).code, 400);
  assert.equal((await call('login', { method: 'POST', body: 'x'.repeat(20001), service })).code, 413);
  assert.equal((await call('login', { method: 'POST', body: {}, headers: { 'content-type': 'text/plain' }, service })).code, 415);
  assert.equal(calls, 0);
});

test('signed-out requests return 401 without leads and logout clears cookie even if Auth is unavailable', async () => {
  const result = await call('leads', { service: { list: async () => { throw new OwnerError(401, 'Sign in.'); } } });
  assert.equal(result.code, 401);
  assert.equal(result.data.leads, undefined);
  assert.match(result.headers['Set-Cookie'], /Max-Age=0/);
  const logout = await call('logout', { method: 'POST', body: {}, service: { logout: async () => { throw new Error('network'); } } });
  assert.equal(logout.code, 200);
  assert.match(logout.headers['Set-Cookie'], /Max-Age=0/);
});

test('owner session reads only the session cookie and returns verified account', async () => {
  const result = await call('session', { headers: { cookie: 'unrelated=value; __Secure-vns_owner=verified-token' }, service: { verify: async token => { assert.equal(token, 'verified-token'); return user; } } });
  assert.equal(result.code, 200);
  assert.deepEqual(result.data.user, user);
});
