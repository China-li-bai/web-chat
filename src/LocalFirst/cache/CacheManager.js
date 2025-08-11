/**
 * 缓存管理器
 * 实现多层缓存策略，包括内存缓存和持久化缓存
 */

export class CacheManager {
  constructor(options = {}) {
    this.options = {
      policy: 'cache-first', // cache-first, network-first, cache-only, network-only
      maxSize: 50 * 1024 * 1024, // 50MB
      defaultTTL: 300000, // 5分钟
      memoryCache: true,
      ...options
    };

    this.storage = options.storage;
    this.memoryCache = new Map();
    this.isInitialized = false;
  }

  /**
   * 初始化缓存管理器
   */
  async init() {
    if (!this.storage) {
      throw new Error('Storage is required for CacheManager');
    }
    
    this.isInitialized = true;
    console.log('[CacheManager] 缓存管理器初始化完成');
  }

  /**
   * 获取缓存数据
   */
  async get(key, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }

    const policy = options.policy || this.options.policy;
    
    switch (policy) {
      case 'cache-first':
        return this._getCacheFirst(key, options);
      case 'network-first':
        return this._getNetworkFirst(key, options);
      case 'cache-only':
        return this._getCacheOnly(key, options);
      default:
        return this._getCacheFirst(key, options);
    }
  }

  /**
   * 设置缓存数据
   */
  async set(key, value, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }

    const ttl = options.ttl || this.options.defaultTTL;
    const metadata = {
      ...options.metadata,
      cachedAt: Date.now(),
      ttl
    };

    // 内存缓存
    if (this.options.memoryCache) {
      this.memoryCache.set(key, {
        value,
        metadata,
        expiresAt: Date.now() + ttl
      });
    }

    // 持久化缓存
    return this.storage.set(key, value, { ttl, metadata });
  }

  /**
   * 删除缓存
   */
  async delete(key) {
    if (!this.isInitialized) {
      await this.init();
    }

    // 先删除内存缓存
    this.memoryCache.delete(key);
    
    // 再删除持久化缓存
    const result = await this.storage.delete(key);
    return result;
  }

  /**
   * 清空所有缓存
   */
  async clear() {
    if (!this.isInitialized) {
      await this.init();
    }

    this.memoryCache.clear();
    return this.storage.clear();
  }

  /**
   * 获取缓存统计信息
   */
  async getStats() {
    if (!this.isInitialized) {
      return { memory: { count: 0, size: 0 }, storage: { count: 0, totalSize: 0 } };
    }

    const memoryStats = {
      count: this.memoryCache.size,
      size: this._calculateMemorySize()
    };

    const storageStats = await this.storage.getStats();

    return {
      memory: memoryStats,
      storage: storageStats
    };
  }

  /**
   * 缓存优先策略
   */
  async _getCacheFirst(key, options) {
    // 先检查内存缓存
    if (this.options.memoryCache) {
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem && memoryItem.expiresAt > Date.now()) {
        return { value: memoryItem.value, metadata: memoryItem.metadata, source: 'memory' };
      }
    }

    // 再检查持久化缓存
    const storageItem = await this.storage.get(key);
    if (storageItem) {
      // 回填内存缓存
      if (this.options.memoryCache) {
        this.memoryCache.set(key, {
          value: storageItem.value,
          metadata: storageItem.metadata,
          expiresAt: Date.now() + this.options.defaultTTL
        });
      }
      return { ...storageItem, source: 'storage' };
    }

    return null;
  }

  /**
   * 网络优先策略（预留接口）
   */
  async _getNetworkFirst(key, options) {
    // 网络优先策略的实现将在网络层完成
    // 这里先返回缓存数据
    return this._getCacheFirst(key, options);
  }

  /**
   * 仅缓存策略
   */
  async _getCacheOnly(key, options) {
    return this._getCacheFirst(key, options);
  }

  /**
   * 计算内存缓存大小
   */
  _calculateMemorySize() {
    let size = 0;
    for (const item of this.memoryCache.values()) {
      size += JSON.stringify(item).length;
    }
    return size;
  }

  /**
   * 销毁缓存管理器
   */
  async destroy() {
    this.memoryCache.clear();
    this.isInitialized = false;
  }
}

export default CacheManager;