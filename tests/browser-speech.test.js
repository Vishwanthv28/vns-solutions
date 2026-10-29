import test from "node:test";
import assert from "node:assert/strict";
import { playBrowserSpeech } from "../src/components/CallingPlatform/browserSpeech.js";

class FakeUtterance {
  constructor(text) {
    this.text = text;
  }
}

class FakeSpeechSynthesis {
  voices = [];
  listeners = new Map();
  utterance = null;

  getVoices() {
    return this.voices;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }

  speak(utterance) {
    this.utterance = utterance;
    queueMicrotask(() => {
      utterance.onstart();
      utterance.onend();
    });
  }

  loadVoices(voices) {
    this.voices = voices;
    this.listeners.get("voiceschanged")?.();
  }
}

test("browser speech waits for voices and selects the default voice before playback", async () => {
  const synthesis = new FakeSpeechSynthesis();
  let state = "";
  const playback = playBrowserSpeech("Hello there.", {
    synthesis,
    Utterance: FakeUtterance,
    voiceLoadTimeoutMs: 100,
    onState: nextState => { state = nextState; },
  });

  assert.equal(synthesis.utterance, null);
  synthesis.loadVoices([{ name: "System voice", default: true }]);
  await playback;

  assert.equal(synthesis.utterance.text, "Hello there.");
  assert.equal(synthesis.utterance.voice.name, "System voice");
  assert.equal(state, "speaking");
  assert.equal(synthesis.listeners.size, 0);
});

test("browser speech reports a blocked playback error with guidance", async () => {
  const synthesis = new FakeSpeechSynthesis();
  synthesis.voices = [{ name: "System voice", default: true }];
  synthesis.speak = utterance => queueMicrotask(() => utterance.onerror({ error: "not-allowed" }));

  await assert.rejects(
    playBrowserSpeech("Hello there.", {
      synthesis,
      Utterance: FakeUtterance,
    }),
    /blocked.*click Play greeting again.*audio permissions/i,
  );
});

test("browser speech reports when the browser never starts playback", async () => {
  const synthesis = new FakeSpeechSynthesis();
  synthesis.voices = [{ name: "System voice", default: true }];
  synthesis.speak = () => {};

  await assert.rejects(
    playBrowserSpeech("Hello there.", {
      synthesis,
      Utterance: FakeUtterance,
      startTimeoutMs: 5,
    }),
    /did not start speech playback.*system speech voice.*site audio/i,
  );
});

test("aborting browser voice loading cancels the pending playback request", async () => {
  const synthesis = new FakeSpeechSynthesis();
  const controller = new AbortController();
  const playback = playBrowserSpeech("Hello there.", {
    synthesis,
    Utterance: FakeUtterance,
    signal: controller.signal,
    voiceLoadTimeoutMs: 100,
  });
  controller.abort();

  await assert.rejects(playback, { name: "AbortError" });
  assert.equal(synthesis.utterance, null);
  assert.equal(synthesis.listeners.size, 0);
});
