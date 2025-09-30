# 记忆学习算法栈 - 实际应用示例

这个目录包含了记忆学习算法栈的完整实际应用示例，展示如何在真实项目中使用这些算法。

## 📁 文件结构

```
examples/
├── README.md              # 本文件 - 示例说明
├── demo-app.ts           # 完整演示应用
├── quick-start.ts        # 快速开始示例
├── integration-examples/ # 集成示例
│   ├── react-app.tsx    # React 应用集成
│   ├── node-server.ts   # Node.js 服务器集成
│   └── web-worker.ts    # Web Worker 集成
└── use-cases/           # 具体用例
    ├── language-app.ts  # 语言学习应用
    ├── coding-tutor.ts  # 编程教学系统
    └── medical-study.ts # 医学学习平台
```

## 🚀 快速开始

### 1. 运行演示应用

```typescript
import { runDemo } from './demo-app';

// 快速演示（5分钟）
await runDemo('quick');

// 完整演示（15分钟）
await runDemo('full');

// 性能测试演示
await runDemo('performance');
```

### 2. 基础使用示例

```typescript
import { MemoryLearningManager } from '../MemoryLearningManager';

// 创建学习管理器
const manager = new MemoryLearningManager();

// 创建学习项目
const items = [
  {
    id: 'item_1',
    content: 'JavaScript - 动态编程语言',
    type: 'concept',
    difficulty: 0.5,
    createdAt: new Date()
  }
];

// 创建学习会话
const session = await manager.createLearningSession(
  'user_123',
  items,
  [], // 历史记录
  [], // 历史会话
  { maxItems: 10, targetDuration: 1200 }
);

// 处理学习响应
const result = await manager.processStudyResponse(
  session.sessionId,
  'item_1',
  'good',
  3000, // 响应时间
  0.8   // 置信度
);

console.log('下次复习时间:', result.nextReviewTime);
```

## 📚 应用场景示例

### 1. 语言学习应用

```typescript
import { DemoApplication } from './demo-app';

const app = new DemoApplication();

// 创建词汇学习会话
const session = await app.vocabApp.createVocabularySession('user_1', 'intermediate');

// 进行词汇测试
const result = await app.vocabApp.testVocabulary(
  session.sessionId,
  'vocab_resilient',
  'able to recover quickly from difficulties'
);
```

### 2. 编程技能训练

```typescript
// 创建编程训练会话
const progSession = await app.programmingTrainer.createProgrammingSession('user_2', 'algorithms');

// 评估代码实现
const codeResult = await app.programmingTrainer.evaluateCode(
  progSession.sessionId,
  'algo_binary_search',
  `function binarySearch(arr, target) { /* 实现代码 */ }`
);
```

### 3. 医学知识学习

```typescript
// 创建医学学习会话
const medSession = await app.medicalApp.createMedicalSession('user_3', 'cardiology');

// 评估医学知识
const medResult = await app.medicalApp.assessMedicalKnowledge(
  medSession.sessionId,
  'med_heart_anatomy',
  'Heart has four chambers with valves preventing backflow'
);
```

## 🔧 集成指南

### React 应用集成

```typescript
import React, { useState, useEffect } from 'react';
import { MemoryLearningManager } from '../MemoryLearningManager';

function LearningApp() {
  const [manager] = useState(() => new MemoryLearningManager());
  const [session, setSession] = useState(null);
  
  useEffect(() => {
    // 初始化学习会话
    initializeSession();
  }, []);
  
  const initializeSession = async () => {
    const items = [/* 学习项目 */];
    const newSession = await manager.createLearningSession(
      'user_id',
      items,
      [],
      [],
      { maxItems: 10, targetDuration: 1200 }
    );
    setSession(newSession);
  };
  
  return (
    <div>
      {/* 学习界面 */}
    </div>
  );
}
```

### Node.js 服务器集成

