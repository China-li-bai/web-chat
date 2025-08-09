import { buildTtsKey } from '../lib/hash.js';

/**
 * TTSWithCache
 * - 统一封装“先查缓存→未命中调用生成器→成功写缓存”的流程
 * - 通过可注入 DAO（SQLite/Memory），便于在测试中 mock/隔离外部依赖
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
  }

  async _ensureInit() {
    if (this._inited) return;
    if (this.dao?.init) {
      await this.dao.init();
    }
    this._inited = true;
  }

  /**
   * 获取或生成 TTS 音频
   * @param {{text:string, voiceStyle:string, lang:string, provider?:string, version?:string}} params
   * @param {() => Promise<{audioBlob: Blob, mimeType?: string, voiceName?: string, style?: string}>} generator
   * @returns {Promise<{audioBlob: Blob, source: 'cache'|'network', meta: any}>}
   */
  async getOrGenerate(params, generator) {
    if (!params?.text) throw new Error('getOrGenerate: params.text is required');
    await this._ensureInit();

    const key = await buildTtsKey(params);

    // 1) 查缓存
    const hit = await this.dao.get(key);
    if (hit && hit.audioBlob) {
      return { audioBlob: hit.audioBlob, source: 'cache', meta: hit.meta };
    }

    // 2) 未命中，调用生成器
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

    // 4) 返回网络生成结果
    return { audioBlob: result.audioBlob, source: 'network', meta: { key } };
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