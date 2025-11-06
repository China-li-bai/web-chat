/**
 * Migration Manager - 数据库架构迁移管理
 * 负责管��数据库版本控制和架构升级
 */

import type { Database } from '@/packages/wa-sqlite-adapter/database';

export interface Migration {
  version: string;
  name: string;
  up: (db: Database) => Promise<void>;
  down?: (db: Database) => Promise<void>;
}

export class MigrationManager {
  private migrations: Map<string, Migration> = new Map();

  constructor() {
    this.registerMigrations();
  }

  private registerMigrations() {
    // 注册所有迁移
    this.addMigration({
      version: '001',
      name: 'initial_schema',
      up: async (db: Database) => {
        // 初始化迁移 - 这将由具体的迁移文件处理
        await this.runInitialMigration(db);
      }
    });

    this.addMigration({
      version: '002', 
      name: 'add_user_id_columns',
      up: async (db: Database) => {
        const statements = [
          'ALTER TABLE "learning_progress" ADD COLUMN "userId" TEXT;',
          'ALTER TABLE "study_logs" ADD COLUMN "userId" TEXT;',
        ];
        
        for (const sql of statements) {
          try {
            await db.exec({ sql });
          } catch (e: any) {
            // 忽略 "duplicate column name" 错误
            if (!e.message?.includes('duplicate column name')) {
              throw e;
            }
          }
        }
      }
    });
  }

  private addMigration(migration: Migration) {
    this.migrations.set(migration.version, migration);
  }

  /**
   * 运行所有待处理的迁移
   */
  async runMigrations(db: Database): Promise<void> {
    // 确保迁移表存在
    await this.ensureMigrationTable(db);

    // 获取已运行的迁移
    const completedMigrations = await this.getCompletedMigrations(db);
    
    // 按版本号排序运行迁移
    const sortedMigrations = Array.from(this.migrations.values())
      .sort((a, b) => a.version.localeCompare(b.version));

    for (const migration of sortedMigrations) {
      if (!completedMigrations.has(migration.version)) {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        
        try {
          await migration.up(db);
          await this.recordMigration(db, migration);
          console.log(`Completed migration ${migration.version}`);
        } catch (error) {
          console.error(`Failed migration ${migration.version}:`, error);
          throw error;
        }
      }
    }
  }

  /**
   * 确保迁移记录表存在
   */
  private async ensureMigrationTable(db: Database): Promise<void> {
    await db.exec({
      sql: `
        CREATE TABLE IF NOT EXISTS "schema_migrations" (
          "version" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "executed_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `
    });
  }

  /**
   * 获取已完成的迁移
   */
  private async getCompletedMigrations(db: Database): Promise<Set<string>> {
    try {
      const rows = await db.exec({
        sql: 'SELECT version FROM "schema_migrations"'
      }) as { version: string }[];
      
      return new Set(rows.map(row => row.version));
    } catch {
      // 如果表不存在，返回空集合
      return new Set();
    }
  }

  /**
   * 记录已完成的迁移
   */
  private async recordMigration(db: Database, migration: Migration): Promise<void> {
    await db.exec({
      sql: 'INSERT INTO "schema_migrations" (version, name) VALUES (?, ?)',
      args: [migration.version, migration.name]
    });
  }

  private async runInitialMigration(db: Database): Promise<void> {
    // Initial migration is now handled by v001-initial.ts
    // This is kept for backward compatibility
    console.log('Initial migration delegated to v001-initial.ts');
  }

  /**
   * 检查是否需要运行迁移
   */
  async checkMigrationStatus(db: Database): Promise<{
    totalMigrations: number;
    completedMigrations: number;
    pendingMigrations: string[];
  }> {
    await this.ensureMigrationTable(db);
    const completedMigrations = await this.getCompletedMigrations(db);
    
    const allMigrations = Array.from(this.migrations.keys());
    const pendingMigrations = allMigrations.filter(v => !completedMigrations.has(v));

    return {
      totalMigrations: allMigrations.length,
      completedMigrations: completedMigrations.size,
      pendingMigrations
    };
  }
}