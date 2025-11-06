/**
 * Unified Database Service - 统一数据库服务层
 * 提供类型安全的数据库访问接口，替代原有的 db.ts
 */

import { BasicDatabase, type Database } from '@/packages/wa-sqlite-adapter/database';
import { MigrationManager } from './migrations/migration-manager';
import { createInitialSchema } from './migrations/v001-initial';

// 重新导出所有类型定义
export * from './schemas/learning.schema';
export * from './schemas/practice.schema'; 
export * from './schemas/game.schema';
export * from './schemas/user.schema';

// 导入业务查询方法需要的类型
import type { 
  WordbookEntity, 
  WordEntity, 
  LearningProgressEntity, 
  StudyLogEntity, 
  LearningStatisticsEntity 
} from './schemas/learning.schema';
import type { GameSessionEntity } from './schemas/game.schema';

class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;
  private migrationManager: MigrationManager;
  private hasTriedReset = false;

  private constructor() {
    this.migrationManager = new MigrationManager();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * 获取数据库连接实例
   */
  async getConnection(): Promise<Database> {
    if (this.db) {
      return this.db;
    }

    const dbName = 'language-learning.db';
    
    try {
      const db = await this.initializeDatabase(dbName);
      this.db = db;
      return db;
    } catch (e: any) {
      // 数据库损坏时的自愈逻辑
      if (!this.hasTriedReset && this.isMalformedError(e)) {
        console.warn('Database is malformed. Attempting self-heal reset:', e?.message);
        this.hasTriedReset = true;
        
        try {
          await this.resetDatabase(dbName);
          const db = await this.initializeDatabase(dbName);
          this.db = db;
          console.log('Database has been reset and rebuilt due to corruption.');
          return db;
        } catch (e2) {
          console.error('Database self-heal reset failed:', e2);
          throw e2;
        }
      }
      throw e;
    }
  }

  /**
   * 初始化数据库
   */
  private async initializeDatabase(dbName: string): Promise<Database> {
    const db = await BasicDatabase.init(dbName);
    
    // 运行初始化脚本
    await createInitialSchema(db);
    
    // 运行迁移
    await this.migrationManager.runMigrations(db);
    
    return db;
  }

  /**
   * 重置损坏的数据库
   */
  private async resetDatabase(dbName: string): Promise<void> {
    // 关闭现有连接
    if (this.db && typeof (this.db as any).close === 'function') {
      try {
        await (this.db as any).close();
      } catch {}
    }
    this.db = null;

    // 删除 IndexedDB
    await this.deleteIndexedDB(dbName);
  }

  /**
   * 删除 IndexedDB 数据库
   */
  private async deleteIndexedDB(dbName: string): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error('indexedDB delete error'));
        req.onblocked = () => resolve(); // 避免卡住
      });
    } catch (err) {
      console.warn('IndexedDB delete failed (ignored):', err);
    }
  }

  /**
   * 检测是否为数据库损坏错误
   */
  private isMalformedError(e: any): boolean {
    const msg = String(e?.message || e || '').toLowerCase();
    return msg.includes('malformed') || msg.includes('disk image is malformed');
  }

  /**
   * 执行原始SQL查询
   */
  async exec(options: { sql: string; args?: any[] }): Promise<any> {
    const db = await this.getConnection();
    return db.exec(options);
  }

  /**
   * 检查迁移状态
   */
  async checkMigrationStatus() {
    const db = await this.getConnection();
    return this.migrationManager.checkMigrationStatus(db);
  }

  /**
   * 强制重新初始化数据库（仅用于开发测试）
   */
  async forceReset(): Promise<void> {
    const dbName = 'language-learning.db';
    await this.resetDatabase(dbName);
    this.hasTriedReset = false;
    await this.getConnection(); // 重新初始化
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db && typeof (this.db as any).close === 'function') {
      await (this.db as any).close();
      this.db = null;
    }
  }

  // ===== 业务查询方法 - 类型安全的数据库访问接口 =====

  /**
   * Learning Domain - 学习领域查询接口
   */

  // 获取词书列表
  async getWordbooks(): Promise<WordbookEntity[]> {
    const db = await this.getConnection();
    return db.exec({
      sql: 'SELECT * FROM "wordbooks" ORDER BY "createdAt" DESC'
    }) as Promise<WordbookEntity[]>;
  }

  // 根据ID获取词书
  async getWordbookById(id: number): Promise<WordbookEntity | null> {
    const db = await this.getConnection();
    const rows = await db.exec({
      sql: 'SELECT * FROM "wordbooks" WHERE "id" = ?',
      args: [id]
    }) as WordbookEntity[];
    return rows[0] || null;
  }

  // 创建词书
  async createWordbook(data: Omit<WordbookEntity, 'id' | 'createdAt'>): Promise<number> {
    const db = await this.getConnection();
    const result = await db.exec({
      sql: 'INSERT INTO "wordbooks" (name, description) VALUES (?, ?) RETURNING id',
      args: [data.name, data.description || null]
    }) as { id: number }[];
    return result[0].id;
  }

  // 获取词书中的单词 (带学习进度)
  async getWordsWithProgress(wordbookId: number, userId: string): Promise<Array<WordEntity & Partial<LearningProgressEntity>>> {
    const db = await this.getConnection();
    return db.exec({
      sql: `
        SELECT 
          w.*,
          lp.stability, lp.retrievability, lp.difficulty, 
          lp.nextReview, lp.lastReview, lp.state, lp.reviewCount
        FROM "words" w
        LEFT JOIN "learning_progress" lp ON w.id = lp.wordId
        WHERE w.wordbookId = ? AND w.userId = ?
        ORDER BY w.createdAt
      `,
      args: [wordbookId, userId]
    });
  }

  // 获取待复习的单词
  async getWordsForReview(wordbookId: number, userId: string, limit = 20): Promise<Array<WordEntity & LearningProgressEntity>> {
    const db = await this.getConnection();
    const now = new Date().toISOString();
    return db.exec({
      sql: `
        SELECT 
          w.*, 
          lp.stability, lp.retrievability, lp.difficulty,
          lp.nextReview, lp.lastReview, lp.state, lp.reviewCount, lp.lapseCount
        FROM "words" w
        JOIN "learning_progress" lp ON w.id = lp.wordId
        WHERE w.wordbookId = ? AND w.userId = ? AND lp.nextReview <= ?
        ORDER BY lp.nextReview
        LIMIT ?
      `,
      args: [wordbookId, userId, now, limit]
    });
  }

  // 创建单词
  async createWord(data: Omit<WordEntity, 'id' | 'createdAt'>): Promise<number> {
    const db = await this.getConnection();
    const result = await db.exec({
      sql: `
        INSERT INTO "words" (wordbookId, userId, word, type, phonetic, definition, translation, example)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `,
      args: [
        data.wordbookId, data.userId, data.word, data.type,
        data.phonetic || null, data.definition, data.translation || null, data.example || null
      ]
    }) as { id: number }[];
    return result[0].id;
  }

  // 更新学习进度
  async updateLearningProgress(data: Omit<LearningProgressEntity, 'id'>): Promise<void> {
    const db = await this.getConnection();
    await db.exec({
      sql: `
        INSERT OR REPLACE INTO "learning_progress" 
        (wordId, userId, stability, retrievability, difficulty, nextReview, lastReview, reviewCount, lapseCount, state)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        data.wordId, data.userId, data.stability, data.retrievability, data.difficulty,
        data.nextReview, data.lastReview || null, data.reviewCount, data.lapseCount, data.state
      ]
    });
  }

  // 记录学习日志
  async createStudyLog(data: Omit<StudyLogEntity, 'id'>): Promise<void> {
    const db = await this.getConnection();
    await db.exec({
      sql: `
        INSERT INTO "study_logs" 
        (itemId, userId, timestamp, response, responseTime, confidence, previousStability, previousRetrievability, newStability, newRetrievability)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        data.itemId, data.userId, data.timestamp, data.response, data.responseTime,
        data.confidence || null, data.previousStability || null, data.previousRetrievability || null,
        data.newStability || null, data.newRetrievability || null
      ]
    });
  }

  /**
   * Game Domain - 游戏领域查询接口
   */

  // 创建游戏会话
  async createGameSession(data: Omit<GameSessionEntity, 'createdAt'>): Promise<void> {
    const db = await this.getConnection();
    await db.exec({
      sql: `
        INSERT INTO "game_sessions" 
        (id, userId, wordbookId, gameType, difficulty, status, startTime, endTime, currentQuestionIndex, timeRemaining, totalScore, correctAnswers, totalQuestions, streak, maxStreak, settings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        data.id, data.userId, data.wordbookId, data.gameType, data.difficulty, data.status,
        data.startTime, data.endTime || null, data.currentQuestionIndex, data.timeRemaining,
        data.totalScore, data.correctAnswers, data.totalQuestions, data.streak, data.maxStreak,
        data.settings
      ]
    });
  }

  // 获取游戏会话
  async getGameSession(sessionId: string): Promise<GameSessionEntity | null> {
    const db = await this.getConnection();
    const rows = await db.exec({
      sql: 'SELECT * FROM "game_sessions" WHERE "id" = ?',
      args: [sessionId]
    }) as GameSessionEntity[];
    return rows[0] || null;
  }

  // 更新游戏会话
  async updateGameSession(sessionId: string, updates: Partial<GameSessionEntity>): Promise<void> {
    const db = await this.getConnection();
    const fields = Object.keys(updates).map(key => `"${key}" = ?`).join(', ');
    const values = Object.values(updates);
    
    await db.exec({
      sql: `UPDATE "game_sessions" SET ${fields} WHERE "id" = ?`,
      args: [...values, sessionId]
    });
  }

  /**
   * Statistics Domain - 统计领域查询接口
   */

  // 获取学习统计数据
  async getLearningStatistics(userId: string, startDate?: string, endDate?: string): Promise<LearningStatisticsEntity[]> {
    const db = await this.getConnection();
    let sql = 'SELECT * FROM "learning_statistics" WHERE "userId" = ?';
    const args = [userId];

    if (startDate) {
      sql += ' AND "date" >= ?';
      args.push(startDate);
    }
    if (endDate) {
      sql += ' AND "date" <= ?';
      args.push(endDate);
    }

    sql += ' ORDER BY "date" DESC';

    return db.exec({ sql, args }) as Promise<LearningStatisticsEntity[]>;
  }

  // 更新学习统计
  async updateLearningStatistics(data: Omit<LearningStatisticsEntity, 'id'>): Promise<void> {
    const db = await this.getConnection();
    await db.exec({
      sql: `
        INSERT OR REPLACE INTO "learning_statistics"
        (userId, date, totalReviews, correctReviews, totalResponseTime, avgResponseTime, avgStability, avgRetrievability, streakDays, lastUpdated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        data.userId, data.date, data.totalReviews, data.correctReviews,
        data.totalResponseTime, data.avgResponseTime, data.avgStability,
        data.avgRetrievability, data.streakDays, data.lastUpdated
      ]
    });
  }
}

// 导出单例实例
export const databaseService = DatabaseService.getInstance();

/**
 * 向后兼容的 getDB 函数
 * @deprecated 建议使用 databaseService.getConnection()
 */
export async function getDB(): Promise<Database> {
  return databaseService.getConnection();
}

// 导出数据库服务类型
export type { Database };
export { DatabaseService };