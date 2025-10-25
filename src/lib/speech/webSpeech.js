// Web Speech API utilities for reusable TTS playback
// This module is framework-agnostic (no React dependency) and can be used across projects.

/** Returns true if Web Speech API (speechSynthesis) is available */
export function isWebSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

/** Get current system voices list (may be empty initially until voiceschanged fires) */
export function getVoices() {
  if (!isWebSpeechSupported()) return [];
  try {
    return window.speechSynthesis.getVoices() || [];
  } catch (e) {
    console.warn('[webSpeech] getVoices failed:', e);
    return [];
  }
}

/**
 * Pick a preferred voice based on language prefix or explicit name
 * @param {Object} opts
 * @param {string} [opts.lang] e.g. 'en-US'
 * @param {string} [opts.voiceName] exact voice name
 * @returns {SpeechSynthesisVoice|null}
 */
export function pickVoice(opts = {}) {
  const { lang, voiceName } = opts;
  const list = getVoices();
  if (voiceName) {
    const v = list.find((v) => v.name === voiceName);
    if (v) return v;
  }
  const langPrefix = (lang || '').toLowerCase().slice(0, 2);
  const byLang = list.filter((v) => (v.lang || '').toLowerCase().startsWith(langPrefix));
  return byLang[0] || list[0] || null;
}

/** Cancel any ongoing speech */
export function cancelSpeech() {
  if (!isWebSpeechSupported()) return;
  try { window.speechSynthesis.cancel(); } catch {}
}

/**
 * Speak text using Web Speech API
 * @param {string} text
 * @param {Object} options
 * @param {string} [options.lang]
 * @param {number} [options.rate]
 * @param {number} [options.pitch]
 * @param {number} [options.volume]
 * @param {string} [options.voiceName]
 * @param {boolean} [options.loop]
 * @param {(ev: SpeechSynthesisEvent) => void} [options.onStart]
 * @param {(ev: SpeechSynthesisEvent) => void} [options.onEnd]
 * @param {(ev: SpeechSynthesisErrorEvent | any) => void} [options.onError]
 * @returns {{ utterance: SpeechSynthesisUtterance, speak: () => void, cancel: () => void }} handle
 */
export function speakTextWeb(text, options = {}) {
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
    onStart,
    onEnd,
    onError,
  } = options;

  // Stop any ongoing speech before starting new one
  cancelSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;

  const preferred = pickVoice({ lang, voiceName });
  if (preferred) utterance.voice = preferred;

  if (typeof onStart === 'function') utterance.onstart = onStart;
  utterance.onend = (ev) => {
    if (loop) {
      try { window.speechSynthesis.speak(utterance); } catch {}
    }
    if (typeof onEnd === 'function') onEnd(ev);
  };
  if (typeof onError === 'function') utterance.onerror = onError;

  const speak = () => {
    try { window.speechSynthesis.speak(utterance); } catch (e) {
      if (typeof onError === 'function') onError(e);
    }
  };

  return { utterance, speak, cancel: cancelSpeech };
}