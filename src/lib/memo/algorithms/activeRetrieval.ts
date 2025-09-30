/**
 * 主动检索策略算法
 * 基于测试效应、生成效应、间隔效应等认知科学原理
 */

import type { 
  LearningItem, 
  StudyRecord, 
  LearningProfile,
  RetrievalStrategy,
  RetrievalSchedule,
  TestingEffect,
  ScheduledItem
} from '../types';

export class ActiveRetrievalAlgorithm {
  /**
   * 生成检索计划
   */
  generateRetrievalSchedule(
    items: LearningItem[],
    records: StudyRecord[],
    profile: LearningProfile,
    targetTime?: Date
  ): RetrievalSchedule {
    if (items.length === 0) {
      return {
        items: [],
        totalItems: 0,
        estimatedDuration: 0,
        cognitiveLoadPrediction: 0,
        generatedAt: new Date()
      };
    }

    const scheduledItems: ScheduledItem[] = [];
    const now = new Date();
    const maxTime = targetTime || new Date(now.getTime() + 24 * 60 * 60 * 1000); // 默认24小时内

    // 为所有项目计算调度信息
    const itemsWithSchedule = items.map(item => {
      const itemRecords = records.filter(r => r.itemId === item.id);
      const strategy = this.selectRetrievalStrategy(item, itemRecords, profile);
      const retrievalStrength = this.calculateRetrievalStrength(item, itemRecords);
      const scheduledTime = this.calculateScheduledTime(item, itemRecords, profile, now, maxTime);

      return {
        item,
        scheduledTime,
        retrievalStrength: Math.min(1, Math.max(0, retrievalStrength)),
        strategy,
        withinTimeWindow: scheduledTime <= maxTime
      };
    });

    // 优先选择时间窗口内的项目，如果没有则选择最紧急的项目
    const withinTimeWindow = itemsWithSchedule.filter(item => item.withinTimeWindow);
    
    if (withinTimeWindow.length > 0) {
      // 有时间窗口内的项目，按检索强度排序
      withinTimeWindow.sort((a, b) => a.retrievalStrength - b.retrievalStrength);
      scheduledItems.push(...withinTimeWindow.map(({ withinTimeWindow, ...item }) => item));
    } else {
      // 没有时间窗口内的项目，选择最紧急的项目（调度时间最早的）
      itemsWithSchedule.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
      // 至少选择前3个最紧急的项目，或者所有项目（如果少于3个）
      const urgentItems = itemsWithSchedule.slice(0, Math.min(3, itemsWithSchedule.length));
      scheduledItems.push(...urgentItems.map(({ withinTimeWindow, ...item }) => ({
        ...item,
        scheduledTime: now // 立即安排
      })));
    }

    const totalDuration = scheduledItems.reduce((sum, item) => {
      return sum + item.strategy.timeLimit;
    }, 0);

    const cognitiveLoad = this.predictCognitiveLoad(scheduledItems, profile);

    return {
      items: scheduledItems,
      totalItems: scheduledItems.length,
      estimatedDuration: totalDuration,
      cognitiveLoadPrediction: Math.min(1, Math.max(0, cognitiveLoad)),
      generatedAt: now
    };
  }

  /**
   * 选择检索策略
   */
  selectRetrievalStrategy(
    item: LearningItem,
    records: StudyRecord[],
    profile: LearningProfile
  ): RetrievalStrategy {
    if (records.length === 0) {
      return this.getDefaultStrategy(item);
    }

    const recentRecords = records.slice(-3); // 最近3次记录
    const successRate = this.calculateSuccessRate(recentRecords);
    const avgResponseTime = this.calculateAverageResponseTime(recentRecords);
    const daysSinceLastReview = this.getDaysSinceLastReview(records);

    // 优先级1: 复杂项目 - 使用分解检索（最高优先级，不受其他条件影响）
    if (item.difficulty > 0.7 && item.content.length > 50) {
      return {
        type: 'elaborative_retrieval',
        difficulty: 'hard',
        hints: this.generateElaborativeHints(item),
        timeLimit: 120,
        description: 'Elaborative retrieval for complex items'
      };
    }

    // 优先级2: 表现差的项目 - 使用提示辅助检索
    if (successRate < 0.5) {
      return {
        type: 'cued_recall',
        difficulty: 'easy',
        hints: this.generateHints(item),
        timeLimit: 90,
        description: 'Cued recall with hints for struggling items'
      };
    }

    // 优先级3: 高遗忘风险项目 - 使用自由回忆强化检索
    if (daysSinceLastReview > 7) {
      return {
        type: 'free_recall',
        difficulty: 'medium',
        hints: [],
        timeLimit: 60,
        description: 'Free recall for items at risk of forgetting'
      };
    }

    // 标准情况 - 识别任务
    return {
      type: 'recognition',
      difficulty: 'medium',
      hints: [],
      timeLimit: 45,
      description: 'Recognition task for standard review'
    };
  }

