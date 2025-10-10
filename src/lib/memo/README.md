# 记忆学习算法栈 (Memory Learning Algorithm Stack)

基于脑科学研究的智能记忆学习系统，集成间隔重复、难度自适应和主动检索策略。

## 🧠 核心特性

- **FSRS 间隔重复算法** - 直接集成 fsrs-browser，科学的记忆强度计算
- **难度自适应算法** - 基于认知负荷理论的个性化难度调整
- **主动检索策略** - 测试效应和分布式练习优化记忆效果
- **统一集成管理** - MemoryLearningManager 协调所有算法
- **TypeScript 强类型** - 完整的类型定义和接口
- **全面测试覆盖** - 56个单元测试 + 15个集成测试

## 📦 安装依赖

```bash
npm install fsrs-browser
```

## 🚀 快速开始

### 基础使用

```typescript
import { MemoryLearningManager } from './src/lib/memo/MemoryLearningManager';
import type { LearningItem, StudyRecord } from './src/lib/memo/types';

// 1. 创建管理器实例
const memoryManager = new MemoryLearningManager();

// 2. 准备学习项目
const learningItems: LearningItem[] = [
  {
    id: 'vocab-1',
    content: 'apple - 苹果',
    type: 'vocabulary',
    difficulty: 0.5,
    createdAt: new Date()
  },
  {
    id: 'concept-1', 
    content: '什么是递归？',
    type: 'concept',
    difficulty: 0.7,
    createdAt: new Date()
  }
];

// 3. 创建个性化学习会话
const session = await memoryManager.createLearningSession(
  'user-123',
  learningItems,
  [], // 历史学习记录
  [], // 历史会话记录
  {
    maxItems: 10,
    targetDuration: 1800 // 30分钟
  }
);

console.log(`学习会话创建成功，包含 ${session.items.length} 个项目`);
```

### 处理学习响应

```typescript
// 4. 处理用户学习响应
const response = await memoryManager.processStudyResponse(
  session.sessionId,
  'vocab-1',
  'good', // 'again' | 'hard' | 'good' | 'easy'
  3000,   // 响应时间(ms)
  0.8     // 置信度
);

console.log('下次复习时间:', response.nextReviewTime);
console.log('记忆强度:', response.memoryStrength);
```

### 完成学习会话

```typescript
// 5. 完成学习会话
const completedSession = await memoryManager.completeSession(session.sessionId);

console.log('会话统计:', {
  总项目数: completedSession.totalItems,
  正确率: completedSession.accuracy,
  平均响应时间: completedSession.averageResponseTime,
  学习效果: completedSession.learningEffectiveness
});
```

## 📚 核心算法

### 1. FSRS 间隔重复算法

基于最新的记忆科学研究，提供精确的复习时间预测。

```typescript
import { FSRSAlgorithm } from './src/lib/memo/algorithms/spacedRepetition';

const fsrs = new FSRSAlgorithm();

// 计算下次复习时间
const nextReview = fsrs.calculateNextReview(item, studyRecords);
console.log('建议复习时间:', nextReview.scheduledTime);
console.log('记忆稳定性:', nextReview.stability);
```

### 2. 难度自适应算法

基于认知负荷理论，动态调整学习难度。

```typescript
import { DifficultyAdaptiveAlgorithm } from './src/lib/memo/algorithms/difficultyAdaptive';

const adaptive = new DifficultyAdaptiveAlgorithm();

// 分析用户学习档案
const profile = adaptive.analyzeLearningProfile(userId, records, sessions);
console.log('认知容量:', profile.cognitiveCapacity);
console.log('学习速度:', profile.learningSpeed);

// 调整项目难度
const adjustment = adaptive.adjustDifficulty(item, records, profile);
console.log('调整后难度:', adjustment.adjustedDifficulty);
console.log('调整原因:', adjustment.adjustmentReason);
```

### 3. 主动检索策略

实现测试效应和分布式练习，优化学习效果。

```typescript
import { ActiveRetrievalAlgorithm } from './src/lib/memo/algorithms/activeRetrieval';

const retrieval = new ActiveRetrievalAlgorithm();

// 生成检索计划
const schedule = retrieval.generateRetrievalSchedule(
  items,
  records,
  30 * 60 * 1000, // 30分钟
  0.7 // 认知容量
);

// 实现分布式练习
const distributedItems = retrieval.implementDistributedPractice(
  items,
  records,
  1800, // 会话时长(秒)
  profile
);
```

## ⚙️ 配置选项

### MemoryLearningManager 配置

