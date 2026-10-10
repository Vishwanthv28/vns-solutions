import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLead } from '../server/lead-validation.js';
import { saveAndNotifyLead } from '../server/lead-provider.js';
import { createLeadHandler } from '../api/consultant-lead.js';
const body = { submissionId: 'b8bc5927-4a98-4f77-b310-22d815d77976', name: ' Demo Visitor ', email: 'demo@example.com', phone: '', consent: true, answers: { businessType: 'restaurant', websiteStatus: 'I do not have a website', mainGoal: 'More bookings', customers: 'Local families', capabilities: ['New business website'], timeline: 'Within 1–2 months', notes: '' }, brief: { businessType: 'restaurant', summary: 'Build a restaurant website.', goals: ['More bookings'], recommendedServices: [{ name: 'Conversion websites', reason: 'Show menus.' }], suggestedFeatures: ['Menu'], nextSteps: ['Discuss scope'] } };
const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-db-secret', RESEND_API_KEY: 'test-mail-secret', LEAD_EMAIL_FROM: 'VNS <onboarding@resend.dev>', LEAD_EMAIL_TO: 'owner@example.com' };
function network() {
  let row; const emails = [], inserts = [];
  const state = { mailFail: false, dbFail: false, emails, inserts };
  state.fetch = async (url, req) => {
    if (url.startsWith('https://api.resend.com')) {
      if (state.mailFail) return { ok: false, status: 403 };
      emails.push({ body: JSON.parse(req.body), headers: req.headers }); return { ok: true };
    }
    assert.equal(req.headers.apikey, env.SUPABASE_SERVICE_ROLE_KEY);
    assert.ok(req.signal);
    if (state.dbFail) return { ok: false, status: 500 };
    if (req.method === 'POST') { const incoming = JSON.parse(req.body); if (!row) { row = { ...incoming, notification_sent: false }; inserts.push(row); } }
    if (req.method === 'PATCH') row.notification_sent = true;
    return { ok: true, json: async () => row ? [row] : [] };
  }; return state;
}
function response() { return { code: 200, headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(v) { this.code=v; return this; }, json(v) { this.data=v; } }; }
async function call(input, submit, extra = {}) { const res=response(); await createLeadHandler(submit,{ limit: false })({method:'POST',headers:{host:'localhost:5173',origin:'http://localhost:5173'},body:input,...extra},res); return res; }
test('optional phone accepted and unknown fields removed', () => { const lead=validateLead({...body, unexpected:'discard'}); assert.equal(lead.phone,''); assert.equal(lead.name,'Demo Visitor'); assert.equal(lead.unexpected,undefined); });
test('rejects contact header injection, missing consent, malformed phone and UUID', () => { for (const change of [{name:'x\r\nBcc: bad'},{email:'bad'},{consent:false},{phone:'123'},{submissionId:'not-a-uuid'}]) assert.throws(()=>validateLead({...body,...change})); });
test('rejects tampered questionnaire and unsupported brief services', () => { assert.throws(()=>validateLead({...body,answers:{...body.answers,mainGoal:'invented'}})); assert.throws(()=>validateLead({...body,brief:{...body.brief,recommendedServices:[{name:'invented',reason:'bad'}]}})); });
test('success saves lead before notification and avoids repeated emails on retry', async () => { const n=network(); const lead=validateLead(body); assert.equal((await saveAndNotifyLead(lead,{env,fetchImpl:n.fetch})).ok,true); await saveAndNotifyLead(lead,{env,fetchImpl:n.fetch}); assert.equal(n.inserts.length,1); assert.equal(n.emails.length,1); assert.equal(n.emails[0].body.reply_to,body.email); assert.match(n.emails[0].body.text,/Build a restaurant website/); assert.match(n.emails[0].headers['Idempotency-Key'],/consultant-lead/); });
test('email failure preserves saved lead and retry does not duplicate row', async () => { const n=network();n.mailFail=true;const lead=validateLead(body); await assert.rejects(saveAndNotifyLead(lead,{env,fetchImpl:n.fetch}),e=>e.status===502); assert.equal(n.inserts.length,1); n.mailFail=false; await saveAndNotifyLead(lead,{env,fetchImpl:n.fetch}); assert.equal(n.inserts.length,1); assert.equal(n.emails.length,1); });
test('database failure prevents notification', async () => { const n=network();n.dbFail=true; await assert.rejects(saveAndNotifyLead(validateLead(body),{env,fetchImpl:n.fetch}),e=>e.status===502);assert.equal(n.emails.length,0); });
test('same id with changed payload cannot overwrite previous lead', async () => { const n=network(); await saveAndNotifyLead(validateLead(body),{env,fetchImpl:n.fetch}); await assert.rejects(saveAndNotifyLead(validateLead({...body,name:'Another person'}),{env,fetchImpl:n.fetch}),e=>e.status===409);assert.equal(n.emails.length,1); });
test('unconfigured submission never calls providers', async () => { await assert.rejects(saveAndNotifyLead(validateLead(body),{env:{},fetchImpl:()=>assert.fail('network called')}),e=>e.status===503); });
test('API rejects foreign origins, invalid JSON, honeypot, GET and oversized requests', async () => { const submit=()=>assert.fail('submit called'); assert.equal((await call(body,submit,{headers:{host:'localhost:5173',origin:'https://other.example'}})).code,403);assert.equal((await call('{broken',submit)).code,400); assert.equal((await call({...body,website:'bot'},submit)).code,400);assert.equal((await call(body,submit,{method:'GET'})).code,405);assert.equal((await call(' '.repeat(65001),submit)).code,413); });
test('API success returns reference and provider errors omit raw secrets', async () => { const ok=await call(body,async lead=>({ok:true,reference:lead.id}));assert.equal(ok.data.reference,body.submissionId);assert.equal(ok.headers['Cache-Control'],'no-store');const fail=await call(body,async()=>{throw new Error('private-key');}); assert.equal(fail.code,502);assert.ok(!fail.data.message.includes('private-key')); });
