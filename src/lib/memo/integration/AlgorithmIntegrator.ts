/**
 * 算法集成器 - 统一管理FSRS、难度自适应、主动检索三大算法
 * 负责算法间的协调和数据库交互
 */

import { FSRSAlgorithm } from '../algorithms/spacedRepetition';
import { DifficultyAdaptiveAlgorithm } from '../algorithms/difficultyAdaptive';
import { ActiveRetrievalAlgorithm } from '../algorithms/activeRetrieval';
import { LearningItemDAO, StudyRecordDAO, StudySessionDAO } from '../database/dao';
import type {
  LearningItem,
  StudyRecord,
  StudyResponse,
  MemoryStrength,
  LearningProfile,
  DifficultyAdjustment,
  RetrievalSchedule,
  ScheduledItem,
  StudySession,
  StrategyConfig,
  LearningItemType
} from '../types';
import type {
  LearningItemRecord,
  StudyRecordDB,
  StudySessionRecord
} from '../database/types';

export interface AlgorithmConfig {
  fsrs: StrategyConfig;
  difficultyAdaptive: {
    enabled: boolean;
    adaptationRate: number;
    minDifficulty: number;
    maxDifficulty: number;
  };
  activeRetrieval: {
    enabled: boolean;
    strategiesEnabled: string[];
    maxItemsPerSession: number;
  };
}

export interface LearningPlan {
  items: ScheduledItem[];
  totalDuration: number;
  cognitiveLoadPrediction: number;
  recommendedBreaks: number[];
  adaptedDifficulties: Map<string, DifficultyAdjustment>;
}

export interface StudyResult {
  updatedStrength: MemoryStrength;
  difficultyAdjustment?: DifficultyAdjustment;
  nextReviewTime: Date;
  sessionStats: {
    totalTime: number;
    correctAnswers: number;
    totalAnswers: number;
    averageResponseTime: number;
  };
}

export class AlgorithmIntegrator {
  private fsrsAlgorithm: FSRSAlgorithm;
  private difficultyAlgorithm: DifficultyAdaptiveAlgorithm;
  private retrievalAlgorithm: ActiveRetrievalAlgorithm;
  private learningItemDAO: LearningItemDAO;
  private studyRecordDAO: StudyRecordDAO;
  private studySessionDAO: StudySessionDAO;

  constructor(
    config: AlgorithmConfig,
    learningItemDAO: LearningItemDAO,
    studyRecordDAO: StudyRecordDAO,
    studySessionDAO: StudySessionDAO
  ) {
    this.fsrsAlgorithm = new FSRSAlgorithm(config.fsrs);
    this.difficultyAlgorithm = new DifficultyAdaptiveAlgorithm();
    this.retrievalAlgorithm = new ActiveRetrievalAlgorithm();
    this.learningItemDAO = learningItemDAO;
    this.studyRecordDAO = studyRecordDAO;
    this.studySessionDAO = studySessionDAO;
  }

  /**
   * 初始化用户学习档案
   */
  async initializeUserProfile(userId: string): Promise<LearningProfile> {
    const recordsResult = await this.studyRecordDAO.findByUserId(userId);
    const sessionsResult = await this.studySessionDAO.findByUserId(userId);
    
    // 检查数据库操作是否成功
    if (!recordsResult.success || !sessionsResult.success) {
      throw new Error('Failed to fetch user data');
    }
    
    // 转换数据库记录为算法接口格式
    const records: StudyRecord[] = (recordsResult.data || []).map((record: StudyRecordDB) => ({
      itemId: record.item_id,
      timestamp: record.created_at,
      response: record.response as StudyResponse,
      responseTime: record.response_time,
      confidence: record.confidence || 0
    }));
    
    const sessions: StudySession[] = (sessionsResult.data || []).map((session: StudySessionRecord) => ({
      sessionId: session.id,
      startTime: session.start_time,
      endTime: session.end_time || new Date(),
      itemsStudied: session.completed_items,
      correctResponses: session.correct_items,
      averageResponseTime: session.average_response_time,
      cognitiveLoad: session.cognitive_load_actual
    }));
    
    return this.difficultyAlgorithm.analyzeLearningProfile(
      userId,
      records,
      sessions
    );
  }

