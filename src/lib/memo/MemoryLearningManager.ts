/**
 * 记忆学习管理器
 * 统一协调间隔重复、难度自适应、主动检索三大算法
 */

import { FSRSAlgorithm } from './algorithms/spacedRepetition';
import { DifficultyAdaptiveAlgorithm } from './algorithms/difficultyAdaptive';
import { ActiveRetrievalAlgorithm } from './algorithms/activeRetrieval';
import type { 
  LearningItem, 
  StudyRecord, 
  StudySession,
  MemoryStrength,
  LearningProfile,
  RetrievalSchedule,
  ScheduledItem,
  RetrievalStrategy,
  TestingEffect
} from './types';

export interface MemoryLearningConfig {
  // FSRS配置
  fsrsParams?: {
    requestRetention?: number;
    maximumInterval?: number;
    easyBonus?: number;
    hardFactor?: number;
  };
  
  // 难度自适应配置
  adaptiveConfig?: {
    minDifficulty?: number;
    maxDifficulty?: number;
    adaptationRate?: number;
  };
  
  // 主动检索配置
  retrievalConfig?: {
    maxSessionDuration?: number; // 秒
    targetCognitiveLoad?: number; // 0-1
    interleaveTypes?: boolean;
  };
}

export interface LearningSession {
  sessionId: string;
  userId: string;
  items: ScheduledItem[];
  startTime: Date;
  endTime?: Date;
  completedItems: number;
  totalCorrect: number;
  averageResponseTime: number;
  cognitiveLoadActual: number;
  adaptations: Array<{
    itemId: string;
    oldDifficulty: number;
    newDifficulty: number;
    reason: string;
  }>;
}

export class MemoryLearningManager {
  private fsrsAlgorithm: FSRSAlgorithm;
  private adaptiveAlgorithm: DifficultyAdaptiveAlgorithm;
  private retrievalAlgorithm: ActiveRetrievalAlgorithm;
  private config: MemoryLearningConfig;

  constructor(config: MemoryLearningConfig = {}) {
    this.config = {
      fsrsParams: {
        requestRetention: 0.9,
        maximumInterval: 36500,
        easyBonus: 1.3,
        hardFactor: 1.2,
        ...config.fsrsParams
      },
      adaptiveConfig: {
        minDifficulty: 0.1,
        maxDifficulty: 0.9,
        adaptationRate: 0.1,
        ...config.adaptiveConfig
      },
      retrievalConfig: {
        maxSessionDuration: 1800, // 30分钟
        targetCognitiveLoad: 0.7,
        interleaveTypes: true,
        ...config.retrievalConfig
      }
    };

    this.fsrsAlgorithm = new FSRSAlgorithm({ fsrsParams: this.config.fsrsParams });
    this.adaptiveAlgorithm = new DifficultyAdaptiveAlgorithm();
    this.retrievalAlgorithm = new ActiveRetrievalAlgorithm();
  }

  /**
   * 创建个性化学习会话
   */
  async createLearningSession(
    userId: string,
    availableItems: LearningItem[],
    studyRecords: StudyRecord[],
    studySessions: StudySession[],
    targetDuration?: number
  ): Promise<LearningSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    // 1. 分析用户学习档案
    const userProfile = this.adaptiveAlgorithm.analyzeLearningProfile(
      userId, 
      studyRecords, 
      studySessions
    );

    // 2. 更新项目难度（基于历史表现）
    const adaptedItems = await this.adaptItemDifficulties(
      availableItems, 
      studyRecords, 
      userProfile
    );

    // 3. 计算记忆强度和复习优先级
    const itemsWithStrength = await this.calculateMemoryStrengths(
      adaptedItems, 
      studyRecords
    );

    // 4. 筛选需要复习的项目
    const itemsForReview = this.selectItemsForReview(itemsWithStrength, userProfile);

    // 5. 生成主动检索计划
    const retrievalSchedule = this.retrievalAlgorithm.generateRetrievalSchedule(
      itemsForReview,
      studyRecords,
      userProfile,
      targetDuration ? new Date(startTime.getTime() + targetDuration * 1000) : undefined
    );

    // 6. 优化学习序列（分布式练习）
    const optimizedItems = this.retrievalAlgorithm.implementDistributedPractice(
      retrievalSchedule.items.map(item => item.item),
      studyRecords,
      targetDuration || this.config.retrievalConfig!.maxSessionDuration!,
      userProfile
    );