  /**
   * 计算测试效应
   */
  calculateTestingEffect(
    item: LearningItem,
    records: StudyRecord[],
    strategy: RetrievalStrategy
  ): TestingEffect {
    const retrievalAttempts = records.filter(r => r.responseTime > 1000).length;
    const successfulRetrievals = records.filter(r => 
      (r.response === 'good' || r.response === 'easy') && r.responseTime > 1000
    ).length;

    const lastRetrievalDate = records.length > 0 
      ? records[records.length - 1].timestamp 
      : null;

    // 计算测试效应强度
    const baseStrength = retrievalAttempts > 0 ? successfulRetrievals / retrievalAttempts : 0;
    const strategyMultiplier = this.getStrategyMultiplier(strategy.type);
    const strength = Math.min(1, baseStrength * strategyMultiplier);

    // 预测保持率
    const predictedRetention = this.predictRetention(strength, item.difficulty);

    return {
      strength,
      retrievalAttempts,
      successfulRetrievals,
      lastRetrievalDate,
      predictedRetention
    };
  }

  /**
   * 优化间隔效应
   */
  optimizeSpacingEffect(
    item: LearningItem,
    records: StudyRecord[],
    profile: LearningProfile
  ): number {
    if (records.length === 0) {
      return 60; // 新项目1小时间隔
    }

    const lastRecord = records[records.length - 1];
    const successRate = this.calculateSuccessRate(records.slice(-3));
    
    // 基础间隔（分钟）
    let baseInterval = 60;
    
    // 根据成功率调整
    if (successRate > 0.8) {
      baseInterval *= 2; // 成功率高，延长间隔
    } else if (successRate < 0.5) {
      baseInterval *= 0.5; // 成功率低，缩短间隔
    }

    // 根据个人档案调整
    const learningSpeedFactor = profile.learningSpeed;
    const retentionFactor = profile.retentionRate;
    
    // 学习速度快且保持率高的用户可以有更长间隔
    const personalFactor = (learningSpeedFactor + retentionFactor) / 2;
    baseInterval *= (0.5 + personalFactor); // 0.5-1.5倍调整

    return Math.max(30, Math.min(1440, baseInterval)); // 限制在30分钟到24小时之间
  }

  /**
   * 实现分布式练习
   */
  implementDistributedPractice(
    items: LearningItem[],
    records: StudyRecord[],
    sessionDuration: number, // 秒
    profile: LearningProfile
  ): LearningItem[] {
    if (items.length === 0) {
      return [];
    }

    // 根据认知容量和会话时长确定项目数量
    const maxItems = Math.floor(sessionDuration / 60) * Math.ceil(profile.cognitiveCapacity * 2);
    const targetCount = Math.min(items.length, maxItems);

    // 按类型分组，确保交错
    const itemsByType = new Map<string, LearningItem[]>();
    for (const item of items) {
      if (!itemsByType.has(item.type)) {
        itemsByType.set(item.type, []);
      }
      itemsByType.get(item.type)!.push(item);
    }

    // 交错选择项目
    const selectedItems: LearningItem[] = [];
    const typeKeys = Array.from(itemsByType.keys());
    let typeIndex = 0;

    while (selectedItems.length < targetCount) {
      const currentType = typeKeys[typeIndex % typeKeys.length];
      const typeItems = itemsByType.get(currentType)!;
      
      if (typeItems.length > 0) {
        const item = typeItems.shift()!;
        selectedItems.push(item);
      }
      
      typeIndex++;
      
      // 如果所有类型都空了，退出
      if (Array.from(itemsByType.values()).every(arr => arr.length === 0)) {
        break;
      }
    }

    return selectedItems;
  }

