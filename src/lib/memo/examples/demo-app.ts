/**
 * 记忆学习算法栈 - 完整演示应用
 * 
 * 这是一个可运行的演示应用，展示如何在实际项目中使用记忆学习算法栈。
 * 包含语言学习、编程训练、医学教育等多个应用场景。
 */

import { MemoryLearningManager } from '../MemoryLearningManager';
import type { LearningItem, StudyRecord, StudySession } from '../types';

// 导入各个应用场景
class EnglishVocabularyApp {
  private memoryManager: MemoryLearningManager;
  
  constructor() {
    this.memoryManager = new MemoryLearningManager({
      fsrsConfig: {
        requestRetention: 0.88,
        maximumInterval: 90,
      },
      adaptiveConfig: {
        adaptationRate: 0.2,
        cognitiveLoadThreshold: 0.7
      }
    });
  }
  
  async createVocabularySession(userId: string, level: string) {
    const vocabularyItems: LearningItem[] = [
      {
        id: 'vocab_resilient',
        content: 'resilient - able to recover quickly from difficulties',
        type: 'vocabulary',
        difficulty: 0.6,
        createdAt: new Date(),
        metadata: {
          word: 'resilient',
          definition: 'able to recover quickly from difficulties',
          example: 'Children are remarkably resilient.',
          category: 'personality_traits'
        }
      },
      {
        id: 'vocab_ubiquitous',
        content: 'ubiquitous - present everywhere',
        type: 'vocabulary',
        difficulty: 0.7,
        createdAt: new Date(),
        metadata: {
          word: 'ubiquitous',
          definition: 'present, appearing, or found everywhere',
          example: 'Smartphones are ubiquitous in modern society.',
          category: 'descriptive'
        }
      }
    ];
    
    return await this.memoryManager.createLearningSession(
      userId,
      vocabularyItems,
      [],
      [],
      { maxItems: 10, targetDuration: 1200 }
    );
  }
  
  async testVocabulary(sessionId: string, itemId: string, userAnswer: string) {
    // 简化的评估逻辑
    const isCorrect = userAnswer.length > 5; // 简单的评估标准
    const response = isCorrect ? 'good' : 'hard';
    const confidence = isCorrect ? 0.8 : 0.4;
    
    return await this.memoryManager.processStudyResponse(
      sessionId,
      itemId,
      response,
      Math.random() * 3000 + 1000,
      confidence
    );
  }
}

class ProgrammingTrainer {
  private memoryManager: MemoryLearningManager;
  
  constructor() {
    this.memoryManager = new MemoryLearningManager({
      fsrsConfig: {
        requestRetention: 0.85,
        maximumInterval: 120,
      },
      adaptiveConfig: {
        adaptationRate: 0.15,
        cognitiveLoadThreshold: 0.75
      }
    });
  }
  
  async createProgrammingSession(userId: string, focusArea: string) {
    const programmingItems: LearningItem[] = [
      {
        id: 'algo_binary_search',
        content: 'Binary Search - efficient search algorithm for sorted arrays',
        type: 'concept',
        difficulty: 0.6,
        createdAt: new Date(),
        metadata: {
          title: 'Binary Search Algorithm',
          category: 'algorithm',
          timeComplexity: 'O(log n)',
          spaceComplexity: 'O(1)'
        }
      },
      {
        id: 'ds_linked_list',
        content: 'Linked List - dynamic data structure with nodes connected by pointers',
        type: 'concept',
        difficulty: 0.5,
        createdAt: new Date(),
        metadata: {
          title: 'Linked List Data Structure',
          category: 'data_structure',
          timeComplexity: 'O(1) insert, O(n) search',
          spaceComplexity: 'O(n)'
        }
      }
    ];
    
    return await this.memoryManager.createLearningSession(
      userId,
      programmingItems,
      [],
      [],
      { maxItems: 8, targetDuration: 1800 }
    );
  }
  
