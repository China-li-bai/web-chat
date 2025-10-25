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

/** Detect the current browser for heuristic voice defaults */
export function detectBrowser() {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    if (/Edg\//.test(ua)) return 'edge';
    if (/Firefox\//.test(ua)) return 'firefox';
    // Safari detection: has Safari but not Chrome/Edge/Opera
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua)) {
      return isIOS ? 'ios_safari' : 'safari';
    }
    if (/Chrome\//.test(ua) || /CriOS\//.test(ua)) return isIOS ? 'ios_chrome' : 'chrome';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Pick a default voice based on the current browser for better compatibility
 * - Chrome: prefer Google voices
 * - Edge: prefer Microsoft voices
 * - Safari (including iOS Safari): prefer Apple voices like Samantha/Alex (en), Ting-Ting/Mei-Jia (zh), Kyoko/Otoya (ja)
 * - Firefox: pick best available (Google/Microsoft if present), otherwise fallback by language
 */
export function pickDefaultVoiceByBrowser(opts = {}) {
  const { lang, voiceStyle } = opts;
  const list = getVoices();
  if (!list.length) return null;

  const browser = detectBrowser();
  const langPrefix = (lang || '').toLowerCase().slice(0, 2);
  const byLang = list.filter((v) => (v.lang || '').toLowerCase().startsWith(langPrefix));

  const findFirst = (voices, re) => voices.find((v) => re.test(v.name));
  const preferByNames = (voices, names) => {
    for (const n of names) {
      const v = voices.find((v) => v.name.toLowerCase().includes(n.toLowerCase()));
      if (v) return v;
    }
    return null;
  };

  if (browser === 'chrome' || browser === 'ios_chrome') {
    const googleByLang = byLang.filter((v) => /google/i.test(v.name));
    const googleAll = list.filter((v) => /google/i.test(v.name));
    return googleByLang[0] || googleAll[0] || byLang[0] || list[0] || null;
  }

  if (browser === 'edge') {
    const msByLang = byLang.filter((v) => /microsoft/i.test(v.name));
    const msAll = list.filter((v) => /microsoft/i.test(v.name));
    return msByLang[0] || msAll[0] || byLang[0] || list[0] || null;
  }

  if (browser === 'safari' || browser === 'ios_safari') {
    if (langPrefix === 'en') {
      const applePref = preferByNames(list, ['Samantha', 'Alex', 'Victoria']);
      return applePref || byLang[0] || list[0] || null;
    }
    if (langPrefix === 'zh') {
      const appleZh = preferByNames(list, ['Ting-Ting', 'Mei-Jia', 'Sin-ji']);
      return appleZh || byLang[0] || list[0] || null;
    }
    if (langPrefix === 'ja') {
      const appleJa = preferByNames(list, ['Kyoko', 'Otoya', 'Yoko']);
      return appleJa || byLang[0] || list[0] || null;
    }
    return byLang[0] || list[0] || null;
  }

  // Firefox or unknown: try Google/Microsoft first, then by language
  const googlePref = findFirst(byLang, /google/i) || findFirst(list, /google/i);
  if (googlePref) return googlePref;
  const msPref = findFirst(byLang, /microsoft/i) || findFirst(list, /microsoft/i);
  if (msPref) return msPref;
  return byLang[0] || list[0] || null;
}

/**
 * Map a voice style to base rate/pitch presets, adjusted per browser
 * This sets baseline sliders; expressive.js will layer dynamic variations on top
 * @param {{style:string, lang?:string, browser?:string}} params
 * @returns {{rate:number, pitch:number}}
 */
export function getStyleParamPreset(params = {}) {
  const { style = 'professional', lang = 'en-US', browser } = params;
  const b = browser || detectBrowser();
  const s = (style || '').toLowerCase();

  // Base tables per browser (moderate for Safari/Firefox)
  const chromeEdge = {
    professional: { rate: 1.0, pitch: 1.0 },
    cheerful:    { rate: 1.20, pitch: 1.15 },
    calm:        { rate: 0.90, pitch: 0.95 },
    energetic:   { rate: 1.35, pitch: 1.25 },
    friendly:    { rate: 1.15, pitch: 1.10 },
    serious:     { rate: 0.95, pitch: 0.90 },
  };
  const safari = {
    professional: { rate: 1.0, pitch: 1.0 },
    cheerful:    { rate: 1.10, pitch: 1.08 },
    calm:        { rate: 0.95, pitch: 0.98 },
    energetic:   { rate: 1.20, pitch: 1.12 },
    friendly:    { rate: 1.08, pitch: 1.05 },
    serious:     { rate: 0.96, pitch: 0.92 },
  };
  const firefox = {
    professional: { rate: 1.0, pitch: 1.0 },
    cheerful:    { rate: 1.12, pitch: 1.10 },
    calm:        { rate: 0.92, pitch: 0.98 },
    energetic:   { rate: 1.25, pitch: 1.15 },
    friendly:    { rate: 1.10, pitch: 1.08 },
    serious:     { rate: 0.96, pitch: 0.92 },
  };
  const table = (b === 'chrome' || b === 'edge' || b === 'ios_chrome') ? chromeEdge
              : (b === 'safari' || b === 'ios_safari') ? safari
              : (b === 'firefox') ? firefox
              : chromeEdge;

  let preset = table[s] || table.professional;

  // Optional language-based subtle tweaks
  const langLower = (lang || '').toLowerCase();
  if (langLower.startsWith('zh')) {
    // Chinese tends to sound clearer slightly slower
    preset = { rate: preset.rate * 0.95, pitch: preset.pitch * 0.98 };
  } else if (langLower.startsWith('ja')) {
    // Japanese: keep near neutral
    preset = { rate: preset.rate * 0.98, pitch: preset.pitch * 1.00 };
  }

  // Clamp to safe ranges
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  return {
    rate: clamp(preset.rate, 0.5, 2.0),
    pitch: clamp(preset.pitch, 0.0, 2.0),
  };
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
 * Attempt to pick a voice that responds to pitch/rate changes and matches style preference
 * Falls back to pickVoice if no better match is found
 * @param {Object} opts
 * @param {string} [opts.lang]
 * @param {string} [opts.voiceName]
 * @param {string} [opts.voiceStyle] one of: cheerful, calm, energetic, friendly, serious, professional
 * @returns {SpeechSynthesisVoice|null}
 */
export function pickVoiceResponsive(opts = {}) {
  const { lang, voiceName, voiceStyle } = opts;
  const list = getVoices();
  if (!list.length) return pickVoice({ lang, voiceName });

  // If an explicit voice is provided, honor it
  if (voiceName) {
    const v = list.find((v) => v.name === voiceName);
    if (v) return v;
  }

  const langPrefix = (lang || '').toLowerCase().slice(0, 2);
  const byLang = list.filter((v) => (v.lang || '').toLowerCase().startsWith(langPrefix));

  // Prefer Google voices (tend to support rate/pitch well in Chrome)
  const googleByLang = byLang.filter((v) => /google/i.test(v.name));
  const googleAll = list.filter((v) => /google/i.test(v.name));

  // Naive gender guess for style preference
  const preferFemale = ['cheerful', 'friendly', 'calm'].includes((voiceStyle || '').toLowerCase());
  const preferMale = ['serious', 'energetic', 'professional'].includes((voiceStyle || '').toLowerCase());
  const isFemale = (name) => /female|samantha|eva|karen|joanna|clara|amelia|sofia|lucy/i.test(name);
  const isMale = (name) => /male|daniel|david|mike|john|bruce|alex|henry|liam|noah/i.test(name);

  const pickByGender = (voices) => {
    if (!voices.length) return null;
    if (preferFemale) {
      const f = voices.find((v) => isFemale(v.name));
      if (f) return f;
    }
    if (preferMale) {
      const m = voices.find((v) => isMale(v.name));
      if (m) return m;
    }
    return voices[0];
  };

  const gByLangPref = pickByGender(googleByLang);
  if (gByLangPref) return gByLangPref;

  const gAnyPref = pickByGender(googleAll);
  if (gAnyPref) return gAnyPref;

  // Fallback: any by language
  const anyByLangPref = pickByGender(byLang);
  if (anyByLangPref) return anyByLangPref;

  // Last resort: first available
  return list[0] || null;
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