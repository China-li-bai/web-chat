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
 * SHA-256 hash function with fallback support
 * @param {string} input - Input string to hash
 * @returns {Promise<string>} - Hex string hash
 */
async function sha256(input) {
  const data = new TextEncoder().encode(input);
  
  // Prefer Web Crypto API
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return hexFromArrayBuffer(digest);
  }

  // Node fallback (for vitest)
  const { createHash } = await import('node:crypto');
  const hash = createHash('sha256');
  hash.update(input, 'utf8');
  return hash.digest('hex');
}

/**
 * 构建 TTS 缓存键
 * 基于文本内容、语音风格、语言、提供商和版本生成唯一的缓存键
 * 
 * @param {{text: string, voiceStyle: string, lang: string, provider?: string, version?: string}} params
 * @returns {Promise<string>} SHA-256 哈希值
 */
export async function buildTtsKey(params) {
  // 缓存键架构版本，用于支持平滑迁移
  const SCHEMA_VERSION = 'v2.1';
  
  // 环境信息，区分不同运行环境
  const ENV_INFO = typeof window !== 'undefined' ? 'web' : 'node';
  
  // 标准化参数
  const normalized = {
    schema: SCHEMA_VERSION,
    env: ENV_INFO,
    text: normalizeText(params.text || ''),
    voiceStyle: params.voiceStyle || 'professional',
    lang: params.lang || 'en-US',
    provider: params.provider || 'gemini',
    version: params.version || 'v2.5-flash-preview-tts'
  };

  // 构建标准化的键字符串，包含架构版本和环境信息
  const keyString = `${normalized.schema}|${normalized.env}|${normalized.text}|${normalized.voiceStyle}|${normalized.lang}|${normalized.provider}:${normalized.version}`;
  
  const hash = await sha256(keyString);
  
  // 在开发环境下记录键构建信息
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    console.log(`[buildTtsKey] 构建缓存键:`, {
      schema: normalized.schema,
      env: normalized.env,
      textPreview: normalized.text.substring(0, 30) + '...',
      voiceStyle: normalized.voiceStyle,
      lang: normalized.lang,
      provider: normalized.provider,
      version: normalized.version,
      hash: hash.substring(0, 16) + '...'
    });
  }
  
  return hash;
}

/**
 * 获取当前缓存键架构版本
 * @returns {string} 架构版本号
 */
export function getCacheKeySchemaVersion() {
  return 'v2.1';
}

/**
 * 检查缓存键是否兼容当前架构版本
 * @param {string} key 缓存键
 * @param {object} metadata 缓存元数据
 * @returns {boolean} 是否兼容
 */
export function isCacheKeyCompatible(key, metadata) {
  const currentSchema = getCacheKeySchemaVersion();
  
  // 如果元数据中没有架构版本信息，认为是旧版本，不兼容
  if (!metadata?.schemaVersion) {
    return false;
  }
  
  // 检查架构版本是否匹配
  return metadata.schemaVersion === currentSchema;
}
