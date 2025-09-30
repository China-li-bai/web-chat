/**
 * 难度自适应算法实现
 * 基于脑科学研究和个性化学习理论
 */

import type {
  LearningItem,
  StudyRecord,
  StudySession,
  LearningProfile,
  CognitiveLoad,
  DifficultyAdjustment
} from '../types';
import { responseToScore, daysBetween } from '../utils';

/**
 * 难度自适应算法类
 */
export class DifficultyAdaptiveAlgorithm {
  
  /**
   * 分析用户学习档案
   */
  analyzeLearningProfile(
    userId: string,
    records: StudyRecord[],
    sessions: StudySession[]
  ): LearningProfile {
    if (records.length === 0 || sessions.length === 0) {
      return this.getDefaultProfile(userId);
    }

    // 计算认知容量（基于会话表现）
    const cognitiveCapacity = this.calculateCognitiveCapacity(sessions);
    
    // 计算学习速度（基于响应时间趋势）
    const learningSpeed = this.calculateLearningSpeed(records);
    
    // 计算保持率（基于遗忘曲线）
    const retentionRate = this.calculateRetentionRate(records);
    
    // 计算偏好难度（基于历史选择）
    const preferredDifficulty = this.calculatePreferredDifficulty(records);
    
    // 计算适应速度（基于学习曲线斜率）
    const adaptationRate = this.calculateAdaptationRate(records);

    return {
      userId,
      cognitiveCapacity,
      learningSpeed,
      retentionRate,
      preferredDifficulty,
      adaptationRate,
      lastUpdated: new Date()
    };
  }

  /**
   * 调整项目难度
   */
  adjustDifficulty(
    item: LearningItem,
    records: StudyRecord[],
    profile: LearningProfile
  ): DifficultyAdjustment {
    if (records.length < 3) {
      // 数据不足，返回原难度
      return {
        originalDifficulty: item.difficulty,
        adjustedDifficulty: item.difficulty,
        adjustmentReason: 'Insufficient data for adjustment',
        confidence: 0.3
      };
    }

    // 计算最近表现
    const recentRecords = records.slice(-5); // 最近5次记录
    const successRate = this.calculateSuccessRate(recentRecords);
    const avgResponseTime = this.calculateAverageResponseTime(recentRecords);
    const confidenceTrend = this.calculateConfidenceTrend(recentRecords);

    // 基于表现调整难度
    let adjustedDifficulty = item.difficulty;
    let adjustmentReason = '';
    let confidence = 0.8;

    // 成功率过高，增加难度
    if (successRate > 0.9 && avgResponseTime < 3000) {
      const increment = Math.min(0.2, (successRate - 0.9) * 2);
      adjustedDifficulty = Math.min(1.0, item.difficulty + increment);
      adjustmentReason = `Success rate too high (${(successRate * 100).toFixed(1)}%), increasing difficulty`;
    }
    // 成功率过低，降低难度
    else if (successRate < 0.6) {
      const decrement = Math.min(0.2, (0.6 - successRate) * 2);
      adjustedDifficulty = Math.max(0.1, item.difficulty - decrement);
      adjustmentReason = `Success rate too low (${(successRate * 100).toFixed(1)}%), decreasing difficulty`;
    }
    // 响应时间过长，降低难度
    else if (avgResponseTime > 8000) {
      const decrement = Math.min(0.15, (avgResponseTime - 8000) / 20000);
      adjustedDifficulty = Math.max(0.1, item.difficulty - decrement);
      adjustmentReason = `Response time too long (${(avgResponseTime / 1000).toFixed(1)}s), decreasing difficulty`;
    }
    // 信心度下降，降低难度
    else if (confidenceTrend < -0.2) {
      adjustedDifficulty = Math.max(0.1, item.difficulty - 0.1);
      adjustmentReason = `Confidence declining (${confidenceTrend.toFixed(2)}), decreasing difficulty`;
    }
    else {
      adjustmentReason = 'No adjustment needed, performance within target range';
      confidence = 0.9;
    }

    // 考虑个人档案进行微调
    const personalityAdjustment = this.applyPersonalityAdjustment(
      adjustedDifficulty,
      profile
    );
    adjustedDifficulty = personalityAdjustment;

    return {
      originalDifficulty: item.difficulty,
      adjustedDifficulty,
      adjustmentReason,
      confidence
    };
  }

