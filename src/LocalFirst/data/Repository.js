/**
 * 数据仓库
 * 提供统一的数据访问接口，整合缓存、同步和网络功能
 */

export class Repository {
  constructor(options = {}) {
    this.options = {
      defaultCachePolicy: 'cache-first',
      defaultTTL: 300000, // 5分钟
      ...options
    };

    this.cacheManager = options.cacheManager;
    this.syncManager = options.syncManager;
    this.networkMonitor = options.networkMonitor;
    
    this.isInitialized = false;
  }

  /**
   * 初始化数据仓库
   */
  async init() {
    if (!this.cacheManager) {
      throw new Error('CacheManager is required for Repository');
    }
    
    if (!this.syncManager) {
      throw new Error('SyncManager is required for Repository');
    }
    
    if (!this.networkMonitor) {
      throw new Error('NetworkMonitor is required for Repository');
    }

    this.isInitialized = true;
    console.log('[Repository] 数据仓库初始化完成');
  }

  /**
   * 获取数据
   */
  async get(key, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }

    const policy = options.policy || this.options.defaultCachePolicy;
    
    try {
      switch (policy) {
        case 'cache-first':
          return await this._getCacheFirst(key, options);
        case 'network-first':
          return await this._getNetworkFirst(key, options);
        case 'cache-only':
          return await this._getCacheOnly(key, options);
        case 'network-only':
          return await this._getNetworkOnly(key, options);
        default:
          return await this._getCacheFirst(key, options);
      }
    } catch (error) {
      console.error(`[Repository] 获取数据失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 设置数据
   */
  async set(key, data, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const ttl = options.ttl || this.options.defaultTTL;
      const metadata = {
        ...options.metadata,
        source: 'local',
        updatedAt: Date.now()
      };

      // 存储到缓存
      await this.cacheManager.set(key, data, { ttl, metadata });

      // 如果在线，添加到同步队列
      if (this.networkMonitor.isOnline() && options.sync !== false) {
        await this.syncManager.queueOperation({
          type: 'create',
          key,
          data,
          metadata
        });
      }

      return { success: true, source: 'local' };
    } catch (error) {
      console.error(`[Repository] 设置数据失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 更新数据
   */
  async update(key, data, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const ttl = options.ttl || this.options.defaultTTL;
      const metadata = {
        ...options.metadata,
        source: 'local',
        updatedAt: Date.now()
      };

      // 更新缓存
      await this.cacheManager.set(key, data, { ttl, metadata });

      // 如果在线，添加到同步队列
      if (this.networkMonitor.isOnline() && options.sync !== false) {
        await this.syncManager.queueOperation({
          type: 'update',
          key,
          data,
          metadata
        });
      }

      return { success: true, source: 'local' };
    } catch (error) {
      console.error(`[Repository] 更新数据失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 删除数据
   */
  async delete(key, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // 从缓存删除
      await this.cacheManager.delete(key);

      // 如果在线，添加到同步队列
      if (this.networkMonitor.isOnline() && options.sync !== false) {
        await this.syncManager.queueOperation({
          type: 'delete',
          key
        });
      }

      return { success: true, source: 'local' };
    } catch (error) {
      console.error(`[Repository] 删除数据失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 查询数据
   */
  async query(pattern, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // 目前只支持从缓存查询
      // 未来可以扩展支持网络查询
      const keys = await this.cacheManager.storage.keys(pattern);
      const results = [];

      for (const key of keys) {
        const item = await this.cacheManager.get(key);
        if (item) {
          results.push({
            key,
            value: item.value,
            metadata: item.metadata
          });
        }
      }

      return results;
    } catch (error) {
      console.error(`[Repository] 查询数据失败: ${pattern}`, error);
      throw error;
    }
  }

  /**
   * 缓存优先策略
   */
  async _getCacheFirst(key, options) {
    // 先尝试从缓存获取
    const cachedData = await this.cacheManager.get(key, options);
    if (cachedData) {
      return cachedData;
    }

    // 缓存未命中且在线时，尝试从网络获取
    if (this.networkMonitor.isOnline() && options.fallbackToNetwork !== false) {
      return await this._fetchFromNetwork(key, options);
    }

    return null;
  }

  /**
   * 网络优先策略
   */
  async _getNetworkFirst(key, options) {
    // 如果在线，先尝试从网络获取
    if (this.networkMonitor.isOnline()) {
      try {
        return await this._fetchFromNetwork(key, options);
      } catch (error) {
        console.warn(`[Repository] 网络获取失败，回退到缓存: ${key}`, error);
      }
    }

    // 网络失败或离线时，从缓存获取
    return await this.cacheManager.get(key, options);
  }

  /**
   * 仅缓存策略
   */
  async _getCacheOnly(key, options) {
    return await this.cacheManager.get(key, options);
  }

  /**
   * 仅网络策略
   */
  async _getNetworkOnly(key, options) {
    if (!this.networkMonitor.isOnline()) {
      throw new Error('Network is offline and network-only policy is specified');
    }

    return await this._fetchFromNetwork(key, options);
  }

  /**
   * 从网络获取数据（预留接口）
   */
  async _fetchFromNetwork(key, options) {
    // 这里应该实现实际的网络请求逻辑
    // 目前只是模拟网络请求
    console.log(`[Repository] 模拟网络请求: ${key}`);
    
    if (options.networkFetcher && typeof options.networkFetcher === 'function') {
      try {
        const networkData = await options.networkFetcher(key);
        
        // 将网络数据缓存
        if (networkData && options.cacheNetworkData !== false) {
          const ttl = options.ttl || this.options.defaultTTL;
          await this.cacheManager.set(key, networkData, { 
            ttl, 
            metadata: { 
              source: 'network', 
              fetchedAt: Date.now() 
            } 
          });
        }
        
        return {
          value: networkData,
          metadata: { source: 'network', fetchedAt: Date.now() },
          source: 'network'
        };
      } catch (error) {
        console.error(`[Repository] 网络请求失败: ${key}`, error);
        throw error;
      }
    }

    // 如果没有提供网络获取器，返回null
    return null;
  }

  /**
   * 获取仓库统计信息
   */
  async getStats() {
    if (!this.isInitialized) {
      return { initialized: false };
    }

    const [cacheStats, syncStats, networkStats] = await Promise.all([
      this.cacheManager.getStats(),
      this.syncManager.getStats(),
      this.networkMonitor.getStats()
    ]);

    return {
      initialized: true,
      cache: cacheStats,
      sync: syncStats,
      network: networkStats
    };
  }

  /**
   * 销毁数据仓库
   */
  async destroy() {
    this.isInitialized = false;
    console.log('[Repository] 数据仓库已销毁');
  }
}

export default Repository;