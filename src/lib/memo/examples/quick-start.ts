/**
 * 记忆学习算法栈 - 快速开始示例
 * 
 * 这个文件提供了最简单的使用示例，帮助你快速上手记忆学习算法栈。
 * 适合初学者和想要快速验证功能的开发者。
 */

import { MemoryLearningManager } from '../MemoryLearningManager';
import type { LearningItem } from '../types';

/**
 * 快速开始示例 - 基础用法
 */
export async function quickStartBasic() {
  console.log('🚀 记忆学习算法栈 - 快速开始示例');
  console.log('='.repeat(50));
  
  // 1. 创建学习管理器
  console.log('📚 步骤1: 创建学习管理器');
  const manager = new MemoryLearningManager();
  console.log('✅ 学习管理器创建成功');
  
  // 2. 准备学习材料
  console.log('\n📝 步骤2: 准备学习材料');
  const learningItems: LearningItem[] = [
    {
      id: 'word_1',
      content: 'apple - 苹果，一种常见的水果',
      type: 'vocabulary',
      difficulty: 0.3,
      createdAt: new Date(),
      metadata: {
        word: 'apple',
        translation: '苹果',
        category: 'fruit'
      }
    },
    {
      id: 'word_2', 
      content: 'computer - 计算机，用于处理数据的电子设备',
      type: 'vocabulary',
      difficulty: 0.5,
      createdAt: new Date(),
      metadata: {
        word: 'computer',
        translation: '计算机',
        category: 'technology'
      }
    },
    {
      id: 'concept_1',
      content: 'JavaScript - 一种动态编程语言',
      type: 'concept',
      difficulty: 0.6,
      createdAt: new Date(),
      metadata: {
        topic: 'programming',
        language: 'JavaScript'
      }
    }
  ];
  
  console.log(`✅ 准备了 ${learningItems.length} 个学习项目`);
  
  // 3. 创建学习会话
  console.log('\n🎯 步骤3: 创建学习会话');
  const session = await manager.createLearningSession(
    'quick-start-user', // 用户ID
    learningItems,      // 学习材料
    [],                 // 历史学习记录（空数组表示新用户）
    [],                 // 历史学习会话（空数组表示新用户）
    {
      maxItems: 3,        // 最多学习3个项目
      targetDuration: 600 // 目标时长10分钟
    }
  );
  
  console.log(`✅ 学习会话创建成功`);
  console.log(`   会话ID: ${session.sessionId}`);
  console.log(`   学习项目数: ${session.items.length}`);
  console.log(`   预计时长: ${session.targetDuration / 60} 分钟`);
  
  // 4. 模拟学习过程
  console.log('\n📖 步骤4: 开始学习过程');
  
  for (let i = 0; i < session.items.length; i++) {
    const sessionItem = session.items[i];
    const item = sessionItem.item;
    
    console.log(`\n📚 学习项目 ${i + 1}: ${item.content}`);
    
    // 模拟用户学习和回答
    // 在实际应用中，这里应该是用户的真实交互
    const userResponses = ['good', 'easy', 'hard'];
    const response = userResponses[i % userResponses.length] as 'good' | 'easy' | 'hard';
    const responseTime = 2000 + Math.random() * 3000; // 2-5秒响应时间
    const confidence = 0.6 + Math.random() * 0.3;     // 60-90%置信度
    
    console.log(`👤 用户响应: ${response}`);
    console.log(`⏱️ 响应时间: ${(responseTime / 1000).toFixed(1)} 秒`);
    console.log(`🎯 置信度: ${(confidence * 100).toFixed(1)}%`);
    
    // 处理学习响应
    const result = await manager.processStudyResponse(
      session.sessionId,
      item.id,
      response,
      responseTime,
      confidence
    );
    
    console.log(`📊 处理结果:`);
    console.log(`   🧠 记忆强度: ${result.memoryStrength.stability.toFixed(2)}`);
    console.log(`   📈 可提取性: ${result.memoryStrength.retrievability.toFixed(2)}`);
    console.log(`   📅 下次复习: ${result.nextReviewTime.toLocaleDateString()}`);
    console.log(`   ⏰ 复习间隔: ${result.interval} 天`);
  }
  
  // 5. 完成会话并查看统计
  console.log('\n📊 步骤5: 完成会话并查看统计');
  const completedSession = await manager.completeSession(session.sessionId);
  
  console.log('✅ 学习会话完成！');
  console.log(`📚 总学习项目: ${completedSession.totalItems}`);
  console.log(`✅ 完成项目: ${completedSession.completedItems}`);
  console.log(`🎯 正确率: ${(completedSession.correctResponses / completedSession.completedItems * 100).toFixed(1)}%`);
  console.log(`⏱️ 平均响应时间: ${(completedSession.averageResponseTime / 1000).toFixed(1)} 秒`);
  console.log(`🧠 认知负荷: ${(completedSession.cognitiveLoad * 100).toFixed(1)}%`);
  
  if (completedSession.learningEffectiveness) {
    console.log(`📈 学习效果: ${(completedSession.learningEffectiveness * 100).toFixed(1)}%`);
  }
  
  console.log('\n🎉 快速开始示例完成！');
}