  // 辅助方法
  private calculateRetrievalStrength(item: LearningItem, records: StudyRecord[]): number {
    if (records.length === 0) {
      return 0.5; // 默认中等强度
    }

    const recentRecords = records.slice(-3);
    const successRate = this.calculateSuccessRate(recentRecords);
    const avgConfidence = recentRecords.reduce((sum, r) => sum + r.confidence, 0) / recentRecords.length;
    
    // 基于成功率和信心度计算
    return (successRate + avgConfidence) / 2;
  }

  private calculateScheduledTime(
    item: LearningItem,
    records: StudyRecord[],
    profile: LearningProfile,
    now: Date,
    maxTime: Date
  ): Date {
    const intervalMinutes = this.optimizeSpacingEffect(item, records, profile);
    return new Date(now.getTime() + intervalMinutes * 60 * 1000);
  }

  private predictCognitiveLoad(items: ScheduledItem[], profile: LearningProfile): number {
    if (items.length === 0) return 0;

    const avgDifficulty = items.reduce((sum, item) => {
      const difficultyScore = item.item.difficulty;
      return sum + difficultyScore;
    }, 0) / items.length;

    const timeLoad = Math.min(1, items.length / (profile.cognitiveCapacity * 10));
    
    return (avgDifficulty + timeLoad) / 2;
  }

  private calculateSuccessRate(records: StudyRecord[]): number {
    if (records.length === 0) return 0.5;
    
    const successful = records.filter(r => r.response === 'good' || r.response === 'easy').length;
    return successful / records.length;
  }

  private calculateAverageResponseTime(records: StudyRecord[]): number {
    if (records.length === 0) return 3000;
    
    return records.reduce((sum, r) => sum + r.responseTime, 0) / records.length;
  }

  private getDaysSinceLastReview(records: StudyRecord[]): number {
    if (records.length === 0) return 999;
    
    const lastRecord = records[records.length - 1];
    const now = new Date();
    // 确保timestamp是Date对象
    const timestamp = lastRecord.timestamp instanceof Date ? lastRecord.timestamp : new Date(lastRecord.timestamp);
    return Math.floor((now.getTime() - timestamp.getTime()) / (24 * 60 * 60 * 1000));
  }

  private getDefaultStrategy(item: LearningItem): RetrievalStrategy {
    return {
      type: 'recognition',
      difficulty: 'medium',
      hints: [],
      timeLimit: 60,
      description: 'Default recognition strategy for new items'
    };
  }

  private generateHints(item: LearningItem): string[] {
    // 简单的提示生成逻辑
    const content = item.content.toLowerCase();
    const hints: string[] = [];
    
    if (content.length > 10) {
      hints.push(`Starts with: ${content.substring(0, 2)}...`);
    }
    
    if (content.includes(' ')) {
      const words = content.split(' ');
      if (words.length > 1) {
        hints.push(`Contains ${words.length} words`);
      }
    }
    
    return hints;
  }

  private generateElaborativeHints(item: LearningItem): string[] {
    const hints = this.generateHints(item);
    hints.push('Think about the context and relationships');
    hints.push('Break down into smaller components');
    return hints;
  }

  private getStrategyMultiplier(type: RetrievalStrategy['type']): number {
    switch (type) {
      case 'free_recall': return 1.2;
      case 'cued_recall': return 1.0;
      case 'recognition': return 0.8;
      case 'elaborative_retrieval': return 1.4;
      default: return 1.0;
    }
  }

  private predictRetention(strength: number, difficulty: number): number {
    // 简化的保持率预测模型
    const baseRetention = strength * 0.8;
    const difficultyPenalty = difficulty * 0.2;
    return Math.max(0.1, Math.min(0.95, baseRetention - difficultyPenalty));
  }
}