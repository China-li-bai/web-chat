# 演示运行器

提供完整的演示脚本，展示各个应用场景的实际运行效果。

## 🎯 演示概述

### 可用演示
1. **语言学习演示** - 英语词汇学习完整流程
2. **编程训练演示** - 算法学习和代码挑战
3. **综合场景演示** - 多领域学习效果对比
4. **性能测试演示** - 大规模数据处理能力

## 💻 演示代码

### 1. 统一演示运行器

```typescript
import { EnglishVocabularyApp } from './language-learning';
import { ProgrammingSkillTrainer } from './programming-training';
import { MemoryLearningManager } from '../MemoryLearningManager';

class DemoRunner {
  private demos: Map<string, () => Promise<void>>;
  
  constructor() {
    this.demos = new Map([
      ['vocabulary', this.runVocabularyDemo.bind(this)],
      ['programming', this.runProgrammingDemo.bind(this)],
      ['comprehensive', this.runComprehensiveDemo.bind(this)],
      ['performance', this.runPerformanceDemo.bind(this)],
      ['all', this.runAllDemos.bind(this)]
    ]);
  }
  
  async runDemo(demoName: string) {
    const demo = this.demos.get(demoName);
    if (!demo) {
      console.error(`❌ 未找到演示: ${demoName}`);
      console.log('可用演示:', Array.from(this.demos.keys()).join(', '));
      return;
    }
    
    console.log(`🚀 开始运行演示: ${demoName}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    try {
      await demo();
      const duration = Date.now() - startTime;
      console.log('='.repeat(60));
      console.log(`✅ 演示完成，耗时: ${duration}ms`);
    } catch (error) {
      console.error('❌ 演示运行失败:', error);
    }
  }
  
  private async runVocabularyDemo() {
    console.log('📚 英语词汇学习演示\n');
    
    const vocabApp = new EnglishVocabularyApp();
    
    // 1. 创建学习会话
    console.log('🎯 步骤1: 创建个性化词汇学习会话');
    const session = await vocabApp.createPersonalizedVocabularySession(
      'demo-user-vocab',
      'intermediate',
      900 // 15分钟
    );
    
    console.log(`✅ 会话创建成功，包含 ${session.items.length} 个词汇\n`);
    
    // 2. 模拟词汇测试
    console.log('🎯 步骤2: 进行多类型词汇测试');
    
    const testTypes = ['definition', 'example', 'synonym', 'pronunciation'];
    const sampleAnswers = {
      'definition': 'present everywhere, found in all places',
      'example': 'Mobile phones are ubiquitous in modern life',
      'synonym': 'omnipresent, widespread',
      'pronunciation': '/juːˈbɪkwɪtəs/'
    };
    
    for (let i = 0; i < Math.min(2, session.items.length); i++) {
      const item = session.items[i];
      const testType = testTypes[i % testTypes.length];
      
      console.log(`\n📝 测试词汇: ${item.item.metadata?.word}`);
      console.log(`🎯 测试类型: ${testType}`);
      
      const startTime = Date.now() - Math.random() * 4000 - 1000;
      const userAnswer = sampleAnswers[testType as keyof typeof sampleAnswers] || 'not sure';
      
      const result = await vocabApp.conductVocabularyTest(
        session.sessionId,
        item.item.id,
        testType as any,
        userAnswer,
        startTime
      );
      
      console.log(`👤 用户答案: "${userAnswer}"`);
      console.log(`📊 评估结果: ${result.feedback.split('\n')[0]}`);
      console.log(`📅 下次复习: ${result.nextReviewTime.toLocaleDateString()}`);
      
      if (result.studyTips && result.studyTips.length > 0) {
        console.log(`💡 学习建议: ${result.studyTips[0]}`);
      }
    }
    
    // 3. 生成进度报告
    console.log('\n🎯 步骤3: 生成学习进度报告');
    const report = await vocabApp.generateProgressReport('demo-user-vocab', 30);
    
    console.log('\n📊 30天学习报告摘要:');
    console.log(`   📚 学习词汇: ${report.totalWordsStudied} 个`);
    console.log(`   🎯 掌握词汇: ${report.masteredWords} 个`);
    console.log(`   📈 平均准确率: ${(report.averageAccuracy * 100).toFixed(1)}%`);
    console.log(`   🔥 连续学习: ${report.studyStreak} 天`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 个性化建议:');
      report.recommendations.slice(0, 2).forEach(rec => console.log(`   ${rec}`));
    }
  }
  
  private async runProgrammingDemo() {
    console.log('💻 编程技能训练演示\n');
    
    const trainer = new ProgrammingSkillTrainer();
    
    // 1. 创建编程训练会话
    console.log('🎯 步骤1: 创建编程技能训练会话');
    const session = await trainer.createProgrammingSession(
      'demo-user-prog',
      'algorithm',
      'intermediate',
      1200 // 20分钟
    );
    
    console.log(`✅ 训练会话创建成功，包含 ${session.items.length} 个概念\n`);
    
    // 2. 模拟代码挑战
    console.log('🎯 步骤2: 进行多类型代码挑战');
    
    const challengeTypes = ['explanation', 'implementation'];
    const sampleResponses = {
      'explanation': '二分查找是一种在有序数组中查找目标元素的高效算法。它通过不断将搜索范围减半来快速定位目标，时间复杂度为O(log n)。',
      'implementation': `function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`
    };
    
    for (let i = 0; i < Math.min(2, session.items.length); i++) {
      const item = session.items[i];
      const challengeType = challengeTypes[i % challengeTypes.length];
      
      console.log(`\n📝 挑战概念: ${item.item.metadata?.title}`);
      console.log(`🎯 挑战类型: ${challengeType}`);
      
      const startTime = Date.now() - Math.random() * 8000 - 2000;
      const userResponse = sampleResponses[challengeType as keyof typeof sampleResponses] || 'console.log("Hello");';
      
      const result = await trainer.conductCodeChallenge(
        session.sessionId,
        item.item.id,
        challengeType as any,
        userResponse,
        startTime
      );
      
      console.log(`💻 用户回答: ${userResponse.substring(0, 50)}...`);
      console.log(`📊 评估结果: ${result.codeAnalysis}`);
      console.log(`📅 下次复习: ${result.nextReviewTime.toLocaleDateString()}`);
      
      if (result.suggestions && result.suggestions.length > 0) {
        console.log(`💡 改进建议: ${result.suggestions[0]}`);
      }
    }
    
    // 3. 生成技能评估
    console.log('\n🎯 步骤3: 生成技能评估报告');
    const report = await trainer.generateSkillAssessment('demo-user-prog', 30);
    
    console.log('\n📊 30天技能评估摘要:');
    console.log(`   🎯 整体技能: ${(report.overallSkillLevel * 100).toFixed(1)}%`);
    console.log(`   💪 优势领域: ${report.strengths.join(', ') || '待评估'}`);
    console.log(`   📚 改进领域: ${report.weaknesses.join(', ') || '待评估'}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 学习建议:');
      report.recommendations.slice(0, 2).forEach(rec => console.log(`   ${rec}`));
    }
    
    if (report.studyPath.length > 0) {
      console.log('\n🛤️ 建议学习路径:');
      report.studyPath.slice(0, 2).forEach((step, index) => {
        console.log(`   ${index + 1}. ${step.category} (${step.targetComplexity})`);
      });
    }
  }
  
  private async runComprehensiveDemo() {
    console.log('🌟 综合场景演示\n');
    
    console.log('🎯 演示多领域学习算法的协同效果');
    
    // 1. 创建通用学习管理器
    const manager = new MemoryLearningManager({
      fsrsConfig: {
        requestRetention: 0.87,
        maximumInterval: 120
      },
      adaptiveConfig: {
        adaptationRate: 0.15,
        cognitiveLoadThreshold: 0.75
      }
    });
    
    // 2. 创建混合学习材料
    const mixedItems = [
      {
        id: 'vocab_resilient',
        content: 'resilient - able to recover quickly from difficulties',
        type: 'vocabulary' as const,
        difficulty: 0.6,
        createdAt: new Date(),
        metadata: { domain: 'language', category: 'adjective' }
      },
      {
        id: 'algo_merge_sort',
        content: 'Merge Sort - divide and conquer sorting algorithm',
        type: 'concept' as const,
        difficulty: 0.7,
        createdAt: new Date(),
        metadata: { domain: 'programming', category: 'algorithm' }
      },
      {
        id: 'fact_js_history',
        content: 'JavaScript was created by Brendan Eich in 1995',
        type: 'fact' as const,
        difficulty: 0.3,
        createdAt: new Date(),
        metadata: { domain: 'technology', category: 'history' }
      }
    ];
    
    console.log('📚 创建混合领域学习会话');
    const session = await manager.createLearningSession(
      'demo-user-mixed',
      mixedItems,
      [],
      [],
      {
        maxItems: 3,
        targetDuration: 600 // 10分钟
      }
    );
    
    console.log(`✅ 混合会话创建成功，包含 ${session.items.length} 个不同领域的项目\n`);
    
    // 3. 模拟跨领域学习
    console.log('🎯 模拟跨领域学习过程');
    
    for (const item of session.items) {
      const domain = item.item.metadata?.domain || 'unknown';
      console.log(`\n📝 学习项目: ${item.item.content}`);
      console.log(`🏷️ 领域: ${domain}`);
      
      // 根据领域模拟不同的响应模式
      let response: 'again' | 'hard' | 'good' | 'easy';
      let confidence: number;
      
      switch (domain) {
        case 'language':
          response = Math.random() > 0.3 ? 'good' : 'hard';
          confidence = 0.6 + Math.random() * 0.3;
          break;
        case 'programming':
          response = Math.random() > 0.4 ? 'good' : 'hard';
          confidence = 0.5 + Math.random() * 0.4;
          break;
        case 'technology':
          response = Math.random() > 0.2 ? 'easy' : 'good';
          confidence = 0.7 + Math.random() * 0.3;
          break;
        default:
          response = 'good';
          confidence = 0.7;
      }
      
      const result = await manager.processStudyResponse(
        session.sessionId,
        item.item.id,
        response,
        Math.random() * 4000 + 1000,
        confidence
      );
      
      console.log(`👤 响应: ${response} (置信度: ${confidence.toFixed(2)})`);
      console.log(`🧠 记忆强度: ${result.memoryStrength.stability.toFixed(2)}`);
      console.log(`📅 下次复习: ${result.nextReviewTime.toLocaleDateString()}`);
    }
    
    // 4. 完成会话并分析
    const completedSession = await manager.completeSession(session.sessionId);
    
    console.log('\n📊 跨领域学习效果分析:');
    console.log(`   📚 总项目数: ${completedSession.totalItems}`);
    console.log(`   ✅ 完成项目: ${completedSession.completedItems}`);
    console.log(`   🎯 正确率: ${(completedSession.correctResponses / completedSession.completedItems * 100).toFixed(1)}%`);
    console.log(`   ⏱️ 平均响应时间: ${(completedSession.averageResponseTime / 1000).toFixed(1)} 秒`);
    console.log(`   🧠 认知负荷: ${(completedSession.cognitiveLoad * 100).toFixed(1)}%`);
    console.log(`   📈 学习效果: ${(completedSession.learningEffectiveness! * 100).toFixed(1)}%`);
  }
  
  private async runPerformanceDemo() {
    console.log('⚡ 性能测试演示\n');
    
    console.log('🎯 测试大规模数据处理能力');
    
    const manager = new MemoryLearningManager();
    
    // 1. 生成大量测试数据
    console.log('📊 生成测试数据...');
    const itemCount = 1000;
    const largeItemSet = Array.from({ length: itemCount }, (_, i) => ({
      id: `perf_item_${i}`,
      content: `Performance test item ${i + 1} - ${this.generateRandomContent()}`,
      type: ['vocabulary', 'concept', 'procedure', 'fact'][i % 4] as any,
      difficulty: Math.random(),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      metadata: {
        category: ['basic', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)],
        domain: ['language', 'programming', 'science', 'history'][Math.floor(Math.random() * 4)]
      }
    }));
    
    console.log(`✅ 生成 ${itemCount} 个测试项目\n`);
    
    // 2. 性能测试：会话创建
    console.log('🚀 测试1: 大规模会话创建');
    console.time('会话创建时间');
    
    const session = await manager.createLearningSession(
      'perf-test-user',
      largeItemSet,
      [],
      [],
      {
        maxItems: 100,
        targetDuration: 3600
      }
    );
    
    console.timeEnd('会话创建时间');
    console.log(`✅ 成功创建包含 ${session.items.length} 个项目的会话\n`);
    
    // 3. 性能测试：批量响应处理
    console.log('🚀 测试2: 批量响应处理');
    const batchSize = 50;
    const responses = session.items.slice(0, batchSize).map(item => ({
      itemId: item.item.id,
      response: ['again', 'hard', 'good', 'easy'][Math.floor(Math.random() * 4)] as any,
      responseTime: Math.random() * 5000 + 500,
      confidence: Math.random()
    }));
    
    console.time('批量响应处理时间');
    
    const results = await Promise.all(
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
    
    console.timeEnd('批量响应处理时间');
    console.log(`✅ 成功处理 ${results.length} 个响应\n`);
    
    // 4. 性能测试：统计分析
    console.log('🚀 测试3: 统计分析性能');
    console.time('统计分析时间');
    
    const stats = manager.getSessionStatistics(session.sessionId);
    
    console.timeEnd('统计分析时间');
    
    console.log('\n📊 性能测试结果:');
    console.log(`   🎯 学习效率: ${(stats.learningEfficiency * 100).toFixed(1)}%`);
    console.log(`   🧠 认知负荷: ${(stats.cognitiveLoad.total * 100).toFixed(1)}%`);
    console.log(`   📈 记忆保留预测: ${(stats.retentionPrediction * 100).toFixed(1)}%`);
    console.log(`   ⚡ 算法性能:`);
    console.log(`      - FSRS 准确性: ${(stats.algorithmPerformance.fsrsAccuracy * 100).toFixed(1)}%`);
    console.log(`      - 自适应效果: ${(stats.algorithmPerformance.adaptiveEffectiveness * 100).toFixed(1)}%`);
    console.log(`      - 检索优化: ${(stats.algorithmPerformance.retrievalOptimization * 100).toFixed(1)}%`);
    
    // 5. 内存使用情况
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      console.log('\n💾 内存使用情况:');
      console.log(`   - 堆内存使用: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   - 堆内存总量: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   - 外部内存: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);
    }
  }
  
  private async runAllDemos() {
    const demoNames = ['vocabulary', 'programming', 'comprehensive', 'performance'];
    
    for (let i = 0; i < demoNames.length; i++) {
      await this.runDemo(demoNames[i]);
      
      if (i < demoNames.length - 1) {
        console.log('\n' + '🔄 准备下一个演示...'.padStart(40));
        console.log('='.repeat(60) + '\n');
        // 在实际环境中可以添加延迟
        // await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n🎉 所有演示完成！');
    console.log('📊 演示总结:');
    console.log('   ✅ 语言学习 - 词汇记忆和多维度测试');
    console.log('   ✅ 编程训练 - 算法学习和代码挑战');
    console.log('   ✅ 综合场景 - 跨领域学习协同');
    console.log('   ✅ 性能测试 - 大规模数据处理');
  }
  
  private generateRandomContent(): string {
    const topics = [
      'advanced vocabulary for academic writing',
      'fundamental programming concepts',
      'historical events and their significance',
      'scientific principles and applications',
      'mathematical theorems and proofs',
      'language grammar and syntax rules'
    ];
    
    return topics[Math.floor(Math.random() * topics.length)];
  }
  
  listAvailableDemos(): void {
    console.log('📋 可用演示列表:');
    console.log('   🗣️  vocabulary    - 英语词汇学习演示');
    console.log('   💻  programming   - 编程技能训练演示');
    console.log('   🌟  comprehensive - 综合场景演示');
    console.log('   ⚡  performance   - 性能测试演示');
    console.log('   🎯  all          - 运行所有演示');
    console.log('\n使用方法: demoRunner.runDemo("演示名称")');
  }
}

// 导出演示运行器
export { DemoRunner };

// 使用示例
export async function runQuickDemo() {
  const runner = new DemoRunner();
  
  console.log('🚀 快速演示 - 记忆学习算法栈\n');
  
  // 运行词汇学习演示
  await runner.runDemo('vocabulary');
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 演示完成！要查看更多演示，请使用:');
  console.log('   runner.listAvailableDemos()');
  console.log('   runner.runDemo("演示名称")');
}
```

## 🚀 使用方法

### 快速开始

```typescript
import { DemoRunner, runQuickDemo } from './demo-runner';

// 方法1: 运行快速演示
await runQuickDemo();

// 方法2: 使用演示运行器
const runner = new DemoRunner();

// 查看可用演示
runner.listAvailableDemos();

// 运行特定演示
await runner.runDemo('vocabulary');
await runner.runDemo('programming');
await runner.runDemo('comprehensive');
await runner.runDemo('performance');

// 运行所有演示
await runner.runDemo('all');
```

### 自定义演示

```typescript
// 创建自定义演示
class CustomDemo extends DemoRunner {
  async runCustomScenario() {
    console.log('🎯 自定义学习场景演示');
    
    // 实现你的自定义演示逻辑
    // ...
  }
}

const customDemo = new CustomDemo();
await customDemo.runCustomScenario();
```

## 📊 演示特点

### 1. 真实数据模拟
- 模拟真实用户的学习行为
- 包含各种响应模式和时间分布
- 展示算法在不同场景下的表现

### 2. 性能基准测试
- 大规模数据处理能力验证
- 内存使用情况监控
- 响应时间性能分析

### 3. 多领域展示
- 语言学习场景
- 编程技能训练
- 跨领域学习协同
- 综合应用效果

### 4. 详细结果分析
- 学习效果统计
- 算法性能指标
- 个性化建议生成
- 进度跟踪展示

---

*通过完整的演示，直观了解记忆学习算法栈的强大功能！*