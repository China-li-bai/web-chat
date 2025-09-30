# 使用示例

## 基础示例

### 1. 创建简单的学习会话

```typescript
import { MemoryLearningManager } from '../MemoryLearningManager';
import type { LearningItem } from '../types';

// 创建管理器
const manager = new MemoryLearningManager();

// 准备学习材料
const vocabularyItems: LearningItem[] = [
  {
    id: 'word-1',
    content: 'serendipity - 意外发现珍奇事物的能力',
    type: 'vocabulary',
    difficulty: 0.6,
    createdAt: new Date('2024-01-01'),
    metadata: {
      language: 'en-zh',
      category: 'advanced'
    }
  },
  {
    id: 'word-2', 
    content: 'ephemeral - 短暂的，转瞬即逝的',
    type: 'vocabulary',
    difficulty: 0.7,
    createdAt: new Date('2024-01-02')
  },
  {
    id: 'word-3',
    content: 'ubiquitous - 无处不在的',
    type: 'vocabulary', 
    difficulty: 0.5,
    createdAt: new Date('2024-01-03')
  }
];

// 创建学习会话
async function createVocabularySession() {
  try {
    const session = await manager.createLearningSession(
      'student-001',
      vocabularyItems,
      [], // 新用户，无历史记录
      [], // 无历史会话
      {
        maxItems: 5,
        targetDuration: 900 // 15分钟
      }
    );
    
    console.log('✅ 学习会话创建成功');
    console.log(`📚 会话ID: ${session.sessionId}`);
    console.log(`📖 学习项目: ${session.items.length} 个`);
    console.log(`⏱️ 预计时长: ${session.targetDuration / 60} 分钟`);
    
    return session;
  } catch (error) {
    console.error('❌ 创建会话失败:', error.message);
  }
}
```

### 2. 模拟学习过程

```typescript
async function simulateLearningProcess() {
  const session = await createVocabularySession();
  if (!session) return;
  
  console.log('\n🎯 开始学习过程...\n');
  
  // 模拟用户对每个项目的响应
  for (const scheduledItem of session.items) {
    const item = scheduledItem.item;
    console.log(`📝 学习项目: ${item.content}`);
    
    // 模拟用户思考和响应时间
    const thinkingTime = Math.random() * 5000 + 1000; // 1-6秒
    await new Promise(resolve => setTimeout(resolve, 100)); // 快速模拟
    
    // 根据难度模拟响应质量
    let response: 'again' | 'hard' | 'good' | 'easy';
    let confidence: number;
    
    if (item.difficulty < 0.3) {
      response = Math.random() > 0.2 ? 'easy' : 'good';
      confidence = 0.8 + Math.random() * 0.2;
    } else if (item.difficulty < 0.6) {
      response = Math.random() > 0.3 ? 'good' : 'hard';
      confidence = 0.6 + Math.random() * 0.3;
    } else {
      const rand = Math.random();
      if (rand > 0.7) response = 'good';
      else if (rand > 0.4) response = 'hard';
      else response = 'again';
      confidence = 0.3 + Math.random() * 0.4;
    }
    
    // 处理响应
    const result = await manager.processStudyResponse(
      session.sessionId,
      item.id,
      response,
      thinkingTime,
      confidence
    );
    
    console.log(`   👤 用户响应: ${response} (置信度: ${confidence.toFixed(2)})`);
    console.log(`   🧠 记忆强度: ${result.memoryStrength.stability.toFixed(2)}`);
    console.log(`   📅 下次复习: ${result.nextReviewTime.toLocaleDateString()}`);
    
    if (result.difficultyAdjustment) {
      console.log(`   ⚖️ 难度调整: ${result.difficultyAdjustment.originalDifficulty.toFixed(2)} → ${result.difficultyAdjustment.adjustedDifficulty.toFixed(2)}`);
    }
    
    console.log('');
  }
  
  // 完成会话
  const completedSession = await manager.completeSession(session.sessionId);
  
  console.log('🎉 学习会话完成！');
  console.log(`📊 统计信息:`);
  console.log(`   总项目数: ${completedSession.totalItems}`);
  console.log(`   完成项目: ${completedSession.completedItems}`);
  console.log(`   正确率: ${(completedSession.correctResponses / completedSession.completedItems * 100).toFixed(1)}%`);
  console.log(`   平均响应时间: ${(completedSession.averageResponseTime / 1000).toFixed(1)} 秒`);
  console.log(`   学习效果: ${(completedSession.learningEffectiveness! * 100).toFixed(1)}%`);
}

// 运行示例
simulateLearningProcess();
```