/**
 * 快速开始示例 - 词汇学习
 */
export async function quickStartVocabulary() {
  console.log('📚 词汇学习快速示例');
  console.log('='.repeat(40));
  
  const manager = new MemoryLearningManager({
    fsrsConfig: {
      requestRetention: 0.88, // 词汇学习需要较高保留率
      maximumInterval: 90
    }
  });
  
  // 英语词汇学习材料
  const vocabularyItems: LearningItem[] = [
    {
      id: 'vocab_hello',
      content: 'hello - 你好，问候语',
      type: 'vocabulary',
      difficulty: 0.2,
      createdAt: new Date(),
      metadata: { word: 'hello', translation: '你好', level: 'beginner' }
    },
    {
      id: 'vocab_beautiful',
      content: 'beautiful - 美丽的，形容词',
      type: 'vocabulary', 
      difficulty: 0.4,
      createdAt: new Date(),
      metadata: { word: 'beautiful', translation: '美丽的', level: 'intermediate' }
    },
    {
      id: 'vocab_serendipity',
      content: 'serendipity - 意外的好运，名词',
      type: 'vocabulary',
      difficulty: 0.8,
      createdAt: new Date(),
      metadata: { word: 'serendipity', translation: '意外的好运', level: 'advanced' }
    }
  ];
  
  console.log('📝 创建词汇学习会话...');
  const session = await manager.createLearningSession(
    'vocab-learner',
    vocabularyItems,
    [],
    [],
    { maxItems: 3, targetDuration: 900 }
  );
  
  console.log(`✅ 词汇会话创建成功，包含 ${session.items.length} 个单词`);
  
  // 模拟词汇学习
  for (const sessionItem of session.items) {
    const item = sessionItem.item;
    const word = item.metadata?.word || 'unknown';
    const level = item.metadata?.level || 'unknown';
    
    console.log(`\n📚 学习单词: ${word} (${level})`);
    console.log(`📖 内容: ${item.content}`);
    
    // 根据难度模拟不同的学习效果
    let response: 'again' | 'hard' | 'good' | 'easy';
    let confidence: number;
    
    if (item.difficulty < 0.3) {
      response = 'easy';
      confidence = 0.9;
    } else if (item.difficulty < 0.6) {
      response = 'good';
      confidence = 0.75;
    } else {
      response = 'hard';
      confidence = 0.5;
    }
    
    const result = await manager.processStudyResponse(
      session.sessionId,
      item.id,
      response,
      Math.random() * 4000 + 1000,
      confidence
    );
    
    console.log(`👤 学习效果: ${response}`);
    console.log(`📅 下次复习: ${result.nextReviewTime.toLocaleDateString()}`);
  }
  
  console.log('\n✅ 词汇学习示例完成！');
}

/**
 * 快速开始示例 - 编程概念学习
 */
