/**
 * wa-sqlite数据库连接管理器
 * 支持离线存储、数据库初始化和连接池管理
 */

import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import * as SQLite from 'wa-sqlite';

// 数据库配置
export interface DatabaseConfig {
  dbName: string;
  version: number;
  enableWAL?: boolean; // Write-Ahead Logging
  enableForeignKeys?: boolean;
  busyTimeout?: number; // 毫秒
  cacheSize?: number; // 页面数
}

// 默认配置
const DEFAULT_CONFIG: DatabaseConfig = {
  dbName: 'memory_learning.db',
  version: 1,
  enableWAL: true,
  enableForeignKeys: true,
  busyTimeout: 5000,
  cacheSize: 2000
};

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private sqlite3: any;
  private db: number | null = null;
  private config: DatabaseConfig;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 获取数据库连接单例
   */
  static getInstance(config?: Partial<DatabaseConfig>): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  /**
   * 初始化数据库连接
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // 初始化SQLite模块
      const module = await SQLiteESMFactory();
      this.sqlite3 = SQLite.Factory(module);

      // 打开数据库
      this.db = await this.sqlite3.open_v2(
        this.config.dbName,
        SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE,
        null
      );

      // 配置数据库
      await this._configureDatabase();

      // 初始化数据库结构
      await this._initializeSchema();

      this.isInitialized = true;
      console.log(`数据库 ${this.config.dbName} 初始化成功`);
    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw new Error(`数据库初始化失败: ${error}`);
    }
  }

  /**
   * 配置数据库参数
   */
  private async _configureDatabase(): Promise<void> {
    if (!this.db || !this.sqlite3) {
      throw new Error('数据库未初始化');
    }

    // 启用外键约束
    if (this.config.enableForeignKeys) {
      await this.sqlite3.exec(this.db, 'PRAGMA foreign_keys = ON;');
    }

    // 启用WAL模式
    if (this.config.enableWAL) {
      await this.sqlite3.exec(this.db, 'PRAGMA journal_mode = WAL;');
    }

    // 设置忙等待超时
    if (this.config.busyTimeout) {
      await this.sqlite3.exec(this.db, `PRAGMA busy_timeout = ${this.config.busyTimeout};`);
    }

    // 设置缓存大小
    if (this.config.cacheSize) {
      await this.sqlite3.exec(this.db, `PRAGMA cache_size = ${this.config.cacheSize};`);
    }

    // 优化性能设置
    await this.sqlite3.exec(this.db, 'PRAGMA synchronous = NORMAL;');
    await this.sqlite3.exec(this.db, 'PRAGMA temp_store = MEMORY;');
    await this.sqlite3.exec(this.db, 'PRAGMA mmap_size = 268435456;'); // 256MB
  }

  /**
   * 初始化数据库结构
   */
  private async _initializeSchema(): Promise<void> {
    if (!this.db || !this.sqlite3) {
      throw new Error('数据库未初始化');
    }

    // 读取schema.sql文件内容（在实际应用中，这里应该从文件系统读取）
    const schemaSQL = await this._getSchemaSQL();
    
    // 执行schema创建
    await this.sqlite3.exec(this.db, schemaSQL);
    
    console.log('数据库结构初始化完成');
  }

  /**
   * 获取schema SQL（这里直接内嵌，实际应用中可以从文件读取）
   */
  private async _getSchemaSQL(): Promise<string> {
    // 这里应该读取schema.sql文件，为了简化直接返回核心表结构
    return `
      -- 用户表
      CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          name TEXT,
          email TEXT,
          preferred_session_duration INTEGER DEFAULT 1800,
          target_cognitive_load REAL DEFAULT 0.7,
          interleave_types BOOLEAN DEFAULT TRUE,
          fsrs_request_retention REAL DEFAULT 0.9,
          fsrs_maximum_interval INTEGER DEFAULT 36500,
          fsrs_easy_bonus REAL DEFAULT 1.3,
          fsrs_hard_factor REAL DEFAULT 1.2,
          min_difficulty REAL DEFAULT 0.1,
          max_difficulty REAL DEFAULT 0.9,
          adaptation_rate REAL DEFAULT 0.1,
          total_study_time INTEGER DEFAULT 0,
          total_items_studied INTEGER DEFAULT 0,
          average_success_rate REAL DEFAULT 0.0
      );

      -- 学习项目表
      CREATE TABLE IF NOT EXISTS learning_items (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          content TEXT NOT NULL,
          content_type TEXT DEFAULT 'text',
          category TEXT,
          tags TEXT,
          difficulty REAL DEFAULT 0.5,
          initial_difficulty REAL DEFAULT 0.5,
          priority INTEGER DEFAULT 1,
          due_date DATETIME,
          stability REAL DEFAULT 1.0,
          difficulty_fsrs REAL DEFAULT 5.0,
          elapsed_days INTEGER DEFAULT 0,
          scheduled_days INTEGER DEFAULT 0,
          reps INTEGER DEFAULT 0,
          lapses INTEGER DEFAULT 0,
          state INTEGER DEFAULT 0,
          last_review DATETIME,
          source TEXT,
          metadata TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- 学习记录表
      CREATE TABLE IF NOT EXISTS study_records (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          session_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          response TEXT NOT NULL,
          response_time INTEGER NOT NULL,
          confidence REAL,
          memory_strength REAL,
          retrievability REAL,
          stability_before REAL,
          stability_after REAL,
          difficulty_before REAL,
          difficulty_after REAL,
          retrieval_strategy TEXT,
          strategy_difficulty TEXT,
          hints_used INTEGER DEFAULT 0,
          time_limit INTEGER,
          device_type TEXT,
          environment TEXT,
          FOREIGN KEY (item_id) REFERENCES learning_items(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- 学习会话表
      CREATE TABLE IF NOT EXISTS study_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          start_time DATETIME NOT NULL,
          end_time DATETIME,
          planned_duration INTEGER,
          actual_duration INTEGER,
          total_items INTEGER DEFAULT 0,
          completed_items INTEGER DEFAULT 0,
          correct_items INTEGER DEFAULT 0,
          average_response_time REAL DEFAULT 0.0,
          cognitive_load_predicted REAL DEFAULT 0.0,
          cognitive_load_actual REAL DEFAULT 0.0,
          success_rate REAL DEFAULT 0.0,
          difficulty_adaptations INTEGER DEFAULT 0,
          strategy_changes INTEGER DEFAULT 0,
          session_type TEXT DEFAULT 'regular',
          interleave_enabled BOOLEAN DEFAULT TRUE,
          notes TEXT,
          device_type TEXT,
          is_completed BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- 学习档案表
      CREATE TABLE IF NOT EXISTS learning_profiles (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          processing_speed REAL DEFAULT 1.0,
          working_memory_capacity REAL DEFAULT 1.0,
          attention_span INTEGER DEFAULT 1800,
          preferred_difficulty REAL DEFAULT 0.5,
          optimal_cognitive_load REAL DEFAULT 0.7,
          learning_style TEXT DEFAULT 'mixed',
          best_time_of_day TEXT,
          preferred_session_length INTEGER DEFAULT 1800,
          break_frequency INTEGER DEFAULT 1800,
          adaptation_sensitivity REAL DEFAULT 0.1,
          forgetting_curve_steepness REAL DEFAULT 1.0,
          total_study_sessions INTEGER DEFAULT 0,
          average_session_success_rate REAL DEFAULT 0.0,
          improvement_rate REAL DEFAULT 0.0,
          consistency_score REAL DEFAULT 0.0,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- 同步状态表
      CREATE TABLE IF NOT EXISTS sync_status (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          synced_at DATETIME,
          sync_attempts INTEGER DEFAULT 0,
          last_error TEXT,
          is_synced BOOLEAN DEFAULT FALSE,
          data_snapshot TEXT
      );

      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_learning_items_user_id ON learning_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_learning_items_due_date ON learning_items(due_date);
      CREATE INDEX IF NOT EXISTS idx_study_records_item_id ON study_records(item_id);
      CREATE INDEX IF NOT EXISTS idx_study_records_user_id ON study_records(user_id);
      CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sync_status_is_synced ON sync_status(is_synced);
    `;
  }

  /**
   * 执行SQL查询
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    await this.initialize();
    
    if (!this.db || !this.sqlite3) {
      throw new Error('数据库未初始化');
    }

    try {
      const results: T[] = [];
      
      for await (const stmt of this.sqlite3.statements(this.db, sql)) {
        // 绑定参数
        if (params.length > 0) {
          this.sqlite3.bind_collection(stmt, params);
        }

        // 执行查询
        while ((await this.sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
          const row = this.sqlite3.row(stmt);
          results.push(row as T);
        }
      }

      return results;
    } catch (error) {
      console.error('SQL查询失败:', { sql, params, error });
      throw new Error(`SQL查询失败: ${error}`);
    }
  }

  /**
   * 执行SQL命令（INSERT, UPDATE, DELETE）
   */
  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    await this.initialize();
    
    if (!this.db || !this.sqlite3) {
      throw new Error('数据库未初始化');
    }

    try {
      for await (const stmt of this.sqlite3.statements(this.db, sql)) {
        // 绑定参数
        if (params.length > 0) {
          this.sqlite3.bind_collection(stmt, params);
        }

        // 执行命令
        await this.sqlite3.step(stmt);
      }

      return {
        changes: this.sqlite3.changes(this.db),
        lastInsertRowid: this.sqlite3.last_insert_rowid(this.db)
      };
    } catch (error) {
      console.error('SQL执行失败:', { sql, params, error });
      throw new Error(`SQL执行失败: ${error}`);
    }
  }

  /**
   * 开始事务
   */
  async beginTransaction(): Promise<void> {
    await this.execute('BEGIN TRANSACTION');
  }

  /**
   * 提交事务
   */
  async commitTransaction(): Promise<void> {
    await this.execute('COMMIT');
  }

  /**
   * 回滚事务
   */
  async rollbackTransaction(): Promise<void> {
    await this.execute('ROLLBACK');
  }

  /**
   * 执行事务
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.beginTransaction();
    
    try {
      const result = await callback();
      await this.commitTransaction();
      return result;
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  /**
   * 检查数据库连接状态
   */
  isConnected(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * 获取数据库版本
   */
  async getVersion(): Promise<number> {
    const result = await this.query<{ user_version: number }>('PRAGMA user_version');
    return result[0]?.user_version || 0;
  }

  /**
   * 设置数据库版本
   */
  async setVersion(version: number): Promise<void> {
    await this.execute(`PRAGMA user_version = ${version}`);
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db && this.sqlite3) {
      await this.sqlite3.close(this.db);
      this.db = null;
      this.isInitialized = false;
      this.initPromise = null;
      console.log('数据库连接已关闭');
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getStats(): Promise<{
    pageCount: number;
    pageSize: number;
    freePages: number;
    cacheSize: number;
    walMode: boolean;
  }> {
    const pageCount = await this.query<{ page_count: number }>('PRAGMA page_count');
    const pageSize = await this.query<{ page_size: number }>('PRAGMA page_size');
    const freePages = await this.query<{ freelist_count: number }>('PRAGMA freelist_count');
    const cacheSize = await this.query<{ cache_size: number }>('PRAGMA cache_size');
    const journalMode = await this.query<{ journal_mode: string }>('PRAGMA journal_mode');

    return {
      pageCount: pageCount[0]?.page_count || 0,
      pageSize: pageSize[0]?.page_size || 0,
      freePages: freePages[0]?.freelist_count || 0,
      cacheSize: cacheSize[0]?.cache_size || 0,
      walMode: journalMode[0]?.journal_mode === 'wal'
    };
  }
}