```typescript
import express from 'express';
import { MemoryLearningManager } from '../MemoryLearningManager';

const app = express();
const manager = new MemoryLearningManager();

app.post('/api/learning/session', async (req, res) => {
  try {
    const { userId, items, options } = req.body;
    
    const session = await manager.createLearningSession(
      userId,
      items,
      [], // 从数据库加载历史记录
      [], // 从数据库加载历史会话
      options
    );
    
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/learning/response', async (req, res) => {
  try {
    const { sessionId, itemId, response, responseTime, confidence } = req.body;
    
    const result = await manager.processStudyResponse(
      sessionId,
      itemId,
      response,
      responseTime,
      confidence
    );
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## 📊 性能优化建议

### 1. 批量处理

```typescript
// 批量处理多个响应
const responses = [
  { sessionId: 'session_1', itemId: 'item_1', response: 'good', responseTime: 3000, confidence: 0.8 },
  { sessionId: 'session_1', itemId: 'item_2', response: 'easy', responseTime: 2000, confidence: 0.9 }
];

const results = await Promise.all(
  responses.map(resp => 
    manager.processStudyResponse(
      resp.sessionId,
      resp.itemId,
      resp.response,
      resp.responseTime,
      resp.confidence
    )
  )
);
```

### 2. 缓存策略

```typescript
// 缓存学习会话
const sessionCache = new Map();

function getCachedSession(sessionId: string) {
  return sessionCache.get(sessionId);
}

function setCachedSession(sessionId: string, session: any) {
  sessionCache.set(sessionId, session);
}
```

### 3. 内存管理

```typescript
// 定期清理过期会话
setInterval(() => {
  const expiredSessions = manager.getExpiredSessions();
  expiredSessions.forEach(sessionId => {
    manager.cleanupSession(sessionId);
  });
}, 60000); // 每分钟清理一次
```

## 🧪 测试示例

### 单元测试

```typescript
import { describe, it, expect } from 'vitest';
import { DemoApplication } from './demo-app';

describe('DemoApplication', () => {
  it('should create vocabulary session successfully', async () => {
    const app = new DemoApplication();
    const session = await app.vocabApp.createVocabularySession('test_user', 'beginner');
    
    expect(session).toBeDefined();
    expect(session.items.length).toBeGreaterThan(0);
  });
  
  it('should evaluate vocabulary correctly', async () => {
    const app = new DemoApplication();
    const session = await app.vocabApp.createVocabularySession('test_user', 'beginner');
    
    const result = await app.vocabApp.testVocabulary(
      session.sessionId,
      session.items[0].item.id,
      'correct answer'
    );
    
    expect(result.response).toBe('good');
    expect(result.memoryStrength).toBeDefined();
  });
});
```

### 集成测试

```typescript
describe('Integration Tests', () => {
  it('should handle complete learning workflow', async () => {
    const app = new DemoApplication();
    
    // 创建会话
    const session = await app.vocabApp.createVocabularySession('integration_test', 'intermediate');
    
    // 进行多轮学习
    for (const item of session.items.slice(0, 3)) {
      const result = await app.vocabApp.testVocabulary(
        session.sessionId,
        item.item.id,
        'test answer'
      );
      
      expect(result).toBeDefined();
      expect(result.nextReviewTime).toBeInstanceOf(Date);
    }
  });
});
```

## 📈 监控和分析

### 学习效果分析

```typescript
// 获取学习统计
const stats = manager.getSessionStatistics(sessionId);

console.log('学习效率:', stats.learningEfficiency);
console.log('认知负荷:', stats.cognitiveLoad);
console.log('记忆保留预测:', stats.retentionPrediction);
```

### 用户行为分析

```typescript
// 分析用户学习模式
const userAnalysis = manager.analyzeUserBehavior(userId, {
  timeRange: 30, // 30天
  includePatterns: true,
  includeRecommendations: true
});

console.log('学习模式:', userAnalysis.patterns);
console.log('改进建议:', userAnalysis.recommendations);
```

## 🔗 相关资源

- [API 参考文档](../docs/api-reference.md)
- [应用场景文档](../docs/scenarios/)
- [算法原理说明](../README.md)
- [性能优化指南](../docs/performance.md)

## 💡 最佳实践

1. **渐进式集成** - 从简单场景开始，逐步扩展功能
2. **数据持久化** - 及时保存学习记录和会话数据
3. **错误处理** - 完善的异常处理和用户反馈
4. **性能监控** - 定期监控算法性能和用户体验
5. **用户反馈** - 收集用户反馈持续优化算法参数

---

*通过这些实际示例，你可以快速上手并在自己的项目中应用记忆学习算法栈！*