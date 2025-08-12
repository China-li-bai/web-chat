/**
 * 可观测性管理器
 * 负责收集和统计TTS缓存系统的关键指标
 */

export class ObservabilityManager {
  constructor() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      networkRequests: 0,
      concurrentRequests: 0,
      mergedRequests: 0, // 被合并的并发请求数
      errors: new Map(), // errorType -> count
      latencies: [], // 最近100次请求的延迟记录
      totalRequests: 0
    };
    
    this.startTime = Date.now();
    this.isEnabled = true; // 可通过环境变量或配置控制
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(key, latency = 0) {
    if (!this.isEnabled) return;
    
    this.metrics.cacheHits++;
    this.metrics.totalRequests++;
    this._recordLatency(latency);
    
    console.log(`[Observability] 🎯 缓存命中: ${key.substring(0, 16)}... (${latency}ms)`);
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(key, latency = 0) {
    if (!this.isEnabled) return;
    
    this.metrics.cacheMisses++;
    this.metrics.totalRequests++;
    this.metrics.networkRequests++;
    this._recordLatency(latency);
    
    console.log(`[Observability] ❌ 缓存未命中: ${key.substring(0, 16)}... (${latency}ms)`);
  }

  /**
   * 记录并发请求合并
   */
  recordRequestMerged(key) {
    if (!this.isEnabled) return;
    
    this.metrics.mergedRequests++;
    console.log(`[Observability] 🔗 并发请求合并: ${key.substring(0, 16)}...`);
  }

  /**
   * 记录并发请求开始
   */
  recordConcurrentStart() {
    if (!this.isEnabled) return;
    this.metrics.concurrentRequests++;
  }

  /**
   * 记录并发请求结束
   */
  recordConcurrentEnd() {
    if (!this.isEnabled) return;
    this.metrics.concurrentRequests = Math.max(0, this.metrics.concurrentRequests - 1);
  }

  /**
   * 记录错误
   */
  recordError(errorType, error) {
    if (!this.isEnabled) return;
    
    const count = this.metrics.errors.get(errorType) || 0;
    this.metrics.errors.set(errorType, count + 1);
    
    console.error(`[Observability] 🚨 错误记录: ${errorType}`, error?.message || error);
  }

  /**
   * 获取缓存命中率
   */
  getHitRate() {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? (this.metrics.cacheHits / total * 100).toFixed(2) : 0;
  }

  /**
   * 获取平均延迟
   */
  getAverageLatency() {
    if (this.metrics.latencies.length === 0) return 0;
    const sum = this.metrics.latencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.metrics.latencies.length);
  }

  /**
   * 获取完整统计信息
   */
  getStats() {
    const uptime = Date.now() - this.startTime;
    const hitRate = this.getHitRate();
    const avgLatency = this.getAverageLatency();
    
    return {
      uptime: Math.round(uptime / 1000), // 秒
      hitRate: `${hitRate}%`,
      totalRequests: this.metrics.totalRequests,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      networkRequests: this.metrics.networkRequests,
      concurrentRequests: this.metrics.concurrentRequests,
      mergedRequests: this.metrics.mergedRequests,
      averageLatency: `${avgLatency}ms`,
      errors: Object.fromEntries(this.metrics.errors),
      efficiency: this.metrics.mergedRequests > 0 
        ? `节省${this.metrics.mergedRequests}次重复请求` 
        : '无重复请求'
    };
  }

  /**
   * 打印统计报告
   */
  printReport() {
    if (!this.isEnabled) return;
    
    const stats = this.getStats();
    console.group('[Observability] 📊 TTS缓存系统统计报告');
    console.log('运行时间:', stats.uptime, '秒');
    console.log('缓存命中率:', stats.hitRate);
    console.log('总请求数:', stats.totalRequests);
    console.log('缓存命中:', stats.cacheHits);
    console.log('缓存未命中:', stats.cacheMisses);
    console.log('网络请求:', stats.networkRequests);
    console.log('当前并发:', stats.concurrentRequests);
    console.log('合并请求:', stats.mergedRequests);
    console.log('平均延迟:', stats.averageLatency);
    console.log('效率提升:', stats.efficiency);
    if (Object.keys(stats.errors).length > 0) {
      console.log('错误统计:', stats.errors);
    }
    console.groupEnd();
  }

  /**
   * 重置统计信息
   */
  reset() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      networkRequests: 0,
      concurrentRequests: 0,
      mergedRequests: 0,
      errors: new Map(),
      latencies: [],
      totalRequests: 0
    };
    this.startTime = Date.now();
    console.log('[Observability] 📊 统计信息已重置');
  }

  /**
   * 启用/禁用监控
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`[Observability] 监控已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 记录延迟（保留最近100次）
   */
  _recordLatency(latency) {
    this.metrics.latencies.push(latency);
    if (this.metrics.latencies.length > 100) {
      this.metrics.latencies.shift();
    }
  }
}

// 全局单例实例
export const observability = new ObservabilityManager();

export default observability;