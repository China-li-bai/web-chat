/**
 * 记忆学习系统核心类型定义
 * 基于脑科学研究和间隔重复理论
 */

// 学习项目类型
export type LearningItemType = 
  | 'vocabulary'    // 词汇
  | 'concept'       // 概念
  | 'procedure'     // 程序性知识
  | 'fact'          // 事实性知识
  | 'formula'       // 公式
  | 'custom';       // 自定义

// 学习响应类型（基于SuperMemo评分系统）
export type StudyResponse = 
  | 'again'   // 0 - 完全忘记，需要重新学习
  | 'hard'    // 1 - 困难，勉强记起
  | 'good'    // 2 - 良好，正常回忆
  | 'easy';   // 3 - 简单，轻松回忆

// 学习项目基础接口
export interface LearningItem {
  id: string;
  content: string;
  type: LearningItemType;
  difficulty: number;        // 0-1之间，表示内在难度
  createdAt: Date;
  metadata?: Record<string, any>;
}

// 学习记录
export interface StudyRecord {
  itemId: string;
  timestamp: Date;
  response: StudyResponse;
  responseTime: number;      // 响应时间（毫秒）
  confidence: number;        // 0-1之间，用户自评信心度
}

// 记忆强度状态
export interface MemoryStrength {
  stability: number;         // 记忆稳定性（天数）
  difficulty: number;        // 项目难度
  retrievability: number;    // 当前可检索性 0-1
  lastReview: Date;
  nextReview: Date;
  reviewCount: number;
  lapseCount: number;        // 遗忘次数
}

// 学习会话
export interface StudySession {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  itemsStudied: number;
  correctResponses: number;
  averageResponseTime: number;
  cognitiveLoad: number;     // 认知负荷 0-1
}

// 个人学习档案
export interface LearningProfile {
  userId: string;
  cognitiveCapacity: number;    // 认知容量 0-1
  learningSpeed: number;        // 学习速度 0-1
  retentionRate: number;        // 保持率 0-1
  preferredDifficulty: number;  // 偏好难度 0-1
  adaptationRate: number;       // 适应速度 0-1
  lastUpdated: Date;
}

// 认知负荷组成
export interface CognitiveLoad {
  intrinsic: number;    // 内在负荷（材料本身复杂度）
  extraneous: number;   // 外在负荷（干扰因素）
  germane: number;      // 相关负荷（学习处理）
  total: number;        // 总负荷
}

// 难度调整结果
export interface DifficultyAdjustment {
  originalDifficulty: number;
  adjustedDifficulty: number;
  adjustmentReason: string;
  confidence: number;    // 调整的信心度
}

// 复习计划项
export interface ReviewItem {
  itemId: string;
  scheduledTime: Date;
  priority: number;      // 优先级 0-1
  estimatedDuration: number; // 预估学习时间（分钟）
}

// 学习策略配置
export interface StrategyConfig {
  algorithm: 'sm2' | 'fsrs' | 'custom';
  parameters: Record<string, number>;
  adaptiveMode: boolean;
  maxReviewsPerDay: number;
  targetRetention: number;   // 目标保持率
}

// 算法接口
export interface SpacedRepetitionAlgorithm {
  calculateNextReview(
    item: LearningItem,
    records: StudyRecord[],
    response: StudyResponse
  ): MemoryStrength;
  
  estimateRetention(
    strength: MemoryStrength,
    timeElapsed: number
  ): number;
}

export interface MemoryStrengthCalculator {
  calculateStrength(
    item: LearningItem,
    records: StudyRecord[]
  ): MemoryStrength;
  
  updateStrength(
    currentStrength: MemoryStrength,
    newRecord: StudyRecord
  ): MemoryStrength;
}

export interface DifficultyAdaptiveAlgorithm {
  analyzeLearningProfile(
    userId: string,
    records: StudyRecord[],
    sessions: StudySession[]
  ): LearningProfile;
  
  adjustDifficulty(
    item: LearningItem,
    records: StudyRecord[],
    profile: LearningProfile
  ): DifficultyAdjustment;
  
  calculateCognitiveLoad(records: StudyRecord[]): CognitiveLoad;
  
  predictOptimalDifficulty(
    profile: LearningProfile,
    itemType: LearningItemType,
    currentPerformance: number
  ): number;
}

export interface ActiveRetrievalStrategy {
  generateRetrievalCues(item: LearningItem): string[];
  
  calculateRetrievalStrength(
    item: LearningItem,
    records: StudyRecord[]
  ): number;
  
  optimizeRetrievalTiming(
    items: LearningItem[],
    strengths: MemoryStrength[]
  ): ReviewItem[];
  
  adaptRetrievalDifficulty(
    item: LearningItem,
    performance: number
  ): LearningItem;
}

// 统计和分析接口
export interface LearningAnalytics {
  calculateRetentionRate(records: StudyRecord[]): number;
  calculateLearningVelocity(records: StudyRecord[]): number;
  identifyWeakAreas(items: LearningItem[], records: StudyRecord[]): LearningItemType[];
  predictLearningOutcome(profile: LearningProfile, targetItems: number): number;
}

// 错误和异常类型
export class MemoryAlgorithmError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MemoryAlgorithmError';
  }
}

export class InsufficientDataError extends MemoryAlgorithmError {
  constructor(message: string = 'Insufficient data for calculation') {
    super(message, 'INSUFFICIENT_DATA');
  }
}

export class InvalidParameterError extends MemoryAlgorithmError {
  constructor(message: string = 'Invalid parameter provided') {
    super(message, 'INVALID_PARAMETER');
  }
}

// 主动检索策略相关类型
export interface RetrievalStrategy {
  type: 'free_recall' | 'cued_recall' | 'recognition' | 'elaborative_retrieval';
  difficulty: 'easy' | 'medium' | 'hard';
  hints: string[];
  timeLimit: number; // 秒
  description: string;
}

export interface ScheduledItem {
  item: LearningItem;
  scheduledTime: Date;
  retrievalStrength: number;
  strategy: RetrievalStrategy;
}

export interface RetrievalSchedule {
  items: ScheduledItem[];
  totalItems: number;
  estimatedDuration: number; // 秒
  cognitiveLoadPrediction: number;
  generatedAt: Date;
}

export interface TestingEffect {
  strength: number;
  retrievalAttempts: number;
  successfulRetrievals: number;
  lastRetrievalDate: Date | null;
  predictedRetention: number;
}