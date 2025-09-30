/**
 * 记忆学习系统工具函数
 */

import type { StudyResponse, StudyRecord, LearningItem } from '../types';

// 常量定义
export const RESPONSE_SCORES = {
  again: 0,
  hard: 1,
  good: 2,
  easy: 3
} as const;

export const DEFAULT_PARAMETERS = {
  // SM-2 默认参数
  SM2_INITIAL_INTERVAL: 1,
  SM2_INITIAL_REPETITION: 0,
  SM2_INITIAL_EASINESS: 2.5,
  SM2_MIN_EASINESS: 1.3,
  SM2_EASINESS_THRESHOLD: 3,
  
  // FSRS 默认参数
  FSRS_INITIAL_STABILITY: [0.4, 0.6, 2.4, 5.8],
  FSRS_INITIAL_DIFFICULTY: 5.0,
  
  // 认知负荷参数
  MAX_RESPONSE_TIME: 30000,  // 30秒
  OPTIMAL_RESPONSE_TIME: 3000, // 3秒
  
  // 难度调整参数
  MAX_DIFFICULTY_ADJUSTMENT: 0.2,
  MIN_RECORDS_FOR_ADJUSTMENT: 3,
  
  // 目标保持率
  TARGET_RETENTION: 0.9
} as const;

/**
 * 将响应转换为数值分数
 */
export function responseToScore(response: StudyResponse): number {
  return RESPONSE_SCORES[response];
}

/**
 * 将数值分数转换为响应
 */
export function scoreToResponse(score: number): StudyResponse {
  const responses: StudyResponse[] = ['again', 'hard', 'good', 'easy'];
  const clampedScore = Math.max(0, Math.min(3, Math.round(score)));
  return responses[clampedScore];
}

/**
 * 计算成功率（good或easy的比例）
 */
export function calculateSuccessRate(records: StudyRecord[]): number {
  if (records.length === 0) return 0;
  
  const successfulRecords = records.filter(
    record => record.response === 'good' || record.response === 'easy'
  );
  
  return successfulRecords.length / records.length;
}

/**
 * 计算平均响应时间
 */
export function calculateAverageResponseTime(records: StudyRecord[]): number {
  if (records.length === 0) return 0;
  
  const totalTime = records.reduce((sum, record) => sum + record.responseTime, 0);
  return totalTime / records.length;
}

/**
 * 计算响应时间的标准差
 */
export function calculateResponseTimeStdDev(records: StudyRecord[]): number {
  if (records.length === 0) return 0;
  
  const avgTime = calculateAverageResponseTime(records);
  const squaredDiffs = records.map(record => 
    Math.pow(record.responseTime - avgTime, 2)
  );
  
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / records.length;
  return Math.sqrt(variance);
}

/**
 * 计算学习趋势（最近的表现是否在改善）
 */
export function calculateLearningTrend(records: StudyRecord[]): number {
  if (records.length < 2) return 0;
  
  // 按时间排序
  const sortedRecords = [...records].sort((a, b) => 
    a.timestamp.getTime() - b.timestamp.getTime()
  );
  
  // 计算前半部分和后半部分的平均分数
  const midPoint = Math.floor(sortedRecords.length / 2);
  const firstHalf = sortedRecords.slice(0, midPoint);
  const secondHalf = sortedRecords.slice(midPoint);
  
  const firstHalfAvg = firstHalf.reduce((sum, record) => 
    sum + responseToScore(record.response), 0
  ) / firstHalf.length;
  
  const secondHalfAvg = secondHalf.reduce((sum, record) => 
    sum + responseToScore(record.response), 0
  ) / secondHalf.length;
  
  // 返回改善程度 (-1 到 1)
  return (secondHalfAvg - firstHalfAvg) / 3;
}

/**
 * 计算遗忘曲线参数
 */
export function calculateForgettingCurve(records: StudyRecord[]): {
  initialStrength: number;
  decayRate: number;
} {
  if (records.length < 2) {
    return { initialStrength: 0.5, decayRate: 0.1 };
  }
  
  // 简化的遗忘曲线计算
  const successRate = calculateSuccessRate(records);
  const avgResponseTime = calculateAverageResponseTime(records);
  
  // 基于成功率和响应时间估算初始强度
  const initialStrength = Math.max(0.1, Math.min(1.0, 
    successRate * (1 - avgResponseTime / DEFAULT_PARAMETERS.MAX_RESPONSE_TIME)
  ));
  
  // 基于学习趋势估算衰减率
  const trend = calculateLearningTrend(records);
  const decayRate = Math.max(0.01, Math.min(0.5, 0.1 - trend * 0.05));
  
  return { initialStrength, decayRate };
}

/**
 * 标准化数值到指定范围
 */
export function normalize(value: number, min: number = 0, max: number = 1): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 计算两个日期之间的天数差
 */
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs((date2.getTime() - date1.getTime()) / msPerDay);
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as unknown as T;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * 验证学习记录的有效性
 */
export function validateStudyRecord(record: StudyRecord): boolean {
  return (
    typeof record.itemId === 'string' &&
    record.itemId.length > 0 &&
    record.timestamp instanceof Date &&
    ['again', 'hard', 'good', 'easy'].includes(record.response) &&
    typeof record.responseTime === 'number' &&
    record.responseTime > 0 &&
    typeof record.confidence === 'number' &&
    record.confidence >= 0 &&
    record.confidence <= 1
  );
}

/**
 * 验证学习项目的有效性
 */
export function validateLearningItem(item: LearningItem): boolean {
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.content === 'string' &&
    item.content.length > 0 &&
    ['vocabulary', 'concept', 'procedure', 'fact', 'formula', 'custom'].includes(item.type) &&
    typeof item.difficulty === 'number' &&
    item.difficulty >= 0 &&
    item.difficulty <= 1 &&
    item.createdAt instanceof Date
  );
}

/**
 * 计算置信区间
 */
export function calculateConfidenceInterval(
  values: number[],
  confidence: number = 0.95
): { lower: number; upper: number; mean: number } {
  if (values.length === 0) {
    return { lower: 0, upper: 0, mean: 0 };
  }
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  if (values.length === 1) {
    return { lower: mean, upper: mean, mean };
  }
  
  // 计算标准差
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  const stdDev = Math.sqrt(variance);
  
  // 使用t分布的近似值（对于大样本，接近正态分布）
  const tValue = confidence === 0.95 ? 1.96 : 2.58; // 95%或99%置信区间
  const margin = tValue * (stdDev / Math.sqrt(values.length));
  
  return {
    lower: mean - margin,
    upper: mean + margin,
    mean
  };
}

/**
 * 指数移动平均
 */
export function exponentialMovingAverage(
  values: number[],
  alpha: number = 0.3
): number[] {
  if (values.length === 0) return [];
  
  const result = [values[0]];
  
  for (let i = 1; i < values.length; i++) {
    const ema = alpha * values[i] + (1 - alpha) * result[i - 1];
    result.push(ema);
  }
  
  return result;
}