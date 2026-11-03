import test from 'node:test';
import assert from 'node:assert/strict';

import { consultantQuestions } from '../src/components/AIConsultant/consultantQuestions.js';
import {
  classifyTimelineClarification,
  classifyVoiceAnswer,
  createVoiceTurnGuard,
  transcribeVoiceRecording,
} from '../src/components/AIConsultant/voiceAnswer.js';

const timeline = consultantQuestions.find(question => question.id === 'timeline');

test('timeline parser accepts natural English ranges and common variations', () => {
  for (const phrase of [
    'Within one to two months',
    'one to two months',
    '1–2 months',
    '1-2 months',
    'a month or two',
    'in two months',
    'a couple of months',
  ]) {
    assert.deepEqual(classifyVoiceAnswer(timeline, phrase, 'en-IN'), {
      status: 'matched',
      value: 'Within 1–2 months',
    }, phrase);
  }
  for (const phrase of ['within 3 to 6 months', '3–6 months', 'in five months']) {
    assert.deepEqual(classifyVoiceAnswer(timeline, phrase, 'en-IN'), {
      status: 'matched',
      value: 'Within 3–6 months',
    }, phrase);
  }
});

test('timeline parser preserves ambiguity instead of turning twelve months into one to two', () => {
  for (const phrase of ['within 12 months', 'twelve months', '12 months']) {
    assert.deepEqual(classifyVoiceAnswer(timeline, phrase, 'en-IN'), { status: 'ambiguous' }, phrase);
  }
  assert.deepEqual(
    classifyTimelineClarification(timeline, 'No, I meant two months', 'en-IN'),
    { status: 'matched', value: 'Within 1–2 months' },
  );
  assert.deepEqual(
    classifyTimelineClarification(timeline, 'No, I meant twelve months', 'en-IN'),
    { status: 'unsupported-twelve' },
  );
  for (const [phrase, language] of [
    ['१२ महीने', 'hi-IN'],
    ['పన్నెండు నెలలు', 'te-IN'],
    ['12 నెలలు', 'te-IN'],
  ]) {
    assert.deepEqual(classifyVoiceAnswer(timeline, phrase, language), { status: 'ambiguous' });
    assert.deepEqual(classifyTimelineClarification(timeline, phrase, language), { status: 'unsupported-twelve' });
  }
});

test('timeline parser accepts Hindi, Telugu and mixed-language answers', () => {
  for (const [phrase, language, expected] of [
    ['एक से दो महीने', 'hi-IN', 'Within 1–2 months'],
    ['एक महीने या दो', 'hi-IN', 'Within 1–2 months'],
    ['1 से 2 महीने', 'hi-IN', 'Within 1–2 months'],
    ['1 से 2 हीने', 'hi-IN', 'Within 1–2 months'],
    ['మూడు నెలల్లో', 'te-IN', 'Within 3–6 months'],
    ['ఒకటి నుండి రెండు నెలలు', 'te-IN', 'Within 1–2 months'],
    ['within రెండు నెలలు', 'te-IN', 'Within 1–2 months'],
    ['जल्दी शुरू करना है', 'hi-IN', 'As soon as practical'],
  ]) {
    assert.deepEqual(classifyVoiceAnswer(timeline, phrase, language), {
      status: 'matched',
      value: expected,
    }, phrase);
  }
});

test('natural option answers map to the existing canonical backend values', () => {
  const goal = consultantQuestions.find(question => question.id === 'mainGoal');
  assert.deepEqual(classifyVoiceAnswer(goal, 'we need more leads please', 'en-IN'), {
    status: 'matched',
    value: 'More enquiries',
  });
  const languageMix = classifyVoiceAnswer(goal, 'మరిన్ని bookings', 'te-IN');
  assert.deepEqual(languageMix, { status: 'matched', value: 'More bookings' });
});

test('turn guard drops duplicate overlapping transcript handling and releases after completion', () => {
  const guard = createVoiceTurnGuard();
  assert.equal(guard.begin(), true);
  assert.equal(guard.begin(), false);
  guard.end();
  assert.equal(guard.begin(), true);
  guard.end();
});

test('failed Sarvam transcription can retry the retained recording without losing its audio', async () => {
  const recording = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm;codecs=opus' });
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls += 1;
    assert.equal(url, '/api/consultant-voice');
    const request = JSON.parse(options.body);
    assert.equal(request.action, 'transcribe');
    assert.equal(request.language, 'te-IN');
    assert.equal(request.mimeType, 'audio/webm;codecs=opus');
    assert.deepEqual([...Buffer.from(request.audioBase64, 'base64')], [1, 2, 3, 4]);
    if (calls === 1) throw new TypeError('network unavailable');
    return new Response(JSON.stringify({ ok: true, transcript: 'రెండు నెలలు' }), { status: 200 });
  };

  await assert.rejects(transcribeVoiceRecording(recording, 'te-IN', fetchImpl), /could not connect/);
  assert.equal(await transcribeVoiceRecording(recording, 'te-IN', fetchImpl), 'రెండు నెలలు');
  assert.equal(calls, 2);
});

test('provider errors produce a retryable transcription failure', async () => {
  const recording = new Blob([new Uint8Array([5, 6])], { type: 'audio/webm' });
  await assert.rejects(
    transcribeVoiceRecording(recording, 'en-IN', async () => new Response(
      JSON.stringify({
        ok: false,
        code: 'PROVIDER_RATE_LIMITED',
        message: 'Voice service is busy. Please wait a moment and retry.',
      }),
      { status: 429 },
    )),
    /Voice service is busy/,
  );
});
