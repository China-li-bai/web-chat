import { useState, useEffect } from 'react';
import { isWebSpeechSupported, getVoices } from '@/lib/speech/webSpeech.js';

/** Clamp helper */
const clamp = (v, min, max, def) => {
  const num = typeof v === 'number' ? v : def;
  return Math.min(max, Math.max(min, num));
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
      }
    } catch (e) {
      console.warn('[useTTSSettings] load failed:', e);
    }
  }, [storageKey]);

  // Persist on changes
  useEffect(() => {
    try {
      const payload = { voiceLang, voiceRate, voicePitch, voiceVolume, selectedVoiceName };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {}
  }, [storageKey, voiceLang, voiceRate, voicePitch, voiceVolume, selectedVoiceName]);

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

  const resetDefaults = () => {
    setVoiceLang('en-US');
    setVoiceRate(1.0);
    setVoicePitch(1.0);
    setVoiceVolume(1.0);
    setSelectedVoiceName('');
  };

  const clearSaved = () => {
    try { localStorage.removeItem(storageKey); } catch {}
  };

  return {
    // state
    voiceLang, voiceRate, voicePitch, voiceVolume, selectedVoiceName, voices,
    // setters
    setVoiceLang, setVoiceRate, setVoicePitch, setVoiceVolume, setSelectedVoiceName, setVoices,
    // helpers
    resetDefaults, clearSaved,
  };
}