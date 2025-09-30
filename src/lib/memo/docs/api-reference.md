# API 参考文档

## MemoryLearningManager

统一的记忆学习管理器，协调所有算法组件。

### 构造函数

```typescript
constructor(config?: MemoryLearningConfig)
```

**参数:**
- `config` (可选): 配置对象

**配置选项:**
```typescript
interface MemoryLearningConfig {
  fsrsConfig?: {
    requestRetention?: number;     // 默认: 0.9
    maximumInterval?: number;      // 默认: 36500
    weights?: number[];           // 默认: FSRS 默认权重
  };
  adaptiveConfig?: {
    minDifficulty?: number;       // 默认: 0.1
    maxDifficulty?: number;       // 默认: 0.9
    adaptationRate?: number;      // 默认: 0.1
    cognitiveLoadThreshold?: number; // 默认: 0.8
  };
  retrievalConfig?: {
    testingEffectWeight?: number;    // 默认: 0.3
    spacingEffectWeight?: number;    // 默认: 0.4
    generationEffectWeight?: number; // 默认: 0.3
    maxSessionDuration?: number;     // 默认: 3600
  };
}
```

### 方法

#### createLearningSession

创建个性化学习会话。

```typescript
async createLearningSession(
  userId: string,
  items: LearningItem[],
  studyRecords: StudyRecord[],
  studySessions: StudySession[],
  options?: SessionOptions
): Promise<StudySession>
```

**参数:**
- `userId`: 用户ID
- `items`: 可用的学习项目列表
- `studyRecords`: 历史学习记录
- `studySessions`: 历史学习会话
- `options`: 会话选项

**SessionOptions:**
```typescript
interface SessionOptions {
  maxItems?: number;        // 最大项目数，默认: 20
  targetDuration?: number;  // 目标时长(秒)，默认: 1800
  difficultyRange?: {       // 难度范围
    min: number;
    max: number;
  };
  itemTypes?: string[];     // 限制项目类型
}
```

**返回值:**
```typescript
interface StudySession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  items: ScheduledItem[];
  targetDuration: number;
  actualDuration?: number;
  totalItems: number;
  completedItems: number;
  correctResponses: number;
  averageResponseTime: number;
  cognitiveLoad: number;
  learningEffectiveness?: number;
  status: 'active' | 'completed' | 'paused';
}
```

**示例:**
```typescript
const session = await manager.createLearningSession(
  'user-123',
  learningItems,
  userRecords,
  userSessions,
  {
    maxItems: 15,
    targetDuration: 1200, // 20分钟
    difficultyRange: { min: 0.3, max: 0.7 }
  }
);
```

#### processStudyResponse

处理用户的学习响应。

```typescript
async processStudyResponse(
  sessionId: string,
  itemId: string,
  response: ResponseType,
  responseTime: number,
  confidence: number
): Promise<StudyResponseResult>
```

**参数:**
- `sessionId`: 会话ID
- `itemId`: 项目ID
- `response`: 响应类型 ('again' | 'hard' | 'good' | 'easy')
- `responseTime`: 响应时间(毫秒)
- `confidence`: 置信度 (0-1)

**返回值:**
```typescript
interface StudyResponseResult {
  success: boolean;
  nextReviewTime: Date;
  memoryStrength: MemoryStrength;
  difficultyAdjustment?: DifficultyAdjustment;
  testingEffect: TestingEffect;
  updatedItem: LearningItem;
}
```

**示例:**
```typescript
const result = await manager.processStudyResponse(
  'session-456',
  'vocab-1',
  'good',
  2500,
  0.85
);

console.log('下次复习:', result.nextReviewTime);
console.log('记忆稳定性:', result.memoryStrength.stability);
```

#### completeSession

完成学习会话并生成统计信息。

```typescript
async completeSession(sessionId: string): Promise<StudySession>
```

**参数:**
- `sessionId`: 会话ID

**返回值:** 完整的会话对象，包含统计信息

**示例:**
```typescript
const completedSession = await manager.completeSession('session-456');

console.log('学习统计:', {
  正确率: completedSession.correctResponses / completedSession.completedItems,
  平均响应时间: completedSession.averageResponseTime,
  学习效果: completedSession.learningEffectiveness
});
```

#### getSessionStatistics

获取会话的详细统计信息。

```typescript
getSessionStatistics(sessionId: string): SessionStatistics
```

**返回值:**
```typescript
interface SessionStatistics {
  sessionId: string;
  learningEfficiency: number;      // 学习效率
  cognitiveLoad: CognitiveLoad;    // 认知负荷分析
  retentionPrediction: number;     // 记忆保留预测
  algorithmPerformance: {          // 算法性能
    fsrsAccuracy: number;
    adaptiveEffectiveness: number;
    retrievalOptimization: number;
  };
  itemStatistics: ItemStatistics[]; // 项目统计
}
```

## FSRSAlgorithm

基于 FSRS 的间隔重复算法实现。

### 方法

#### calculateNextReview

计算下次复习时间。

```typescript
calculateNextReview(
  item: LearningItem,
  records: StudyRecord[]
): ReviewSchedule
```

**返回值:**
```typescript
interface ReviewSchedule {
  scheduledTime: Date;    // 建议复习时间
  interval: number;       // 间隔天数
  stability: number;      // 记忆稳定性
  difficulty: number;     // 当前难度
  retrievability: number; // 可提取性
}
```

#### calculateMemoryStrength

计算记忆强度。

