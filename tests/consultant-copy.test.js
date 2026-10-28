import test from 'node:test';
import assert from 'node:assert/strict';

import { consultantQuestions } from '../src/components/AIConsultant/consultantQuestions.js';
import {
  canonicalOption,
  CONSULTANT_LANGUAGES,
  consultantCopy,
  localizedOption,
  localizedQuestion,
} from '../src/components/AIConsultant/consultantCopy.js';

test('question options localize for display and voice recognition maps them to canonical values', () => {
  for (const language of ['en-IN', 'te-IN', 'hi-IN']) {
    for (const question of consultantQuestions.filter(item => item.options)) {
      const display = localizedQuestion(question, language);
      assert.equal(display.options.length, question.options.length);
      for (const [index, canonical] of question.options.entries()) {
        const localized = localizedOption(canonical, language);
        assert.equal(display.options[index], localized);
        assert.equal(canonicalOption(localized, question.options, language), canonical);
        assert.equal(question.options[index], canonical);
      }
    }
  }
});

test('language controls and question copy are available in English, Telugu, and Hindi', () => {
  assert.deepEqual(CONSULTANT_LANGUAGES.map(({ code }) => code), ['en-IN', 'te-IN', 'hi-IN']);
  assert.deepEqual(CONSULTANT_LANGUAGES.map(({ label }) => label), ['English', 'తెలుగు', 'हिन्दी']);
  for (const language of ['en-IN', 'te-IN', 'hi-IN']) {
    const copy = consultantCopy(language);
    assert.ok(copy.controls.back);
    assert.ok(copy.controls.continue);
    assert.ok(copy.controls.question(2, 7));
    assert.ok(copy.voice.start);
    assert.ok(copy.voice.greeting);
    assert.ok(copy.voice.mute);
    assert.ok(copy.voice.end);
    assert.ok(localizedQuestion(consultantQuestions[0], language).label);
  }
});
