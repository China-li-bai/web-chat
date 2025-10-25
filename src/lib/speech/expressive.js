// Expressive Web Speech playback with dynamic prosody
// Provides speakTextExpressiveWeb(text, options) that segments text and adjusts rate/pitch/pauses
// NOTE: Expressiveness applies to Web Speech API only; in Tauri, callers should route via index.js which falls back to normal speak.

import { isWebSpeechSupported, cancelSpeech, pickVoiceResponsive } from './webSpeech.js';

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function jitter(val, amount = 0.06) {
  const r = (Math.random() * 2 - 1) * amount; // [-amount, amount]
  return val + r;
}

function styleMultipliers(style = 'professional') {
  switch (style) {
    case 'cheerful': return { rate: 1.15, pitch: 1.20 };
    case 'calm': return { rate: 0.88, pitch: 0.95 };
    case 'energetic': return { rate: 1.22, pitch: 1.12 };
    case 'friendly': return { rate: 1.08, pitch: 1.10 };
    case 'serious': return { rate: 0.92, pitch: 0.88 };
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

function splitIntoPhrases(seg) {
  // First split by inner punctuation (commas/colon/semicolon/dash/parentheses)
  let parts = seg.split(/[，,：:；;——\-\(\)【】\[\]<>]/).map(s => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    // Fallback: for long segments, break into 2-3 chunks by whitespace
    if (/\s/.test(seg) && seg.length > 24) {
      const tokens = seg.split(/\s+/);
      const n = tokens.length;
      const cut1 = Math.floor(n / 3);
      const cut2 = Math.floor((2 * n) / 3);
      parts = [
        tokens.slice(0, cut1).join(' '),
        tokens.slice(cut1, cut2).join(' '),
        tokens.slice(cut2).join(' ')
      ].filter(p => p.trim().length > 0);
    } else if (seg.length > 20) {
      // CJK fallback: split by characters roughly in half
      const mid = Math.floor(seg.length / 2);
      parts = [seg.slice(0, mid), seg.slice(mid)];
    } else {
      parts = [seg];
    }
  }
  return parts;
}

function punctuationProfile(seg) {
  const end = seg.slice(-1);
  const hasComma = /[,，]/.test(seg);
  const hasNewline = /\n/.test(seg);
  let pause = 180; // base pause
  let rateMul = 1.0;
  let pitchMul = 1.0;

  if (end === '!') { pause = 240; rateMul += 0.08; pitchMul += 0.10; }
  else if (end === '?' || end === '？') { pause = 240; pitchMul += 0.10; }
  else if (end === '.' || end === '。' || end === '；' || end === '…') { pause = 200; }

  if (hasComma) pause = Math.max(pause, 140);
  if (hasNewline) pause = Math.max(pause, 280);

  return { pauseMs: pause, rateMul, pitchMul, terminal: end };
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
    segmentPauseMs = 200,
    jitter: jitterAmount = 0.10,
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
        timerId = setTimeout(() => speakSegment(0), Math.max(segmentPauseMs, 180));
      }
      return;
    }

    const prof = punctuationProfile(seg);
    const phrases = splitIntoPhrases(seg);

    const speakPhrase = (pIdx) => {
      if (canceled) return;
      const phrase = phrases[pIdx];
      if (phrase == null) {
        // phrase sequence done, move to next segment
        const pause = Math.max(segmentPauseMs, prof.pauseMs);
        timerId = setTimeout(() => speakSegment(idx + 1), pause);
        return;
      }

      const total = phrases.length;
      // Apply contour: slight rising pitch for questions across phrases
      let contourPitchMul = 1.0;
      if (prof.terminal === '?' || prof.terminal === '？') {
        contourPitchMul = 1.0 + (pIdx / Math.max(1, total - 1)) * 0.06; // up to +6%
      }
      // Exclamations: a bit faster and louder at the end phrase
      let contourRateMul = 1.0;
      let contourVolMul = 1.0;
      if (prof.terminal === '!') {
        contourRateMul = 1.0 + (pIdx === total - 1 ? 0.05 : 0.02);
        contourVolMul = 1.0 + (pIdx === total - 1 ? 0.05 : 0.02);
      }

      const effectiveRate = clamp(jitter(rate * styleRate * prof.rateMul * contourRateMul, jitterAmount), 0.1, 2.0);
      const effectivePitch = clamp(jitter(pitch * stylePitch * prof.pitchMul * contourPitchMul, jitterAmount), 0.0, 2.0);
      const effectiveVol = clamp(volume * contourVolMul, 0.0, 1.0);

      const utter = new SpeechSynthesisUtterance(phrase);
      utter.lang = lang;
      utter.rate = effectiveRate;
      utter.pitch = effectivePitch;
      utter.volume = effectiveVol;

      const preferred = pickVoiceResponsive({ lang, voiceName, voiceStyle });
      if (preferred) utter.voice = preferred;

      if (!started && pIdx === 0) {
        started = true;
        if (typeof onStart === 'function') utter.onstart = onStart;
      }
      utter.onerror = (e) => { if (typeof onError === 'function') onError(e); };
      utter.onend = () => {
        if (canceled) return;
        const intraPause = Math.max(120, Math.round(segmentPauseMs * 0.6));
        timerId = setTimeout(() => speakPhrase(pIdx + 1), intraPause);
      };

      try { window.speechSynthesis.speak(utter); } catch (e) { if (typeof onError === 'function') onError(e); }
    };

    speakPhrase(0);
  };

  const speak = () => speakSegment(0);
  const cancel = () => {
    canceled = true;
    if (timerId) { try { clearTimeout(timerId); } catch {} }
    cancelSpeech();
  };

  return { speak, cancel };
}