## 高级示例

### 3. 多类型学习材料

```typescript
// 创建不同类型的学习材料
const mixedLearningItems: LearningItem[] = [
  // 词汇类
  {
    id: 'vocab-1',
    content: 'algorithm - 算法',
    type: 'vocabulary',
    difficulty: 0.4,
    createdAt: new Date(),
    metadata: { subject: 'computer-science' }
  },
  
  // 概念类
  {
    id: 'concept-1',
    content: '什么是递归？递归是函数调用自身的编程技术。',
    type: 'concept',
    difficulty: 0.7,
    createdAt: new Date(),
    metadata: { subject: 'computer-science', complexity: 'intermediate' }
  },
  
  // 程序类
  {
    id: 'procedure-1',
    content: '如何实现二分查找？1.确定中点 2.比较目标值 3.递归查找',
    type: 'procedure',
    difficulty: 0.8,
    createdAt: new Date(),
    metadata: { subject: 'algorithms', steps: 3 }
  },
  
  // 事实类
  {
    id: 'fact-1',
    content: 'JavaScript 于 1995 年由 Brendan Eich 创建',
    type: 'fact',
    difficulty: 0.3,
    createdAt: new Date(),
    metadata: { subject: 'history', year: 1995 }
  }
];

async function createMixedLearningSession() {
  const session = await manager.createLearningSession(
    'student-002',
    mixedLearningItems,
    [],
    [],
    {
      maxItems: 10,
      targetDuration: 1200, // 20分钟
      itemTypes: ['vocabulary', 'concept', 'procedure'] // 排除事实类
    }
  );
  
  console.log('📚 混合类型学习会话创建成功');
  console.log('项目类型分布:');
  
  const typeCount = session.items.reduce((acc, item) => {
    acc[item.item.type] = (acc[item.item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} 个`);
  });
}
```

### 4. 个性化学习档案分析

```typescript
import { DifficultyAdaptiveAlgorithm } from '../algorithms/difficultyAdaptive';

async function analyzeUserLearningProfile() {
  const adaptive = new DifficultyAdaptiveAlgorithm();
  
  // 模拟用户历史学习记录
  const userRecords: StudyRecord[] = [
    {
      itemId: 'vocab-1',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
      response: 'good',
      responseTime: 3000,
      confidence: 0.8
    },
    {
      itemId: 'vocab-1',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
      response: 'easy',
      responseTime: 2000,
      confidence: 0.9
    },
    {
      itemId: 'concept-1',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
      response: 'hard',
      responseTime: 8000,
      confidence: 0.4
    },
    {
      itemId: 'concept-1',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
      response: 'good',
      responseTime: 5000,
      confidence: 0.7
    }
  ];
  
  // 模拟历史学习会话
  const userSessions: StudySession[] = [
    {
      sessionId: 'session-1',
      userId: 'student-002',
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 1800000),
      items: [],
      targetDuration: 1800,
      actualDuration: 1650,
      totalItems: 8,
      completedItems: 8,
      correctResponses: 6,
      averageResponseTime: 4200,
      cognitiveLoad: 0.6,
      learningEffectiveness: 0.75,
      status: 'completed'
    }
  ];
  
  // 分析学习档案
  const profile = adaptive.analyzeLearningProfile('student-002', userRecords, userSessions);
  
  console.log('👤 用户学习档案分析:');
  console.log(`🧠 认知容量: ${(profile.cognitiveCapacity * 100).toFixed(1)}%`);
  console.log(`⚡ 学习速度: ${(profile.learningSpeed * 100).toFixed(1)}%`);
  console.log(`💾 保留率: ${(profile.retentionRate * 100).toFixed(1)}%`);
  console.log(`🎯 偏好难度: ${(profile.preferredDifficulty * 100).toFixed(1)}%`);
  console.log(`🔄 适应速率: ${(profile.adaptationRate * 100).toFixed(1)}%`);
  
  // 基于档案调整项目难度
  for (const item of mixedLearningItems) {
    const adjustment = adaptive.adjustDifficulty(item, userRecords, profile);
    
    if (Math.abs(adjustment.adjustedDifficulty - adjustment.originalDifficulty) > 0.05) {
      console.log(`\n📝 ${item.content.substring(0, 30)}...`);
      console.log(`   难度调整: ${adjustment.originalDifficulty.toFixed(2)} → ${adjustment.adjustedDifficulty.toFixed(2)}`);
      console.log(`   调整原因: ${adjustment.adjustmentReason}`);
      console.log(`   建议操作: ${adjustment.recommendedAction}`);
    }
  }
}
```

### 5. 主动检索策略演示

```typescript
import { ActiveRetrievalAlgorithm } from '../algorithms/activeRetrieval';