  /**
   * 生成个性化学习计划
   */
  async generateLearningPlan(
    userId: string,
    targetDuration: number = 1800, // 30分钟默认
    maxItems: number = 20
  ): Promise<LearningPlan> {
    // 获取用户档案
    const profile = await this.initializeUserProfile(userId);
    
    // 获取待复习的学习项目
    const dueItemsResult = await this.learningItemDAO.findDueForReview(userId);
    if (!dueItemsResult.success) {
      throw new Error('Failed to fetch due items');
    }
    
    const limitedItems = (dueItemsResult.data || []).slice(0, maxItems);
    
    // 转换为算法接口格式
    const items: LearningItem[] = limitedItems.map((item: LearningItemRecord) => ({
      id: item.id,
      content: item.content,
      type: item.content_type as LearningItemType,
      difficulty: item.difficulty,
      createdAt: item.created_at,
      metadata: item.metadata ? JSON.parse(item.metadata) : undefined
    }));
    
    // 获取学习记录
    const allRecordsResult = await this.studyRecordDAO.findByUserId(userId);
    if (!allRecordsResult.success) {
      throw new Error('Failed to fetch study records');
    }
    
    const allRecords: StudyRecord[] = (allRecordsResult.data || []).map((record: StudyRecordDB) => ({
      itemId: record.item_id,
      timestamp: record.created_at,
      response: record.response as StudyResponse,
      responseTime: record.response_time,
      confidence: record.confidence || 0
    }));
    
    // 生成检索计划
    const retrievalSchedule = this.retrievalAlgorithm.generateRetrievalSchedule(
      items,
      allRecords,
      profile
    );
    
    // 调整难度
    const adaptedDifficulties = new Map<string, DifficultyAdjustment>();
    if (retrievalSchedule && retrievalSchedule.items && retrievalSchedule.items.length > 0) {
      for (const scheduledItem of retrievalSchedule.items) {
        const itemRecords = allRecords.filter(r => r.itemId === scheduledItem.item.id);
        const adjustment = this.difficultyAlgorithm.adjustDifficulty(
          scheduledItem.item,
          itemRecords,
          profile
        );
        adaptedDifficulties.set(scheduledItem.item.id, adjustment);
      }
    }
    
    // 计算推荐休息时间
    const recommendedBreaks = this.calculateRecommendedBreaks(
      retrievalSchedule?.estimatedDuration || targetDuration,
      profile.cognitiveCapacity
    );
    
    return {
      items: retrievalSchedule.items,
      totalDuration: retrievalSchedule.estimatedDuration,
      cognitiveLoadPrediction: retrievalSchedule.cognitiveLoadPrediction,
      recommendedBreaks,
      adaptedDifficulties
    };
  }

