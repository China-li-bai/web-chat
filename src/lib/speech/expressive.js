// Expressive Web Speech playback with dynamic prosody
// Provides speakTextExpressiveWeb(text, options) that segments text and adjusts rate/pitch/pauses
// NOTE: Expressiveness applies to Web Speech API only; in Tauri, callers should route via index.js which falls back to normal speak.

import { isWebSpeechSupported, cancelSpeech, pickVoice } from './webSpeech.js';

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function jitter(val, amount = 0.06) {
  const r = (Math.random() * 2 - 1) * amount; // [-amount, amount]
  return val + r;
}

function styleMultipliers(style = 'professional') {
  switch (style) {
    case 'cheerful': return { rate: 1.08, pitch: 1.12 };
    case 'calm': return { rate: 0.92, pitch: 0.95 };
    case 'energetic': return { rate: 1.15, pitch: 1.10 };
    case 'friendly': return { rate: 1.03, pitch: 1.05 };
    case 'serious': return { rate: 0.95, pitch: 0.90 };
    case 'professional':
    default: return { rate: 1.00, pitch: 1.00 };
  }
}

function splitIntoSegments(text) {
  const t = (text || '').replace(/[\t\r ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  if (!t) return [];
  // Match sentences including terminal punctuation if present
  const re = /[^.!?。？！；…\n]+[.!?。？！；…]?/g;
  const segs = t.match(re) || [t];
  return segs.map(s => s.trim()).filter(Boolean);
}

function punctuationProfile(seg) {
  const end = seg.slice(-1);
  const hasComma = /[,，]/.test(seg);
  const hasNewline = /\n/.test(seg);
  let pause = 150; // base pause
  let rateMul = 1.0;
  let pitchMul = 1.0;

  if (end === '!') { pause = 220; rateMul += 0.05; pitchMul += 0.06; }
  else if (end === '?' || end === '？') { pause = 220; pitchMul += 0.06; }
  else if (end === '.' || end === '。' || end === '；' || end === '…') { pause = 180; }

  if (hasComma) pause = Math.max(pause, 120);
  if (hasNewline) pause = Math.max(pause, 240);

  return { pauseMs: pause, rateMul, pitchMul };
}

/**
 * Expressive Web Speech speaking of text
 * @param {string} text
 * @param {Object} options
 * @param {string} [options.lang]
 * @param {number} [options.rate]
 * @param {number} [options.pitch]
 * @param {number} [options.volume]
 * @param {string} [options.voiceName]
 * @param {boolean} [options.loop]
 * @param {string} [options.voiceStyle]
 * @param {(ev: any) => void} [options.onStart]
 * @param {(ev: any) => void} [options.onEnd]
 * @param {(ev: any) => void} [options.onError]
 * @param {number} [options.segmentPauseMs] base pause between segments
 * @param {number} [options.jitter] randomization magnitude for rate/pitch
 * @returns {{ speak: () => void, cancel: () => void }} handle
 */
export function speakTextExpressiveWeb(text, options = {}) {
  if (!isWebSpeechSupported()) {
    throw new Error('Web Speech API not supported in this environment');
  }
  const {
    lang = 'en-US',
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    voiceName,
    loop = false,
    voiceStyle = 'professional',
    onStart,
    onEnd,
    onError,
    segmentPauseMs = 150,
    jitter: jitterAmount = 0.06,
  } = options;

  const segs = splitIntoSegments(text);
  let canceled = false;
  let started = false;
  let timerId = null;

  const { rate: styleRate, pitch: stylePitch } = styleMultipliers(voiceStyle);

  // Ensure no overlap with existing speech
  cancelSpeech();

  const speakSegment = (idx) => {
    if (canceled) return;
    const seg = segs[idx];
    if (!seg) {
      if (typeof onEnd === 'function') onEnd({ type: 'sequenceend' });
      if (loop && !canceled) {
        // restart after a small delay
        timerId = setTimeout(() => speakSegment(0), Math.max(segmentPauseMs, 150));
      }
      return;
    }

    const prof = punctuationProfile(seg);
    const effectiveRate = clamp(jitter(rate * styleRate * prof.rateMul, jitterAmount), 0.1, 2.0);
    const effectivePitch = clamp(jitter(pitch * stylePitch * prof.pitchMul, jitterAmount), 0.0, 2.0);
    const effectiveVol = clamp(volume, 0.0, 1.0);

    const utter = new SpeechSynthesisUtterance(seg);
    utter.lang = lang;
    utter.rate = effectiveRate;
    utter.pitch = effectivePitch;
    utter.volume = effectiveVol;

    const preferred = pickVoice({ lang, voiceName });
    if (preferred) utter.voice = preferred;

    if (!started) {
      started = true;
      if (typeof onStart === 'function') utter.onstart = onStart;
    }
    utter.onerror = (e) => {
      if (typeof onError === 'function') onError(e);
    };
    utter.onend = () => {
      if (canceled) return;
      const pause = Math.max(segmentPauseMs, prof.pauseMs);
      timerId = setTimeout(() => speakSegment(idx + 1), pause);
    };

    try {
      window.speechSynthesis.speak(utter);
    } catch (e) {
      if (typeof onError === 'function') onError(e);
    }
  };

  const speak = () => speakSegment(0);
  const cancel = () => {
    canceled = true;
    if (timerId) { try { clearTimeout(timerId); } catch {} }
    cancelSpeech();
  };

  return { speak, cancel };
}