async function demonstrateActiveRetrieval() {
  const retrieval = new ActiveRetrievalAlgorithm();
  
  // 创建学习档案
  const profile: LearningProfile = {
    userId: 'student-003',
    cognitiveCapacity: 0.8,
    learningSpeed: 0.7,
    retentionRate: 0.75,
    preferredDifficulty: 0.6,
    adaptationRate: 0.5,
    lastUpdated: new Date()
  };
  
  console.log('🎯 主动检索策略演示\n');
  
  // 1. 生成检索计划
  const schedule = retrieval.generateRetrievalSchedule(
    mixedLearningItems,
    [],
    30 * 60 * 1000, // 30分钟
    profile.cognitiveCapacity
  );
  
  console.log('📅 检索计划:');
  schedule.forEach((item, index) => {
    console.log(`${index + 1}. ${item.itemId}`);
    console.log(`   策略: ${item.strategy}`);
    console.log(`   时间: ${item.scheduledTime.toLocaleTimeString()}`);
    console.log(`   预计时长: ${item.estimatedDuration / 1000} 秒`);
    console.log(`   优先级: ${item.priority.toFixed(2)}\n`);
  });
  
  // 2. 实现分布式练习
  const distributedItems = retrieval.implementDistributedPractice(
    mixedLearningItems,
    [],
    1800, // 30分钟会话
    profile
  );
  
  console.log('🔄 分布式练习序列:');
  distributedItems.forEach((item, index) => {
    console.log(`${index + 1}. [${item.type}] ${item.content.substring(0, 40)}...`);
  });
  
  // 3. 选择最优检索策略
  console.log('\n🧠 检索策略选择:');
  for (const item of mixedLearningItems) {
    const strategy = retrieval.selectRetrievalStrategy(item, [], profile);
    console.log(`${item.type}: ${strategy}`);
  }
}
```

### 6. 性能监控和优化

```typescript
async function performanceMonitoring() {
  console.log('📊 性能监控演示\n');
  
  // 创建大量学习项目进行性能测试
  const largeItemSet: LearningItem[] = Array.from({ length: 1000 }, (_, i) => ({
    id: `item-${i}`,
    content: `学习项目 ${i + 1}`,
    type: ['vocabulary', 'concept', 'procedure', 'fact'][i % 4] as any,
    difficulty: Math.random(),
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  }));
  
  // 性能测试
  console.time('大规模会话创建');
  
  const session = await manager.createLearningSession(
    'performance-test-user',
    largeItemSet,
    [],
    [],
    {
      maxItems: 50,
      targetDuration: 3600
    }
  );
  
  console.timeEnd('大规模会话创建');
  
  // 批量响应处理性能测试
  console.time('批量响应处理');
  
  const responses = session.items.slice(0, 10).map(item => ({
    itemId: item.item.id,
    response: ['again', 'hard', 'good', 'easy'][Math.floor(Math.random() * 4)] as any,
    responseTime: Math.random() * 5000 + 1000,
    confidence: Math.random()
  }));
  
  await Promise.all(
    responses.map(response =>
      manager.processStudyResponse(
        session.sessionId,
        response.itemId,
        response.response,
        response.responseTime,
        response.confidence
      )
    )
  );
  
  console.timeEnd('批量响应处理');
  
  // 获取详细统计
  const stats = manager.getSessionStatistics(session.sessionId);
  
  console.log('\n📈 性能统计:');
  console.log(`学习效率: ${(stats.learningEfficiency * 100).toFixed(1)}%`);
  console.log(`认知负荷: ${(stats.cognitiveLoad.total * 100).toFixed(1)}%`);
  console.log(`记忆保留预测: ${(stats.retentionPrediction * 100).toFixed(1)}%`);
  console.log('算法性能:');
  console.log(`  FSRS 准确性: ${(stats.algorithmPerformance.fsrsAccuracy * 100).toFixed(1)}%`);
  console.log(`  自适应效果: ${(stats.algorithmPerformance.adaptiveEffectiveness * 100).toFixed(1)}%`);
  console.log(`  检索优化: ${(stats.algorithmPerformance.retrievalOptimization * 100).toFixed(1)}%`);
}
```

### 7. 错误处理和边界情况

```typescript
async function errorHandlingDemo() {
  console.log('⚠️ 错误处理演示\n');
  
  // 1. 处理空项目列表
  try {
    await manager.createLearningSession('user-empty', [], [], []);
  } catch (error) {
    console.log('✅ 正确捕获空项目列表错误:', error.message);
  }
  
  // 2. 处理不存在的会话
  try {
    await manager.processStudyResponse('non-existent-session', 'item-1', 'good', 1000, 0.8);
  } catch (error) {
    console.log('✅ 正确捕获会话不存在错误:', error.message);
  }
  
  // 3. 处理极端响应时间
  const session = await manager.createLearningSession(
    'edge-case-user',
    vocabularyItems.slice(0, 1),
    [],
    []
  );
  
  // 极短响应时间
  const result1 = await manager.processStudyResponse(
    session.sessionId,
    vocabularyItems[0].id,
    'good',
    50, // 50ms - 极快
    0.9
  );
  console.log('✅ 处理极短响应时间:', result1.success);
  
  // 极长响应时间
  const result2 = await manager.processStudyResponse(
    session.sessionId,
    vocabularyItems[0].id,
    'hard',
    60000, // 60秒 - 极慢
    0.3
  );
  console.log('✅ 处理极长响应时间:', result2.success);
  
  // 4. 处理边界难度值
  const extremeItem: LearningItem = {
    id: 'extreme-item',
    content: '极端难度项目',
    type: 'concept',
    difficulty: 0.99, // 接近最大难度
    createdAt: new Date()
  };
  
  const extremeSession = await manager.createLearningSession(
    'extreme-user',
    [extremeItem],
    [],
    []
  );
  
  console.log('✅ 处理极端难度项目:', extremeSession.items.length > 0);
}
```

### 8. 完整的学习应用示例

```typescript
class LearningApp {
  private manager: MemoryLearningManager;
  private currentSession: StudySession | null = null;
  
