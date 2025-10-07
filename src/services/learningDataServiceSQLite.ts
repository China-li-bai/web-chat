/**
 * 基于 SQLite 的学习数据服务层 - 重新设计版本
 * 使用 wa-sqlite 替代 localStorage，提供更好的性能和数据完整性
 * 确保字段映射正确，CRUD 操作可靠
 */

import { 
  Wordbook, 
  Vocabulary, 
  LearningRecord, 
  WordbookStats, 
  DailyProgress,
  WordbookCategory,
  DifficultyLevel,
  WordbookSource,
  StatsFilter
} from '../types/wordbook';
import { databaseInitService } from './databaseInitService';
import type { DatabaseAdapter } from '../packages/wa-sqlite-adapter/databaseAdapter';

// 扩展的学习会话接口
export interface LearningSession {
  id: string;
  wordbookId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  totalWords: number;
  correctAnswers: number;
  totalTime: number; // 秒
  isCompleted: boolean;
  createdAt: string;
}

// 扩展的每日进度接口（包含wordbookId）
export interface DailyProgressWithWordbook extends DailyProgress {
  wordbookId: string;
}

// 数据库行类型定义
interface WordbookRow {
  id: string;
  name: string;
  category: string;
  description?: string;
  difficulty: string;
  word_count: number;
  tags?: string;
  created_at: string;
  updated_at: string;
  source?: string;
  is_active: number;
}

interface VocabularyRow {
  id: string;
  wordbook_id: string;
  word: string;
  pronunciation?: string;
  meaning: string;
  example?: string;
  difficulty: number;
  mastery_level: number;
  last_reviewed?: string;
  review_count: number;
  tags?: string;
  created_at: string;
  updated_at: string;
}

interface LearningRecordRow {
  id: string;
  wordbook_id: string;
  vocabulary_id: string;
  user_id: string;
  session_id: string;
  result: string;
  time_spent: number;
  timestamp: string;
}

class LearningDataServiceSQLite {
  private adapter: DatabaseAdapter | null = null;
  private readonly DEFAULT_USER_ID = 'default_user';

  // ==================== 初始化 ====================
  
  private async ensureInitialized(): Promise<DatabaseAdapter> {
    if (!this.adapter) {
      console.log('[DEBUG] 初始化数据库适配器...');
      this.adapter = await databaseInitService.initialize();
      console.log('[DEBUG] 数据库适配器初始化完成');
    }
    return this.adapter;
  }

  // ==================== 工具方法 ====================
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  // ==================== 字段映射辅助函数 ====================

  private mapWordbookFromDb(row: WordbookRow): Wordbook {
    return {
      id: row.id,
      name: row.name,
      category: row.category as WordbookCategory,
      description: row.description || '',
      difficulty: row.difficulty as DifficultyLevel,
      wordCount: row.word_count,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      source: row.source as WordbookSource,
      isActive: Boolean(row.is_active)
    };
  }

