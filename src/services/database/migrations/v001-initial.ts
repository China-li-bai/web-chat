/**
 * Initial Schema Migration - v001
 * 创建所有基础表结构
 */

import type { Database } from '@/packages/wa-sqlite-adapter/database';
import { LEARNING_SCHEMA, LEARNING_INDICES } from '../schemas/learning.schema';
import { PRACTICE_SCHEMA, PRACTICE_INDICES } from '../schemas/practice.schema';
import { GAME_SCHEMA, GAME_INDICES } from '../schemas/game.schema';
import { USER_SCHEMA, USER_INDICES } from '../schemas/user.schema';

export async function createInitialSchema(db: Database): Promise<void> {
  console.log('Running initial schema migration...');
  
  // 按依赖顺序创建表
  const allSchemas = [
    ...LEARNING_SCHEMA,
    ...PRACTICE_SCHEMA, 
    ...GAME_SCHEMA,
    ...USER_SCHEMA
  ];

  // 创建所有表
  for (const sql of allSchemas) {
    if (sql.trim()) {
      try {
        await db.exec({ sql });
      } catch (error) {
        console.error('Failed to execute schema statement:', sql);
        throw error;
      }
    }
  }

  // 创建所有索引
  const allIndices = [
    ...LEARNING_INDICES,
    ...PRACTICE_INDICES,
    ...GAME_INDICES,
    ...USER_INDICES
  ];

  for (const sql of allIndices) {
    if (sql.trim()) {
      try {
        await db.exec({ sql });
      } catch (error) {
        console.warn('Index creation warning:', error);
        // 索引创建失败不应该阻止迁移
      }
    }
  }

  console.log('Initial schema migration completed');
}