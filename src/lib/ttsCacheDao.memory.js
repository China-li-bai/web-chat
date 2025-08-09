/**
 * In-memory TTS cache DAO implementation (for TDD and fallback).
 * Features:
 * - Keyed by SHA-256 key (see src/lib/hash.js)
 * - Enforce max cache bytes (default 50MB) via oldest-first eviction (created_at asc)
 * - Basic CRUD: get, put, stats, clearAll, clearExpired
 *
 * Record shape:
 * {
 *   key: string,
 *   text: string,
 *   voiceStyle: string,
 *   lang: string,
 *   provider?: string,
 *   version?: string,
 *   createdAt: number (ms),
 *   size: number (bytes),
 *   audioBlob: Blob
 * }
 */

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

function ensureBlob(input) {
  if (input instanceof Blob) return input;
  if (input instanceof Uint8Array) return new Blob([input], { type: 'audio/wav' });
  if (input instanceof ArrayBuffer) return new Blob([new Uint8Array(input)], { type: 'audio/wav' });
  // fallback for string/buffer
  return new Blob([input], { type: 'audio/wav' });
}

export class TtsCacheDaoMemory {
  /**
   * @param {{ maxBytes?: number }} options
   */
  constructor(options = {}) {
    this.maxBytes = typeof options.maxBytes === 'number' ? options.maxBytes : DEFAULT_MAX_BYTES;
    this._map = new Map(); // key -> record
    this._totalBytes = 0;
  }

  async init() {
    // no-op for memory driver
    return true;
  }

  /**
   * @param {string} key
   * @returns {Promise<null | { audioBlob: Blob, meta: any }>}
   */
  async get(key) {
    const rec = this._map.get(key);
    if (!rec) return null;
    return {
      audioBlob: rec.audioBlob,
      meta: {
        key: rec.key,
        text: rec.text,
        voiceStyle: rec.voiceStyle,
        lang: rec.lang,
        provider: rec.provider,
        version: rec.version,
        createdAt: rec.createdAt,
        size: rec.size
      }
    };
  }

  /**
   * @param {{
   *  key: string,
   *  text: string,
   *  voiceStyle: string,
   *  lang: string,
   *  provider?: string,
   *  version?: string,
   *  audioBlob: Blob | Uint8Array | ArrayBuffer,
   *  createdAt?: number
   * }} p
   */
  async put(p) {
    if (!p || !p.key) throw new Error('put: key is required');
    const audioBlob = ensureBlob(p.audioBlob);
    const size = audioBlob.size || 0;

    // if exists, remove old size
    const existing = this._map.get(p.key);
    if (existing) {
      this._totalBytes -= existing.size || 0;
    }

    const rec = {
      key: p.key,
      text: p.text || '',
      voiceStyle: p.voiceStyle || '',
      lang: p.lang || '',
      provider: p.provider || 'unknown',
      version: p.version || '1',
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
      size,
      audioBlob
    };

    this._map.set(p.key, rec);
    this._totalBytes += size;

    await this._enforceMaxBytes();
  }

  async stats() {
    return {
      count: this._map.size,
      totalBytes: this._totalBytes
    };
  }

  async clearAll() {
    this._map.clear();
    this._totalBytes = 0;
  }

  /**
   * Delete records with createdAt < beforeTs
   * @param {number} beforeTs
   */
  async clearExpired(beforeTs) {
    let freed = 0;
    for (const [k, rec] of this._map) {
      if (rec.createdAt < beforeTs) {
        freed += rec.size || 0;
        this._map.delete(k);
      }
    }
    this._totalBytes -= freed;
    if (this._totalBytes < 0) this._totalBytes = 0;
  }

  async _enforceMaxBytes() {
    if (this._totalBytes <= this.maxBytes) return;

    // Evict oldest first (by createdAt)
    const entries = Array.from(this._map.values()).sort((a, b) => a.createdAt - b.createdAt);
    for (const rec of entries) {
      if (this._totalBytes <= this.maxBytes) break;
      this._map.delete(rec.key);
      this._totalBytes -= rec.size || 0;
    }
    if (this._totalBytes < 0) this._totalBytes = 0;
  }
}

export default TtsCacheDaoMemory;