  private mapVocabularyFromDb(row: VocabularyRow): Vocabulary {
    return {
      id: row.id,
      wordbookId: row.wordbook_id,
      word: row.word,
      pronunciation: row.pronunciation || '',
      meaning: row.meaning,
      example: row.example || '',
      difficulty: row.difficulty,
      masteryLevel: row.mastery_level,
      lastReviewed: row.last_reviewed || '',
      reviewCount: row.review_count,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapLearningRecordFromDb(row: LearningRecordRow): LearningRecord {
    return {
      id: row.id,
      wordbookId: row.wordbook_id,
      vocabularyId: row.vocabulary_id,
      userId: row.user_id,
      sessionId: row.session_id,
      result: row.result as 'correct' | 'incorrect' | 'skip',
      timeSpent: row.time_spent,
      timestamp: row.timestamp
    };
  }

  // ==================== 词书管理 ====================

  async getWordbooks(): Promise<Wordbook[]> {
    try {
      console.log('[DEBUG] 获取所有词书...');
      const adapter = await this.ensureInitialized();
      const rows = await adapter.query({
        sql: 'SELECT * FROM wordbooks WHERE is_active = 1 ORDER BY created_at DESC'
      }) as unknown as WordbookRow[];

      const wordbooks = rows.map(row => this.mapWordbookFromDb(row));
      console.log(`[DEBUG] 成功获取 ${wordbooks.length} 个词书`);
      return wordbooks;
    } catch (error) {
      console.error('[ERROR] 获取词书失败:', error);
      throw new Error(`获取词书失败: ${error.message}`);
    }
  }

  async getWordbookById(id: string): Promise<Wordbook | null> {
    try {
      console.log(`[DEBUG] 获取词书 ID: ${id}`);
      const adapter = await this.ensureInitialized();
      const rows = await adapter.query({
        sql: 'SELECT * FROM wordbooks WHERE id = ? AND is_active = 1',
        args: [id]
      }) as unknown as WordbookRow[];

      if (rows.length === 0) {
        console.log(`[DEBUG] 未找到词书 ID: ${id}`);
        return null;
      }

      const wordbook = this.mapWordbookFromDb(rows[0]);
      console.log(`[DEBUG] 成功获取词书: ${wordbook.name}`);
      return wordbook;
    } catch (error) {
      console.error(`[ERROR] 获取词书失败 ID: ${id}`, error);
      throw new Error(`获取词书失败: ${error.message}`);
    }
  }

  async createWordbook(wordbook: Omit<Wordbook, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>): Promise<Wordbook> {
    try {
      console.log('[DEBUG] 创建词书:', wordbook.name);
      const adapter = await this.ensureInitialized();
      
      const id = this.generateId();
      const now = this.getCurrentTimestamp();

      const newWordbook: Wordbook = {
        ...wordbook,
        id,
        wordCount: 0,
        createdAt: now,
        updatedAt: now
      };

      await adapter.run({
        sql: `INSERT INTO wordbooks (id, name, category, description, difficulty, word_count, tags, created_at, updated_at, source, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          wordbook.name,
          wordbook.category,
          wordbook.description || null,
          wordbook.difficulty,
          0,
          JSON.stringify(wordbook.tags || []),
          now,
          now,
          wordbook.source || null,
          wordbook.isActive !== false ? 1 : 0
        ]
      });

      console.log(`[DEBUG] 成功创建词书: ${wordbook.name}, ID: ${id}`);
      return newWordbook;
    } catch (error) {
      console.error('[ERROR] 创建词书失败:', error);
      throw new Error(`创建词书失败: ${error.message}`);
    }
  }

  async updateWordbook(id: string, updates: Partial<Wordbook>): Promise<Wordbook | null> {
    try {
      console.log(`[DEBUG] 更新词书 ID: ${id}`, updates);
      const adapter = await this.ensureInitialized();
      const now = this.getCurrentTimestamp();

      const setParts: string[] = [];
      const args: any[] = [];

      if (updates.name !== undefined) {
        setParts.push('name = ?');
        args.push(updates.name);
      }
      if (updates.category !== undefined) {
        setParts.push('category = ?');
        args.push(updates.category);
      }
      if (updates.description !== undefined) {
        setParts.push('description = ?');
        args.push(updates.description);
      }
      if (updates.difficulty !== undefined) {
        setParts.push('difficulty = ?');
        args.push(updates.difficulty);
      }
      if (updates.tags !== undefined) {
        setParts.push('tags = ?');
        args.push(JSON.stringify(updates.tags));
      }
      if (updates.source !== undefined) {
        setParts.push('source = ?');
        args.push(updates.source);
      }
      if (updates.isActive !== undefined) {
        setParts.push('is_active = ?');
        args.push(updates.isActive ? 1 : 0);
      }

      if (setParts.length === 0) {
        return this.getWordbookById(id);
      }

      setParts.push('updated_at = ?');
      args.push(now);
      args.push(id);

      const result = await adapter.run({
        sql: `UPDATE wordbooks SET ${setParts.join(', ')} WHERE id = ?`,
        args
      });

      if (result.rowsAffected === 0) {
        console.log(`[DEBUG] 词书不存在或未更新 ID: ${id}`);
        return null;
      }

      console.log(`[DEBUG] 成功更新词书 ID: ${id}`);
      return this.getWordbookById(id);
    } catch (error) {
      console.error(`[ERROR] 更新词书失败 ID: ${id}`, error);
      throw new Error(`更新词书失败: ${error.message}`);
    }
  }

  async deleteWordbook(id: string): Promise<boolean> {
    try {
      console.log(`[DEBUG] 删除词书 ID: ${id}`);
      const adapter = await this.ensureInitialized();
      
      // 软删除
      const result = await adapter.run({
        sql: 'UPDATE wordbooks SET is_active = 0, updated_at = ? WHERE id = ?',
        args: [this.getCurrentTimestamp(), id]
      });

      const success = result.rowsAffected > 0;
      console.log(`[DEBUG] 删除词书结果 ID: ${id}, 成功: ${success}`);
      return success;
    } catch (error) {
      console.error(`[ERROR] 删除词书失败 ID: ${id}`, error);
      throw new Error(`删除词书失败: ${error.message}`);
    }
  }

  // ==================== 词汇管理 ====================

  async getVocabularies(wordbookId?: string): Promise<Vocabulary[]> {
    try {
      console.log(`[DEBUG] 获取词汇, 词书ID: ${wordbookId || '全部'}`);
      const adapter = await this.ensureInitialized();
      
      let sql = 'SELECT * FROM vocabularies';
      let args: any[] = [];

      if (wordbookId) {
        sql += ' WHERE wordbook_id = ?';
        args.push(wordbookId);
      }

      sql += ' ORDER BY created_at ASC';

      const rows = await adapter.query({ sql, args }) as unknown as VocabularyRow[];
      const vocabularies = rows.map(row => this.mapVocabularyFromDb(row));
      
      console.log(`[DEBUG] 成功获取 ${vocabularies.length} 个词汇`);
      return vocabularies;
    } catch (error) {
      console.error('[ERROR] 获取词汇失败:', error);
      throw new Error(`获取词汇失败: ${error.message}`);
    }
  }

  async getVocabularyById(id: string): Promise<Vocabulary | null> {
    try {
      console.log(`[DEBUG] 获取词汇 ID: ${id}`);
      const adapter = await this.ensureInitialized();
      const rows = await adapter.query({
        sql: 'SELECT * FROM vocabularies WHERE id = ?',
        args: [id]
      }) as unknown as VocabularyRow[];

      if (rows.length === 0) {
        console.log(`[DEBUG] 未找到词汇 ID: ${id}`);
        return null;
      }

      const vocabulary = this.mapVocabularyFromDb(rows[0]);
      console.log(`[DEBUG] 成功获取词汇: ${vocabulary.word}`);
      return vocabulary;
    } catch (error) {
      console.error(`[ERROR] 获取词汇失败 ID: ${id}`, error);
      throw new Error(`获取词汇失败: ${error.message}`);
    }
  }

  async createVocabulary(vocabulary: Omit<Vocabulary, 'id' | 'createdAt' | 'updatedAt' | 'masteryLevel' | 'reviewCount'>): Promise<Vocabulary> {
    try {
      console.log('[DEBUG] 创建词汇:', vocabulary.word);
      const adapter = await this.ensureInitialized();
      
      const id = this.generateId();
      const now = this.getCurrentTimestamp();

      const newVocabulary: Vocabulary = {
        ...vocabulary,
        id,
        masteryLevel: 0,
        reviewCount: 0,
        createdAt: now,
        updatedAt: now
      };

      await adapter.run({
        sql: `INSERT INTO vocabularies (id, wordbook_id, word, pronunciation, meaning, example, difficulty, mastery_level, last_reviewed, review_count, tags, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          vocabulary.wordbookId,
          vocabulary.word,
          vocabulary.pronunciation || null,
          vocabulary.meaning,
          vocabulary.example || null,
          vocabulary.difficulty || 0.5,
          0,
          vocabulary.lastReviewed || null,
          0,
          JSON.stringify(vocabulary.tags || []),
          now,
          now
        ]
      });

      console.log(`[DEBUG] 成功创建词汇: ${vocabulary.word}, ID: ${id}`);
      return newVocabulary;
    } catch (error) {
      console.error('[ERROR] 创建词汇失败:', error);
      throw new Error(`创建词汇失败: ${error.message}`);
    }
  }

  async updateVocabulary(id: string, updates: Partial<Vocabulary>): Promise<Vocabulary | null> {
    try {
      console.log(`[DEBUG] 更新词汇 ID: ${id}`, updates);
      const adapter = await this.ensureInitialized();
      const now = this.getCurrentTimestamp();

      const setParts: string[] = [];
      const args: any[] = [];

      if (updates.word !== undefined) {
        setParts.push('word = ?');
        args.push(updates.word);
      }
      if (updates.pronunciation !== undefined) {
        setParts.push('pronunciation = ?');
        args.push(updates.pronunciation);
      }
      if (updates.meaning !== undefined) {
        setParts.push('meaning = ?');
        args.push(updates.meaning);
      }
      if (updates.example !== undefined) {
        setParts.push('example = ?');
        args.push(updates.example);
      }
      if (updates.difficulty !== undefined) {
        setParts.push('difficulty = ?');
        args.push(updates.difficulty);
      }
      if (updates.masteryLevel !== undefined) {
        setParts.push('mastery_level = ?');
        args.push(updates.masteryLevel);
      }
      if (updates.lastReviewed !== undefined) {
        setParts.push('last_reviewed = ?');
        args.push(updates.lastReviewed);
      }
      if (updates.reviewCount !== undefined) {
        setParts.push('review_count = ?');
        args.push(updates.reviewCount);
      }
      if (updates.tags !== undefined) {
        setParts.push('tags = ?');
        args.push(JSON.stringify(updates.tags));
      }

      if (setParts.length === 0) {
        return this.getVocabularyById(id);
      }

      setParts.push('updated_at = ?');
      args.push(now);
      args.push(id);

      const result = await adapter.run({
        sql: `UPDATE vocabularies SET ${setParts.join(', ')} WHERE id = ?`,
        args
      });

      if (result.rowsAffected === 0) {
        console.log(`[DEBUG] 词汇不存在或未更新 ID: ${id}`);
        return null;
      }

      console.log(`[DEBUG] 成功更新词汇 ID: ${id}`);
      return this.getVocabularyById(id);
    } catch (error) {
      console.error(`[ERROR] 更新词汇失败 ID: ${id}`, error);
      throw new Error(`更新词汇失败: ${error.message}`);
    }
  }

  async deleteVocabulary(id: string): Promise<boolean> {
    try {
      console.log(`[DEBUG] 删除词汇 ID: ${id}`);
      const adapter = await this.ensureInitialized();
      
      const result = await adapter.run({
        sql: 'DELETE FROM vocabularies WHERE id = ?',
        args: [id]
      });

      const success = result.rowsAffected > 0;
      console.log(`[DEBUG] 删除词汇结果 ID: ${id}, 成功: ${success}`);
      return success;
    } catch (error) {
      console.error(`[ERROR] 删除词汇失败 ID: ${id}`, error);
      throw new Error(`删除词汇失败: ${error.message}`);
    }
  }

  // ==================== 批量操作 ====================

  async createVocabulariesBatch(vocabularies: Omit<Vocabulary, 'id' | 'createdAt' | 'updatedAt' | 'masteryLevel' | 'reviewCount'>[]): Promise<Vocabulary[]> {
    try {
      console.log(`[DEBUG] 批量创建词汇，数量: ${vocabularies.length}`);
      const adapter = await this.ensureInitialized();
      const now = this.getCurrentTimestamp();
      const results: Vocabulary[] = [];

      // 使用事务确保数据一致性
      await adapter.run({ sql: 'BEGIN TRANSACTION' });

      try {
        for (const vocabulary of vocabularies) {
          const id = this.generateId();
          const newVocabulary: Vocabulary = {
            ...vocabulary,
            id,
            masteryLevel: 0,
            reviewCount: 0,
            createdAt: now,
            updatedAt: now
          };

          await adapter.run({
            sql: `INSERT INTO vocabularies (id, wordbook_id, word, pronunciation, meaning, example, difficulty, mastery_level, last_reviewed, review_count, tags, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              id,
              vocabulary.wordbookId,
              vocabulary.word,
              vocabulary.pronunciation || null,
              vocabulary.meaning,
              vocabulary.example || null,
              vocabulary.difficulty || 0.5,
              0,
              vocabulary.lastReviewed || null,
              0,
              JSON.stringify(vocabulary.tags || []),
              now,
              now
            ]
          });

          results.push(newVocabulary);
        }

        await adapter.run({ sql: 'COMMIT' });
        console.log(`[DEBUG] 成功批量创建 ${results.length} 个词汇`);
        return results;
      } catch (error) {
        await adapter.run({ sql: 'ROLLBACK' });
        throw error;
      }
    } catch (error) {
      console.error('[ERROR] 批量创建词汇失败:', error);
      throw new Error(`批量创建词汇失败: ${error.message}`);
    }
  }

  // ==================== 学习记录管理 ====================

  async getLearningRecords(wordbookId?: string, vocabularyId?: string): Promise<LearningRecord[]> {
    try {
      console.log(`[DEBUG] 获取学习记录, 词书ID: ${wordbookId || '全部'}, 词汇ID: ${vocabularyId || '全部'}`);
      const adapter = await this.ensureInitialized();
      
      let sql = 'SELECT * FROM learning_records';
      const conditions: string[] = [];
      const args: any[] = [];

      if (wordbookId) {
        conditions.push('wordbook_id = ?');
        args.push(wordbookId);
      }

      if (vocabularyId) {
        conditions.push('vocabulary_id = ?');
        args.push(vocabularyId);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY timestamp DESC';

      const rows = await adapter.query({ sql, args }) as unknown as LearningRecordRow[];
      const records = rows.map(row => this.mapLearningRecordFromDb(row));
      
      console.log(`[DEBUG] 成功获取 ${records.length} 条学习记录`);
      return records;
    } catch (error) {
      console.error('[ERROR] 获取学习记录失败:', error);
      throw new Error(`获取学习记录失败: ${error.message}`);
    }
  }

  async createLearningRecord(record: Omit<LearningRecord, 'id' | 'userId'>): Promise<LearningRecord> {
    try {
      console.log('[DEBUG] 创建学习记录:', record);
      const adapter = await this.ensureInitialized();
      const id = this.generateId();

      const newRecord: LearningRecord = {
        ...record,
        id,
        userId: this.DEFAULT_USER_ID
      };

      await adapter.run({
        sql: `INSERT INTO learning_records (id, wordbook_id, vocabulary_id, user_id, session_id, result, time_spent, timestamp)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          record.wordbookId,
          record.vocabularyId,
          this.DEFAULT_USER_ID,
          record.sessionId,
          record.result,
          record.timeSpent,
          record.timestamp
        ]
      });

      console.log(`[DEBUG] 成功创建学习记录 ID: ${id}`);
      return newRecord;
    } catch (error) {
      console.error('[ERROR] 创建学习记录失败:', error);
      throw new Error(`创建学习记录失败: ${error.message}`);
    }
  }

  // ==================== 统计数据 ====================

  async getWordbookStats(wordbookId: string): Promise<WordbookStats | null> {
    try {
      console.log(`[DEBUG] 获取词书统计 ID: ${wordbookId}`);
      const adapter = await this.ensureInitialized();
      const rows = await adapter.query({
        sql: 'SELECT * FROM wordbook_stats WHERE wordbook_id = ?',
        args: [wordbookId]
      });

      if (rows.length === 0) {
        console.log(`[DEBUG] 未找到词书统计 ID: ${wordbookId}`);
        return null;
      }

      const row = rows[0];
      const stats: WordbookStats = {
        wordbookId: row.wordbook_id as string,
        totalWords: row.total_words as number,
        masteredWords: row.mastered_words as number,
        averageMastery: row.average_mastery as number,
        totalStudyTime: row.total_study_time as number,
        lastStudyDate: row.last_study_date as string,
        studySessions: row.study_sessions as number,
        accuracyRate: row.accuracy_rate as number
      };

      console.log(`[DEBUG] 成功获取词书统计: ${stats.totalWords} 个词汇`);
      return stats;
    } catch (error) {
      console.error(`[ERROR] 获取词书统计失败 ID: ${wordbookId}`, error);
      throw new Error(`获取词书统计失败: ${error.message}`);
    }
  }

  // ==================== 数据管理 ====================

  async clearAllData(): Promise<void> {
    try {
      console.log('[DEBUG] 清除所有数据...');
      const adapter = await this.ensureInitialized();
      
      // 删除所有数据（保留表结构）
      const tables = ['daily_progress', 'learning_sessions', 'learning_records', 'vocabularies', 'wordbooks'];
      
      await adapter.run({ sql: 'BEGIN TRANSACTION' });
      
      try {
        for (const table of tables) {
          await adapter.run({ sql: `DELETE FROM ${table}` });
        }
        await adapter.run({ sql: 'COMMIT' });
        console.log('[DEBUG] 成功清除所有数据');
      } catch (error) {
        await adapter.run({ sql: 'ROLLBACK' });
        throw error;
      }
    } catch (error) {
      console.error('[ERROR] 清除数据失败:', error);
      throw new Error(`清除数据失败: ${error.message}`);
    }
  }
}

// 创建并导出服务实例
const learningDataService = new LearningDataServiceSQLite();

export default learningDataService;
export { LearningDataServiceSQLite };