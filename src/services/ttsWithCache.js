import { buildTtsKey, isCacheKeyCompatible } from '../lib/hash.js';
import { observability } from './observabilityManager.js';

/**
 * TTSWithCache
 * - 统一封装"先查缓存→未命中调用生成器→成功写缓存"的流程
 * - 通过可注入 DAO（SQLite/Memory），便于在测试中 mock/隔离外部依赖
 * - 支持并发去重：同一缓存键的并发请求会被合并，避免重复的网络调用
 * - 集成可观测性：记录缓存命中率、延迟、并发数等关键指标
 *
 * DAO 接口约定：
 *  - init(): Promise<boolean>
 *  - get(key): Promise<null | { audioBlob: Blob, meta: any }>
 *  - put({ key, text, voiceStyle, lang, provider, version, audioBlob, createdAt }): Promise<void>
 *  - stats(): Promise<{ count:number, totalBytes:number }>
 *  - clearAll(): Promise<void>
 *  - clearExpired(beforeTs:number): Promise<void>
 */
export class TTSWithCache {
  /**
   * @param {object} dao 参见上面的接口约定
   */
  constructor(dao) {
    this.dao = dao;
    this._inited = false;
    // 并发去重：存储正在进行的请求Promise
    this._pendingRequests = new Map(); // key -> Promise<result>
  }

  async _ensureInit() {
    if (this._inited) return;
    if (this.dao?.init) {
      await this.dao.init();
    }
    this._inited = true;
  }

  /**
   * 获取或生成 TTS 音频（支持并发去重和可观测性）
   * @param {{text:string, voiceStyle:string, lang:string, provider?:string, version?:string}} params
   * @param {() => Promise<{audioBlob: Blob, mimeType?: string, voiceName?: string, style?: string}>} generator
   * @returns {Promise<{audioBlob: Blob, source: 'cache'|'network', meta: any}>}
   */
  async getOrGenerate(params, generator) {
    if (!params?.text) throw new Error('getOrGenerate: params.text is required');
    await this._ensureInit();

    const startTime = Date.now();
    const key = await buildTtsKey(params);

    // 并发去重：检查是否有相同key的请求正在进行
    if (this._pendingRequests.has(key)) {
      observability.recordRequestMerged(key);
      console.log(`[TTSWithCache] 🔗 合并并发请求: ${key.substring(0, 16)}...`);
      return await this._pendingRequests.get(key);
    }

    // 创建新的请求Promise并记录并发状态
    observability.recordConcurrentStart();
    const requestPromise = this._doGetOrGenerate(key, params, generator, startTime);
    this._pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // 清理并发状态
      this._pendingRequests.delete(key);
      observability.recordConcurrentEnd();
    }
  }

  /**
   * 实际执行获取或生成逻辑（内部方法）
   */
  async _doGetOrGenerate(key, params, generator, startTime) {
    try {
      // 1) 查缓存
      const hit = await this.dao.get(key);
      if (hit && hit.audioBlob) {
        // 检查缓存键兼容性
        if (isCacheKeyCompatible(key, hit.meta)) {
          const latency = Date.now() - startTime;
          observability.recordCacheHit(key, latency);
          console.log(`[TTSWithCache] ✅ 缓存命中且兼容: ${key.substring(0, 16)}...`);
          return { audioBlob: hit.audioBlob, source: 'cache', meta: hit.meta };
        } else {
          // 缓存不兼容，记录并忽略，继续走网络生成流程
          console.log(`[TTSWithCache] ⚠️ 缓存不兼容，架构版本不匹配: ${key.substring(0, 16)}...`);
          observability.recordError('CACHE_INCOMPATIBLE', new Error('Cache schema version mismatch'));
          // 可选：删除不兼容的缓存项
          try {
            if (this.dao.delete) {
              await this.dao.delete(key);
              console.log(`[TTSWithCache] 🗑️ 已删除不兼容的缓存项: ${key.substring(0, 16)}...`);
            }
          } catch (deleteError) {
            console.warn(`[TTSWithCache] 删除不兼容缓存项失败:`, deleteError);
          }
        }
      }

      // 2) 缓存未命中，调用生成器
      const latency = Date.now() - startTime;
      observability.recordCacheMiss(key, latency);
      
      console.log(`[TTSWithCache] 🌐 缓存未命中，调用生成器: ${key.substring(0, 16)}...`);
      const result = await generator();
      if (!result || !result.audioBlob) {
        throw new Error('TTS generator did not return audioBlob');
      }

      // 3) 写缓存（带元信息）
      await this.dao.put({
        key,
        text: params.text || '',
        voiceStyle: params.voiceStyle || '',
        lang: params.lang || '',
        provider: params.provider || 'unknown',
        version: params.version || '1',
        audioBlob: result.audioBlob,
        createdAt: Date.now()
      });

      console.log(`[TTSWithCache] ✅ 网络生成并缓存成功: ${key.substring(0, 16)}...`);
      
      // 4) 返回网络生成结果
      return { audioBlob: result.audioBlob, source: 'network', meta: { key } };
      
    } catch (error) {
      // 记录错误
      const errorType = this._classifyError(error);
      observability.recordError(errorType, error);
      throw error;
    }
  }

  /**
   * 错误分类（用于统计）
   */
  _classifyError(error) {
    const message = error?.message || '';
    if (message.includes('401') || message.includes('API密鑰')) return 'AUTH_ERROR';
    if (message.includes('429') || message.includes('配額')) return 'QUOTA_ERROR';
    if (message.includes('timeout') || message.includes('超时')) return 'TIMEOUT_ERROR';
    if (message.includes('network') || message.includes('网络')) return 'NETWORK_ERROR';
    return 'UNKNOWN_ERROR';
  }

  async clearAll() {
    await this._ensureInit();
    return this.dao.clearAll();
  }

  async clearExpired(beforeTs) {
    await this._ensureInit();
    return this.dao.clearExpired(beforeTs);
  }

  async stats() {
    await this._ensureInit();
    return this.dao.stats();
  }
}

export default TTSWithCache;