/**
 * 网络状态监控器
 * 监控网络连接状态，提供在线/离线事件
 */

export class NetworkMonitor {
  constructor(options = {}) {
    this.options = {
      checkInterval: 5000, // 5秒检查一次
      timeout: 3000, // 3秒超时
      ...options
    };

    this.isOnlineState = navigator?.onLine ?? true;
    this.listeners = new Map();
    this.checkTimer = null;
    this.isInitialized = false;
  }

  /**
   * 初始化网络监控器
   */
  async init() {
    // 监听浏览器网络事件
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this._handleOnline.bind(this));
      window.addEventListener('offline', this._handleOffline.bind(this));
    }

    // 启动定期检查
    this._startPeriodicCheck();

    this.isInitialized = true;
    console.log('[NetworkMonitor] 网络监控器初始化完成');
  }

  /**
   * 检查当前是否在线
   */
  isOnline() {
    return this.isOnlineState;
  }

  /**
   * 添加事件监听器
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * 手动检查网络状态
   */
  async checkNetworkStatus() {
    try {
      // 尝试发送一个轻量级的网络请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      const isOnline = response.ok;
      this._updateOnlineStatus(isOnline);
      
      return isOnline;
    } catch (error) {
      // 网络请求失败，认为离线
      this._updateOnlineStatus(false);
      return false;
    }
  }

  /**
   * 获取网络统计信息
   */
  async getStats() {
    return {
      isOnline: this.isOnlineState,
      lastCheck: Date.now(),
      listeners: {
        online: this.listeners.get('online')?.size || 0,
        offline: this.listeners.get('offline')?.size || 0
      }
    };
  }

  /**
   * 销毁网络监控器
   */
  async destroy() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this._handleOnline.bind(this));
      window.removeEventListener('offline', this._handleOffline.bind(this));
    }

    this.listeners.clear();
    this.isInitialized = false;
    console.log('[NetworkMonitor] 网络监控器已销毁');
  }

  /**
   * 处理在线事件
   */
  _handleOnline() {
    console.log('[NetworkMonitor] 浏览器报告网络已连接');
    this._updateOnlineStatus(true);
  }

  /**
   * 处理离线事件
   */
  _handleOffline() {
    console.log('[NetworkMonitor] 浏览器报告网络已断开');
    this._updateOnlineStatus(false);
  }

  /**
   * 更新在线状态
   */
  _updateOnlineStatus(isOnline) {
    const wasOnline = this.isOnlineState;
    this.isOnlineState = isOnline;

    // 状态发生变化时触发事件
    if (wasOnline !== isOnline) {
      const event = isOnline ? 'online' : 'offline';
      this._emit(event);
      console.log(`[NetworkMonitor] 网络状态变化: ${wasOnline ? '在线' : '离线'} -> ${isOnline ? '在线' : '离线'}`);
    }
  }

  /**
   * 触发事件
   */
  _emit(event) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error(`[NetworkMonitor] 事件回调执行失败: ${event}`, error);
        }
      });
    }
  }

  /**
   * 启动定期检查
   */
  _startPeriodicCheck() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.checkTimer = setInterval(async () => {
      await this.checkNetworkStatus();
    }, this.options.checkInterval);
  }
}

export default NetworkMonitor;