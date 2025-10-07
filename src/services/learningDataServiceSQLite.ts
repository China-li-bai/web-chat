/**
 * 基于 SQLite 的学习数据服务层
 * 使用 wa-sqlite 替代 localStorage，提供更好的性能和数据完整性
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

class LearningDataServiceSQLite {
  private adapter: DatabaseAdapter | null = null;
  private readonly DEFAULT_USER_ID = 'default_user';

  // ==================== 初始化 ====================
  
  private async ensureInitialized(): Promise<DatabaseAdapter> {
    if (!this.adapter) {
      this.adapter = await databaseInitService.initialize();
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

  // ==================== 词书管理 ====================

  async getWordbooks(): Promise<Wordbook[]> {
    const adapter = await this.ensureInitialized();
    const rows = await adapter.query({
      sql: 'SELECT * FROM wordbooks WHERE is_active = true ORDER BY created_at DESC'
    });

    return rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      category: row.category as WordbookCategory,
      description: row.description as string,
      difficulty: row.difficulty as DifficultyLevel,
      wordCount: row.word_count as number,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      source: row.source as WordbookSource,
      isActive: Boolean(row.is_active)
    }));
  }

  async getWordbookById(id: string): Promise<Wordbook | null> {
    const adapter = await this.ensureInitialized();
    const rows = await adapter.query({
      sql: 'SELECT * FROM wordbooks WHERE id = ? AND is_active = true',
      args: [id]
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id as string,
      name: row.name as string,
      category: row.category as WordbookCategory,
      description: row.description as string,
      difficulty: row.difficulty as DifficultyLevel,
      wordCount: row.word_count as number,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      source: row.source as WordbookSource,
      isActive: Boolean(row.is_active)
    };
  }

  async createWordbook(wordbook: Omit<Wordbook, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>): Promise<Wordbook> {
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

    return newWordbook;
  }

  async updateWordbook(id: string, updates: Partial<Wordbook>): Promise<Wordbook | null> {
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
      args.push(updates.isActive);
    }

    if (setParts.length === 0) {
      return this.getWordbookById(id);
    }

    setParts.push('updated_at = ?');
    args.push(now);
    args.push(id);

    await adapter.run({
      sql: `UPDATE wordbooks SET ${setParts.join(', ')} WHERE id = ?`,
      args
    });

    return this.getWordbookById(id);
  }

  async deleteWordbook(id: string): Promise<boolean> {
    const adapter = await this.ensureInitialized();
    
    // 软删除
    const result = await adapter.run({
      sql: 'UPDATE wordbooks SET is_active = false, updated_at = ? WHERE id = ?',
      args: [this.getCurrentTimestamp(), id]
    });

    return result.rowsAffected > 0;
  }

  // ==================== 词汇管理 ====================

  async getVocabularies(wordbookId?: string): Promise<Vocabulary[]> {
    const adapter = await this.ensureInitialized();
    
    let sql = 'SELECT * FROM vocabularies';
    let args: any[] = [];

    if (wordbookId) {
      sql += ' WHERE wordbook_id = ?';
      args.push(wordbookId);
    }

    sql += ' ORDER BY created_at ASC';

    const rows = await adapter.query({ sql, args });

    return rows.map(row => ({
      id: row.id as string,
      wordbookId: row.wordbook_id as string,
      word: row.word as string,
      pronunciation: row.pronunciation as string,
      meaning: row.meaning as string,
      example: row.example as string,
      difficulty: row.difficulty as number,
      masteryLevel: row.mastery_level as number,
      lastReviewed: row.last_reviewed as string,
      reviewCount: row.review_count as number,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }));
  }

  async getVocabularyById(id: string): Promise<Vocabulary | null> {
    const adapter = await this.ensureInitialized();
    const rows = await adapter.query({
      sql: 'SELECT * FROM vocabularies WHERE id = ?',
      args: [id]
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id as string,
      wordbookId: row.wordbook_id as string,
      word: row.word as string,
      pronunciation: row.pronunciation as string,
      meaning: row.meaning as string,
      example: row.example as string,
      difficulty: row.difficulty as number,
      masteryLevel: row.mastery_level as number,
      lastReviewed: row.last_reviewed as string,
      reviewCount: row.review_count as number,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    };
  }

  async createVocabulary(vocabulary: Omit<Vocabulary, 'id' | 'createdAt' | 'updatedAt' | 'masteryLevel' | 'reviewCount'>): Promise<Vocabulary> {
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

    return newVocabulary;
  }

  async updateVocabulary(id: string, updates: Partial<Vocabulary>): Promise<Vocabulary | null> {
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

    await adapter.run({
      sql: `UPDATE vocabularies SET ${setParts.join(', ')} WHERE id = ?`,
      args
    });

    return this.getVocabularyById(id);
  }

  async deleteVocabulary(id: string): Promise<boolean> {
    const adapter = await this.ensureInitialized();
    
    const result = await adapter.run({
      sql: 'DELETE FROM vocabularies WHERE id = ?',
      args: [id]
    });

    return result.rowsAffected > 0;
  }

  // ==================== 学习记录管理 ====================

  async getLearningRecords(wordbookId?: string, vocabularyId?: string): Promise<LearningRecord[]> {
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

    const rows = await adapter.query({ sql, args });

    return rows.map(row => ({
      id: row.id as string,
      wordbookId: row.wordbook_id as string,
      vocabularyId: row.vocabulary_id as string,
      userId: row.user_id as string,
      sessionId: row.session_id as string,
      result: row.result as 'correct' | 'incorrect' | 'skip',
      timeSpent: row.time_spent as number,
      timestamp: row.timestamp as string
    }));
  }

  async createLearningRecord(record: Omit<LearningRecord, 'id' | 'userId'>): Promise<LearningRecord> {
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

    return newRecord;
  }

  // ==================== 学习会话管理 ====================

  async getLearningSession(id: string): Promise<LearningSession | null> {
    const adapter = await this.ensureInitialized();
    const rows = await adapter.query({
      sql: 'SELECT * FROM learning_sessions WHERE id = ?',
      args: [id]
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id as string,
      wordbookId: row.wordbook_id as string,
      userId: row.user_id as string,
      startTime: row.start_time as string,
      endTime: row.end_time as string,
      totalWords: row.total_words as number,
      correctAnswers: row.correct_answers as number,
      totalTime: row.total_time as number,
      isCompleted: Boolean(row.is_completed),
      createdAt: row.created_at as string
    };
  }

  async createLearningSession(wordbookId: string): Promise<LearningSession> {
    const adapter = await this.ensureInitialized();
    const id = this.generateId();
    const now = this.getCurrentTimestamp();

    const session: LearningSession = {
      id,
      wordbookId,
      userId: this.DEFAULT_USER_ID,
      startTime: now,
      totalWords: 0,
      correctAnswers: 0,
      totalTime: 0,
      isCompleted: false,
      createdAt: now
    };

    await adapter.run({
      sql: `INSERT INTO learning_sessions (id, wordbook_id, user_id, start_time, end_time, total_words, correct_answers, total_time, is_completed, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        wordbookId,
        this.DEFAULT_USER_ID,
        now,
        null,
        0,
        0,
        0,
        0,
        now
      ]
    });

    return session;
  }

  async completeLearningSession(sessionId: string, totalWords: number, correctAnswers: number, totalTime: number): Promise<LearningSession | null> {
    const adapter = await this.ensureInitialized();
    const now = this.getCurrentTimestamp();

    await adapter.run({
      sql: `UPDATE learning_sessions 
            SET end_time = ?, total_words = ?, correct_answers = ?, total_time = ?, is_completed = true
            WHERE id = ?`,
      args: [now, totalWords, correctAnswers, totalTime, sessionId]
    });

    return this.getLearningSession(sessionId);
  }

  // ==================== 每日进度管理 ====================

  async getDailyProgress(wordbookId: string, dateRange?: { start: string; end: string }): Promise<DailyProgress[]> {
    const adapter = await this.ensureInitialized();
    
    let sql = 'SELECT * FROM daily_progress WHERE wordbook_id = ?';
    const args: any[] = [wordbookId];

    if (dateRange) {
      sql += ' AND date >= ? AND date <= ?';
      args.push(dateRange.start, dateRange.end);
    }

    sql += ' ORDER BY date ASC';

    const rows = await adapter.query({ sql, args });

    return rows.map(row => ({
      date: row.date as string,
      wordsStudied: row.words_studied as number,
      accuracy: row.accuracy as number,
      timeSpent: row.time_spent as number
    }));
  }

  private async updateDailyProgress(wordbookId: string, wordsStudied: number, accuracy: number, timeSpent: number): Promise<void> {
    const adapter = await this.ensureInitialized();
    const today = this.getCurrentDate();
    const now = this.getCurrentTimestamp();

    // 尝试更新现有记录
    const updateResult = await adapter.run({
      sql: `UPDATE daily_progress 
            SET words_studied = words_studied + ?, 
                accuracy = (accuracy * words_studied + ? * ?) / (words_studied + ?),
                time_spent = time_spent + ?,
                updated_at = ?
            WHERE wordbook_id = ? AND user_id = ? AND date = ?`,
      args: [wordsStudied, accuracy, wordsStudied, wordsStudied, timeSpent, now, wordbookId, this.DEFAULT_USER_ID, today]
    });

    // 如果没有现有记录，创建新记录
    if (updateResult.rowsAffected === 0) {
      await adapter.run({
        sql: `INSERT INTO daily_progress (id, wordbook_id, user_id, date, words_studied, accuracy, time_spent, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [this.generateId(), wordbookId, this.DEFAULT_USER_ID, today, wordsStudied, accuracy, timeSpent, now, now]
      });
    }
  }

  // ==================== 统计数据 ====================

  async getWordbookStats(wordbookId: string): Promise<WordbookStats | null> {
    const adapter = await this.ensureInitialized();
    const rows = await adapter.query({
      sql: 'SELECT * FROM wordbook_stats WHERE wordbook_id = ?',
      args: [wordbookId]
    });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      wordbookId: row.wordbook_id as string,
      totalWords: row.total_words as number,
      masteredWords: row.mastered_words as number,
      averageMastery: row.average_mastery as number,
      totalStudyTime: row.total_study_time as number,
      lastStudyDate: row.last_study_date as string,
      studySessions: row.study_sessions as number,
      accuracyRate: row.accuracy_rate as number
    };
  }

  async getAllWordbookStats(filter?: StatsFilter): Promise<WordbookStats[]> {
    const adapter = await this.ensureInitialized();
    let sql = 'SELECT * FROM wordbook_stats';
    const args: any[] = [];

    if (filter?.category) {
      // 需要 JOIN wordbooks 表来过滤 category
      sql = `SELECT ws.* FROM wordbook_stats ws 
             JOIN wordbooks w ON ws.wordbook_id = w.id 
             WHERE w.category = ?`;
      args.push(filter.category);
    }

    sql += ' ORDER BY last_study_date DESC';

    const rows = await adapter.query({ sql, args });

    return rows.map(row => ({
      wordbookId: row.wordbook_id as string,
      totalWords: row.total_words as number,
      masteredWords: row.mastered_words as number,
      averageMastery: row.average_mastery as number,
      totalStudyTime: row.total_study_time as number,
      lastStudyDate: row.last_study_date as string,
      studySessions: row.study_sessions as number,
      accuracyRate: row.accuracy_rate as number
    }));
  }

  // ==================== 数据管理 ====================

  async clearAllData(): Promise<void> {
    const adapter = await this.ensureInitialized();
    
    // 删除所有数据（保留表结构）
    const tables = ['daily_progress', 'learning_sessions', 'learning_records', 'vocabularies', 'wordbooks'];
    
    for (const table of tables) {
      await adapter.run({ sql: `DELETE FROM ${table}` });
    }
  }

  async initializeWithSampleData(): Promise<void> {
    // 可以在这里添加示例数据初始化逻辑
    console.log('SQLite 版本暂不提供示例数据初始化');
  }
}

export const learningDataServiceSQLite = new LearningDataServiceSQLite();
export default learningDataServiceSQLite;