export async function quickStartProgramming() {
  console.log('💻 编程概念学习快速示例');
  console.log('='.repeat(40));
  
  const manager = new MemoryLearningManager({
    fsrsConfig: {
      requestRetention: 0.85,
      maximumInterval: 120
    },
    adaptiveConfig: {
      adaptationRate: 0.15,
      cognitiveLoadThreshold: 0.75
    }
  });
  
  // 编程概念学习材料
  const programmingItems: LearningItem[] = [
    {
      id: 'concept_variable',
      content: '变量 - 存储数据的容器，可以被赋值和修改',
      type: 'concept',
      difficulty: 0.3,
      createdAt: new Date(),
      metadata: { 
        concept: 'variable',
        category: 'basic',
        language: 'general'
      }
    },
    {
      id: 'concept_function',
      content: '函数 - 可重用的代码块，接受参数并返回结果',
      type: 'concept',
      difficulty: 0.5,
      createdAt: new Date(),
      metadata: {
        concept: 'function',
        category: 'intermediate', 
        language: 'general'
      }
    },
    {
      id: 'concept_recursion',
      content: '递归 - 函数调用自身的编程技术，用于解决分治问题',
      type: 'concept',
      difficulty: 0.8,
      createdAt: new Date(),
      metadata: {
        concept: 'recursion',
        category: 'advanced',
        language: 'general'
      }
    }
  ];
  
  console.log('🎯 创建编程学习会话...');
  const session = await manager.createLearningSession(
    'programming-student',
    programmingItems,
    [],
    [],
    { maxItems: 3, targetDuration: 1200 }
  );
  
  console.log(`✅ 编程会话创建成功，包含 ${session.items.length} 个概念`);
  
  // 模拟编程概念学习
  for (const sessionItem of session.items) {
    const item = sessionItem.item;
    const concept = item.metadata?.concept || 'unknown';
    const category = item.metadata?.category || 'unknown';
    
    console.log(`\n💡 学习概念: ${concept} (${category})`);
    console.log(`📝 定义: ${item.content}`);
    
    // 模拟理解程度
    const responses: Array<'again' | 'hard' | 'good' | 'easy'> = ['good', 'easy', 'hard'];
    const response = responses[Math.floor(Math.random() * responses.length)];
    const confidence = 0.5 + Math.random() * 0.4;
    const responseTime = 3000 + Math.random() * 5000; // 编程概念需要更多思考时间
    
    const result = await manager.processStudyResponse(
      session.sessionId,
      item.id,
      response,
      responseTime,
      confidence
    );
    
    console.log(`🧠 理解程度: ${response}`);
    console.log(`⏱️ 思考时间: ${(responseTime / 1000).toFixed(1)} 秒`);
    console.log(`📅 下次复习: ${result.nextReviewTime.toLocaleDateString()}`);
  }
  
  console.log('\n✅ 编程概念学习示例完成！');
}

/**
 * 运行所有快速示例
 */
export async function runAllQuickExamples() {
  console.log('🌟 运行所有快速开始示例');
  console.log('='.repeat(60));
  
  try {
    // 1. 基础示例
    await quickStartBasic();
    
    console.log('\n' + '='.repeat(60));
    
    // 2. 词汇学习示例
    await quickStartVocabulary();
    
    console.log('\n' + '='.repeat(60));
    
    // 3. 编程学习示例
    await quickStartProgramming();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 所有快速示例运行完成！');
    
    console.log('\n📚 接下来你可以：');
    console.log('   1. 查看完整演示: import { runDemo } from "./demo-app"');
    console.log('   2. 阅读API文档: ../docs/api-reference.md');
    console.log('   3. 探索应用场景: ../docs/scenarios/');
    console.log('   4. 集成到你的项目中');
    
  } catch (error) {
    console.error('❌ 运行示例时出现错误:', error);
  }
}

// 导出便捷函数
export { quickStartBasic as basic, quickStartVocabulary as vocabulary, quickStartProgramming as programming };

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
  runAllQuickExamples().catch(console.error);
}