    // 7. 重新生成调度项目
    const finalScheduledItems: ScheduledItem[] = optimizedItems.map(item => {
      const originalScheduled = retrievalSchedule.items.find(si => si.item.id === item.id);
      return originalScheduled || {
        item,
        scheduledTime: startTime,
        retrievalStrength: 0.5,
        strategy: this.retrievalAlgorithm.selectRetrievalStrategy(item, 
          studyRecords.filter(r => r.itemId === item.id), 
          userProfile
        )
      };
    });

    return {
      sessionId,
      userId,
      items: finalScheduledItems,
      startTime,
      completedItems: 0,
      totalCorrect: 0,
      averageResponseTime: 0,
      cognitiveLoadActual: 0,
      adaptations: []
    };
  }

  /**
   * 处理学习响应并更新状态
   */
  async processStudyResponse(
    session: LearningSession,
    itemId: string,
    response: StudyRecord['response'],
    responseTime: number,
    confidence: number
  ): Promise<{
    updatedMemoryStrength: MemoryStrength;
    difficultyAdjustment?: {
      oldDifficulty: number;
      newDifficulty: number;
      reason: string;
    };
    testingEffect: TestingEffect;
  }> {
    const item = session.items.find(si => si.item.id === itemId)?.item;
    if (!item) {
      throw new Error(`Item ${itemId} not found in session`);
    }

    // 1. 创建学习记录
    const studyRecord: StudyRecord = {
      itemId,
      timestamp: new Date(),
      response,
      responseTime,
      confidence
    };

    // 2. 更新记忆强度（FSRS）
    const currentStrength = await this.fsrsAlgorithm.calculateMemoryStrength(item, [studyRecord]);
    const updatedStrength = await this.fsrsAlgorithm.updateMemoryStrength(
      currentStrength,
      response,
      new Date()
    );

    // 3. 检查是否需要难度调整
    let difficultyAdjustment;
    const itemRecords = [studyRecord]; // 在实际使用中，这里应该包含历史记录
    const userProfile = this.adaptiveAlgorithm.analyzeLearningProfile(
      session.userId, 
      itemRecords, 
      []
    );
    
    const adjustment = this.adaptiveAlgorithm.adjustDifficulty(item, itemRecords, userProfile);
    if (Math.abs(adjustment.adjustedDifficulty - item.difficulty) > 0.05) {
      difficultyAdjustment = {
        oldDifficulty: item.difficulty,
        newDifficulty: adjustment.adjustedDifficulty,
        reason: adjustment.adjustmentReason
      };
      
      // 更新项目难度
      item.difficulty = adjustment.adjustedDifficulty;
      
      // 记录调整
      session.adaptations.push({
        itemId,
        oldDifficulty: difficultyAdjustment.oldDifficulty,
        newDifficulty: difficultyAdjustment.newDifficulty,
        reason: difficultyAdjustment.reason
      });
    }

    // 4. 计算测试效应
    const strategy = session.items.find(si => si.item.id === itemId)?.strategy!;
    const testingEffect = this.retrievalAlgorithm.calculateTestingEffect(
      item,
      itemRecords,
      strategy
    );

    // 5. 更新会话统计
    session.completedItems++;
    if (response === 'good' || response === 'easy') {
      session.totalCorrect++;
    }
    
    const totalResponseTime = session.averageResponseTime * (session.completedItems - 1) + responseTime;
    session.averageResponseTime = totalResponseTime / session.completedItems;

    return {
      updatedMemoryStrength: updatedStrength,
      difficultyAdjustment,
      testingEffect
    };
  }

  /**
   * 完成学习会话
   */
  completeSession(session: LearningSession): StudySession {
    session.endTime = new Date();
    
    const duration = session.endTime.getTime() - session.startTime.getTime();
    const successRate = session.completedItems > 0 ? session.totalCorrect / session.completedItems : 0;
    
    // 计算实际认知负荷
    const cognitiveLoad = this.calculateActualCognitiveLoad(session);
    session.cognitiveLoadActual = cognitiveLoad;

    return {
      sessionId: session.sessionId,
      startTime: session.startTime,
      endTime: session.endTime,
      itemsStudied: session.completedItems,
      correctResponses: session.totalCorrect,
      averageResponseTime: session.averageResponseTime,
      cognitiveLoad
    };
  }

  /**
   * 获取学习统计信息
   */
  getSessionStatistics(session: LearningSession): {
    completionRate: number;
    successRate: number;
    averageResponseTime: number;
    cognitiveLoadPredicted: number;
    cognitiveLoadActual: number;
    difficultyAdaptations: number;
    estimatedRetention: number;
  } {
    const completionRate = session.items.length > 0 ? session.completedItems / session.items.length : 0;
    const successRate = session.completedItems > 0 ? session.totalCorrect / session.completedItems : 0;
    
    // 预测保持率（基于成功率和认知负荷）
    const estimatedRetention = this.estimateRetention(successRate, session.cognitiveLoadActual);

    return {
      completionRate,
      successRate,
      averageResponseTime: session.averageResponseTime,
      cognitiveLoadPredicted: session.items.length > 0 
        ? session.items.reduce((sum, item) => sum + item.retrievalStrength, 0) / session.items.length 
        : 0,
      cognitiveLoadActual: session.cognitiveLoadActual,
      difficultyAdaptations: session.adaptations.length,
      estimatedRetention
    };
  }

  // 私有辅助方法
  private async adaptItemDifficulties(
    items: LearningItem[],
    studyRecords: StudyRecord[],
    userProfile: LearningProfile
  ): Promise<LearningItem[]> {
    return Promise.all(items.map(async (item) => {
      const itemRecords = studyRecords.filter(r => r.itemId === item.id);
      if (itemRecords.length >= 3) {
        const adjustment = this.adaptiveAlgorithm.adjustDifficulty(item, itemRecords, userProfile);
        return {
          ...item,
          difficulty: adjustment.adjustedDifficulty
        };
      }
      return item;
    }));
  }

  private async calculateMemoryStrengths(
    items: LearningItem[],
    studyRecords: StudyRecord[]
  ): Promise<Array<LearningItem & { memoryStrength: MemoryStrength }>> {
    return Promise.all(items.map(async (item) => {
      const itemRecords = studyRecords.filter(r => r.itemId === item.id);
      const memoryStrength = await this.fsrsAlgorithm.calculateMemoryStrength(item, itemRecords);
      return {
        ...item,
        memoryStrength
      };
    }));
  }

  private selectItemsForReview(
    itemsWithStrength: Array<LearningItem & { memoryStrength: MemoryStrength }>,
    userProfile: LearningProfile
  ): LearningItem[] {
    const now = new Date();
    
    // 筛选需要复习的项目
    let itemsForReview = itemsWithStrength.filter(item => {
      return item.memoryStrength.nextReview <= now || 
             item.memoryStrength.retrievability < 0.8;
    });

    // 如果没有满足复习条件的项目，选择一些项目进行新学习或强化练习
    if (itemsForReview.length === 0) {
      // 按可检索性排序，选择需要强化的项目
      itemsForReview = itemsWithStrength
        .sort((a, b) => a.memoryStrength.retrievability - b.memoryStrength.retrievability)
        .slice(0, Math.min(5, itemsWithStrength.length)); // 至少选择5个项目或全部项目
    }

    // 按优先级排序（可检索性低的优先）
    itemsForReview.sort((a, b) => a.memoryStrength.retrievability - b.memoryStrength.retrievability);

    // 根据认知容量限制数量
    const maxItems = Math.ceil(userProfile.cognitiveCapacity * 20);
    return itemsForReview.slice(0, maxItems).map(item => ({
      id: item.id,
      content: item.content,
      type: item.type,
      difficulty: item.difficulty,
      createdAt: item.createdAt,
      metadata: item.metadata
    }));
  }

  private calculateActualCognitiveLoad(session: LearningSession): number {
    if (session.completedItems === 0) return 0;

    const avgDifficulty = session.items
      .slice(0, session.completedItems)
      .reduce((sum, item) => sum + item.item.difficulty, 0) / session.completedItems;

    const timeLoad = Math.min(1, session.averageResponseTime / 5000); // 5秒为基准
    const errorLoad = 1 - (session.totalCorrect / session.completedItems);

    return (avgDifficulty + timeLoad + errorLoad) / 3;
  }

  private estimateRetention(successRate: number, cognitiveLoad: number): number {
    // 简化的保持率估算模型
    const baseRetention = successRate * 0.8;
    const loadPenalty = cognitiveLoad * 0.2;
    return Math.max(0.1, Math.min(0.95, baseRetention - loadPenalty));
  }
}