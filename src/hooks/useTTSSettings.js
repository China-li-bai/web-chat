import { useState, useEffect } from 'react';
import { isWebSpeechSupported, getVoices, pickDefaultVoiceByBrowser, getStyleParamPreset } from '@/lib/speech/webSpeech.js';

/** Clamp helper */
const clamp = (v, min, max, def) => {
  const num = typeof v === 'number' ? v : def;
  return Math.min(max, Math.max(min, num));
};

/** Safe boolean */
const toBool = (v, def = false) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true';
  return def;
};

/**
 * React hook: manage TTS settings + system voices + localStorage persistence
 * @param {string} storageKey localStorage key (default 'tts_settings')
 */
export default function useTTSSettings(storageKey = 'tts_settings') {
  const [voiceLang, setVoiceLang] = useState('en-US');
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const [voices, setVoices] = useState([]);

  // Expressive + style presets
  const [voiceStyle, setVoiceStyle] = useState('professional');
  const [expressiveEnabled, setExpressiveEnabled] = useState(true);
  const [segmentPauseMs, setSegmentPauseMs] = useState(150);
  const [expressiveJitter, setExpressiveJitter] = useState(0.06);
  const [linkStyleParams, setLinkStyleParams] = useState(true);

  // Load persisted settings once
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.voiceLang) setVoiceLang(s.voiceLang);
        if (typeof s.voiceRate !== 'undefined') setVoiceRate(clamp(s.voiceRate, 0.5, 2.0, 1.0));
        if (typeof s.voicePitch !== 'undefined') setVoicePitch(clamp(s.voicePitch, 0.0, 2.0, 1.0));
        if (typeof s.voiceVolume !== 'undefined') setVoiceVolume(clamp(s.voiceVolume, 0.0, 1.0, 1.0));
        if (s.selectedVoiceName) setSelectedVoiceName(s.selectedVoiceName);
        if (s.voiceStyle) setVoiceStyle(s.voiceStyle);
        if (typeof s.expressiveEnabled !== 'undefined') setExpressiveEnabled(toBool(s.expressiveEnabled, true));
        if (typeof s.segmentPauseMs !== 'undefined') setSegmentPauseMs(clamp(s.segmentPauseMs, 60, 800, 150));
        if (typeof s.expressiveJitter !== 'undefined') setExpressiveJitter(clamp(s.expressiveJitter, 0.0, 0.5, 0.06));
        if (typeof s.linkStyleParams !== 'undefined') setLinkStyleParams(toBool(s.linkStyleParams, true));
      }
    } catch (e) {
      console.warn('[useTTSSettings] load failed:', e);
    }
  }, [storageKey]);

  // Persist on changes
  useEffect(() => {
    try {
      const payload = {
        voiceLang, voiceRate, voicePitch, voiceVolume, selectedVoiceName,
        voiceStyle, expressiveEnabled, segmentPauseMs, expressiveJitter, linkStyleParams,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {}
  }, [storageKey, voiceLang, voiceRate, voicePitch, voiceVolume, selectedVoiceName, voiceStyle, expressiveEnabled, segmentPauseMs, expressiveJitter, linkStyleParams]);

  // Load system voices
  useEffect(() => {
    if (!isWebSpeechSupported()) return;
    const update = () => {
      try { setVoices(getVoices()); } catch (e) {}
    };
    update();
    try { window.speechSynthesis.onvoiceschanged = update; } catch {}
    return () => {
      try { window.speechSynthesis.onvoiceschanged = null; } catch {}
    };
  }, []);

  // Auto-select recommended default voice per browser when no selection or invalid saved selection
  useEffect(() => {
    if (!voices || voices.length === 0) return;
    const hasSelected = selectedVoiceName && voices.some(v => v.name === selectedVoiceName);
    if (!hasSelected) {
      try {
        const v = pickDefaultVoiceByBrowser({ lang: voiceLang, voiceStyle });
        if (v) setSelectedVoiceName(v.name);
      } catch {}
    }
  }, [voices, selectedVoiceName, voiceLang, voiceStyle]);

  // Map voice style to base rate/pitch presets by browser
  useEffect(() => {
    if (!linkStyleParams) return;
    try {
      const preset = getStyleParamPreset({ style: voiceStyle, lang: voiceLang });
      if (preset) {
        const { rate, pitch } = preset;
        setVoiceRate(clamp(rate, 0.5, 2.0, 1.0));
        setVoicePitch(clamp(pitch, 0.0, 2.0, 1.0));
      }
    } catch {}
  }, [voiceStyle, voiceLang, linkStyleParams]);

  const resetDefaults = () => {
    setVoiceLang('en-US');
    setVoiceRate(1.0);
    setVoicePitch(1.0);
    setVoiceVolume(1.0);
    setSelectedVoiceName('');
    setVoiceStyle('professional');
    setExpressiveEnabled(true);
    setSegmentPauseMs(150);
    setExpressiveJitter(0.06);
    setLinkStyleParams(true);
  };

  const clearSaved = () => {
    try { localStorage.removeItem(storageKey); } catch {}
  };

  return {
    // state
    voiceLang, voiceRate, voicePitch, voiceVolume, selectedVoiceName, voices,
    voiceStyle, expressiveEnabled, segmentPauseMs, expressiveJitter, linkStyleParams,
    // setters
    setVoiceLang, setVoiceRate, setVoicePitch, setVoiceVolume, setSelectedVoiceName, setVoices,
    setVoiceStyle, setExpressiveEnabled, setSegmentPauseMs, setExpressiveJitter, setLinkStyleParams,
    // helpers
    resetDefaults, clearSaved,
  };
}