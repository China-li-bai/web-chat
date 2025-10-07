/**
 * 数据迁移服务：从 localStorage 迁移到 SQLite
 * 负责将现有的 localStorage 数据安全地迁移到 SQLite 数据库
 */

import { learningDataServiceSQLite } from './learningDataServiceSQLite';
import type { 
  Wordbook, 
  Vocabulary, 
  LearningRecord,
  DailyProgress
} from '../types/wordbook';
import { 
  WordbookCategory,
  DifficultyLevel,
  WordbookSource
} from '../types/wordbook';

// localStorage 存储键名
const STORAGE_KEYS = {
  WORDBOOKS: 'wordbooks',
  VOCABULARIES: 'vocabularies',
  LEARNING_RECORDS: 'learningRecords',
  DAILY_PROGRESS: 'dailyProgress',
  MIGRATION_STATUS: 'sqlite_migration_status'
} as const;

// 迁移状态
interface MigrationStatus {
  isCompleted: boolean;
  completedAt?: string;
  version: string;
  migratedTables: string[];
}

class DataMigrationToSQLite {
  private readonly MIGRATION_VERSION = '1.0.0';

  // ==================== 迁移状态检查 ====================

  /**
   * 检查是否需要进行数据迁移
   */
  needsMigration(): boolean {
    try {
      const statusStr = localStorage.getItem(STORAGE_KEYS.MIGRATION_STATUS);
      if (!statusStr) return true;

      const status: MigrationStatus = JSON.parse(statusStr);
      return !status.isCompleted || status.version !== this.MIGRATION_VERSION;
    } catch (error) {
      console.warn('检查迁移状态时出错:', error);
      return true;
    }
  }

  /**
   * 获取迁移状态
   */
  getMigrationStatus(): MigrationStatus | null {
    try {
      const statusStr = localStorage.getItem(STORAGE_KEYS.MIGRATION_STATUS);
      return statusStr ? JSON.parse(statusStr) : null;
    } catch (error) {
      console.warn('获取迁移状态时出错:', error);
      return null;
    }
  }

  // ==================== 数据读取 ====================

