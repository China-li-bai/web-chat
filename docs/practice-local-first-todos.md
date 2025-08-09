# 口语练习页面 Local-First 语音缓存系统 - 任务清单

## 项目概述
将口语练习页面（/practice）的AI语音生成功能改造为基于 wa-sqlite 的 local-first 架构，实现语音的本地缓存和离线使用。

## 当前状态分析
- ✅ 已有 Practice.jsx 页面实现基本功能
- ✅ 已有 apiManager.js 实现基于 localStorage 的缓存
- ✅ 已有后端 SQLite 数据库结构
- ❌ 前端未集成 wa-sqlite
- ❌ 语音缓存未使用数据库存储
- ❌ 缺少离线优先的数据同步机制

---

## 🎯 核心任务清单

### Phase 1: 基础设施搭建
- [ ] **1.1** 安装和配置 wa-sqlite 依赖
  - [ ] 添加 `wa-sqlite` 到 package.json
  - [ ] 添加 `@sqlite.org/sqlite-wasm` 依赖
  - [ ] 配置 Vite 支持 WASM 文件

- [ ] **1.2** 创建本地数据库管理器
  - [ ] 创建 `src/utils/localDatabase.js`
  - [ ] 实现数据库初始化和连接
  - [ ] 设计语音缓存表结构
  - [ ] 实现数据库版本管理和迁移

- [ ] **1.3** 设计语音缓存数据模型
  ```sql
  CREATE TABLE speech_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,
    text_content TEXT NOT NULL,
    voice_style TEXT NOT NULL,
    audio_data BLOB NOT NULL,
    mime_type TEXT NOT NULL,
    voice_name TEXT,
    api_source TEXT NOT NULL,
    file_size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 1
  );
  ```

### Phase 2: 缓存系统重构
- [ ] **2.1** 重构 apiManager.js 缓存逻辑
  - [ ] 移除 localStorage 缓存实现
  - [ ] 集成 wa-sqlite 数据库操作
  - [ ] 实现音频 BLOB 数据的存储和检索
  - [ ] 保持现有 API 接口兼容性

- [ ] **2.2** 实现高效的缓存查询
  - [ ] 基于 cache_key 的快速查询
  - [ ] 实现 LRU 缓存淘汰策略
  - [ ] 添加缓存统计和监控
  - [ ] 实现缓存大小限制（默认 500MB）

- [ ] **2.3** 优化音频数据处理
  - [ ] 实现音频压缩存储
  - [ ] 添加音频格式转换支持
  - [ ] 实现流式音频加载
  - [ ] 添加音频完整性校验

### Phase 3: Practice 页面集成
- [ ] **3.1** 更新 Practice.jsx 组件
  - [ ] 集成新的缓存系统
  - [ ] 添加缓存状态显示
  - [ ] 实现离线模式检测
  - [ ] 添加缓存管理界面

- [ ] **3.2** 实现智能缓存策略
  - [ ] 预缓存常用练习文本
  - [ ] 实现后台缓存更新
  - [ ] 添加缓存预热功能
  - [ ] 实现缓存优先级管理

- [ ] **3.3** 用户体验优化
  - [ ] 添加缓存加载进度显示
  - [ ] 实现无缝的在线/离线切换
  - [ ] 添加缓存清理和管理选项
  - [ ] 实现缓存统计展示

### Phase 4: 性能和可靠性
- [ ] **4.1** 性能优化
  - [ ] 实现数据库连接池
  - [ ] 添加查询索引优化
  - [ ] 实现异步音频加载
  - [ ] 添加内存缓存层

- [ ] **4.2** 错误处理和恢复
  - [ ] 实现数据库损坏检测和修复
  - [ ] 添加缓存数据备份机制
  - [ ] 实现优雅的降级策略
  - [ ] 添加详细的错误日志

- [ ] **4.3** 数据同步和备份
  - [ ] 实现跨设备缓存同步（可选）
  - [ ] 添加缓存导出/导入功能
  - [ ] 实现增量备份机制
  - [ ] 添加云端备份选项

### Phase 5: 测试和文档
- [ ] **5.1** 单元测试
  - [ ] 测试数据库操作
  - [ ] 测试缓存逻辑
  - [ ] 测试音频处理
  - [ ] 测试错误场景

- [ ] **5.2** 集成测试
  - [ ] 测试完整的缓存流程
  - [ ] 测试离线模式
  - [ ] 测试性能基准
  - [ ] 测试数据迁移

- [ ] **5.3** 文档和部署
  - [ ] 更新 API 文档
  - [ ] 编写用户使用指南
  - [ ] 创建开发者文档
  - [ ] 准备生产环境部署

---

## 🔧 技术实现细节

### 数据库配置
```javascript
// src/utils/localDatabase.js
const DB_CONFIG = {
  name: 'speech_practice.db',
  version: 1,
  maxSize: 500 * 1024 * 1024, // 500MB
  cacheExpiry: 30 * 24 * 60 * 60 * 1000, // 30天
};
```

### 缓存键生成策略
```javascript
function generateCacheKey(text, style, apiSource) {
  const content = `${text}|${style}|${apiSource}`;
  return `speech_${btoa(content).replace(/[+/=]/g, '')}`;
}
```

### 音频存储格式
- 主格式：WebM/Opus（高压缩比）
- 备用格式：WAV（兼容性）
- 元数据：JSON 格式存储

---

## 📊 成功指标

### 性能指标
- [ ] 缓存命中率 > 80%
- [ ] 音频加载时间 < 200ms
- [ ] 数据库查询时间 < 50ms
- [ ] 离线模式可用性 > 95%

### 用户体验指标
- [ ] 首次加载时间减少 60%
- [ ] 离线使用无感知切换
- [ ] 缓存管理界面直观易用
- [ ] 错误恢复自动化

### 技术指标
- [ ] 代码覆盖率 > 85%
- [ ] 数据库操作事务安全
- [ ] 内存使用优化
- [ ] 跨平台兼容性

---

## 🚀 部署和发布

### 开发环境
- [ ] 配置开发数据库
- [ ] 设置调试工具
- [ ] 配置热重载

### 生产环境
- [ ] 数据库优化配置
- [ ] 缓存预热脚本
- [ ] 监控和日志
- [ ] 性能分析工具

---

## 📝 注意事项

1. **数据迁移**：需要将现有 localStorage 缓存迁移到 wa-sqlite
2. **向后兼容**：保持现有 API 接口不变
3. **性能监控**：实时监控缓存性能和数据库大小
4. **用户隐私**：确保本地数据安全，不上传敏感信息
5. **跨平台**：确保在 Web、Tauri 桌面应用中都能正常工作

---

## 🎯 里程碑时间线

- **Week 1-2**: Phase 1 - 基础设施搭建
- **Week 3-4**: Phase 2 - 缓存系统重构  
- **Week 5-6**: Phase 3 - Practice 页面集成
- **Week 7**: Phase 4 - 性能和可靠性
- **Week 8**: Phase 5 - 测试和文档

---

*最后更新：2024年12月*
*项目状态：规划阶段*