  async evaluateCode(sessionId: string, itemId: string, userCode: string) {
    // 简化的代码评估
    const hasCorrectStructure = userCode.includes('function') || userCode.includes('class');
    const hasLogic = userCode.includes('if') || userCode.includes('while') || userCode.includes('for');
    
    let response: 'again' | 'hard' | 'good' | 'easy';
    let confidence: number;
    
    if (hasCorrectStructure && hasLogic) {
      response = 'good';
      confidence = 0.8;
    } else if (hasCorrectStructure || hasLogic) {
      response = 'hard';
      confidence = 0.5;
    } else {
      response = 'again';
      confidence = 0.3;
    }
    
    return await this.memoryManager.processStudyResponse(
      sessionId,
      itemId,
      response,
      Math.random() * 8000 + 2000,
      confidence
    );
  }
}

class MedicalLearningApp {
  private memoryManager: MemoryLearningManager;
  
  constructor() {
    this.memoryManager = new MemoryLearningManager({
      fsrsConfig: {
        requestRetention: 0.92,
        maximumInterval: 60,
      },
      adaptiveConfig: {
        adaptationRate: 0.1,
        cognitiveLoadThreshold: 0.8
      }
    });
  }
  
  async createMedicalSession(userId: string, specialty: string) {
    const medicalItems: LearningItem[] = [
      {
        id: 'med_heart_anatomy',
        content: 'Heart Anatomy - four chambers, valves, and conduction system',
        type: 'medical_knowledge',
        difficulty: 0.7,
        createdAt: new Date(),
        metadata: {
          title: 'Heart Anatomy',
          category: 'anatomy',
          specialty: 'cardiology',
          clinicalRelevance: 'Essential for understanding cardiovascular diseases'
        }
      },
      {
        id: 'med_diabetes_diagnosis',
        content: 'Diabetes Diagnosis - FPG ≥7.0 mmol/L, Random ≥11.1 mmol/L, HbA1c ≥6.5%',
        type: 'medical_knowledge',
        difficulty: 0.6,
        createdAt: new Date(),
        metadata: {
          title: 'Diabetes Diagnosis Criteria',
          category: 'clinical',
          specialty: 'endocrinology',
          clinicalRelevance: 'Critical for early diagnosis and treatment'
        }
      }
    ];
    
    return await this.memoryManager.createLearningSession(
      userId,
      medicalItems,
      [],
      [],
      { maxItems: 6, targetDuration: 2400 }
    );
  }
  
  async assessMedicalKnowledge(sessionId: string, itemId: string, userResponse: string) {
    // 简化的医学知识评估
    const medicalTerms = ['heart', 'diabetes', 'diagnosis', 'anatomy', 'glucose', 'chamber'];
    const responseTerms = userResponse.toLowerCase().split(/\s+/);
    
    const matchedTerms = medicalTerms.filter(term => 
      responseTerms.some(respTerm => respTerm.includes(term) || term.includes(respTerm))
    );
    
    const matchRatio = matchedTerms.length / medicalTerms.length;
    
    let response: 'again' | 'hard' | 'good' | 'easy';
    let confidence: number;
    
    if (matchRatio >= 0.6) {
      response = 'easy';
      confidence = 0.9;
    } else if (matchRatio >= 0.4) {
      response = 'good';
      confidence = 0.7;
    } else if (matchRatio >= 0.2) {
      response = 'hard';
      confidence = 0.5;
    } else {
      response = 'again';
      confidence = 0.3;
    }
    
    return await this.memoryManager.processStudyResponse(
      sessionId,
      itemId,
      response,
      Math.random() * 6000 + 2000,
      confidence
    );
  }
}

/**
 * 主演示应用类
 */
export class DemoApplication {
  private vocabApp: EnglishVocabularyApp;
  private programmingTrainer: ProgrammingTrainer;
  private medicalApp: MedicalLearningApp;
  
  constructor() {
    this.vocabApp = new EnglishVocabularyApp();
    this.programmingTrainer = new ProgrammingTrainer();
    this.medicalApp = new MedicalLearningApp();
  }
  
