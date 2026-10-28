import { useEffect, useRef, useState } from 'react';
import { consultantCopy, localizedOption, localizedQuestion } from './consultantCopy.js';
import {
  classifyTimelineClarification,
  classifyVoiceAnswer,
  createVoiceTurnGuard,
  transcribeVoiceRecording,
} from './voiceAnswer.js';

const silenceMs = 1100;
const maxRecordingMs = 25000;
const speechThreshold = 0.012;

function stopTracks(stream) {
  for (const track of stream?.getTracks() || []) track.stop();
}

function recorderOptions() {
  const supported = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'];
  const mimeType = supported.find(type => MediaRecorder.isTypeSupported?.(type));
  return mimeType ? { mimeType } : undefined;
}

function recordTiming(values) {
  console.debug('[VNS voice timing]', values);
}

export default function VoiceConversation({ language, question, answers, onAnswer }) {
  const copy = consultantCopy(language).voice;
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [showConversation, setShowConversation] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [error, setError] = useState('');
  const [retryKind, setRetryKind] = useState('');
  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  const speakingRef = useRef(false);
  const captureRef = useRef(null);
  const captureStartingRef = useRef(false);
  const mountedRef = useRef(false);
  const questionRef = useRef(question);
  const answersRef = useRef(answers);
  const languageRef = useRef(language);
  const onAnswerRef = useRef(onAnswer);
  const sessionRef = useRef(0);
  const speechGenerationRef = useRef(0);
  const speechRequestRef = useRef(null);
  const transcriptionRequestRef = useRef(null);
  const audioRef = useRef(null);
  const audioCacheRef = useRef(new Map());
  const questionKeyRef = useRef(null);
  const pendingTimelineClarificationRef = useRef(false);
  const pendingBlobRef = useRef(null);
  const pendingPromptRef = useRef(false);
  const turnGuardRef = useRef(createVoiceTurnGuard());
  const captureMsRef = useRef(0);

  questionRef.current = question;
  answersRef.current = answers;
  languageRef.current = language;
  onAnswerRef.current = onAnswer;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeRef.current = false;
      sessionRef.current += 1;
      speechGenerationRef.current += 1;
      speechRequestRef.current?.abort();
      transcriptionRequestRef.current?.abort();
      const capture = captureRef.current;
      captureRef.current = null;
      if (capture?.timer) window.clearInterval(capture.timer);
      if (capture?.recorder?.state === 'recording') {
        capture.shouldTranscribe = false;
        capture.recorder.stop();
      }
      stopTracks(capture?.stream);
      if (capture?.audioContext?.state !== 'closed') void capture?.audioContext?.close();
      audioRef.current?.pause();
      for (const url of audioCacheRef.current.values()) URL.revokeObjectURL(url);
      audioCacheRef.current.clear();
    };
  }, []);

  function addMessage(speaker, text) {
    if (mountedRef.current) setConversation(current => [...current, { speaker, text }]);
  }

  function setFailure(message, retry = '') {
    if (!mountedRef.current) return;
    setError(message);
    setRetryKind(retry);
    setPhase('error');
  }

  function cleanupCapture(capture) {
    if (capture.timer) window.clearInterval(capture.timer);
    stopTracks(capture.stream);
    if (capture.audioContext?.state !== 'closed') void capture.audioContext?.close();
  }

  function cancelCapture(discard = true) {
    const capture = captureRef.current;
    if (!capture) return;
    capture.shouldTranscribe = !discard;
    captureRef.current = null;
    if (capture.timer) window.clearInterval(capture.timer);
    if (capture.recorder.state === 'recording') {
      capture.recorder.stop();
      if (discard) cleanupCapture(capture);
    }
    else cleanupCapture(capture);
  }

  function stopSpeech() {
    speechGenerationRef.current += 1;
    speechRequestRef.current?.abort();
    speechRequestRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    speakingRef.current = false;
  }

  async function speak(text, onComplete) {
    if (!text || !activeRef.current || mutedRef.current) return;
    if (captureStartingRef.current) sessionRef.current += 1;
    cancelCapture(true);
    stopSpeech();
    const generation = speechGenerationRef.current;
    const key = `${languageRef.current}\u0000${text}`;
    speakingRef.current = true;
    setPhase('speaking');
    setError('');
    setRetryKind('');
    const cachedUrl = audioCacheRef.current.get(key);
    let url = cachedUrl;
    if (!url) {
      const controller = new AbortController();
      speechRequestRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 32000);
      const synthesisStartedAt = performance.now();
      try {
        const response = await fetch('/api/consultant-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            action: 'speak',
            text: text.slice(0, 2500),
            language: languageRef.current,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || data?.ok !== true) {
          throw new Error(data?.message || 'Voice playback is unavailable.');
        }
        recordTiming({ speechSynthesisRequestMs: Math.round(performance.now() - synthesisStartedAt) });
        if (controller.signal.aborted || generation !== speechGenerationRef.current ||
            !activeRef.current || mutedRef.current || !mountedRef.current) return;

        const bytes = Uint8Array.from(atob(data.audioBase64), character => character.charCodeAt(0));
        url = URL.createObjectURL(new Blob([bytes], { type: data.mimeType }));
        audioCacheRef.current.set(key, url);
        if (audioCacheRef.current.size > 8) {
          const oldestKey = audioCacheRef.current.keys().next().value;
          const oldestUrl = audioCacheRef.current.get(oldestKey);
          audioCacheRef.current.delete(oldestKey);
          URL.revokeObjectURL(oldestUrl);
        }
      } catch (failure) {
        if (generation !== speechGenerationRef.current) return;
        speakingRef.current = false;
        recordTiming({ speechSynthesisRequestMs: Math.round(performance.now() - synthesisStartedAt), failed: true });
        setFailure(
          controller.signal.aborted
            ? 'Voice playback timed out. Retry the speech or continue with the microphone.'
            : failure.message || 'Voice playback failed. Please retry.',
          'speech',
        );
        if (pendingPromptRef.current) {
          pendingPromptRef.current = false;
          announceCurrentQuestion();
        } else onComplete?.();
        return;
      } finally {
        window.clearTimeout(timeout);
        if (speechRequestRef.current === controller) speechRequestRef.current = null;
      }
    }

    if (generation !== speechGenerationRef.current || !activeRef.current ||
        mutedRef.current || !mountedRef.current) return;
    const audio = new Audio(url);
    const playbackStartedAt = performance.now();
    let playbackSettled = false;
    audioRef.current = audio;
    audio.onended = () => {
      if (playbackSettled || generation !== speechGenerationRef.current) return;
      playbackSettled = true;
      if (audioRef.current === audio) audioRef.current = null;
      speakingRef.current = false;
      recordTiming({ speechPlaybackMs: Math.round(performance.now() - playbackStartedAt) });
      if (pendingPromptRef.current) {
        pendingPromptRef.current = false;
        announceCurrentQuestion();
      } else if (onComplete) {
        onComplete();
      } else {
        setPhase('listening');
        void beginRecording();
      }
    };
    audio.onerror = () => {
      if (playbackSettled || generation !== speechGenerationRef.current) return;
      playbackSettled = true;
      recordTiming({ speechPlaybackMs: Math.round(performance.now() - playbackStartedAt), failed: true });
      if (audioRef.current === audio) audioRef.current = null;
      speakingRef.current = false;
      setFailure('Voice playback failed. Retry the prompt or continue with the microphone.', 'speech');
      if (pendingPromptRef.current) {
        pendingPromptRef.current = false;
        announceCurrentQuestion();
      } else onComplete?.();
    };
    try {
      await audio.play();
    } catch (failure) {
      if (playbackSettled || generation !== speechGenerationRef.current) return;
      playbackSettled = true;
      speakingRef.current = false;
      recordTiming({ speechPlaybackMs: Math.round(performance.now() - playbackStartedAt), failed: true });
      setFailure(failure.message || 'Voice playback failed. Retry the prompt or continue with the microphone.', 'speech');
      if (pendingPromptRef.current) {
        pendingPromptRef.current = false;
        announceCurrentQuestion();
      } else onComplete?.();
    }
  }

  async function beginRecording() {
    if (!activeRef.current || mutedRef.current || captureStartingRef.current ||
        captureRef.current || speakingRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setFailure('Microphone recording is unavailable in this browser. Try Chrome or Edge, or use Click or type.', 'record');
      return;
    }
    captureStartingRef.current = true;
    const session = sessionRef.current;
    let stream;
    let audioContext;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (session !== sessionRef.current || !activeRef.current || mutedRef.current || !mountedRef.current) {
        stopTracks(stream);
        return;
      }
      const options = recorderOptions();
      const recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      audioContext = AudioContextConstructor ? new AudioContextConstructor() : null;
      if (audioContext?.state === 'suspended') await audioContext.resume();
      if (session !== sessionRef.current || !activeRef.current || mutedRef.current || !mountedRef.current) {
        stopTracks(stream);
        if (audioContext?.state !== 'closed') void audioContext?.close();
        return;
      }
      const analyser = audioContext?.createAnalyser();
      if (audioContext && analyser) {
        const source = audioContext.createMediaStreamSource(stream);
        analyser.fftSize = 1024;
        source.connect(analyser);
      }
      const capture = {
        recorder,
        stream,
        audioContext,
        analyser,
        chunks: [],
        shouldTranscribe: true,
        heardSpeech: false,
        silenceStartedAt: null,
        startedAt: performance.now(),
        timer: null,
        session,
      };
      captureRef.current = capture;
      recorder.ondataavailable = event => {
        if (event.data?.size) capture.chunks.push(event.data);
      };
      recorder.onstop = () => {
        cleanupCapture(capture);
        if (captureRef.current === capture) captureRef.current = null;
        captureMsRef.current = Math.round(performance.now() - capture.startedAt);
        if (!capture.shouldTranscribe || capture.session !== sessionRef.current ||
            !activeRef.current || mutedRef.current) return;
        const blob = new Blob(capture.chunks, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size) {
          setFailure('No speech was recorded. Please retry the microphone.', 'record');
          return;
        }
        pendingBlobRef.current = blob;
        void transcribePending();
      };
      recorder.onerror = () => {
        if (captureRef.current === capture) captureRef.current = null;
        capture.shouldTranscribe = false;
        cleanupCapture(capture);
        setFailure('Microphone recording failed. Please retry or record your answer again.', 'record');
      };
      recorder.start(200);
      setError('');
      setRetryKind('');
      setPhase('listening');

      const samples = analyser ? new Float32Array(analyser.fftSize) : null;
      capture.timer = window.setInterval(() => {
        if (captureRef.current !== capture || recorder.state !== 'recording') return;
        const now = performance.now();
        if (samples && analyser) {
          analyser.getFloatTimeDomainData(samples);
          let energy = 0;
          for (const sample of samples) energy += sample * sample;
          const rms = Math.sqrt(energy / samples.length);
          if (rms >= speechThreshold) {
            capture.heardSpeech = true;
            capture.silenceStartedAt = null;
          } else if (capture.heardSpeech) {
            capture.silenceStartedAt ??= now;
            if (now - capture.silenceStartedAt >= silenceMs) {
              cancelCapture(false);
              return;
            }
          }
        }
        if (now - capture.startedAt >= maxRecordingMs) cancelCapture(false);
      }, 100);
    } catch (failure) {
      stopTracks(stream);
      if (audioContext?.state !== 'closed') void audioContext?.close();
      if (session !== sessionRef.current || !activeRef.current ||
          mutedRef.current || !mountedRef.current) return;
      setFailure(
        failure.name === 'NotAllowedError'
          ? 'Microphone access was denied. Allow microphone access in browser settings, then retry.'
          : 'Microphone could not start. Check browser permissions and retry.',
        'record',
      );
    } finally {
      captureStartingRef.current = false;
      if (session !== sessionRef.current && activeRef.current && !mutedRef.current &&
          !speakingRef.current && !captureRef.current) {
        void beginRecording();
      }
    }
  }

  function acceptAnswer(current, value, transcript) {
    pendingTimelineClarificationRef.current = false;
    addMessage(consultantCopy(languageRef.current).voice.user, transcript);
    onAnswerRef.current(current, value, transcript);
    const acknowledgement = consultantCopy(languageRef.current).voice.acknowledgement;
    addMessage(consultantCopy(languageRef.current).voice.assistant, acknowledgement);
    void speak(acknowledgement, () => {
      const key = `${questionRef.current?.id || 'complete'}:${languageRef.current}`;
      if (questionKeyRef.current !== key) announceCurrentQuestion();
      else void beginRecording();
    });
  }

  function handleTranscript(transcript) {
    if (!activeRef.current || mutedRef.current || !questionRef.current) return;
    const current = questionRef.current;
    const voiceCopy = consultantCopy(languageRef.current).voice;
    const processingStartedAt = performance.now();
    const wasClarifyingTimeline = pendingTimelineClarificationRef.current;
    const result = wasClarifyingTimeline
      ? classifyTimelineClarification(current, transcript, languageRef.current)
      : classifyVoiceAnswer(current, transcript, languageRef.current);
    recordTiming({
      captureMs: captureMsRef.current,
      answerProcessingMs: Math.round(performance.now() - processingStartedAt),
    });

    if (result.status === 'ambiguous') {
      pendingTimelineClarificationRef.current = true;
      addMessage(voiceCopy.user, transcript);
      addMessage(voiceCopy.assistant, voiceCopy.timelineClarification);
      void speak(voiceCopy.timelineClarification, () => void beginRecording());
      return;
    }
    if (result.status === 'unsupported-twelve') {
      pendingTimelineClarificationRef.current = false;
      addMessage(voiceCopy.user, transcript);
      const response = voiceCopy.timelineUnsupported;
      addMessage(voiceCopy.assistant, response);
      void speak(response, () => void beginRecording());
      return;
    }
    if (result.status !== 'matched') {
      addMessage(voiceCopy.user, transcript);
      const options = current.options?.map(option => localizedOption(option, languageRef.current)).join('. ');
      const response = options
        ? `${voiceCopy.notUnderstood} ${options}`
        : voiceCopy.notUnderstood;
      addMessage(voiceCopy.assistant, response);
      void speak(response, () => void beginRecording());
      return;
    }

    const value = current.type === 'multiple'
      ? [...new Set([
        ...(Array.isArray(answersRef.current[current.id]) ? answersRef.current[current.id] : []),
        ...(Array.isArray(result.value) ? result.value : [result.value]),
      ])]
      : result.value;
    acceptAnswer(current, value, transcript);
  }

  async function transcribePending() {
    const blob = pendingBlobRef.current;
    if (!blob || !activeRef.current || mutedRef.current ||
        !turnGuardRef.current.begin()) return;
    const session = sessionRef.current;
    const controller = new AbortController();
    transcriptionRequestRef.current = controller;
    const startedAt = performance.now();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 32000);
    setPhase('processing');
    setError('');
    setRetryKind('');
    try {
      const transcript = await transcribeVoiceRecording(
        blob,
        languageRef.current,
        (url, options) => fetch(url, { ...options, signal: controller.signal }),
      );
      if (controller.signal.aborted || session !== sessionRef.current ||
          !activeRef.current || mutedRef.current || !mountedRef.current) return;
      recordTiming({ speechRecognitionMs: Math.round(performance.now() - startedAt) });
      window.clearTimeout(timeout);
      pendingBlobRef.current = null;
      handleTranscript(transcript);
    } catch (failure) {
      if (session !== sessionRef.current || (controller.signal.aborted && !timedOut)) return;
      recordTiming({ speechRecognitionMs: Math.round(performance.now() - startedAt), failed: true });
      setFailure(
        timedOut
          ? 'Speech recognition timed out. Your recording is saved; retry transcription or record again.'
          : failure.message || 'Speech recognition failed. Retry transcription or record your answer again.',
        'transcription',
      );
    } finally {
      window.clearTimeout(timeout);
      if (transcriptionRequestRef.current === controller) transcriptionRequestRef.current = null;
      turnGuardRef.current.end();
    }
  }

  function promptForCurrentQuestion() {
    const current = questionRef.current;
    const currentCopy = consultantCopy(languageRef.current);
    if (!current) return currentCopy.voice.complete;
    const display = localizedQuestion(current, languageRef.current);
    const options = display.options?.length ? ` ${display.options.join('. ')}` : '';
    return `${display.label} ${display.help || ''}${options}`.trim();
  }

  function announceCurrentQuestion() {
    if (!activeRef.current || mutedRef.current || speakingRef.current) {
      if (activeRef.current && !mutedRef.current) pendingPromptRef.current = true;
      return;
    }
    const current = questionRef.current;
    const key = `${current?.id || 'complete'}:${languageRef.current}`;
    if (questionKeyRef.current === key) {
      if (pendingBlobRef.current) void transcribePending();
      else if (current) void beginRecording();
      else setPhase('idle');
      return;
    }
    questionKeyRef.current = key;
    const prompt = promptForCurrentQuestion();
    addMessage(consultantCopy(languageRef.current).voice.assistant, prompt);
    void speak(prompt, () => {
      if (questionRef.current) void beginRecording();
      else setPhase('idle');
    });
  }

  function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setFailure('Microphone recording is unavailable in this browser. Try Chrome or Edge, or use Click or type.', 'record');
      return;
    }
    sessionRef.current += 1;
    activeRef.current = true;
    mutedRef.current = false;
    questionKeyRef.current = null;
    pendingTimelineClarificationRef.current = false;
    pendingBlobRef.current = null;
    setActive(true);
    setMuted(false);
    setError('');
    setRetryKind('');
    const greeting = consultantCopy(languageRef.current).voice.greeting;
    addMessage(consultantCopy(languageRef.current).voice.assistant, greeting);
    void speak(greeting, announceCurrentQuestion);
  }

  function mute() {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    if (nextMuted) {
      sessionRef.current += 1;
      cancelCapture(true);
      transcriptionRequestRef.current?.abort();
      transcriptionRequestRef.current = null;
      stopSpeech();
      turnGuardRef.current.end();
      setPhase('idle');
      setError('');
      setRetryKind('');
      return;
    }
    if (pendingBlobRef.current) void transcribePending();
    else announceCurrentQuestion();
  }

  function end() {
    sessionRef.current += 1;
    activeRef.current = false;
    mutedRef.current = false;
    cancelCapture(true);
    transcriptionRequestRef.current?.abort();
    transcriptionRequestRef.current = null;
    stopSpeech();
    turnGuardRef.current.end();
    pendingBlobRef.current = null;
    pendingTimelineClarificationRef.current = false;
    setActive(false);
    setMuted(false);
    setPhase('idle');
    setError('');
    setRetryKind('');
  }

  function retry() {
    setError('');
    setRetryKind('');
    if (retryKind === 'transcription' && pendingBlobRef.current) {
      void transcribePending();
    } else if (retryKind === 'speech') {
      const prompt = conversation.at(-1)?.text || promptForCurrentQuestion();
      void speak(prompt, announceCurrentQuestion);
    } else {
      void beginRecording();
    }
  }

  const previousLanguageRef = useRef(language);
  useEffect(() => {
    if (previousLanguageRef.current === language) return;
    previousLanguageRef.current = language;
    if (!activeRef.current || mutedRef.current) return;
    sessionRef.current += 1;
    cancelCapture(true);
    transcriptionRequestRef.current?.abort();
    transcriptionRequestRef.current = null;
    turnGuardRef.current.end();
    stopSpeech();
    questionKeyRef.current = null;
    if (pendingBlobRef.current) void transcribePending();
    else if (pendingTimelineClarificationRef.current) {
      const prompt = consultantCopy(languageRef.current).voice.timelineClarification;
      addMessage(consultantCopy(languageRef.current).voice.assistant, prompt);
      void speak(prompt, () => void beginRecording());
    }
    else announceCurrentQuestion();
  }, [language]);

  useEffect(() => {
    if (active && !muted && questionKeyRef.current &&
        questionKeyRef.current !== `${question?.id || 'complete'}:${language}`) {
      announceCurrentQuestion();
    }
  }, [active, muted, question?.id, language]);

  const status = phase === 'listening'
    ? copy.listening
    : phase === 'processing'
      ? copy.processing
      : phase === 'speaking'
        ? copy.speaking
        : '';

  return <section className="ai-voice" aria-label={copy.title}>
    <p className="ai-voice-guidance">{copy.guidance}</p>
    <div className="ai-voice-toolbar">
      {!active
        ? <button className="ai-voice-button" type="button" onClick={start}>{copy.start}</button>
        : <>
          <button className="ai-voice-button" type="button" onClick={mute}>{muted ? copy.unmute : copy.mute}</button>
          {phase === 'listening' && <button className="ai-voice-button" type="button" onClick={() => cancelCapture(false)}>{copy.sendAnswer}</button>}
          <button className="ai-voice-button" type="button" onClick={end}>{copy.end}</button>
        </>}
      <label className="ai-voice-toggle">
        <input type="checkbox" checked={showConversation} onChange={event => setShowConversation(event.target.checked)} />
        {copy.showConversation}
      </label>
    </div>
    {active && !muted && (status || !question) && <p className="ai-voice-status" role="status">{status || copy.complete}</p>}
    {!active && question && conversation.length > 0 && <p className="ai-voice-status" role="status">{copy.ended}</p>}
    {error && <div className="ai-error" role="alert"><p>{error}</p><div className="ai-voice-toolbar">
      <button className="ai-voice-button" type="button" onClick={retry}>{retryKind === 'transcription' ? copy.retry : retryKind === 'speech' ? copy.retrySpeech : copy.retry}</button>
      {retryKind === 'transcription' && <button className="ai-voice-button" type="button" onClick={() => { pendingBlobRef.current = null; setError(''); setRetryKind(''); void beginRecording(); }}>{copy.recordAgain}</button>}
      {retryKind === 'speech' && <button className="ai-voice-button" type="button" onClick={() => { setError(''); setRetryKind(''); void beginRecording(); }}>{copy.recordAgain}</button>}
    </div></div>}
    {showConversation && conversation.length > 0 && <ol className="ai-voice-transcript" aria-live="polite">
      {conversation.map((message, index) => <li key={`${index}-${message.speaker}`}><b>{message.speaker}</b><span>{message.text}</span></li>)}
    </ol>}
  </section>;
}
