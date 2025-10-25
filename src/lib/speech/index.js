import { isWebSpeechSupported, getVoices, pickVoice, cancelSpeech, speakTextWeb } from './webSpeech.js'
import { isTauriApp, speakTextTauri } from './tauriSpeech.js'
import { speakTextExpressiveWeb } from './expressive.js'

/**
 * Universal speakText that tries Tauri first (if running in Tauri), otherwise Web Speech API.
 * @param {string} text
 * @param {Object} options
 * @param {string} [options.lang]
 * @param {number} [options.rate]
 * @param {number} [options.pitch]
 * @param {number} [options.volume]
 * @param {string} [options.voiceName]
 * @param {boolean} [options.loop]
 * @param {(ev: any) => void} [options.onStart]
 * @param {(ev: any) => void} [options.onEnd]
 * @param {(ev: any) => void} [options.onError]
 * @returns {Promise<{ mode: 'tauri' | 'web', handle?: { utterance: SpeechSynthesisUtterance, speak: () => void, cancel: () => void } }>} result
 */
export async function speakText(text, options = {}) {
  if (isTauriApp()) {
    await speakTextTauri(text, options)
    return { mode: 'tauri' }
  }
  if (!isWebSpeechSupported()) {
    throw new Error('No available speech engine: neither Tauri nor Web Speech supported')
  }
  const handle = speakTextWeb(text, options)
  handle.speak()
  return { mode: 'web', handle }
}

// New: expressive variant (Web-only enhancements; Tauri falls back to normal backend speak)
export async function speakTextExpressive(text, options = {}) {
  if (isTauriApp()) {
    await speakTextTauri(text, options)
    return { mode: 'tauri' }
  }
  if (!isWebSpeechSupported()) {
    throw new Error('No available speech engine: neither Tauri nor Web Speech supported')
  }
  const handle = speakTextExpressiveWeb(text, options)
  handle.speak()
  return { mode: 'web', handle }
}

export { isWebSpeechSupported, getVoices, pickVoice, cancelSpeech }
export { isTauriApp }