  /**
   * 运行完整的演示流程
   */
  async runFullDemo() {
    console.log('🚀 记忆学习算法栈 - 完整演示开始');
    console.log('='.repeat(60));
    
    try {
      // 1. 语言学习演示
      await this.runVocabularyDemo();
      
      console.log('\n' + '='.repeat(60));
      
      // 2. 编程训练演示
      await this.runProgrammingDemo();
      
      console.log('\n' + '='.repeat(60));
      
      // 3. 医学学习演示
      await this.runMedicalDemo();
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ 所有演示完成！');
      
    } catch (error) {
      console.error('❌ 演示过程中出现错误:', error);
    }
  }
  
  /**
   * 语言学习演示
   */
  private async runVocabularyDemo() {
    console.log('📚 1. 英语词汇学习演示');
    console.log('-'.repeat(40));
    
    // 创建学习会话
    console.log('🎯 创建词汇学习会话...');
    const vocabSession = await this.vocabApp.createVocabularySession('demo-user-1', 'intermediate');
    console.log(`✅ 会话创建成功，ID: ${vocabSession.sessionId}`);
    console.log(`📚 包含 ${vocabSession.items.length} 个词汇`);
    
    // 模拟学习过程
    console.log('\n🎯 开始词汇测试...');
    
    for (let i = 0; i < Math.min(2, vocabSession.items.length); i++) {
      const item = vocabSession.items[i];
      const word = item.item.metadata?.word || 'unknown';
      
      console.log(`\n📝 测试词汇: ${word}`);
      
      // 模拟用户回答
      const userAnswers = [
        'able to recover quickly from difficult situations',
        'present everywhere in modern society'
      ];
      
      const userAnswer = userAnswers[i] || 'not sure';
      console.log(`👤 用户回答: "${userAnswer}"`);
      
      // 评估回答
      const result = await this.vocabApp.testVocabulary(
        vocabSession.sessionId,
        item.item.id,
        userAnswer
      );
      
      console.log(`📊 评估结果: ${result.response}`);
      console.log(`🧠 记忆强度: ${result.memoryStrength.stability.toFixed(2)}`);
      console.log(`📅 下次复习: ${result.nextReviewTime.toLocaleDateString()}`);
    }
    
    console.log('\n✅ 词汇学习演示完成');
  }
  
  /**
   * 编程训练演示
   */
  private async runProgrammingDemo() {
    console.log('💻 2. 编程技能训练演示');
    console.log('-'.repeat(40));
    
    // 创建编程会话
    console.log('🎯 创建编程训练会话...');
    const progSession = await this.programmingTrainer.createProgrammingSession('demo-user-2', 'algorithms');
    console.log(`✅ 会话创建成功，ID: ${progSession.sessionId}`);
    console.log(`💻 包含 ${progSession.items.length} 个编程概念`);
    
    // 模拟编程练习
    console.log('\n🎯 开始编程挑战...');
    
    for (let i = 0; i < Math.min(2, progSession.items.length); i++) {
      const item = progSession.items[i];
      const concept = item.item.metadata?.title || 'unknown';
      
      console.log(`\n📝 编程概念: ${concept}`);
      
      // 模拟用户代码
      const userCodes = [
        `function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`,
        `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}`
      ];
      
      const userCode = userCodes[i] || 'console.log("Hello");';
      console.log(`👤 用户代码: ${userCode.substring(0, 50)}...`);
      
      // 评估代码
      const result = await this.programmingTrainer.evaluateCode(
        progSession.sessionId,
        item.item.id,
        userCode
      );
      
      console.log(`📊 评估结果: ${result.response}`);
      console.log(`🧠 记忆强度: ${result.memoryStrength.stability.toFixed(2)}`);
      console.log(`📅 下次复习: ${result.nextReviewTime.toLocaleDateString()}`);
    }
    
    console.log('\n✅ 编程训练演示完成');
  }
  
