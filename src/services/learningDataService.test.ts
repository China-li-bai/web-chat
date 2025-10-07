/**
 * LearningDataService 测试文件
 * 验证基础的增删改查操作
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import learningDataService from './learningDataService';
import { WordbookCategory, DifficultyLevel, WordbookSource } from '../types/wordbook';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('LearningDataService', () => {
  beforeEach(() => {
    // 清理所有 mock 调用
    vi.clearAllMocks();
    // 重置 localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('词书管理', () => {
    it('应该能够创建新词书', async () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const wordbookData = {
        name: '测试词书',
        category: WordbookCategory.DAILY,
        description: '测试描述',
        difficulty: DifficultyLevel.BEGINNER,
        tags: ['测试'],
        source: WordbookSource.CUSTOM,
        isActive: true
      };

      const wordbook = await learningDataService.createWordbook(wordbookData);

      expect(wordbook).toMatchObject({
        ...wordbookData,
        wordCount: 0
      });
      expect(wordbook.id).toBeDefined();
      expect(wordbook.createdAt).toBeDefined();
      expect(wordbook.updatedAt).toBeDefined();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该能够获取所有词书', async () => {
      const mockWordbooks = [
        {
          id: '1',
          name: '词书1',
          category: WordbookCategory.DAILY,
          difficulty: DifficultyLevel.BEGINNER,
          wordCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isActive: true
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockWordbooks));

      const wordbooks = await learningDataService.getWordbooks();

      expect(wordbooks).toEqual(mockWordbooks);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('learning_wordbooks');
    });

    it('应该能够根据ID获取词书', async () => {
      const mockWordbooks = [
        {
          id: '1',
          name: '词书1',
          category: WordbookCategory.DAILY,
          difficulty: DifficultyLevel.BEGINNER,
          wordCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isActive: true
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockWordbooks));

      const wordbook = await learningDataService.getWordbookById('1');

      expect(wordbook).toEqual(mockWordbooks[0]);
    });

    it('应该能够更新词书', async () => {
      const mockWordbooks = [
        {
          id: '1',
          name: '词书1',
          category: WordbookCategory.DAILY,
          difficulty: DifficultyLevel.BEGINNER,
          wordCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isActive: true
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockWordbooks));

      const updatedWordbook = await learningDataService.updateWordbook('1', {
        name: '更新的词书名'
      });

      expect(updatedWordbook?.name).toBe('更新的词书名');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该能够删除词书', async () => {
      const mockWordbooks = [
        {
          id: '1',
          name: '词书1',
          category: WordbookCategory.DAILY,
          difficulty: DifficultyLevel.BEGINNER,
          wordCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isActive: true
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockWordbooks));

      const result = await learningDataService.deleteWordbook('1');

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('词汇管理', () => {
    it('应该能够创建新词汇', async () => {
      // Mock 词书存在
      const mockWordbooks = [
        {
          id: 'wb1',
          name: '词书1',
          category: WordbookCategory.DAILY,
          difficulty: DifficultyLevel.BEGINNER,
          wordCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isActive: true
        }
      ];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'learning_wordbooks') return JSON.stringify(mockWordbooks);
        if (key === 'learning_vocabularies') return '[]';
        return null;
      });

      const vocabularyData = {
        wordbookId: 'wb1',
        word: 'hello',
        pronunciation: '/həˈloʊ/',
        meaning: '你好',
        example: 'Hello, world!',
        difficulty: 0.3
      };

      const vocabulary = await learningDataService.createVocabulary(vocabularyData);

      expect(vocabulary).toMatchObject({
        ...vocabularyData,
        masteryLevel: 0,
        reviewCount: 0
      });
      expect(vocabulary.id).toBeDefined();
      expect(vocabulary.createdAt).toBeDefined();
      expect(vocabulary.updatedAt).toBeDefined();
    });

    it('应该能够获取指定词书的词汇', async () => {
      const mockVocabularies = [
        {
          id: 'v1',
          wordbookId: 'wb1',
          word: 'hello',
          meaning: '你好',
          difficulty: 0.3,
          masteryLevel: 0,
          reviewCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'v2',
          wordbookId: 'wb2',
          word: 'world',
          meaning: '世界',
          difficulty: 0.3,
          masteryLevel: 0,
          reviewCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockVocabularies));

      const vocabularies = await learningDataService.getVocabularies('wb1');

      expect(vocabularies).toHaveLength(1);
      expect(vocabularies[0].wordbookId).toBe('wb1');
    });
  });

  describe('学习记录管理', () => {
    it('应该能够创建学习记录', async () => {
      // Mock 词汇存在
      const mockVocabularies = [
        {
          id: 'v1',
          wordbookId: 'wb1',
          word: 'hello',
          meaning: '你好',
          difficulty: 0.3,
          masteryLevel: 0.5,
          reviewCount: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'learning_vocabularies') return JSON.stringify(mockVocabularies);
        if (key === 'learning_records') return '[]';
        return null;
      });

      const recordData = {
        wordbookId: 'wb1',
        vocabularyId: 'v1',
        sessionId: 'session1',
        result: 'correct' as const,
        timeSpent: 5,
        timestamp: '2024-01-01T10:00:00.000Z'
      };

      const record = await learningDataService.createLearningRecord(recordData);

      expect(record).toMatchObject({
        ...recordData,
        userId: 'default_user'
      });
      expect(record.id).toBeDefined();
    });

    it('应该能够获取学习记录', async () => {
      const mockRecords = [
        {
          id: 'r1',
          wordbookId: 'wb1',
          vocabularyId: 'v1',
          userId: 'default_user',
          sessionId: 'session1',
          result: 'correct',
          timeSpent: 5,
          timestamp: '2024-01-01T10:00:00.000Z'
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockRecords));

      const records = await learningDataService.getLearningRecords('wb1');

      expect(records).toHaveLength(1);
      expect(records[0].wordbookId).toBe('wb1');
    });
  });

  describe('学习会话管理', () => {
    it('应该能够创建学习会话', async () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const session = await learningDataService.createLearningSession('wb1');

      expect(session).toMatchObject({
        wordbookId: 'wb1',
        userId: 'default_user',
        totalWords: 0,
        correctAnswers: 0,
        totalTime: 0,
        isCompleted: false
      });
      expect(session.id).toBeDefined();
      expect(session.startTime).toBeDefined();
      expect(session.createdAt).toBeDefined();
    });

    it('应该能够完成学习会话', async () => {
      const mockSessions = [
        {
          id: 'session1',
          wordbookId: 'wb1',
          userId: 'default_user',
          startTime: '2024-01-01T10:00:00.000Z',
          totalWords: 0,
          correctAnswers: 0,
          totalTime: 0,
          isCompleted: false,
          createdAt: '2024-01-01T10:00:00.000Z'
        }
      ];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'learning_sessions') return JSON.stringify(mockSessions);
        if (key === 'daily_progress') return '[]';
        return null;
      });

      const completedSession = await learningDataService.completeLearningSession(
        'session1', 10, 8, 300
      );

      expect(completedSession).toMatchObject({
        totalWords: 10,
        correctAnswers: 8,
        totalTime: 300,
        isCompleted: true
      });
      expect(completedSession?.endTime).toBeDefined();
    });
  });

  describe('统计数据生成', () => {
    it('应该能够生成词书统计', async () => {
      const mockWordbook = {
        id: 'wb1',
        name: '词书1',
        category: WordbookCategory.DAILY,
        difficulty: DifficultyLevel.BEGINNER,
        wordCount: 2,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        isActive: true
      };

      const mockVocabularies = [
        {
          id: 'v1',
          wordbookId: 'wb1',
          word: 'hello',
          meaning: '你好',
          difficulty: 0.3,
          masteryLevel: 0.9, // 已掌握
          reviewCount: 5,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'v2',
          wordbookId: 'wb1',
          word: 'world',
          meaning: '世界',
          difficulty: 0.3,
          masteryLevel: 0.5, // 未掌握
          reviewCount: 2,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      const mockRecords = [
        {
          id: 'r1',
          wordbookId: 'wb1',
          vocabularyId: 'v1',
          userId: 'default_user',
          sessionId: 'session1',
          result: 'correct',
          timeSpent: 5,
          timestamp: '2024-01-01T10:00:00.000Z'
        },
        {
          id: 'r2',
          wordbookId: 'wb1',
          vocabularyId: 'v2',
          userId: 'default_user',
          sessionId: 'session1',
          result: 'incorrect',
          timeSpent: 8,
          timestamp: '2024-01-01T10:05:00.000Z'
        }
      ];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'learning_wordbooks') return JSON.stringify([mockWordbook]);
        if (key === 'learning_vocabularies') return JSON.stringify(mockVocabularies);
        if (key === 'learning_records') return JSON.stringify(mockRecords);
        if (key === 'learning_sessions') return '[]';
        if (key === 'daily_progress') return '[]';
        return null;
      });

      const stats = await learningDataService.getWordbookStats('wb1');

      expect(stats).toMatchObject({
        wordbookId: 'wb1',
        totalWords: 2,
        masteredWords: 1, // 只有一个词汇掌握程度 >= 0.8
        averageMastery: 0.7, // (0.9 + 0.5) / 2
        accuracyRate: 0.5 // 1 correct out of 2 records
      });
    });
  });

  describe('数据初始化', () => {
    it('应该能够初始化示例数据', async () => {
      localStorageMock.getItem.mockReturnValue('[]'); // 空数据

      await learningDataService.initializeWithSampleData();

      // 验证创建了词书和词汇
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'learning_wordbooks',
        expect.any(String)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'learning_vocabularies',
        expect.any(String)
      );
    });

    it('如果已有数据则不应该初始化', async () => {
      const existingWordbooks = [
        {
          id: '1',
          name: '现有词书',
          category: WordbookCategory.DAILY,
          difficulty: DifficultyLevel.BEGINNER,
          wordCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isActive: true
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingWordbooks));

      await learningDataService.initializeWithSampleData();

      // 不应该创建新数据
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });
});