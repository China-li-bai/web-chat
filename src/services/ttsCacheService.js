import { TtsCacheDaoSqlite } from '../lib/ttsCacheDao.sqlite.js';
import { TTSWithCache } from './ttsWithCache.js';

// 默认使用 wa-sqlite(IDB VFS) 并带内存回退
const dao = new TtsCacheDaoSqlite({
  maxBytes: 50 * 1024 * 1024,
  vfs: 'idb'
});
const svc = new TTSWithCache(dao);

// 初始化状态跟踪
let initPromise = null;
let initError = null;

/**
 * 预初始化缓存系统
 * 在应用启动时调用，确保缓存系统已经初始化
 * @returns {Promise<boolean>} 初始化是否成功
 */
export async function preInitCache() {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      console.log('[ttsCacheService] 开始预初始化缓存系统...');
      await svc._ensureInit();
      const stats = await svc.stats();
      console.log(`[ttsCacheService] 缓存系统初始化成功，当前缓存项: ${stats.count}，总大小: ${Math.round(stats.totalBytes/1024)}KB`);
      return true;
    } catch (err) {
      console.error('[ttsCacheService] 缓存系统初始化失败:', err);
      initError = err;
      return false;
    }
  })();
  
  return initPromise;
}

/**
 * 统一获取或生成（带本地缓存）
 * @param {{text:string, voiceStyle:string, lang:string, provider?:string, version?:string}} params
 * @param {() => Promise<{audioBlob: Blob, mimeType?: string, voiceName?: string, style?: string}>} generator
 */
export async function getOrGenerateTTS(params, generator) {
  // 确保缓存系统已初始化
  if (!initPromise) {
    await preInitCache();
  }
  
  // 如果初始化失败，记录警告但仍尝试使用
  if (initError) {
    console.warn('[ttsCacheService] 使用可能未完全初始化的缓存系统:', initError);
  }
  
  return svc.getOrGenerate(params, generator);
}

/** 清空全部本地缓存 */
export async function clearAllCache() {
  // 确保缓存系统已初始化
  if (!initPromise) {
    await preInitCache();
  }
  
  const result = await svc.clearAll();
  console.log('[ttsCacheService] 已清空所有缓存');
  return result;
}

/** 获取缓存统计信息 */
export async function cacheStats() {
  // 确保缓存系统已初始化
  if (!initPromise) {
    await preInitCache();
  }
  
  return svc.stats();
}

/** 获取缓存初始化状态 */
export function getCacheInitStatus() {
  return {
    initialized: !!initPromise,
    error: initError ? String(initError) : null,
    usingMemory: dao._usingMemory || false
  };
}

export default {
  preInitCache,
  getOrGenerateTTS,
  clearAllCache,
  cacheStats,
  getCacheInitStatus
};