  /**
   * 医学学习演示
   */
  private async runMedicalDemo() {
    console.log('🏥 3. 医学知识学习演示');
    console.log('-'.repeat(40));
    
    // 创建医学会话
    console.log('🎯 创建医学学习会话...');
    const medSession = await this.medicalApp.createMedicalSession('demo-user-3', 'cardiology');
    console.log(`✅ 会话创建成功，ID: ${medSession.sessionId}`);
    console.log(`🏥 包含 ${medSession.items.length} 个医学知识点`);
    
    // 模拟医学学习
    console.log('\n🎯 开始医学知识评估...');
    
    for (let i = 0; i < Math.min(2, medSession.items.length); i++) {
      const item = medSession.items[i];
      const topic = item.item.metadata?.title || 'unknown';
      
      console.log(`\n📝 医学主题: ${topic}`);
      
      // 模拟用户回答
      const userResponses = [
        'Heart has four chambers: left and right atrium, left and right ventricle. Valves prevent backflow.',
        'Diabetes diagnosis requires fasting glucose ≥7.0 mmol/L or random glucose ≥11.1 mmol/L or HbA1c ≥6.5%'
      ];
      
      const userResponse = userResponses[i] || 'not sure about this topic';
      console.log(`👤 用户回答: ${userResponse.substring(0, 60)}...`);
      
      // 评估医学知识
      const result = await this.medicalApp.assessMedicalKnowledge(
        medSession.sessionId,
        item.item.id,
        userResponse
      );
      
      console.log(`📊 评估结果: ${result.response}`);
      console.log(`🧠 记忆强度: ${result.memoryStrength.stability.toFixed(2)}`);
      console.log(`📅 下次复习: ${result.nextReviewTime.toLocaleDateString()}`);
    }
    
    console.log('\n✅ 医学学习演示完成');
  }
  
  /**
   * 快速演示 - 展示核心功能
   */
  async runQuickDemo() {
    console.log('⚡ 快速演示 - 记忆学习算法栈核心功能');
    console.log('='.repeat(50));
    
    // 创建通用学习管理器
    const manager = new MemoryLearningManager();
    
    // 创建混合学习材料
    const mixedItems: LearningItem[] = [
      {
        id: 'quick_vocab',
        content: 'serendipity - pleasant surprise or fortunate accident',
        type: 'vocabulary',
        difficulty: 0.7,
        createdAt: new Date(),
        metadata: { category: 'advanced_vocabulary' }
      },
      {
        id: 'quick_algo',
        content: 'Quick Sort - divide and conquer sorting algorithm',
        type: 'concept',
        difficulty: 0.8,
        createdAt: new Date(),
        metadata: { category: 'algorithms' }
      },
      {
        id: 'quick_med',
        content: 'Hypertension - blood pressure consistently ≥140/90 mmHg',
        type: 'medical_knowledge',
        difficulty: 0.6,
        createdAt: new Date(),
        metadata: { category: 'clinical_medicine' }
      }
    ];
    
    console.log('📚 创建混合学习会话...');
    const session = await manager.createLearningSession(
      'quick-demo-user',
      mixedItems,
      [],
      [],
      { maxItems: 3, targetDuration: 600 }
    );
    
    console.log(`✅ 会话创建成功，包含 ${session.items.length} 个不同类型的学习项目`);
    
    // 模拟学习过程
    console.log('\n🎯 模拟学习过程...');
    
    for (const sessionItem of session.items) {
      const item = sessionItem.item;
      console.log(`\n📝 学习项目: ${item.content.substring(0, 40)}...`);
      console.log(`🏷️ 类型: ${item.type}`);
      
      // 模拟随机响应
      const responses: Array<'again' | 'hard' | 'good' | 'easy'> = ['good', 'easy', 'hard'];
      const response = responses[Math.floor(Math.random() * responses.length)];
      const confidence = 0.5 + Math.random() * 0.4;
      
      const result = await manager.processStudyResponse(
        session.sessionId,
        item.id,
        response,
        Math.random() * 4000 + 1000,
        confidence
      );
      
      console.log(`👤 响应: ${response} (置信度: ${confidence.toFixed(2)})`);
      console.log(`🧠 记忆强度: ${result.memoryStrength.stability.toFixed(2)}`);
      console.log(`📅 下次复习: ${result.nextReviewTime.toLocaleDateString()}`);
    }
    
    // 完成会话并获取统计
    const completedSession = await manager.completeSession(session.sessionId);
    
    console.log('\n📊 学习会话统计:');
    console.log(`   📚 总项目: ${completedSession.totalItems}`);
    console.log(`   ✅ 完成项目: ${completedSession.completedItems}`);
    console.log(`   🎯 正确率: ${(completedSession.correctResponses / completedSession.completedItems * 100).toFixed(1)}%`);
    console.log(`   ⏱️ 平均响应时间: ${(completedSession.averageResponseTime / 1000).toFixed(1)} 秒`);
    console.log(`   🧠 认知负荷: ${(completedSession.cognitiveLoad * 100).toFixed(1)}%`);
    
    console.log('\n✅ 快速演示完成！');
  }
  
