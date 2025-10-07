/**
 * 统一的学习数据服务层
 * 基于 wordbook.ts 类型定义，提供所有学习数据的 CRUD 操作
 * 使用 localStorage 作为数据存储，支持未来扩展到其他存储方案
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

class LearningDataService {
  private readonly STORAGE_KEYS = {
    WORDBOOKS: 'learning_wordbooks',
    VOCABULARIES: 'learning_vocabularies', 
    LEARNING_RECORDS: 'learning_records',
    LEARNING_SESSIONS: 'learning_sessions',
    DAILY_PROGRESS: 'daily_progress'
  };

  private readonly DEFAULT_USER_ID = 'default_user';

  // ==================== 工具方法 ====================
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  private getStorageData<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return [];
    }
  }

  private setStorageData<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error writing ${key} to localStorage:`, error);
      throw new Error(`Failed to save data to ${key}`);
    }
  }

  // ==================== 词书管理 ====================

  async getWordbooks(): Promise<Wordbook[]> {
    return this.getStorageData<Wordbook>(this.STORAGE_KEYS.WORDBOOKS);
  }

  async getWordbookById(id: string): Promise<Wordbook | null> {
    const wordbooks = await this.getWordbooks();
    return wordbooks.find(wb => wb.id === id) || null;
  }

  async createWordbook(wordbook: Omit<Wordbook, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>): Promise<Wordbook> {
    const newWordbook: Wordbook = {
      ...wordbook,
      id: this.generateId(),
      wordCount: 0,
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp()
    };

    const wordbooks = await this.getWordbooks();
    wordbooks.push(newWordbook);
    this.setStorageData(this.STORAGE_KEYS.WORDBOOKS, wordbooks);

    return newWordbook;
  }

  async updateWordbook(id: string, updates: Partial<Wordbook>): Promise<Wordbook | null> {
    const wordbooks = await this.getWordbooks();
    const index = wordbooks.findIndex(wb => wb.id === id);
    
    if (index === -1) return null;

    wordbooks[index] = {
      ...wordbooks[index],
      ...updates,
      updatedAt: this.getCurrentTimestamp()
    };

    this.setStorageData(this.STORAGE_KEYS.WORDBOOKS, wordbooks);
    return wordbooks[index];
  }

  async deleteWordbook(id: string): Promise<boolean> {
    const wordbooks = await this.getWordbooks();
    const filteredWordbooks = wordbooks.filter(wb => wb.id !== id);
    
    if (filteredWordbooks.length === wordbooks.length) return false;

    // 同时删除相关的词汇、学习记录等
    await this.deleteVocabulariesByWordbookId(id);
    await this.deleteLearningRecordsByWordbookId(id);
    await this.deleteSessionsByWordbookId(id);
    await this.deleteDailyProgressByWordbookId(id);

    this.setStorageData(this.STORAGE_KEYS.WORDBOOKS, filteredWordbooks);
    return true;
  }

  // ==================== 词汇管理 ====================

  async getVocabularies(wordbookId?: string): Promise<Vocabulary[]> {
    const vocabularies = this.getStorageData<Vocabulary>(this.STORAGE_KEYS.VOCABULARIES);
    return wordbookId ? vocabularies.filter(v => v.wordbookId === wordbookId) : vocabularies;
  }

  async getVocabularyById(id: string): Promise<Vocabulary | null> {
    const vocabularies = await this.getVocabularies();
    return vocabularies.find(v => v.id === id) || null;
  }

  async createVocabulary(vocabulary: Omit<Vocabulary, 'id' | 'createdAt' | 'updatedAt' | 'masteryLevel' | 'reviewCount'>): Promise<Vocabulary> {
    const newVocabulary: Vocabulary = {
      ...vocabulary,
      id: this.generateId(),
      masteryLevel: 0,
      reviewCount: 0,
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp()
    };

    const vocabularies = await this.getVocabularies();
    vocabularies.push(newVocabulary);
    this.setStorageData(this.STORAGE_KEYS.VOCABULARIES, vocabularies);

    // 更新词书的词汇数量
    await this.updateWordbookWordCount(vocabulary.wordbookId);

    return newVocabulary;
  }

  async updateVocabulary(id: string, updates: Partial<Vocabulary>): Promise<Vocabulary | null> {
    const vocabularies = await this.getVocabularies();
    const index = vocabularies.findIndex(v => v.id === id);
    
    if (index === -1) return null;

    vocabularies[index] = {
      ...vocabularies[index],
      ...updates,
      updatedAt: this.getCurrentTimestamp()
    };

    this.setStorageData(this.STORAGE_KEYS.VOCABULARIES, vocabularies);
    return vocabularies[index];
  }

  async deleteVocabulary(id: string): Promise<boolean> {
    const vocabularies = await this.getVocabularies();
    const vocabulary = vocabularies.find(v => v.id === id);
    if (!vocabulary) return false;

    const filteredVocabularies = vocabularies.filter(v => v.id !== id);
    this.setStorageData(this.STORAGE_KEYS.VOCABULARIES, filteredVocabularies);

    // 删除相关学习记录
    await this.deleteLearningRecordsByVocabularyId(id);
    
    // 更新词书的词汇数量
    await this.updateWordbookWordCount(vocabulary.wordbookId);

    return true;
  }

  private async deleteVocabulariesByWordbookId(wordbookId: string): Promise<void> {
    const vocabularies = await this.getVocabularies();
    const filteredVocabularies = vocabularies.filter(v => v.wordbookId !== wordbookId);
    this.setStorageData(this.STORAGE_KEYS.VOCABULARIES, filteredVocabularies);
  }

  private async updateWordbookWordCount(wordbookId: string): Promise<void> {
    const vocabularies = await this.getVocabularies(wordbookId);
    await this.updateWordbook(wordbookId, { wordCount: vocabularies.length });
  }

  // ==================== 学习记录管理 ====================

  async getLearningRecords(wordbookId?: string, vocabularyId?: string): Promise<LearningRecord[]> {
    let records = this.getStorageData<LearningRecord>(this.STORAGE_KEYS.LEARNING_RECORDS);
    
    if (wordbookId) {
      records = records.filter(r => r.wordbookId === wordbookId);
    }
    
    if (vocabularyId) {
      records = records.filter(r => r.vocabularyId === vocabularyId);
    }
    
    return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createLearningRecord(record: Omit<LearningRecord, 'id' | 'userId'>): Promise<LearningRecord> {
    const newRecord: LearningRecord = {
      ...record,
      id: this.generateId(),
      userId: this.DEFAULT_USER_ID
    };

    const records = await this.getLearningRecords();
    records.push(newRecord);
    this.setStorageData(this.STORAGE_KEYS.LEARNING_RECORDS, records);

    // 更新词汇的掌握程度和复习统计
    await this.updateVocabularyMastery(record.vocabularyId, record.result);

    return newRecord;
  }

  private async deleteLearningRecordsByWordbookId(wordbookId: string): Promise<void> {
    const records = await this.getLearningRecords();
    const filteredRecords = records.filter(r => r.wordbookId !== wordbookId);
    this.setStorageData(this.STORAGE_KEYS.LEARNING_RECORDS, filteredRecords);
  }

  private async deleteLearningRecordsByVocabularyId(vocabularyId: string): Promise<void> {
    const records = await this.getLearningRecords();
    const filteredRecords = records.filter(r => r.vocabularyId !== vocabularyId);
    this.setStorageData(this.STORAGE_KEYS.LEARNING_RECORDS, filteredRecords);
  }

  private async updateVocabularyMastery(vocabularyId: string, result: 'correct' | 'incorrect' | 'skip'): Promise<void> {
    const vocabulary = await this.getVocabularyById(vocabularyId);
    if (!vocabulary) return;

    let masteryChange = 0;
    if (result === 'correct') {
      masteryChange = 0.1;
    } else if (result === 'incorrect') {
      masteryChange = -0.05;
    }

    const newMasteryLevel = Math.max(0, Math.min(1, vocabulary.masteryLevel + masteryChange));

    await this.updateVocabulary(vocabularyId, {
      masteryLevel: newMasteryLevel,
      reviewCount: vocabulary.reviewCount + 1,
      lastReviewed: this.getCurrentTimestamp()
    });
  }

  // ==================== 学习会话管理 ====================

  async getLearningSession(id: string): Promise<LearningSession | null> {
    const sessions = this.getStorageData<LearningSession>(this.STORAGE_KEYS.LEARNING_SESSIONS);
    return sessions.find(s => s.id === id) || null;
  }

  async createLearningSession(wordbookId: string): Promise<LearningSession> {
    const newSession: LearningSession = {
      id: this.generateId(),
      wordbookId,
      userId: this.DEFAULT_USER_ID,
      startTime: this.getCurrentTimestamp(),
      totalWords: 0,
      correctAnswers: 0,
      totalTime: 0,
      isCompleted: false,
      createdAt: this.getCurrentTimestamp()
    };

    const sessions = this.getStorageData<LearningSession>(this.STORAGE_KEYS.LEARNING_SESSIONS);
    sessions.push(newSession);
    this.setStorageData(this.STORAGE_KEYS.LEARNING_SESSIONS, sessions);

    return newSession;
  }

  async completeLearningSession(sessionId: string, totalWords: number, correctAnswers: number, totalTime: number): Promise<LearningSession | null> {
    const sessions = this.getStorageData<LearningSession>(this.STORAGE_KEYS.LEARNING_SESSIONS);
    const index = sessions.findIndex(s => s.id === sessionId);
    
    if (index === -1) return null;

    sessions[index] = {
      ...sessions[index],
      endTime: this.getCurrentTimestamp(),
      totalWords,
      correctAnswers,
      totalTime,
      isCompleted: true
    };

    this.setStorageData(this.STORAGE_KEYS.LEARNING_SESSIONS, sessions);

    // 更新每日进度
    await this.updateDailyProgress(sessions[index].wordbookId, totalWords, correctAnswers / totalWords, totalTime);

    return sessions[index];
  }

  private async deleteSessionsByWordbookId(wordbookId: string): Promise<void> {
    const sessions = this.getStorageData<LearningSession>(this.STORAGE_KEYS.LEARNING_SESSIONS);
    const filteredSessions = sessions.filter(s => s.wordbookId !== wordbookId);
    this.setStorageData(this.STORAGE_KEYS.LEARNING_SESSIONS, filteredSessions);
  }

  // ==================== 每日进度管理 ====================

  async getDailyProgress(wordbookId: string, dateRange?: { start: string; end: string }): Promise<DailyProgress[]> {
    let progress = this.getStorageData<DailyProgressWithWordbook>(this.STORAGE_KEYS.DAILY_PROGRESS)
      .filter(p => p.wordbookId === wordbookId);

    if (dateRange) {
      progress = progress.filter(p => p.date >= dateRange.start && p.date <= dateRange.end);
    }

    return progress.sort((a, b) => a.date.localeCompare(b.date));
  }

  private async updateDailyProgress(wordbookId: string, wordsStudied: number, accuracy: number, timeSpent: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const progressList = this.getStorageData<DailyProgressWithWordbook>(this.STORAGE_KEYS.DAILY_PROGRESS);
    
    const existingIndex = progressList.findIndex(p => 
      p.wordbookId === wordbookId && p.date === today
    );

    if (existingIndex >= 0) {
      // 更新现有记录
      progressList[existingIndex] = {
        ...progressList[existingIndex],
        wordsStudied: progressList[existingIndex].wordsStudied + wordsStudied,
        accuracy: (progressList[existingIndex].accuracy + accuracy) / 2, // 平均准确率
        timeSpent: progressList[existingIndex].timeSpent + timeSpent
      };
    } else {
      // 创建新记录
      const newProgress: DailyProgressWithWordbook = {
        wordbookId,
        date: today,
        wordsStudied,
        accuracy,
        timeSpent
      };
      progressList.push(newProgress);
    }

    this.setStorageData(this.STORAGE_KEYS.DAILY_PROGRESS, progressList);
  }

  private async deleteDailyProgressByWordbookId(wordbookId: string): Promise<void> {
    const progress = this.getStorageData<DailyProgressWithWordbook>(this.STORAGE_KEYS.DAILY_PROGRESS);
    const filteredProgress = progress.filter(p => p.wordbookId !== wordbookId);
    this.setStorageData(this.STORAGE_KEYS.DAILY_PROGRESS, filteredProgress);
  }

  // ==================== 统计数据生成 ====================

  async getWordbookStats(wordbookId: string): Promise<WordbookStats | null> {
    const wordbook = await this.getWordbookById(wordbookId);
    if (!wordbook) return null;

    const vocabularies = await this.getVocabularies(wordbookId);
    const records = await this.getLearningRecords(wordbookId);
    const sessions = this.getStorageData<LearningSession>(this.STORAGE_KEYS.LEARNING_SESSIONS)
      .filter(s => s.wordbookId === wordbookId && s.isCompleted);
    const dailyProgress = await this.getDailyProgress(wordbookId);

    const totalWords = vocabularies.length;
    const masteredWords = vocabularies.filter(v => v.masteryLevel >= 0.8).length;
    const averageMastery = totalWords > 0 ? vocabularies.reduce((sum, v) => sum + v.masteryLevel, 0) / totalWords : 0;
    const totalStudyTime = dailyProgress.reduce((sum, p) => sum + p.timeSpent, 0);
    const lastStudyDate = dailyProgress.length > 0 ? dailyProgress[dailyProgress.length - 1].date : undefined;
    const studySessions = sessions.length;
    const accuracyRate = records.length > 0 ? records.filter(r => r.result === 'correct').length / records.length : 0;

    return {
      wordbookId,
      totalWords,
      masteredWords,
      averageMastery,
      totalStudyTime,
      lastStudyDate,
      studySessions,
      accuracyRate,
      dailyProgress
    };
  }

  async getAllWordbookStats(filter?: StatsFilter): Promise<WordbookStats[]> {
    let wordbooks = await this.getWordbooks();

    // 应用筛选条件
    if (filter?.wordbookIds) {
      wordbooks = wordbooks.filter(wb => filter.wordbookIds!.includes(wb.id));
    }
    if (filter?.category) {
      wordbooks = wordbooks.filter(wb => wb.category === filter.category);
    }
    if (filter?.difficulty) {
      wordbooks = wordbooks.filter(wb => wb.difficulty === filter.difficulty);
    }

    const statsPromises = wordbooks.map(wb => this.getWordbookStats(wb.id));
    const stats = await Promise.all(statsPromises);
    
    return stats.filter(s => s !== null) as WordbookStats[];
  }

  // ==================== 数据迁移和初始化 ====================

  async initializeWithSampleData(): Promise<void> {
    const existingWordbooks = await this.getWordbooks();
    if (existingWordbooks.length > 0) return; // 已有数据，不需要初始化

    // 创建示例词书
    const sampleWordbook = await this.createWordbook({
      name: '英语基础词汇',
      category: WordbookCategory.DAILY,
      description: '日常英语基础词汇学习',
      difficulty: DifficultyLevel.BEGINNER,
      tags: ['基础', '日常'],
      source: WordbookSource.CUSTOM,
      isActive: true
    });

    // 添加示例词汇
    const sampleWords = [
      { word: 'hello', pronunciation: '/həˈloʊ/', meaning: '你好', example: 'Hello, how are you?' },
      { word: 'world', pronunciation: '/wɜːrld/', meaning: '世界', example: 'Welcome to the world.' },
      { word: 'learn', pronunciation: '/lɜːrn/', meaning: '学习', example: 'I want to learn English.' }
    ];

    for (const wordData of sampleWords) {
      await this.createVocabulary({
        wordbookId: sampleWordbook.id,
        ...wordData,
        difficulty: 0.3
      });
    }
  }

  // ==================== 数据清理 ====================

  async clearAllData(): Promise<void> {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

// 导出单例实例
export const learningDataService = new LearningDataService();
export default learningDataService;