  /**
   * 计算认知负荷
   */
  calculateCognitiveLoad(records: StudyRecord[]): CognitiveLoad {
    if (records.length === 0) {
      return {
        intrinsic: 0.5,
        extraneous: 0.3,
        germane: 0.4,
        total: 0.4
      };
    }

    // 内在负荷：基于任务复杂度和响应时间
    const avgResponseTime = this.calculateAverageResponseTime(records);
    const intrinsic = Math.min(1.0, avgResponseTime / 10000); // 标准化到0-1

    // 外在负荷：基于错误率和重复次数
    const errorRate = 1 - this.calculateSuccessRate(records);
    const extraneous = Math.min(1.0, errorRate * 1.5);

    // 相关负荷：基于学习效果和信心度提升
    const confidenceTrend = this.calculateConfidenceTrend(records);
    const germane = Math.max(0, Math.min(1.0, 0.5 + confidenceTrend));

    // 总负荷：加权平均
    const total = (intrinsic * 0.4 + extraneous * 0.4 + germane * 0.2);

    return {
      intrinsic,
      extraneous,
      germane,
      total: Math.min(1.0, total)
    };
  }

  /**
   * 预测最优难度
   */
  predictOptimalDifficulty(
    profile: LearningProfile,
    itemType: string,
    currentPerformance: number
  ): number {
    // 基础难度：根据项目类型
    let baseDifficulty = 0.5;
    switch (itemType) {
      case 'vocabulary':
        baseDifficulty = 0.4;
        break;
      case 'grammar':
        baseDifficulty = 0.6;
        break;
      case 'procedure':
        baseDifficulty = 0.7;
        break;
      default:
        baseDifficulty = 0.5;
    }

    // 根据个人档案调整
    const capacityFactor = profile.cognitiveCapacity;
    const speedFactor = profile.learningSpeed;
    const retentionFactor = profile.retentionRate;

    // 综合调整因子
    const adjustmentFactor = (capacityFactor + speedFactor + retentionFactor) / 3;
    
    // 根据当前表现微调
    const performanceAdjustment = (currentPerformance - 0.75) * 0.3;

    let optimalDifficulty = baseDifficulty * (0.7 + adjustmentFactor * 0.6) + performanceAdjustment;
    
    // 限制在合理范围内
    optimalDifficulty = Math.max(0.1, Math.min(0.9, optimalDifficulty));

    return optimalDifficulty;
  }

  // ========== 私有辅助方法 ==========

  private getDefaultProfile(userId: string): LearningProfile {
    return {
      userId,
      cognitiveCapacity: 0.7,
      learningSpeed: 0.5,
      retentionRate: 0.6,
      preferredDifficulty: 0.5,
      adaptationRate: 0.5,
      lastUpdated: new Date()
    };
  }

  private calculateCognitiveCapacity(sessions: StudySession[]): number {
    if (sessions.length === 0) return 0.7;

    // 基于会话时长、正确率和认知负荷
    const avgDuration = sessions.reduce((sum, s) => 
      sum + (s.endTime.getTime() - s.startTime.getTime()), 0) / sessions.length;
    const avgAccuracy = sessions.reduce((sum, s) => 
      sum + (s.correctResponses / s.itemsStudied), 0) / sessions.length;
    const avgCognitiveLoad = sessions.reduce((sum, s) => 
      sum + (s.cognitiveLoad || 0.5), 0) / sessions.length;

    // 长时间高准确率低负荷 = 高认知容量
    const durationFactor = Math.min(1.0, avgDuration / (60 * 60 * 1000)); // 标准化到1小时
    const accuracyFactor = avgAccuracy;
    const loadFactor = 1 - avgCognitiveLoad;

    return Math.min(1.0, (durationFactor + accuracyFactor + loadFactor) / 3);
  }

  private calculateLearningSpeed(records: StudyRecord[]): number {
    if (records.length < 5) return 0.5;

    // 基于响应时间的改善趋势
    const timeWindows = this.splitIntoTimeWindows(records, 5);
    if (timeWindows.length < 2) return 0.5;

    const firstWindowAvg = this.calculateAverageResponseTime(timeWindows[0]);
    const lastWindowAvg = this.calculateAverageResponseTime(timeWindows[timeWindows.length - 1]);

    // 响应时间减少 = 学习速度快
    const improvement = (firstWindowAvg - lastWindowAvg) / firstWindowAvg;
    return Math.max(0.1, Math.min(1.0, 0.5 + improvement));
  }