```typescript
const config = {
  // FSRS 算法配置
  fsrsConfig: {
    requestRetention: 0.9,    // 目标保留率
    maximumInterval: 36500,   // 最大间隔天数
    weights: [/* 自定义权重 */]
  },
  
  // 难度自适应配置
  adaptiveConfig: {
    minDifficulty: 0.1,       // 最小难度
    maxDifficulty: 0.9,       // 最大难度
    adaptationRate: 0.1,      // 适应速率
    cognitiveLoadThreshold: 0.8 // 认知负荷阈值
  },
  
  // 主动检索配置
  retrievalConfig: {
    testingEffectWeight: 0.3,  // 测试效应权重
    spacingEffectWeight: 0.4,  // 间隔效应权重
    generationEffectWeight: 0.3, // 生成效应权重
    maxSessionDuration: 3600   // 最大会话时长(秒)
  }
};

const manager = new MemoryLearningManager(config);
```

## 📊 类型定义

### 核心类型

```typescript
// 学习项目
interface LearningItem {
  id: string;
  content: string;
  type: 'vocabulary' | 'concept' | 'procedure' | 'fact';
  difficulty: number; // 0-1
  createdAt: Date;
  metadata?: Record<string, any>;
}

// 学习记录
interface StudyRecord {
  itemId: string;
  timestamp: Date;
  response: 'again' | 'hard' | 'good' | 'easy';
  responseTime: number; // 毫秒
  confidence: number;   // 0-1
}

// 记忆强度
interface MemoryStrength {
  stability: number;      // 记忆稳定性
  retrievability: number; // 可提取性
  difficulty: number;     // 当前难度
  lastReviewed: Date;
  reviewCount: number;
  successRate: number;
}

// 学习档案
interface LearningProfile {
  userId: string;
  cognitiveCapacity: number;  // 认知容量
  learningSpeed: number;      // 学习速度
  retentionRate: number;      // 保留率
  preferredDifficulty: number; // 偏好难度
  adaptationRate: number;     // 适应速率
  lastUpdated: Date;
}
```

## 🔧 高级用法

### 自定义算法策略

```typescript
// 实现自定义间隔重复算法
class CustomSpacedRepetition implements SpacedRepetitionAlgorithm {
  calculateNextReview(item: LearningItem, records: StudyRecord[]): ReviewSchedule {
    // 自定义实现
    return {
      scheduledTime: new Date(),
      interval: 1,
      stability: 1.0,
      difficulty: item.difficulty
    };
  }
}

// 使用自定义算法
const manager = new MemoryLearningManager({
  customAlgorithms: {
    spacedRepetition: new CustomSpacedRepetition()
  }
});
```

### 批量处理

```typescript
// 批量处理多个用户的学习会话
const users = ['user1', 'user2', 'user3'];
const sessions = await Promise.all(
  users.map(userId => 
    manager.createLearningSession(userId, items, records, sessions)
  )
);

console.log(`为 ${sessions.length} 个用户创建了学习会话`);
```

### 性能监控

```typescript
// 获取详细的会话统计
const stats = manager.getSessionStatistics(sessionId);

console.log('性能指标:', {
  学习效率: stats.learningEfficiency,
  认知负荷: stats.cognitiveLoad,
  记忆保留预测: stats.retentionPrediction,
  算法性能: stats.algorithmPerformance
});
```

## 🧪 测试

运行所有测试：

```bash
# 单元测试
npm test src/lib/memo/algorithms/__tests__/

# 集成测试  
npm test src/lib/memo/__tests__/integration.test.ts

# 性能测试
npm test src/lib/memo/__tests__/ -- --reporter=verbose
```

## 📈 最佳实践

### 1. 数据收集

```typescript
// 收集高质量的学习数据
const record: StudyRecord = {
  itemId: item.id,
  timestamp: new Date(),
  response: userResponse,
  responseTime: Date.now() - startTime, // 精确计时
  confidence: calculateConfidence(userInput) // 基于输入质量
};
```

### 2. 个性化优化

```typescript
// 定期更新用户档案
setInterval(async () => {
  const updatedProfile = adaptive.analyzeLearningProfile(
    userId, 
    recentRecords, 
    recentSessions
  );
  await saveUserProfile(userId, updatedProfile);
}, 24 * 60 * 60 * 1000); // 每日更新
```

### 3. 错误处理

```typescript
try {
  const session = await manager.createLearningSession(userId, items, records, sessions);
} catch (error) {
  if (error.message.includes('No items selected')) {
    // 处理无可用项目的情况
    console.log('当前无需复习项目，建议学习新内容');
  } else {
    // 其他错误处理
    console.error('创建学习会话失败:', error);
  }
}
```

## 🔗 相关资源

- [FSRS 算法论文](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm)
- [认知负荷理论](https://en.wikipedia.org/wiki/Cognitive_load_theory)
- [测试效应研究](https://en.wikipedia.org/wiki/Testing_effect)
- [脑科学记忆调研文档](../../docs/腦科學有關於記憶的調研.md)


## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

*基于脑科学研究的智能记忆学习系统 - 让学习更科学、更高效*