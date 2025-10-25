// Tauri-based speech/TTS utilities
import { invoke } from '@tauri-apps/api/core';

export function isTauriApp() {
  return typeof window !== 'undefined' && window.__TAURI__;
}

/**
 * Speak text via Tauri backend (if available). Depending on your backend implementation,
 * this may play natively or return audio data. Here we assume a command 'text_to_speech'.
 * @param {string} text
 * @param {{ lang?: string, rate?: number, pitch?: number, volume?: number }} opts
 * @returns {Promise<void>} resolves when request is sent; errors are thrown on failure
 */
export async function speakTextTauri(text, opts = {}) {
  if (!isTauriApp()) {
    throw new Error('Not running in Tauri environment');
  }
  const { lang = 'en-US', rate = 1.0, pitch = 1.0, volume = 1.0 } = opts;
  try {
    await invoke('text_to_speech', { text, lang, rate, pitch, volume });
  } catch (e) {
    console.warn('[tauriSpeech] text_to_speech failed:', e);
    throw e;
  }
}