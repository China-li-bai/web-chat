/**
 * 数据库模块主入口
 * 统一导出数据库连接、DAO类和类型定义
 */

// 数据库连接
export { DatabaseConnection } from './connection';

// DAO类
export {
  BaseDAO,
  LearningItemDAO,
  StudyRecordDAO,
  StudySessionDAO
} from './dao';

// 类型定义
export type {
  // 数据库记录类型
  BaseRecord,
  UserRecord,
  LearningItemRecord,
  StudyRecordDB,
  StudySessionRecord,
  LearningProfileRecord,
  CognitiveLoadRecord,
  DifficultyAdjustmentRecord,
  RetrievalStrategyRecord,
  SyncStatusRecord,
  
  // 工具类型
  DatabaseResult,
  QueryOptions,
  PaginatedResult,
  StudyStatistics,
  LearningProgress,
  AlgorithmMetrics
} from './types';

import { DatabaseConnection } from './connection';
import { LearningItemDAO, StudyRecordDAO, StudySessionDAO } from './dao';

// 数据库管理器类
export class DatabaseManager {
  private connection: DatabaseConnection;
  private learningItemDAO: LearningItemDAO;
  private studyRecordDAO: StudyRecordDAO;
  private studySessionDAO: StudySessionDAO;

  constructor(config?: any) {
    this.connection = DatabaseConnection.getInstance(config);
    this.learningItemDAO = new LearningItemDAO();
    this.studyRecordDAO = new StudyRecordDAO();
    this.studySessionDAO = new StudySessionDAO();
  }

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    await this.connection.initialize();
  }

  /**
   * 获取学习项目DAO
   */
  get learningItems(): LearningItemDAO {
    return this.learningItemDAO;
  }

  /**
   * 获取学习记录DAO
   */
  get studyRecords(): StudyRecordDAO {
    return this.studyRecordDAO;
  }

  /**
   * 获取学习会话DAO
   */
  get studySessions(): StudySessionDAO {
    return this.studySessionDAO;
  }

  /**
   * 获取数据库连接
   */
  get db(): DatabaseConnection {
    return this.connection;
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    await this.connection.close();
  }

  /**
   * 获取数据库统计信息
   */
  async getStats(): Promise<any> {
    return this.connection.getStats();
  }

  /**
   * 执行数据库备份
   */
  async backup(filePath: string): Promise<void> {
    // TODO: 实现数据库备份功能
    throw new Error('备份功能尚未实现');
  }

  /**
   * 从备份恢复数据库
   */
  async restore(filePath: string): Promise<void> {
    // TODO: 实现数据库恢复功能
    throw new Error('恢复功能尚未实现');
  }
}