  /**
   * 从 localStorage 读取词书数据
   */
  private getWordbooksFromLocalStorage(): Wordbook[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORDBOOKS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('读取 localStorage 词书数据时出错:', error);
      return [];
    }
  }

  /**
   * 从 localStorage 读取词汇数据
   */
  private getVocabulariesFromLocalStorage(): Vocabulary[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VOCABULARIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('读取 localStorage 词汇数据时出错:', error);
      return [];
    }
  }

  /**
   * 从 localStorage 读取学习记录数据
   */
  private getLearningRecordsFromLocalStorage(): LearningRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEARNING_RECORDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('读取 localStorage 学习记录数据时出错:', error);
      return [];
    }
  }

  /**
   * 从 localStorage 读取每日进度数据
   */
  private getDailyProgressFromLocalStorage(): DailyProgress[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAILY_PROGRESS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('读取 localStorage 每日进度数据时出错:', error);
      return [];
    }
  }

  // ==================== 数据验证和清理 ====================

  /**
   * 验证和清理词书数据
   */
  private validateAndCleanWordbook(wordbook: any): Wordbook | null {
    try {
      // 必需字段检查
      if (!wordbook.id || !wordbook.name) {
        console.warn('词书缺少必需字段:', wordbook);
        return null;
      }

      return {
        id: String(wordbook.id),
        name: String(wordbook.name),
        category: wordbook.category || WordbookCategory.CUSTOM,
        description: wordbook.description || '',
        difficulty: wordbook.difficulty || DifficultyLevel.INTERMEDIATE,
        wordCount: Number(wordbook.wordCount) || 0,
        tags: Array.isArray(wordbook.tags) ? wordbook.tags : [],
        createdAt: wordbook.createdAt || new Date().toISOString(),
        updatedAt: wordbook.updatedAt || new Date().toISOString(),
        source: wordbook.source || WordbookSource.CUSTOM,
        isActive: wordbook.isActive !== false
      };
    } catch (error) {
      console.warn('验证词书数据时出错:', error, wordbook);
      return null;
    }
  }

  /**
   * 验证和清理词汇数据
   */
  private validateAndCleanVocabulary(vocabulary: any): Vocabulary | null {
    try {
      // 必需字段检查
      if (!vocabulary.id || !vocabulary.wordbookId || !vocabulary.word || !vocabulary.meaning) {
        console.warn('词汇缺少必需字段:', vocabulary);
        return null;
      }

      return {
        id: String(vocabulary.id),
        wordbookId: String(vocabulary.wordbookId),
        word: String(vocabulary.word),
        pronunciation: vocabulary.pronunciation || '',
        meaning: String(vocabulary.meaning),
        example: vocabulary.example || '',
        difficulty: Number(vocabulary.difficulty) || 0.5,
        masteryLevel: Number(vocabulary.masteryLevel) || 0,
        lastReviewed: vocabulary.lastReviewed || null,
        reviewCount: Number(vocabulary.reviewCount) || 0,
        tags: Array.isArray(vocabulary.tags) ? vocabulary.tags : [],
        createdAt: vocabulary.createdAt || new Date().toISOString(),
        updatedAt: vocabulary.updatedAt || new Date().toISOString()
      };
    } catch (error) {
      console.warn('验证词汇数据时出错:', error, vocabulary);
      return null;
    }
  }

  /**
   * 验证和清理学习记录数据
   */
  private validateAndCleanLearningRecord(record: any): LearningRecord | null {
    try {
      // 必需字段检查
      if (!record.id || !record.wordbookId || !record.vocabularyId || !record.result) {
        console.warn('学习记录缺少必需字段:', record);
        return null;
      }

      return {
        id: String(record.id),
        wordbookId: String(record.wordbookId),
        vocabularyId: String(record.vocabularyId),
        userId: record.userId || 'default_user',
        sessionId: record.sessionId || 'legacy_session',
        result: record.result,
        timeSpent: Number(record.timeSpent) || 0,
        timestamp: record.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.warn('验证学习记录数据时出错:', error, record);
      return null;
    }
  }

  // ==================== 数据迁移 ====================

  /**
   * 迁移词书数据
   */
  private async migrateWordbooks(): Promise<number> {
    console.log('开始迁移词书数据...');
    
    const wordbooks = this.getWordbooksFromLocalStorage();
    let migratedCount = 0;

    for (const wordbookData of wordbooks) {
      const cleanWordbook = this.validateAndCleanWordbook(wordbookData);
      if (!cleanWordbook) continue;

      try {
        // 检查是否已存在
        const existing = await learningDataServiceSQLite.getWordbookById(cleanWordbook.id);
        if (existing) {
          console.log(`词书 ${cleanWordbook.name} 已存在，跳过迁移`);
          continue;
        }

        // 创建词书（不包含自动生成的字段）
        const { id, createdAt, updatedAt, wordCount, ...wordbookToCreate } = cleanWordbook;
        await learningDataServiceSQLite.createWordbook(wordbookToCreate);
        migratedCount++;
        
        console.log(`成功迁移词书: ${cleanWordbook.name}`);
      } catch (error) {
        console.error(`迁移词书 ${cleanWordbook.name} 时出错:`, error);
      }
    }

    console.log(`词书迁移完成，共迁移 ${migratedCount} 个词书`);
    return migratedCount;
  }

  /**
   * 迁移词汇数据
   */
  private async migrateVocabularies(): Promise<number> {
    console.log('开始迁移词汇数据...');
    
    const vocabularies = this.getVocabulariesFromLocalStorage();
    let migratedCount = 0;

    for (const vocabularyData of vocabularies) {
      const cleanVocabulary = this.validateAndCleanVocabulary(vocabularyData);
      if (!cleanVocabulary) continue;

      try {
        // 检查词书是否存在
        const wordbook = await learningDataServiceSQLite.getWordbookById(cleanVocabulary.wordbookId);
        if (!wordbook) {
          console.warn(`词汇 ${cleanVocabulary.word} 的词书不存在，跳过迁移`);
          continue;
        }

        // 检查是否已存在
        const existing = await learningDataServiceSQLite.getVocabularyById(cleanVocabulary.id);
        if (existing) {
          console.log(`词汇 ${cleanVocabulary.word} 已存在，跳过迁移`);
          continue;
        }

        // 创建词汇（不包含自动生成的字段）
        const { id, createdAt, updatedAt, masteryLevel, reviewCount, ...vocabularyToCreate } = cleanVocabulary;
        await learningDataServiceSQLite.createVocabulary({
          ...vocabularyToCreate,
          lastReviewed: cleanVocabulary.lastReviewed
        });
        migratedCount++;
        
        console.log(`成功迁移词汇: ${cleanVocabulary.word}`);
      } catch (error) {
        console.error(`迁移词汇 ${cleanVocabulary.word} 时出错:`, error);
      }
    }

    console.log(`词汇迁移完成，共迁移 ${migratedCount} 个词汇`);
    return migratedCount;
  }

  /**
   * 迁移学习记录数据
   */
  private async migrateLearningRecords(): Promise<number> {
    console.log('开始迁移学习记录数据...');
    
    const records = this.getLearningRecordsFromLocalStorage();
    let migratedCount = 0;

    for (const recordData of records) {
      const cleanRecord = this.validateAndCleanLearningRecord(recordData);
      if (!cleanRecord) continue;

      try {
        // 检查词书和词汇是否存在
        const wordbook = await learningDataServiceSQLite.getWordbookById(cleanRecord.wordbookId);
        const vocabulary = await learningDataServiceSQLite.getVocabularyById(cleanRecord.vocabularyId);
        
        if (!wordbook || !vocabulary) {
          console.warn(`学习记录的词书或词汇不存在，跳过迁移`);
          continue;
        }

        // 创建学习记录（不包含 userId）
        const { userId, ...recordToCreate } = cleanRecord;
        await learningDataServiceSQLite.createLearningRecord(recordToCreate);
        migratedCount++;
        
        if (migratedCount % 100 === 0) {
          console.log(`已迁移 ${migratedCount} 条学习记录...`);
        }
      } catch (error) {
        console.error(`迁移学习记录时出错:`, error);
      }
    }

    console.log(`学习记录迁移完成，共迁移 ${migratedCount} 条记录`);
    return migratedCount;
  }

  // ==================== 主迁移方法 ====================

  /**
   * 执行完整的数据迁移
   */
  async migrate(): Promise<{
    success: boolean;
    message: string;
    details: {
      wordbooks: number;
      vocabularies: number;
      learningRecords: number;
    };
  }> {
    console.log('开始数据迁移...');
    
    try {
      // 检查是否需要迁移
      if (!this.needsMigration()) {
        return {
          success: true,
          message: '数据已经迁移完成，无需重复迁移',
          details: { wordbooks: 0, vocabularies: 0, learningRecords: 0 }
        };
      }

      const details = {
        wordbooks: 0,
        vocabularies: 0,
        learningRecords: 0
      };

      // 按顺序迁移数据（保持外键完整性）
      details.wordbooks = await this.migrateWordbooks();
      details.vocabularies = await this.migrateVocabularies();
      details.learningRecords = await this.migrateLearningRecords();

      // 标记迁移完成
      const migrationStatus: MigrationStatus = {
        isCompleted: true,
        completedAt: new Date().toISOString(),
        version: this.MIGRATION_VERSION,
        migratedTables: ['wordbooks', 'vocabularies', 'learning_records']
      };

      localStorage.setItem(STORAGE_KEYS.MIGRATION_STATUS, JSON.stringify(migrationStatus));

      const totalMigrated = details.wordbooks + details.vocabularies + details.learningRecords;
      const message = `数据迁移成功完成！共迁移 ${totalMigrated} 条数据`;
      
      console.log(message);
      console.log('迁移详情:', details);

      return {
        success: true,
        message,
        details
      };

    } catch (error) {
      console.error('数据迁移过程中出错:', error);
      return {
        success: false,
        message: `数据迁移失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: { wordbooks: 0, vocabularies: 0, learningRecords: 0 }
      };
    }
  }

  /**
   * 重置迁移状态（用于测试或重新迁移）
   */
  resetMigrationStatus(): void {
    localStorage.removeItem(STORAGE_KEYS.MIGRATION_STATUS);
    console.log('迁移状态已重置');
  }

  /**
   * 清理 localStorage 数据（迁移完成后可选）
   */
  cleanupLocalStorageData(): void {
    const keysToRemove = [
      STORAGE_KEYS.WORDBOOKS,
      STORAGE_KEYS.VOCABULARIES,
      STORAGE_KEYS.LEARNING_RECORDS,
      STORAGE_KEYS.DAILY_PROGRESS
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log('localStorage 数据清理完成');
  }
}

export const dataMigrationToSQLite = new DataMigrationToSQLite();
export default dataMigrationToSQLite;