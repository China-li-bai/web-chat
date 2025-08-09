import { TtsCacheDaoSqlite } from '../lib/ttsCacheDao.sqlite.js';
import { TTSWithCache } from './ttsWithCache.js';

// 默认使用 wa-sqlite(IDB VFS) 并带内存回退
const dao = new TtsCacheDaoSqlite({
  maxBytes: 50 * 1024 * 1024,
  vfs: 'idb'
});
const svc = new TTSWithCache(dao);

/**
 * 统一获取或生成（带本地缓存）
 * @param {{text:string, voiceStyle:string, lang:string, provider?:string, version?:string}} params
 * @param {() => Promise<{audioBlob: Blob, mimeType?: string, voiceName?: string, style?: string}>} generator
 */
export async function getOrGenerateTTS(params, generator) {
  return svc.getOrGenerate(params, generator);
}

/** 清空全部本地缓存 */
export async function clearAllCache() {
  return svc.clearAll();
}

/** 获取缓存统计信息 */
export async function cacheStats() {
  return svc.stats();
}

export default {
  getOrGenerateTTS,
  clearAllCache,
  cacheStats
};