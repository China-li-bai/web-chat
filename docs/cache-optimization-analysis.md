# TTS缓存系统问题分析与改进方案

## 当前实现分析

### 已完成的功能
1. ✅ wa-sqlite + IDB VFS 持久化存储
2. ✅ 内存回退机制（当SQLite初始化失败时）
3. ✅ SHA-256缓存键生成（text|voiceStyle|lang|provider:version）
4. ✅ 基本的缓存读写和清理功能
5. ✅ Practice页面已接入ttsCacheService

### 发现的问题

#### 1. 并发去重缺失 🔴
**问题**: 同一个缓存键的多次并发请求会导致重复的网络调用
```javascript
// 当前TTSWithCache.getOrGenerate()没有并发控制
// 如果用户快速点击多次"AI语音"按钮，会发起多个相同的TTS请求
```

**影响**: 
- 浪费API配额
- 增加响应延迟
- 可能导致竞态条件

#### 2. 可观测性不足 🟡
**问题**: 缺少关键指标监控
- 无缓存命中率统计
- 无请求延迟监控
- 无并发请求数量跟踪
- 无错误分类统计

#### 3. 缓存键策略不够健壮 🟡
**问题**: 
- 缺少schemaVersion，无法支持平滑迁移
- provider版本信息可能不够精确
- 没有考虑不同环境的差异化

#### 4. 错误处理不够精细 🟡
**问题**: 
- 没有区分不同类型的错误（网络超时、API配额、认证失败等）
- 缺少重试机制
- 错误信息对用户不够友好

## 改进方案

### Phase 1: 并发去重与请求合并 (优先级: 高)

#### 1.1 在TTSWithCache中添加并发控制
```javascript
class TTSWithCache {
  constructor(dao) {
    this.dao = dao;
    this._inited = false;
    this._pendingRequests = new Map(); // key -> Promise
  }

  async getOrGenerate(params, generator) {
    const key = await buildTtsKey(params);
    
    // 检查是否有相同key的请求正在进行
    if (this._pendingRequests.has(key)) {
      console.log(`[TTSWithCache] 合并并发请求: ${key}`);
      return this._pendingRequests.get(key);
    }
    
    // 创建新的请求Promise
    const requestPromise = this._doGetOrGenerate(key, params, generator);
    this._pendingRequests.set(key, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this._pendingRequests.delete(key);
    }
  }
}
```

#### 1.2 添加可观测性埋点
```javascript
class ObservabilityManager {
  constructor() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      networkRequests: 0,
      concurrentRequests: 0,
      errors: new Map(), // errorType -> count
      latencies: [] // 最近100次请求的延迟
    };
  }
  
  recordCacheHit(key) {
    this.metrics.cacheHits++;
    console.log(`[Observability] 缓存命中: ${key}`);
  }
  
  recordCacheMiss(key) {
    this.metrics.cacheMisses++;
    console.log(`[Observability] 缓存未命中: ${key}`);
  }
  
  getHitRate() {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? (this.metrics.cacheHits / total * 100).toFixed(2) : 0;
  }
}
```

### Phase 2: 缓存键策略优化 (优先级: 中)

#### 2.1 增强缓存键生成
```javascript
// 在buildTtsKey中添加schemaVersion和环境信息
const SCHEMA_VERSION = 'v2.1';
const ENV_INFO = typeof window !== 'undefined' ? 'web' : 'node';

export async function buildTtsKey(params) {
  const normalized = {
    schema: SCHEMA_VERSION,
    env: ENV_INFO,
    text: params.text || '',
    voiceStyle: params.voiceStyle || 'professional',
    lang: params.lang || 'en-US',
    provider: params.provider || 'gemini',
    version: params.version || 'v2.5-flash-preview-tts'
  };
  
  const keyString = `${normalized.schema}|${normalized.env}|${normalized.text}|${normalized.voiceStyle}|${normalized.lang}|${normalized.provider}:${normalized.version}`;
  return await sha256(keyString);
}
```

### Phase 3: 错误处理与重试机制 (优先级: 中)

#### 3.1 分级错误处理
```javascript
class ErrorHandler {
  static classify(error) {
    if (error.message.includes('401') || error.message.includes('API密鑰')) {
      return { type: 'AUTH_ERROR', retryable: false, userMessage: 'API密鑰無效，請檢查設置' };
    }
    if (error.message.includes('429') || error.message.includes('配額')) {
      return { type: 'QUOTA_ERROR', retryable: true, userMessage: 'API配額已用完，請稍後再試' };
    }
    if (error.message.includes('timeout') || error.message.includes('超时')) {
      return { type: 'TIMEOUT_ERROR', retryable: true, userMessage: '網絡連接超時，請重試' };
    }
    return { type: 'UNKNOWN_ERROR', retryable: false, userMessage: '未知錯誤，請重試' };
  }
}
```

## 实施计划

### 立即执行 (本次迭代)
1. ✅ 完成问题分析文档
2. 🔄 实现TTSWithCache并发去重机制
3. 🔄 添加基础可观测性埋点
4. 🔄 在Practice页面显示缓存来源和统计信息

### 下一迭代
1. 优化缓存键策略
2. 实现错误分级和重试机制
3. 添加配额管理和清理策略
4. 完善端到端测试

## 预期效果

### 性能提升
- 减少50%以上的重复API调用
- 提升缓存命中率到80%以上
- 降低平均响应时间30%

### 用户体验
- 更快的语音生成响应
- 更友好的错误提示
- 实时的缓存状态反馈

### 可维护性
- 完整的监控和诊断能力
- 更健壮的错误处理
- 支持平滑的版本迁移