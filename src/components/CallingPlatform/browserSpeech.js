function abortError() {
  const error = new Error("Speech playback was stopped.");
  error.name = "AbortError";
  return error;
}

function readVoices(synthesis) {
  try {
    return synthesis.getVoices();
  } catch {
    throw new Error("Browser voices could not be loaded. Check your browser's text-to-speech settings, then try again.");
  }
}

function waitForVoices(synthesis, signal, timeoutMs) {
  const initialVoices = readVoices(synthesis);
  if (initialVoices.length || typeof synthesis.addEventListener !== "function") {
    return Promise.resolve(initialVoices);
  }

  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      synthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      signal?.removeEventListener("abort", handleAbort);
    };
    const finish = (callback, value) => {
      cleanup();
      callback(value);
    };
    const handleVoicesChanged = () => {
      try {
        const voices = readVoices(synthesis);
        if (voices.length) finish(resolve, voices);
      } catch (error) {
        finish(reject, error);
      }
    };
    const handleAbort = () => finish(reject, abortError());

    synthesis.addEventListener("voiceschanged", handleVoicesChanged);
    signal?.addEventListener("abort", handleAbort, { once: true });
    if (signal?.aborted) {
      handleAbort();
      return;
    }

    timer = setTimeout(() => {
      try {
        finish(resolve, readVoices(synthesis));
      } catch (error) {
        finish(reject, error);
      }
    }, timeoutMs);
    handleVoicesChanged();
  });
}

function describePlaybackError(code) {
  const messages = {
    "audio-busy": "Another audio request is using the browser's speech engine. Wait a moment and try again.",
    canceled: "Speech playback was canceled. Try again.",
    interrupted: "Speech playback was interrupted. Try again.",
    network: "A network problem interrupted browser speech playback. Check your connection and try again.",
    "not-allowed": "Browser speech playback was blocked. Click Play greeting again and check this site's browser audio permissions.",
    "synthesis-failed": "Browser speech could not be generated. Check your browser's text-to-speech settings, then try again.",
    "voice-unavailable": "The browser voice is unavailable. Check that a system speech voice is installed, then try again.",
  };
  return messages[code] || "Browser speech playback failed. Check your browser's text-to-speech and audio settings, then try again.";
}

export async function playBrowserSpeech(text, {
  synthesis,
  Utterance,
  signal,
  onState = () => {},
  voiceLoadTimeoutMs = 1500,
  startTimeoutMs = 8000,
} = {}) {
  if (!synthesis || typeof synthesis.speak !== "function" || typeof synthesis.getVoices !== "function") {
    throw new Error("Browser speech synthesis is not available. Try a browser with text-to-speech support.");
  }
  if (typeof Utterance !== "function") {
    throw new Error("Browser speech playback is unavailable. Try a browser with text-to-speech support.");
  }
  if (signal?.aborted) throw abortError();

  const voices = await waitForVoices(synthesis, signal, voiceLoadTimeoutMs);
  if (signal?.aborted) throw abortError();

  const utterance = new Utterance(text);
  const defaultVoice = voices.find(voice => voice.default);
  if (defaultVoice) utterance.voice = defaultVoice;

  await new Promise((resolve, reject) => {
    let startTimer;
    let settled = false;
    const cleanup = () => {
      clearTimeout(startTimer);
      signal?.removeEventListener("abort", handleAbort);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const handleAbort = () => finish(reject, abortError());

    utterance.onstart = () => {
      clearTimeout(startTimer);
      onState("speaking");
    };
    utterance.onend = () => finish(resolve);
    utterance.onerror = event => finish(reject, new Error(describePlaybackError(event?.error)));
    signal?.addEventListener("abort", handleAbort, { once: true });
    if (signal?.aborted) {
      handleAbort();
      return;
    }

    startTimer = setTimeout(() => {
      finish(reject, new Error("The browser did not start speech playback. Check that a system speech voice is installed and that site audio is allowed, then try again."));
    }, startTimeoutMs);

    try {
      synthesis.speak(utterance);
    } catch {
      finish(reject, new Error("The browser could not start speech playback. Check your browser's text-to-speech settings, then try again."));
    }
  });
}
