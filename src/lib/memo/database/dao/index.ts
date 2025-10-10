/**
 * DAO模块统一导出
 * 提供所有数据访问对象的统一入口
 */

export { BaseDAO } from './BaseDAO';
export { LearningItemDAO } from './LearningItemDAO';
export { StudyRecordDAO } from './StudyRecordDAO';
export { StudySessionDAO } from './StudySessionDAO';

// 导出类型
export type {
  DatabaseResult,
  QueryOptions,
  PaginatedResult,
  StudyStatistics,
  LearningProgress,
  AlgorithmMetrics
} from '../types';