  /**
   * 处理学习响应
   */
  async processStudyResponse(
    userId: string,
    itemId: string,
    response: StudyResponse,
    responseTime: number,
    confidence: number,
    sessionId?: string
  ): Promise<StudyResult> {
    // 获取学习项目和历史记录
    const itemResult = await this.learningItemDAO.findById(itemId);
    if (!itemResult.success || !itemResult.data) {
      throw new Error(`Learning item not found: ${itemId}`);
    }
    
    const itemData = itemResult.data;
    const item: LearningItem = {
      id: itemData.id,
      content: itemData.content,
      type: itemData.content_type as LearningItemType,
      difficulty: itemData.difficulty,
      createdAt: itemData.created_at,
      metadata: itemData.metadata ? JSON.parse(itemData.metadata) : undefined
    };
    
    const recordsResult = await this.studyRecordDAO.findByItemId(itemId);
    if (!recordsResult.success) {
      throw new Error('Failed to fetch study records');
    }
    
    const records: StudyRecord[] = (recordsResult.data || []).map((record: StudyRecordDB) => ({
      itemId: record.item_id,
      timestamp: record.created_at,
      response: record.response as StudyResponse,
      responseTime: record.response_time,
      confidence: record.confidence || 0
    }));
    
    const profile = await this.initializeUserProfile(userId);
    
    // 创建新的学习记录
    const newRecord: StudyRecord = {
      itemId,
      timestamp: new Date(),
      response,
      responseTime,
      confidence
    };
    
    // 使用FSRS算法计算新的记忆强度
    const updatedStrength = this.fsrsAlgorithm.calculateNextReview(
      item,
      [...records, newRecord],
      response
    );
    
    // 调整难度
    const difficultyAdjustment = this.difficultyAlgorithm.adjustDifficulty(
      item,
      [...records, newRecord],
      profile
    );
    
    // 保存学习记录
    await this.studyRecordDAO.create({
      user_id: userId,
      item_id: itemId,
      session_id: sessionId || undefined,
      response: response,
      response_time: responseTime,
      confidence: confidence,
      memory_strength: updatedStrength.retrievability,
      difficulty_after: difficultyAdjustment.adjustedDifficulty,
      hints_used: 0
    });
    
    // 更新学习项目的FSRS数据
    await this.learningItemDAO.updateFSRSData(itemId, {
      stability: updatedStrength.stability,
      difficulty: updatedStrength.difficulty,
      due_date: updatedStrength.nextReview,
      reps: updatedStrength.reviewCount,
      lapses: updatedStrength.lapseCount,
      state: this.responseToState(response),
      elapsed_days: 0,
      scheduled_days: Math.ceil((updatedStrength.nextReview.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
    });
    
    // 如果有会话ID，更新会话统计
    let sessionStats = {
      totalTime: responseTime,
      correctAnswers: response === 'good' || response === 'easy' ? 1 : 0,
      totalAnswers: 1,
      averageResponseTime: responseTime
    };
    
    if (sessionId) {
      await this.studySessionDAO.updateSessionStats(sessionId, {
        totalItems: 1,
        completedItems: 1,
        correctAnswers: sessionStats.correctAnswers,
        averageResponseTime: responseTime
      });
    }
    
    return {
      updatedStrength,
      difficultyAdjustment,
      nextReviewTime: updatedStrength.nextReview,
      sessionStats
    };
  }

  /**
   * 开始学习会话
   */
  async startStudySession(
    userId: string,
    sessionType: 'regular' | 'intensive' | 'review' = 'review',
    plannedDuration: number = 1800
  ): Promise<string> {
    const result = await this.studySessionDAO.create({
      user_id: userId,
      session_type: sessionType,
      start_time: new Date(),
      planned_duration: plannedDuration,
      is_completed: false,
      total_items: 0,
      completed_items: 0,
      correct_items: 0,
      average_response_time: 0,
      cognitive_load_predicted: 0,
      cognitive_load_actual: 0,
      success_rate: 0,
      difficulty_adaptations: 0,
      strategy_changes: 0,
      interleave_enabled: false
    });
    
    if (!result.success || !result.data) {
      throw new Error('Failed to create study session');
    }
    
    return result.data.id;
  }

  /**
   * 结束学习会话
   */
  async endStudySession(sessionId: string): Promise<StudySession> {
    const result = await this.studySessionDAO.endSession(sessionId);
    if (!result.success || !result.data) {
      throw new Error(`Study session not found: ${sessionId}`);
    }
    
    const session = result.data;
    return {
      sessionId: session.id,
      startTime: session.start_time,
      endTime: session.end_time || new Date(),
      itemsStudied: session.completed_items,
      correctResponses: session.correct_items,
      averageResponseTime: session.average_response_time,
      cognitiveLoad: session.cognitive_load_actual
    };
  }

  /**
   * 获取学习进度统计
   */
  async getLearningProgress(userId: string): Promise<any> {
    const result = await this.learningItemDAO.getLearningProgress(userId);
    if (!result.success) {
      throw new Error('Failed to fetch learning progress');
    }
    return result.data;
  }

  /**
   * 计算推荐休息时间
   */
  private calculateRecommendedBreaks(
    totalDuration: number,
    cognitiveCapacity: number
  ): number[] {
    const breaks: number[] = [];
    const baseInterval = 900; // 15分钟基础间隔
    const adjustedInterval = baseInterval / Math.max(0.5, cognitiveCapacity);
    
    let currentTime = adjustedInterval;
    while (currentTime < totalDuration) {
      breaks.push(currentTime);
      currentTime += adjustedInterval;
    }
    
    return breaks;
  }

  /**
   * 将响应转换为FSRS状态
   */
  private responseToState(response: StudyResponse): 0 | 1 | 2 | 3 {
    switch (response) {
      case 'again': return 0;
      case 'hard': return 1;
      case 'good': return 2;
      case 'easy': return 3;
      default: return 2;
    }
  }
}