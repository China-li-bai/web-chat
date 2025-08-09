/**
 * Hash and cache-key utilities for TTS local-first cache.
 * - Uses Web Crypto API (SHA-256) when available
 * - Falls back to Node crypto (for Vitest)
 */

/**
 * Normalize text for key generation:
 * - Collapse whitespace
 * - Trim
 * - Keep case (TTS may be case-sensitive in some engines)
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Convert ArrayBuffer to hex string
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function hexFromArrayBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const h = bytes[i].toString(16).padStart(2, '0');
    hex += h;
  }
  return hex;
}

/**
 * Compute SHA-256 hex digest.
 * @param {string|Uint8Array|ArrayBuffer} input
 * @returns {Promise<string>}
 */
export async function sha256Hex(input) {
  // Normalize input to string or Uint8Array
  let data;
  if (typeof input === 'string') {
    // Browser crypto.subtle needs Uint8Array
    try {
      data = new TextEncoder().encode(input);
    } catch {
      // Node fallback won't need it
      data = input;
    }
  } else if (input instanceof ArrayBuffer) {
    data = new Uint8Array(input);
  } else {
    data = input;
  }

  // Prefer Web Crypto API
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return hexFromArrayBuffer(digest);
  }

  // Node fallback (for vitest)
  const { createHash } = await import('node:crypto');
  const hash = createHash('sha256');
  if (typeof input === 'string') {
    hash.update(input, 'utf8');
  } else if (data instanceof Uint8Array) {
    hash.update(Buffer.from(data));
  } else {
    hash.update(Buffer.from(data));
  }
  return hash.digest('hex');
}

/**
 * Build stable TTS cache key from payload parameters.
 * Include provider/version to avoid cross-engine or model-version collisions.
 * @param {{text:string, voiceStyle:string, lang:string, provider?:string, version?:string}} p
 * @returns {Promise<string>}
 */
export async function buildTtsKey(p) {
  const text = normalizeText(p?.text || '');
  const voiceStyle = p?.voiceStyle || '';
  const lang = p?.lang || '';
  const provider = p?.provider || 'unknown';
  const version = p?.version || '1';

  // Use a simple, readable payload string; avoid ambiguity with explicit separators.
  const payload = `${text}||${voiceStyle}||${lang}||${provider}:${version}`;
  return sha256Hex(payload);
}