  /**
   * 性能测试演示
   */
  async runPerformanceTest() {
    console.log('⚡ 性能测试演示');
    console.log('='.repeat(40));
    
    const manager = new MemoryLearningManager();
    
    // 生成大量测试数据
    console.log('📊 生成测试数据...');
    const itemCount = 100;
    const largeItemSet: LearningItem[] = Array.from({ length: itemCount }, (_, i) => ({
      id: `perf_item_${i}`,
      content: `Performance test item ${i + 1} - testing memory algorithm scalability`,
      type: ['vocabulary', 'concept', 'procedure', 'fact'][i % 4] as any,
      difficulty: Math.random(),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      metadata: {
        category: ['basic', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)]
      }
    }));
    
    console.log(`✅ 生成 ${itemCount} 个测试项目`);
    
    // 性能测试：会话创建
    console.log('\n🚀 测试会话创建性能...');
    console.time('会话创建');
    
    const session = await manager.createLearningSession(
      'perf-test-user',
      largeItemSet,
      [],
      [],
      { maxItems: 50, targetDuration: 3600 }
    );
    
    console.timeEnd('会话创建');
    console.log(`✅ 成功创建包含 ${session.items.length} 个项目的会话`);
    
    // 性能测试：批量响应处理
    console.log('\n🚀 测试批量响应处理性能...');
    const batchSize = 20;
    
    console.time('批量响应处理');
    
    const promises = session.items.slice(0, batchSize).map(async (item) => {
      const response = ['again', 'hard', 'good', 'easy'][Math.floor(Math.random() * 4)] as any;
      const confidence = Math.random();
      const responseTime = Math.random() * 5000 + 500;
      
      return await manager.processStudyResponse(
        session.sessionId,
        item.item.id,
        response,
        responseTime,
        confidence
      );
    });
    
    const results = await Promise.all(promises);
    
    console.timeEnd('批量响应处理');
    console.log(`✅ 成功处理 ${results.length} 个响应`);
    
    // 获取性能统计
    const stats = manager.getSessionStatistics(session.sessionId);
    
    console.log('\n📊 性能统计结果:');
    console.log(`   🎯 学习效率: ${(stats.learningEfficiency * 100).toFixed(1)}%`);
    console.log(`   🧠 认知负荷: ${(stats.cognitiveLoad.total * 100).toFixed(1)}%`);
    console.log(`   📈 记忆保留预测: ${(stats.retentionPrediction * 100).toFixed(1)}%`);
    
    console.log('\n✅ 性能测试完成！');
  }
}

/**
 * 导出便捷函数
 */
export async function runDemo(type: 'quick' | 'full' | 'performance' = 'quick') {
  const app = new DemoApplication();
  
  switch (type) {
    case 'quick':
      await app.runQuickDemo();
      break;
    case 'full':
      await app.runFullDemo();
      break;
    case 'performance':
      await app.runPerformanceTest();
      break;
    default:
      console.log('❌ 未知的演示类型，可用类型: quick, full, performance');
  }
}

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
  runDemo('quick').catch(console.error);
}