  constructor() {
    this.manager = new MemoryLearningManager({
      fsrsConfig: {
        requestRetention: 0.85, // 稍低的保留率，更频繁复习
        maximumInterval: 180    // 最大6个月间隔
      },
      adaptiveConfig: {
        adaptationRate: 0.15,   // 较快的适应速度
        cognitiveLoadThreshold: 0.75
      }
    });
  }
  
  async startLearningSession(userId: string, subject: string) {
    console.log(`🚀 为用户 ${userId} 开始 ${subject} 学习会话`);
    
    // 加载用户的学习材料
    const items = await this.loadUserItems(userId, subject);
    const records = await this.loadUserRecords(userId);
    const sessions = await this.loadUserSessions(userId);
    
    // 创建个性化会话
    this.currentSession = await this.manager.createLearningSession(
      userId,
      items,
      records,
      sessions,
      {
        maxItems: 15,
        targetDuration: 1200 // 20分钟
      }
    );
    
    console.log(`📚 会话创建成功，包含 ${this.currentSession.items.length} 个学习项目`);
    return this.currentSession;
  }
  
  async processUserResponse(itemId: string, userInput: string, startTime: number) {
    if (!this.currentSession) {
      throw new Error('没有活跃的学习会话');
    }
    
    // 评估用户响应
    const { response, confidence } = this.evaluateResponse(userInput);
    const responseTime = Date.now() - startTime;
    
    // 处理响应
    const result = await this.manager.processStudyResponse(
      this.currentSession.sessionId,
      itemId,
      response,
      responseTime,
      confidence
    );
    
    // 更新UI显示
    this.updateUI(result);
    
    return result;
  }
  
  async completeSession() {
    if (!this.currentSession) return null;
    
    const completed = await this.manager.completeSession(this.currentSession.sessionId);
    
    // 保存会话数据
    await this.saveSessionData(completed);
    
    // 显示学习报告
    this.showLearningReport(completed);
    
    this.currentSession = null;
    return completed;
  }
  