  private calculateRetentionRate(records: StudyRecord[]): number {
    if (records.length < 3) return 0.6;

    // 基于长期记忆表现
    const longTermRecords = records.filter(r => {
      const daysSince = daysBetween(r.timestamp, new Date());
      return daysSince >= 1; // 至少1天前的记录
    });

    if (longTermRecords.length === 0) return 0.6;

    return this.calculateSuccessRate(longTermRecords);
  }

  private calculatePreferredDifficulty(records: StudyRecord[]): number {
    if (records.length === 0) return 0.5;

    // 基于用户在不同难度下的表现
    const difficultyPerformance = new Map<number, number[]>();
    
    records.forEach(record => {
      // 假设我们能从记录中推断难度（实际实现中可能需要额外字段）
      const estimatedDifficulty = this.estimateDifficultyFromRecord(record);
      const score = responseToScore(record.response);
      
      if (!difficultyPerformance.has(estimatedDifficulty)) {
        difficultyPerformance.set(estimatedDifficulty, []);
      }
      difficultyPerformance.get(estimatedDifficulty)!.push(score);
    });

    // 找到表现最好的难度范围
    let bestDifficulty = 0.5;
    let bestScore = 0;

    for (const [difficulty, scores] of difficultyPerformance) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestDifficulty = difficulty;
      }
    }

    return bestDifficulty;
  }

  private calculateAdaptationRate(records: StudyRecord[]): number {
    if (records.length < 10) return 0.5;

    // 基于学习曲线的斜率
    const timeWindows = this.splitIntoTimeWindows(records, 5);
    if (timeWindows.length < 3) return 0.5;

    const improvements = [];
    for (let i = 1; i < timeWindows.length; i++) {
      const prevScore = this.calculateSuccessRate(timeWindows[i - 1]);
      const currScore = this.calculateSuccessRate(timeWindows[i]);
      improvements.push(currScore - prevScore);
    }

    const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    return Math.max(0.1, Math.min(1.0, 0.5 + avgImprovement * 2));
  }

  private calculateSuccessRate(records: StudyRecord[]): number {
    if (records.length === 0) return 0;
    
    const successCount = records.filter(r => 
      r.response === 'good' || r.response === 'easy'
    ).length;
    
    return successCount / records.length;
  }

  private calculateAverageResponseTime(records: StudyRecord[]): number {
    if (records.length === 0) return 5000; // 默认5秒
    
    const totalTime = records.reduce((sum, r) => sum + r.responseTime, 0);
    return totalTime / records.length;
  }

  private calculateConfidenceTrend(records: StudyRecord[]): number {
    if (records.length < 3) return 0;

    const confidences = records.map(r => r.confidence);
    const firstHalf = confidences.slice(0, Math.floor(confidences.length / 2));
    const secondHalf = confidences.slice(Math.floor(confidences.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return secondAvg - firstAvg;
  }

  private applyPersonalityAdjustment(
    difficulty: number,
    profile: LearningProfile
  ): number {
    // 根据个人档案微调难度
    const capacityAdjustment = (profile.cognitiveCapacity - 0.7) * 0.1;
    const speedAdjustment = (profile.learningSpeed - 0.5) * 0.05;
    const adaptationAdjustment = (profile.adaptationRate - 0.5) * 0.05;

    let adjusted = difficulty + capacityAdjustment + speedAdjustment + adaptationAdjustment;
    
    // 限制在合理范围
    return Math.max(0.1, Math.min(1.0, adjusted));
  }

  private splitIntoTimeWindows(records: StudyRecord[], windowSize: number): StudyRecord[][] {
    const windows: StudyRecord[][] = [];
    for (let i = 0; i < records.length; i += windowSize) {
      windows.push(records.slice(i, i + windowSize));
    }
    return windows;
  }

  private estimateDifficultyFromRecord(record: StudyRecord): number {
    // 基于响应时间和结果估算难度
    const timeScore = Math.min(1.0, record.responseTime / 10000);
    const responseScore = responseToScore(record.response);
    
    // 时间长且答错 = 高难度，时间短且答对 = 低难度
    return Math.max(0.1, Math.min(1.0, timeScore + (1 - responseScore) * 0.5));
  }
}