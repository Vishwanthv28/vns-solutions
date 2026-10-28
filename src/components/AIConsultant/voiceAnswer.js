import { answerError } from '../../../server/consultant-validation.js';
import { localizedOption } from './consultantCopy.js';

function normalize(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[०-९]/g, digit => String('०१२३४५६७८९'.indexOf(digit)))
    .replace(/[౦-౯]/g, digit => String('౦౧౨౩౪౫౬౭౮౯'.indexOf(digit)))
    .replace(/[–—−]/g, '-')
    .replace(/[.,!?।;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function phraseIncludes(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, 'i').test(text);
}

const timelinePatterns = {
  'Within 1–2 months': [
    /(?:^|\s)(?:1|one|a)\s*(?:-|to|through|or)\s*(?:2|two)(?:\s|$|months?)/,
    /(?:^|\s)(?:1|one)\s+(?:2|two)\s+months?(?:\s|$)/,
    /\b(?:a|one)\s+month\s+or\s+(?:2|two)\b/,
    /\b(?:(?:within|in|after|next)\s+)?(?:a\s+)?(?:month\s+or\s+two|two\s+months?|2\s+months?|couple(?:\s+of)?\s+months?)\b/,
    /(?:एक\s*(?:से|या|-)\s*दो|एक\s+महीने\s+या\s+दो|दो)\s*महीने?/,
    /(?:^|\s)(?:1|एक)\s*(?:से|या|-)\s*(?:2|दो)(?:\s*(?:महीने?|महीनों?|महीनो|हीने?))?(?:\s|$)/,
    /एक\s+महीने\s+या\s+दो$/,
    /(?:ఒకటి?\s*(?:నుంచి|నుండి|వరకు|-)\s*రెండు|ఒక\s+నెల\s+లేదా\s+రెండు|రెండు)\s*నెల/,
    /(?:within|in)\s+రెండు\s+నెల/,
    /(?:one|1)\s+month\s+or\s+(?:two|2)/,
    /\b(?:ek\s+se\s+do|ek\s+ya\s+do|ek-do|do\s+mahine|rendu\s+nelalu)\b/,
  ],
  'Within 3–6 months': [
    /(?:^|\s)(?:3|three)\s*(?:-|to|through)\s*(?:6|six)(?:\s|$|months?)/,
    /(?:^|\s)(?:3|three|4|four|5|five|6|six|तीन|चार|पांच|पाँच|छह)\s+months?(?:\s|$)/,
    /\b(?:within|in|after)\s+(?:3|three|4|four|5|five|6|six)\s+months?\b/,
    /(?:तीन|चार|पांच|पाँच|छह|६)\s*(?:से|-)\s*(?:छह|६)\s*महीने?/,
    /(?:महीने में|अगले)\s*(?:तीन|चार|पांच|पाँच|छह|६)\s*महीने?/,
    /(?:మూడు|నాలుగు|ఐదు|ఆరు)\s*(?:నుంచి|నుండి|-)\s*(?:మూడు|నాలుగు|ఐదు|ఆరు)?\s*నెల/,
    /(?:మూడు|నాలుగు|ఐదు|ఆరు)\s*నెల/,
    /\b(?:teen\s+se\s+chhah|3\s+se\s+6\s+mahine|moodu\s+(?:nunchi\s+)?aaru\s+nelalu|moodu\s+nelalu)\b/,
  ],
  'As soon as practical': [
    /\b(?:as soon as (?:possible|practical)|right away|immediately|soon|asap|jaldi|tvaraga)\b/,
  ],
  'I am only exploring': [
    /\b(?:only exploring|just exploring|exploring|not sure yet|still deciding|ఇంకా పరిశీలిస్తున్నాను|ఇప్పుడే ఆలోచిస్తున్నాను|अभी सिर्फ देख रहा|अभी केवल देख रहा|अभी तय नहीं)\b/,
  ],
};

function classifyTimeline(text) {
  if (timelinePatterns['Within 1–2 months'].some(pattern => pattern.test(text))) {
    return { status: 'matched', value: 'Within 1–2 months' };
  }
  if (timelinePatterns['Within 3–6 months'].some(pattern => pattern.test(text))) {
    return { status: 'matched', value: 'Within 3–6 months' };
  }
  if (timelinePatterns['As soon as practical'].some(pattern => pattern.test(text)) ||
      ['త్వరగా', 'వీలైనంత త్వరగా', 'जल्दी', 'जितनी जल्दी हो सके'].some(phrase => text.includes(phrase))) {
    return { status: 'matched', value: 'As soon as practical' };
  }
  if (timelinePatterns['I am only exploring'].some(pattern => pattern.test(text)) ||
      ['ఇంకా పరిశీలిస్తున్నాను', 'ఇప్పుడే ఆలోచిస్తున్నాను', 'अभी सिर्फ देख रहा', 'अभी केवल देख रहा', 'अभी तय नहीं'].some(phrase => text.includes(phrase))) {
    return { status: 'matched', value: 'I am only exploring' };
  }
  if (/\b(?:12|twelve|twelv)\s*months?\b|\b12\s*(?:महीने|महीना|महीनों)|\b12\s*నెల(?:లు|లో|కు)?|\bmonths?\s*(?:12|twelve)\b|बारह\s+महीने|పన్నెండు\s+నెల|\bpannendu\s+nelalu\b/.test(text)) {
    return { status: 'ambiguous' };
  }
  return { status: 'unmatched' };
}

const optionAliases = {
  'I do not have a website': ['no website', "don't have a website", 'need a website', 'నా వెబ్‌సైట్ లేదు', 'मेरी वेबसाइट नहीं'],
  'I have one, but it needs improvement': ['my website needs work', 'website needs improvement', 'वेबसाइट में सुधार', 'వెబ్‌సైట్ మెరుగుపరచాలి'],
  'My website works well': ['website is fine', 'website works', 'वेबसाइट ठीक है', 'వెబ్‌సైట్ బాగుంది'],
  'More enquiries': ['more leads', 'more inquiries', 'అధిక విచారణలు', 'ज्यादा पूछताछ'],
  'More bookings': ['more appointments', 'అధిక బుకింగ్స్', 'మరిన్ని bookings', 'జ्यादा बुकिंग'],
  'More orders or sales': ['more sales', 'more orders', 'అమ్మకాలు', 'ज्यादा बिक्री'],
  'Better customer support': ['support customers better', 'customer service', 'మంచి కస్టమర్ సపోర్ట్', 'बेहतर ग्राहक सहायता'],
  'Less repetitive work': ['reduce repetitive work', 'automate repetitive work', 'పునరావృత పనులు తగ్గించు', 'बार बार का काम कम'],
};

function classifyOptions(question, transcript, language) {
  const matches = [];
  for (const option of question.options || []) {
    const forms = [option, localizedOption(option, language), ...(optionAliases[option] || [])]
      .map(normalize).filter(Boolean);
    if (forms.some(form => phraseIncludes(transcript, form))) matches.push(option);
  }
  const unique = [...new Set(matches)];
  if (question.type === 'multiple' && unique.length) return { status: 'matched', value: unique };
  return unique.length === 1 ? { status: 'matched', value: unique[0] } : { status: 'unmatched' };
}

export function classifyVoiceAnswer(question, transcript, language, awaitingTimelineClarification = false) {
  const text = normalize(String(transcript || ''));
  if (!text) return { status: 'unmatched' };
  if (question.id === 'timeline') {
    const timeline = classifyTimeline(text);
    if (timeline.status !== 'unmatched') return timeline;
    if (awaitingTimelineClarification) return { status: 'unmatched' };
  }
  if (question.type === 'text' && question.optional &&
      /\b(?:skip|pass|દాటవేయి|వదిలేయండి|छोड़ें|छोड़ दीजिए)\b/.test(text)) {
    return { status: 'matched', value: '' };
  }
  if (question.type === 'text') {
    const error = answerError(question, String(transcript).trim());
    return error ? { status: 'unmatched' } : { status: 'matched', value: String(transcript).trim() };
  }
  return classifyOptions(question, text, language);
}

export function classifyTimelineClarification(question, transcript, language) {
  const text = normalize(String(transcript || ''));
  const answer = classifyVoiceAnswer(question, text, language, true);
  if (answer.status === 'matched') return answer;
  if (/\b(?:12|twelve|twelv)\b/.test(text) ||
      ['बारह', 'పన్నెండు', 'pannendu'].some(phrase => text.includes(phrase))) {
    return { status: 'unsupported-twelve' };
  }
  return { status: 'unmatched' };
}

export function createVoiceTurnGuard() {
  let processing = false;
  return {
    begin() {
      if (processing) return false;
      processing = true;
      return true;
    },
    end() {
      processing = false;
    },
  };
}

export async function transcribeVoiceRecording(blob, language, fetchImpl = fetch) {
  const buffer = await blob.arrayBuffer();
  if (buffer.byteLength > 2_000_000) {
    throw new Error('This recording is too large to transcribe. Record a shorter answer.');
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  let response;
  try {
    response = await fetchImpl('/api/consultant-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'transcribe',
        language,
        mimeType: blob.type || 'audio/webm',
        audioBase64: btoa(binary),
      }),
    });
  } catch (failure) {
    if (failure.name === 'AbortError') throw failure;
    throw new Error('Speech recognition could not connect. Retry transcription or record your answer again.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok !== true || typeof data.transcript !== 'string') {
    throw new Error(data?.message || 'Speech could not be transcribed. Retry or record your answer again.');
  }
  return data.transcript.trim();
}