```typescript
calculateMemoryStrength(
  item: LearningItem,
  records: StudyRecord[]
): MemoryStrength
```

#### updateMemoryStrength

更新记忆强度。

```typescript
updateMemoryStrength(
  item: LearningItem,
  response: ResponseType,
  responseTime: number
): MemoryStrength
```

## DifficultyAdaptiveAlgorithm

基于认知负荷理论的难度自适应算法。

### 方法

#### analyzeLearningProfile

分析用户学习档案。

```typescript
analyzeLearningProfile(
  userId: string,
  records: StudyRecord[],
  sessions: StudySession[]
): LearningProfile
```

**返回值:**
```typescript
interface LearningProfile {
  userId: string;
  cognitiveCapacity: number;    // 认知容量 (0-1)
  learningSpeed: number;        // 学习速度 (0-1)
  retentionRate: number;        // 保留率 (0-1)
  preferredDifficulty: number;  // 偏好难度 (0-1)
  adaptationRate: number;       // 适应速率 (0-1)
  lastUpdated: Date;
}
```

#### adjustDifficulty

调整项目难度。

```typescript
adjustDifficulty(
  item: LearningItem,
  records: StudyRecord[],
  profile: LearningProfile
): DifficultyAdjustment
```

**返回值:**
```typescript
interface DifficultyAdjustment {
  originalDifficulty: number;
  adjustedDifficulty: number;
  adjustmentReason: string;
  confidence: number;           // 调整置信度
  recommendedAction: string;    // 建议操作
}
```

#### calculateCognitiveLoad

计算认知负荷。

```typescript
calculateCognitiveLoad(records: StudyRecord[]): CognitiveLoad
```

**返回值:**
```typescript
interface CognitiveLoad {
  intrinsic: number;    // 内在负荷
  extraneous: number;   // 外在负荷
  germane: number;      // 相关负荷
  total: number;        // 总负荷
}
```

#### predictOptimalDifficulty

预测最优难度。

```typescript
predictOptimalDifficulty(
  profile: LearningProfile,
  itemType: string,
  currentPerformance: number
): number
```

## ActiveRetrievalAlgorithm

主动检索策略算法实现。

### 方法

#### generateRetrievalSchedule

生成检索计划。

```typescript
generateRetrievalSchedule(
  items: LearningItem[],
  records: StudyRecord[],
  maxTime: number,
  cognitiveCapacity?: number
): RetrievalSchedule[]
```

**返回值:**
```typescript
interface RetrievalSchedule {
  itemId: string;
  scheduledTime: Date;
  strategy: RetrievalStrategy;
  estimatedDuration: number;
  priority: number;
}
```

#### selectRetrievalStrategy

选择检索策略。

```typescript
selectRetrievalStrategy(
  item: LearningItem,
  records: StudyRecord[],
  profile: LearningProfile
): RetrievalStrategy
```

**RetrievalStrategy 类型:**
```typescript
type RetrievalStrategy = 
  | 'free_recall'      // 自由回忆
  | 'cued_recall'      // 提示回忆
  | 'recognition'      // 识别
  | 'generation'       // 生成
  | 'elaboration'      // 精细化
  | 'interleaving';    // 交错练习
```

#### implementDistributedPractice

实现分布式练习。

```typescript
implementDistributedPractice(
  items: LearningItem[],
  records: StudyRecord[],
  sessionDuration: number,
  profile: LearningProfile
): LearningItem[]
```

#### calculateTestingEffect

计算测试效应。

```typescript
calculateTestingEffect(
  item: LearningItem,
  records: StudyRecord[]
): TestingEffect
```

**返回值:**
```typescript
interface TestingEffect {
  strength: number;           // 效应强度
  confidence: number;         // 置信度
  retentionBoost: number;     // 记忆提升
  transferBenefit: number;    // 迁移收益
  lastCalculated: Date;
}
```

## 错误处理

### 常见错误类型

```typescript
// 无可用项目错误
class NoItemsAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoItemsAvailableError';
  }
}

// 会话不存在错误
class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session ${sessionId} not found`);
    this.name = 'SessionNotFoundError';
  }
}

// 算法配置错误
class AlgorithmConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlgorithmConfigError';
  }
}
```

### 错误处理示例

```typescript
try {
  const session = await manager.createLearningSession(userId, items, records, sessions);
} catch (error) {
  if (error instanceof NoItemsAvailableError) {
    // 处理无可用项目
    console.log('当前无需复习项目');
  } else if (error instanceof SessionNotFoundError) {
    // 处理会话不存在
    console.log('会话已过期或不存在');
  } else {
    // 其他错误
    console.error('未知错误:', error);
  }
}
```

## 性能优化

### 批量操作

```typescript
// 批量处理多个响应
const responses = await Promise.all(
  userResponses.map(response => 
    manager.processStudyResponse(
      sessionId,
      response.itemId,
      response.response,
      response.responseTime,
      response.confidence
    )
  )
);
```

### 缓存策略

```typescript
// 缓存用户档案
const profileCache = new Map<string, LearningProfile>();

function getCachedProfile(userId: string): LearningProfile | undefined {
  return profileCache.get(userId);
}

function setCachedProfile(userId: string, profile: LearningProfile): void {
  profileCache.set(userId, profile);
}
```

### 内存管理

```typescript
// 定期清理过期会话
setInterval(() => {
  manager.cleanupExpiredSessions();
}, 60 * 60 * 1000); // 每小时清理一次