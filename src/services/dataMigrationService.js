import learningDataService from './learningDataService';
import { wordbookService } from './wordbookService';

/**
 * 数据迁移服务
 * 负责将localStorage中的旧数据迁移到新的LearningDataService系统
 */
class DataMigrationService {
  constructor() {
    this.MIGRATION_KEY = 'data_migration_completed';
    this.LEGACY_WORDBOOK_ID = 'legacy_wordbook';
  }

  /**
   * 检查是否需要进行数据迁移
   */
  needsMigration() {
    const migrationCompleted = localStorage.getItem(this.MIGRATION_KEY);
    if (migrationCompleted) {
      return false;
    }

    // 检查是否存在旧数据
    const hasLegacyRecords = localStorage.getItem('language_learning_records');
    const hasLegacySessions = localStorage.getItem('language_learning_sessions');
    const hasLegacyItems = localStorage.getItem('language_learning_items');

    return !!(hasLegacyRecords || hasLegacySessions || hasLegacyItems);
  }

  /**
   * 执行数据迁移
   */
  async migrate() {
    try {
      console.log('开始数据迁移...');

      // 1. 创建或获取遗留词书
      const legacyWordbook = await this.ensureLegacyWordbook();

      // 2. 迁移学习项目（词汇）
      await this.migrateLearningItems(legacyWordbook.id);

      // 3. 迁移学习会话
      await this.migrateLearningSession();

      // 4. 迁移学习记录
      await this.migrateLearningRecords(legacyWordbook.id);

      // 5. 标记迁移完成
      localStorage.setItem(this.MIGRATION_KEY, 'true');

      console.log('数据迁移完成');
      return { success: true, message: '数据迁移成功完成' };

    } catch (error) {
      console.error('数据迁移失败:', error);
      return { success: false, message: '数据迁移失败: ' + error.message };
    }
  }

  /**
   * 确保存在遗留词书
   */
  async ensureLegacyWordbook() {
    try {
      // 尝试获取现有的遗留词书
      const existingWordbooks = await wordbookService.getWordbooks();
      const legacyWordbook = existingWordbooks.find(wb => wb.id === this.LEGACY_WORDBOOK_ID);

      if (legacyWordbook) {
        return legacyWordbook;
      }

      // 创建新的遗留词书
      const newWordbook = await wordbookService.createWordbook({
        name: '遗留学习数据',
        description: '从localStorage迁移的历史学习数据',
        language: 'en',
        targetLanguage: 'zh'
      });

      // 更新ID为固定值
      newWordbook.id = this.LEGACY_WORDBOOK_ID;
      return newWordbook;

    } catch (error) {
      console.error('创建遗留词书失败:', error);
      throw error;
    }
  }

  /**
   * 迁移学习项目（词汇）
   */
  async migrateLearningItems(wordbookId) {
    const savedItems = localStorage.getItem('language_learning_items');
    if (!savedItems) {
      return;
    }

    try {
      const items = JSON.parse(savedItems);
      console.log(`迁移 ${items.length} 个学习项目...`);

      for (const item of items) {
        const vocabulary = {
          id: item.id,
          word: item.word,
          translation: item.translation,
          pronunciation: item.pronunciation || '',
          example: item.example || '',
          difficulty: item.difficulty || 'medium',
          tags: item.tags || [],
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await wordbookService.importVocabulary(wordbookId, [vocabulary]);
      }

      console.log('学习项目迁移完成');
    } catch (error) {
      console.error('迁移学习项目失败:', error);
      throw error;
    }
  }

  /**
   * 迁移学习会话
   */
  async migrateLearningSession() {
    const savedSessions = localStorage.getItem('language_learning_sessions');
    if (!savedSessions) {
      return;
    }

    try {
      const sessions = JSON.parse(savedSessions);
      console.log(`迁移 ${sessions.length} 个学习会话...`);

      for (const session of sessions) {
        const learningSession = {
          id: session.id,
          wordbookId: this.LEGACY_WORDBOOK_ID,
          startTime: session.startTime,
          endTime: session.endTime,
          duration: session.duration,
          itemsStudied: session.itemsStudied || 0,
          correctAnswers: session.correctAnswers || 0,
          accuracy: session.accuracy || 0,
          createdAt: session.createdAt || session.startTime,
          updatedAt: new Date().toISOString()
        };

        await learningDataService.createLearningSession(learningSession);
      }

      console.log('学习会话迁移完成');
    } catch (error) {
      console.error('迁移学习会话失败:', error);
      throw error;
    }
  }

  /**
   * 迁移学习记录
   */
  async migrateLearningRecords(wordbookId) {
    const savedRecords = localStorage.getItem('language_learning_records');
    if (!savedRecords) {
      return;
    }

    try {
      const records = JSON.parse(savedRecords);
      console.log(`迁移 ${records.length} 个学习记录...`);

      for (const record of records) {
        const learningRecord = {
          id: record.id,
          wordbookId: wordbookId,
          vocabularyId: record.itemId,
          sessionId: record.sessionId || 'legacy_session',
          result: this.mapResponseToResult(record.response),
          timeSpent: record.responseTime || 0,
          difficulty: record.difficulty || 0.5,
          interval: record.interval || 1,
          stability: record.stability || 0.5,
          confidence: record.confidence || 0.5,
          timestamp: record.timestamp || new Date().toISOString(),
          createdAt: record.createdAt || record.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await learningDataService.createLearningRecord(learningRecord);
      }

      console.log('学习记录迁移完成');
    } catch (error) {
      console.error('迁移学习记录失败:', error);
      throw error;
    }
  }

  /**
   * 将旧的响应格式映射到新的结果格式
   */
  mapResponseToResult(response) {
    switch (response) {
      case 'easy':
      case 'good':
        return 'correct';
      case 'hard':
      case 'again':
        return 'incorrect';
      default:
        return 'correct';
    }
  }

  /**
   * 清理旧数据（可选）
   */
  cleanupLegacyData() {
    try {
      localStorage.removeItem('language_learning_records');
      localStorage.removeItem('language_learning_sessions');
      localStorage.removeItem('language_learning_items');
      console.log('旧数据清理完成');
    } catch (error) {
      console.error('清理旧数据失败:', error);
    }
  }

  /**
   * 重置迁移状态（用于测试）
   */
  resetMigrationStatus() {
    localStorage.removeItem(this.MIGRATION_KEY);
  }
}

export const dataMigrationService = new DataMigrationService();
export default dataMigrationService;