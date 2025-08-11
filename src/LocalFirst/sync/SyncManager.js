/**
 * 同步管理器
 * 处理在线/离线状态切换时的数据同步
 */

export class SyncManager {
  constructor(options = {}) {
    this.options = {
      syncInterval: 30000, // 30秒
      conflictStrategy: 'client-wins', // client-wins, server-wins, merge
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    };

    this.storage = options.storage;
    this.networkMonitor = options.networkMonitor;
    
    this.syncQueue = new Map(); // 待同步的操作队列
    this.isInitialized = false;
    this.isSyncing = false;
    this.syncTimer = null;
  }

  /**
   * 初始化同步管理器
   */
  async init() {
    if (!this.storage) {
      throw new Error('Storage is required for SyncManager');
    }
    
    if (!this.networkMonitor) {
      throw new Error('NetworkMonitor is required for SyncManager');
    }

    // 监听网络状态变化
    this.networkMonitor.on('online', () => this._onNetworkOnline());
    this.networkMonitor.on('offline', () => this._onNetworkOffline());

    // 启动定期同步
    this._startPeriodicSync();

    this.isInitialized = true;
    console.log('[SyncManager] 同步管理器初始化完成');
  }

  /**
   * 添加操作到同步队列
   */
  async queueOperation(operation) {
    if (!this.isInitialized) {
      await this.init();
    }

    const operationId = this._generateOperationId();
    const queueItem = {
      id: operationId,
      ...operation,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    this.syncQueue.set(operationId, queueItem);
    
    // 如果在线，立即尝试同步
    if (this.networkMonitor.isOnline()) {
      await this._syncOperation(queueItem);
    }

    return operationId;
  }

  /**
   * 立即执行同步
   */
  async syncNow() {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.isSyncing) {
      console.log('[SyncManager] 同步正在进行中，跳过');
      return;
    }

    if (!this.networkMonitor.isOnline()) {
      console.log('[SyncManager] 网络离线，无法同步');
      return;
    }

    await this._performSync();
  }

  /**
   * 获取同步统计信息
   */
  async getStats() {
    const pendingOperations = Array.from(this.syncQueue.values())
      .filter(op => op.status === 'pending');
    
    const failedOperations = Array.from(this.syncQueue.values())
      .filter(op => op.status === 'failed');

    return {
      totalOperations: this.syncQueue.size,
      pendingOperations: pendingOperations.length,
      failedOperations: failedOperations.length,
      isSyncing: this.isSyncing,
      isOnline: this.networkMonitor?.isOnline() || false
    };
  }

  /**
   * 清空同步队列
   */
  async clearQueue() {
    this.syncQueue.clear();
    console.log('[SyncManager] 同步队列已清空');
  }

  /**
   * 销毁同步管理器
   */
  async destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.networkMonitor) {
      this.networkMonitor.off('online', this._onNetworkOnline);
      this.networkMonitor.off('offline', this._onNetworkOffline);
    }

    this.syncQueue.clear();
    this.isInitialized = false;
    console.log('[SyncManager] 同步管理器已销毁');
  }

  /**
   * 网络上线处理
   */
  async _onNetworkOnline() {
    console.log('[SyncManager] 网络已连接，开始同步');
    await this._performSync();
  }

  /**
   * 网络离线处理
   */
  _onNetworkOffline() {
    console.log('[SyncManager] 网络已断开');
  }

  /**
   * 启动定期同步
   */
  _startPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      if (this.networkMonitor.isOnline() && !this.isSyncing) {
        await this._performSync();
      }
    }, this.options.syncInterval);
  }

  /**
   * 执行同步操作
   */
  async _performSync() {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    
    try {
      const pendingOperations = Array.from(this.syncQueue.values())
        .filter(op => op.status === 'pending')
        .sort((a, b) => a.timestamp - b.timestamp);

      console.log(`[SyncManager] 开始同步 ${pendingOperations.length} 个操作`);

      for (const operation of pendingOperations) {
        await this._syncOperation(operation);
      }

      // 清理已完成的操作
      this._cleanupCompletedOperations();
      
    } catch (error) {
      console.error('[SyncManager] 同步过程中发生错误:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 同步单个操作
   */
  async _syncOperation(operation) {
    try {
      // 这里应该调用实际的API进行同步
      // 目前只是模拟同步成功
      console.log(`[SyncManager] 同步操作: ${operation.type} - ${operation.key}`);
      
      operation.status = 'completed';
      operation.completedAt = Date.now();
      
    } catch (error) {
      console.error(`[SyncManager] 同步操作失败: ${operation.id}`, error);
      
      operation.retries++;
      if (operation.retries >= this.options.maxRetries) {
        operation.status = 'failed';
        operation.error = error.message;
      } else {
        // 延迟重试
        setTimeout(() => {
          if (this.networkMonitor.isOnline()) {
            this._syncOperation(operation);
          }
        }, this.options.retryDelay * operation.retries);
      }
    }
  }

  /**
   * 清理已完成的操作
   */
  _cleanupCompletedOperations() {
    const completedOperations = Array.from(this.syncQueue.entries())
      .filter(([_, op]) => op.status === 'completed');

    for (const [id] of completedOperations) {
      this.syncQueue.delete(id);
    }

    if (completedOperations.length > 0) {
      console.log(`[SyncManager] 清理了 ${completedOperations.length} 个已完成的操作`);
    }
  }

  /**
   * 生成操作ID
   */
  _generateOperationId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default SyncManager;