  private evaluateResponse(userInput: string): { response: ResponseType; confidence: number } {
    // 简化的响应评估逻辑
    const inputLength = userInput.trim().length;
    const hasKeywords = /正确|对|是|yes|correct/i.test(userInput);
    
    if (inputLength === 0) {
      return { response: 'again', confidence: 0 };
    } else if (inputLength < 5) {
      return { response: 'hard', confidence: 0.3 };
    } else if (hasKeywords && inputLength > 10) {
      return { response: 'easy', confidence: 0.9 };
    } else {
      return { response: 'good', confidence: 0.7 };
    }
  }
  
  private updateUI(result: StudyResponseResult) {
    console.log(`✨ 响应处理完成`);
    console.log(`📈 记忆强度: ${result.memoryStrength.stability.toFixed(2)}`);
    console.log(`📅 下次复习: ${result.nextReviewTime.toLocaleDateString()}`);
    
    if (result.difficultyAdjustment) {
      console.log(`⚖️ 难度已调整: ${result.difficultyAdjustment.adjustmentReason}`);
    }
  }
  
  private showLearningReport(session: StudySession) {
    console.log('\n📊 学习报告');
    console.log('='.repeat(40));
    console.log(`📚 学习项目: ${session.totalItems}`);
    console.log(`✅ 完成项目: ${session.completedItems}`);
    console.log(`🎯 正确率: ${(session.correctResponses / session.completedItems * 100).toFixed(1)}%`);
    console.log(`⏱️ 平均响应时间: ${(session.averageResponseTime / 1000).toFixed(1)} 秒`);
    console.log(`🧠 认知负荷: ${(session.cognitiveLoad * 100).toFixed(1)}%`);
    console.log(`📈 学习效果: ${(session.learningEffectiveness! * 100).toFixed(1)}%`);
    console.log('='.repeat(40));
  }
  
  // 模拟数据加载方法
  private async loadUserItems(userId: string, subject: string): Promise<LearningItem[]> {
    // 实际应用中从数据库加载
    return vocabularyItems;
  }
  
  private async loadUserRecords(userId: string): Promise<StudyRecord[]> {
    // 实际应用中从数据库加载
    return [];
  }
  
  private async loadUserSessions(userId: string): Promise<StudySession[]> {
    // 实际应用中从数据库加载
    return [];
  }
  
  private async saveSessionData(session: StudySession): Promise<void> {
    // 实际应用中保存到数据库
    console.log(`💾 会话数据已保存: ${session.sessionId}`);
  }
}

// 使用学习应用
async function runLearningApp() {
  const app = new LearningApp();
  
  // 开始学习会话
  const session = await app.startLearningSession('student-001', 'vocabulary');
  
  // 模拟用户学习过程
  for (let i = 0; i < Math.min(3, session.items.length); i++) {
    const item = session.items[i];
    console.log(`\n📖 学习: ${item.item.content}`);
    
    // 模拟用户输入
    const userInputs = ['正确答案', '不太确定', '完全正确的详细回答'];
    const userInput = userInputs[i % userInputs.length];
    
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));
    
    await app.processUserResponse(item.item.id, userInput, startTime);
  }
  
  // 完成会话
  await app.completeSession();
}

// 运行所有示例
async function runAllExamples() {
  console.log('🎓 记忆学习算法栈 - 使用示例\n');
  
  try {
    await simulateLearningProcess();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await createMixedLearningSession();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await analyzeUserLearningProfile();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await demonstrateActiveRetrieval();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await performanceMonitoring();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await errorHandlingDemo();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await runLearningApp();
    
  } catch (error) {
    console.error('❌ 示例运行出错:', error);
  }
}

// 导出示例函数
export {
  createVocabularySession,
  simulateLearningProcess,
  createMixedLearningSession,
  analyzeUserLearningProfile,
  demonstrateActiveRetrieval,
  performanceMonitoring,
  errorHandlingDemo,
  LearningApp,
  runAllExamples
};
```

## 运行示例

要运行这些示例，请确保已安装所有依赖：

```bash
npm install fsrs-browser
```

然后在你的项目中导入并运行：

```typescript
import { runAllExamples } from './src/lib/memo/docs/examples';

// 运行所有示例
runAllExamples();
```

或者运行特定示例：

```typescript
import { simulateLearningProcess } from './src/lib/memo/docs/examples';

// 只运行基础学习过程示例
simulateLearningProcess();