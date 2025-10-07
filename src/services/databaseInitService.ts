/**
 * 数据库初始化服务
 * 基于 database-schema.sql 实现 SQLite 数据库的初始化
 */

import { createSqliteDatabaseAdapter } from '../packages';
import type { DatabaseAdapter } from '../packages/wa-sqlite-adapter/databaseAdapter';

export class DatabaseInitService {
  private static instance: DatabaseInitService;
  private adapter: DatabaseAdapter | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): DatabaseInitService {
    if (!DatabaseInitService.instance) {
      DatabaseInitService.instance = new DatabaseInitService();
    }
    return DatabaseInitService.instance;
  }

  /**
   * 初始化数据库
   */
  public async initialize(dbName: string = 'language_learning.db'): Promise<DatabaseAdapter> {
    if (this.isInitialized && this.adapter) {
      return this.adapter;
    }

    try {
      // 创建数据库适配器
      this.adapter = await createSqliteDatabaseAdapter(dbName);
      
      // 创建表结构
      await this.createTables();
      
      // 创建索引
      await this.createIndexes();
      
      // 创建视图
      await this.createViews();
      
      // 创建触发器
      await this.createTriggers();
      
      this.isInitialized = true;
      console.log('数据库初始化完成');
      
      return this.adapter;
    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据库适配器
   */
  public getAdapter(): DatabaseAdapter {
    if (!this.adapter) {
      throw new Error('数据库未初始化，请先调用 initialize()');
    }
    return this.adapter;
  }

  /**
   * 创建表结构
   */
  private async createTables(): Promise<void> {
    const tables = [
      // 词书表
      `CREATE TABLE IF NOT EXISTS wordbooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('academic', 'exam', 'business', 'daily', 'custom')),
        description TEXT,
        difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
        word_count INTEGER NOT NULL DEFAULT 0,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        source TEXT CHECK (source IN ('oxford_3000', 'cet4', 'cet6', 'postgraduate', 'interview', 'custom')),
        is_active BOOLEAN NOT NULL DEFAULT true
      )`,

      // 词汇表
      `CREATE TABLE IF NOT EXISTS vocabularies (
        id TEXT PRIMARY KEY,
        wordbook_id TEXT NOT NULL,
        word TEXT NOT NULL,
        pronunciation TEXT,
        meaning TEXT NOT NULL,
        example TEXT,
        difficulty REAL NOT NULL DEFAULT 0.5 CHECK (difficulty >= 0 AND difficulty <= 1),
        mastery_level REAL NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 1),
        last_reviewed TEXT,
        review_count INTEGER NOT NULL DEFAULT 0,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE
      )`,

      // 学习记录表
      `CREATE TABLE IF NOT EXISTS learning_records (
        id TEXT PRIMARY KEY,
        wordbook_id TEXT NOT NULL,
        vocabulary_id TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'default_user',
        session_id TEXT NOT NULL,
        result TEXT NOT NULL CHECK (result IN ('correct', 'incorrect', 'skip')),
        time_spent INTEGER NOT NULL DEFAULT 0,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE,
        FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE CASCADE
      )`,

      // 学习会话表
      `CREATE TABLE IF NOT EXISTS learning_sessions (
        id TEXT PRIMARY KEY,
        wordbook_id TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'default_user',
        start_time TEXT NOT NULL,
        end_time TEXT,
        total_words INTEGER NOT NULL DEFAULT 0,
        correct_answers INTEGER NOT NULL DEFAULT 0,
        total_time INTEGER NOT NULL DEFAULT 0,
        is_completed BOOLEAN NOT NULL DEFAULT false,
        created_at TEXT NOT NULL,
        FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE
      )`,

      // 每日进度表
      `CREATE TABLE IF NOT EXISTS daily_progress (
        id TEXT PRIMARY KEY,
        wordbook_id TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'default_user',
        date TEXT NOT NULL,
        words_studied INTEGER NOT NULL DEFAULT 0,
        accuracy REAL NOT NULL DEFAULT 0 CHECK (accuracy >= 0 AND accuracy <= 1),
        time_spent INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE,
        UNIQUE(wordbook_id, user_id, date)
      )`
    ];

    for (const sql of tables) {
      await this.adapter!.run({ sql });
    }
  }

  /**
   * 创建索引
   */
  private async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_vocabularies_wordbook_id ON vocabularies(wordbook_id)',
      'CREATE INDEX IF NOT EXISTS idx_learning_records_wordbook_id ON learning_records(wordbook_id)',
      'CREATE INDEX IF NOT EXISTS idx_learning_records_vocabulary_id ON learning_records(vocabulary_id)',
      'CREATE INDEX IF NOT EXISTS idx_learning_records_timestamp ON learning_records(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_learning_sessions_wordbook_id ON learning_sessions(wordbook_id)',
      'CREATE INDEX IF NOT EXISTS idx_learning_sessions_start_time ON learning_sessions(start_time)',
      'CREATE INDEX IF NOT EXISTS idx_daily_progress_wordbook_id ON daily_progress(wordbook_id)',
      'CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(date)'
    ];

    for (const sql of indexes) {
      await this.adapter!.run({ sql });
    }
  }

  /**
   * 创建视图
   */
  private async createViews(): Promise<void> {
    const views = [
      `CREATE VIEW IF NOT EXISTS wordbook_stats AS
      SELECT 
        w.id as wordbook_id,
        w.name as wordbook_name,
        COUNT(v.id) as total_words,
        COUNT(CASE WHEN v.mastery_level >= 0.8 THEN 1 END) as mastered_words,
        COALESCE(AVG(v.mastery_level), 0) as average_mastery,
        COALESCE(SUM(dp.time_spent), 0) as total_study_time,
        MAX(dp.date) as last_study_date,
        COUNT(DISTINCT ls.id) as study_sessions,
        CASE 
          WHEN COUNT(lr.id) > 0 THEN 
            CAST(COUNT(CASE WHEN lr.result = 'correct' THEN 1 END) AS REAL) / COUNT(lr.id)
          ELSE 0 
        END as accuracy_rate
      FROM wordbooks w
      LEFT JOIN vocabularies v ON w.id = v.wordbook_id
      LEFT JOIN learning_records lr ON w.id = lr.wordbook_id
      LEFT JOIN learning_sessions ls ON w.id = ls.wordbook_id AND ls.is_completed = true
      LEFT JOIN daily_progress dp ON w.id = dp.wordbook_id
      WHERE w.is_active = true
      GROUP BY w.id, w.name`
    ];

    for (const sql of views) {
      await this.adapter!.run({ sql });
    }
  }

  /**
   * 创建触发器
   */
  private async createTriggers(): Promise<void> {
    const triggers = [
      // 更新词书的word_count
      `CREATE TRIGGER IF NOT EXISTS update_wordbook_count 
      AFTER INSERT ON vocabularies
      BEGIN
        UPDATE wordbooks 
        SET word_count = (
          SELECT COUNT(*) FROM vocabularies WHERE wordbook_id = NEW.wordbook_id
        ),
        updated_at = datetime('now')
        WHERE id = NEW.wordbook_id;
      END`,

      `CREATE TRIGGER IF NOT EXISTS update_wordbook_count_delete
      AFTER DELETE ON vocabularies
      BEGIN
        UPDATE wordbooks 
        SET word_count = (
          SELECT COUNT(*) FROM vocabularies WHERE wordbook_id = OLD.wordbook_id
        ),
        updated_at = datetime('now')
        WHERE id = OLD.wordbook_id;
      END`,

      // 更新词汇的复习统计
      `CREATE TRIGGER IF NOT EXISTS update_vocabulary_stats
      AFTER INSERT ON learning_records
      BEGIN
        UPDATE vocabularies 
        SET 
          review_count = review_count + 1,
          last_reviewed = NEW.timestamp,
          mastery_level = CASE 
            WHEN NEW.result = 'correct' THEN 
              MIN(1.0, mastery_level + 0.1)
            WHEN NEW.result = 'incorrect' THEN 
              MAX(0.0, mastery_level - 0.05)
            ELSE mastery_level
          END,
          updated_at = datetime('now')
        WHERE id = NEW.vocabulary_id;
      END`
    ];

    for (const sql of triggers) {
      await this.adapter!.run({ sql });
    }
  }

  /**
   * 检查数据库是否已初始化
   */
  public async isDbInitialized(): Promise<boolean> {
    if (!this.adapter) return false;
    
    try {
      const result = await this.adapter.query({
        sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='wordbooks'"
      });
      return result.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * 重置数据库（仅用于测试）
   */
  public async resetDatabase(): Promise<void> {
    if (!this.adapter) return;

    const tables = ['daily_progress', 'learning_sessions', 'learning_records', 'vocabularies', 'wordbooks'];
    
    for (const table of tables) {
      await this.adapter.run({ sql: `DROP TABLE IF EXISTS ${table}` });
    }
    
    await this.adapter.run({ sql: 'DROP VIEW IF EXISTS wordbook_stats' });
    
    this.isInitialized = false;
  }
}

// 导出单例实例
export const databaseInitService = DatabaseInitService.getInstance();