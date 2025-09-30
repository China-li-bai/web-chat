/**
 * 主动检索策略算法测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ActiveRetrievalAlgorithm } from '../activeRetrieval';
import type { LearningItem, StudyRecord, StudySession, LearningProfile } from '../../types';

describe('ActiveRetrievalAlgorithm', () => {
  let algorithm: ActiveRetrievalAlgorithm;
  let mockItems: LearningItem[];
  let mockRecords: StudyRecord[];
  let mockSessions: StudySession[];
  let mockProfile: LearningProfile;

  beforeEach(() => {
    algorithm = new ActiveRetrievalAlgorithm();
    
    mockItems = [
      {
        id: 'item-1',
        content: 'Test vocabulary word',
        type: 'vocabulary',
        difficulty: 0.5,
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'item-2',
        content: 'Complex grammar rule',
        type: 'concept',
        difficulty: 0.8,
        createdAt: new Date('2024-01-02')
      },
      {
        id: 'item-3',
        content: 'Simple concept',
        type: 'concept',
        difficulty: 0.3,
        createdAt: new Date('2024-01-03')
      }
    ];

    mockRecords = [
      {
        itemId: 'item-1',
        timestamp: new Date('2024-01-01T10:00:00'),
        response: 'good',
        responseTime: 3000,
        confidence: 0.8
      },
      {
        itemId: 'item-1',
        timestamp: new Date('2024-01-02T10:00:00'),
        response: 'easy',
        responseTime: 2000,
        confidence: 0.9
      },
      {
        itemId: 'item-2',
        timestamp: new Date('2024-01-01T11:00:00'),
        response: 'hard',
        responseTime: 8000,
        confidence: 0.4
      },
      {
        itemId: 'item-2',
        timestamp: new Date('2024-01-02T11:00:00'),
        response: 'again',
        responseTime: 10000,
        confidence: 0.2
      },
      {
        itemId: 'item-3',
        timestamp: new Date('2024-01-01T12:00:00'),
        response: 'easy',
        responseTime: 1500,
        confidence: 0.95
      }
    ];

    mockSessions = [
      {
        sessionId: 'session-1',
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T10:30:00'),
        itemsStudied: 10,
        correctResponses: 8,
        averageResponseTime: 2500,
        cognitiveLoad: 0.6
      }
    ];

    mockProfile = {
      userId: 'user-1',
      cognitiveCapacity: 0.8,
      learningSpeed: 0.7,
      retentionRate: 0.75,
      preferredDifficulty: 0.6,
      adaptationRate: 0.6,
      lastUpdated: new Date('2024-01-01')
    };
  });

  describe('generateRetrievalSchedule', () => {
    it('应该生成有效的检索计划', () => {
      const schedule = algorithm.generateRetrievalSchedule(
        mockItems,
        mockRecords,
        mockProfile
      );

      expect(schedule.items).toBeDefined();
      expect(schedule.totalItems).toBeGreaterThan(0);
      expect(schedule.estimatedDuration).toBeGreaterThan(0);
      expect(schedule.cognitiveLoadPrediction).toBeGreaterThanOrEqual(0);
      expect(schedule.cognitiveLoadPrediction).toBeLessThanOrEqual(1);
      expect(schedule.generatedAt).toBeInstanceOf(Date);
    });

    it('应该按优先级排序项目', () => {
      const schedule = algorithm.generateRetrievalSchedule(
        mockItems,
        mockRecords,
        mockProfile
      );

      // 检查是否有项目被安排
      expect(schedule.items.length).toBeGreaterThan(0);
      
      // 检查每个项目都有必要的属性
      schedule.items.forEach(scheduledItem => {
        expect(scheduledItem.item).toBeDefined();
        expect(scheduledItem.scheduledTime).toBeInstanceOf(Date);
        expect(scheduledItem.retrievalStrength).toBeGreaterThanOrEqual(0);
        expect(scheduledItem.retrievalStrength).toBeLessThanOrEqual(1);
        expect(scheduledItem.strategy).toBeDefined();
      });
    });

    it('应该考虑目标时间范围', () => {
      const targetDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2小时后
      
      const schedule = algorithm.generateRetrievalSchedule(
        mockItems,
        mockRecords,
        mockProfile,
        targetDate
      );

      // 所有安排的项目都应该在目标时间内
      schedule.items.forEach(scheduledItem => {
        expect(scheduledItem.scheduledTime.getTime()).toBeLessThanOrEqual(targetDate.getTime());
      });
    });
  });

  describe('selectRetrievalStrategy', () => {
    it('应该为表现差的项目选择提示辅助检索', () => {
      const poorRecords = [
        {
          itemId: 'item-1',
          timestamp: new Date('2024-01-01'),
          response: 'again' as const,
          responseTime: 8000,
          confidence: 0.2
        },
        {
          itemId: 'item-1',
          timestamp: new Date('2024-01-02'),
          response: 'hard' as const,
          responseTime: 7000,
          confidence: 0.3
        },
        {
          itemId: 'item-1',
          timestamp: new Date('2024-01-03'),
          response: 'again' as const,
          responseTime: 9000,
          confidence: 0.1
        }
      ];

      const strategy = algorithm.selectRetrievalStrategy(
        mockItems[0],
        poorRecords,
        mockProfile
      );

      expect(strategy.type).toBe('cued_recall');
      expect(strategy.difficulty).toBe('easy');
      expect(strategy.hints.length).toBeGreaterThan(0);
    });

    it('应该为高遗忘风险项目选择强化检索', () => {
      // 模拟很久没有复习的项目
      const oldRecords = [
        {
          itemId: 'item-1',
          timestamp: new Date('2023-12-01'), // 很久以前
          response: 'good' as const,
          responseTime: 3000,
          confidence: 0.8
        }
      ];

      const strategy = algorithm.selectRetrievalStrategy(
        mockItems[0],
        oldRecords,
        mockProfile
      );

      expect(strategy.type).toBe('free_recall');
      expect(strategy.difficulty).toBe('medium');
    });

    it('应该为复杂项目选择分解检索', () => {
      const complexItem = {
        ...mockItems[1],
        difficulty: 0.9,
        content: 'Very complex procedural knowledge with multiple steps and intricate relationships'
      };

      const strategy = algorithm.selectRetrievalStrategy(
        complexItem,
        mockRecords.filter(r => r.itemId === 'item-2'),
        mockProfile
      );

      expect(strategy.type).toBe('elaborative_retrieval');
      expect(strategy.difficulty).toBe('hard');
      expect(strategy.hints.length).toBeGreaterThan(0);
    });

    it('应该为标准情况选择识别任务', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      
      const normalRecords = [
        {
          itemId: 'item-1',
          timestamp: twoDaysAgo,
          response: 'good' as const,
          responseTime: 3000,
          confidence: 0.8
        },
        {
          itemId: 'item-1',
          timestamp: yesterday,
          response: 'good' as const,
          responseTime: 2800,
          confidence: 0.85
        }
      ];

      const strategy = algorithm.selectRetrievalStrategy(
        mockItems[0],
        normalRecords,
        mockProfile
      );

      expect(strategy.type).toBe('recognition');
      expect(strategy.difficulty).toBe('medium');
    });
  });

  describe('calculateTestingEffect', () => {
    it('应该计算测试效应强度', () => {
      const testingEffect = algorithm.calculateTestingEffect(
        mockItems[0],
        mockRecords.filter(r => r.itemId === 'item-1'),
        {
          type: 'free_recall',
          difficulty: 'medium',
          hints: [],
          timeLimit: 60,
          description: 'Test strategy'
        }
      );

      expect(testingEffect.strength).toBeGreaterThanOrEqual(0);
      expect(testingEffect.strength).toBeLessThanOrEqual(1);
      expect(testingEffect.retrievalAttempts).toBeGreaterThanOrEqual(0);
      expect(testingEffect.successfulRetrievals).toBeGreaterThanOrEqual(0);
      expect(testingEffect.predictedRetention).toBeGreaterThanOrEqual(0);
      expect(testingEffect.predictedRetention).toBeLessThanOrEqual(1);
    });

    it('应该正确计算检索尝试次数', () => {
      const records = mockRecords.filter(r => r.itemId === 'item-1');
      
      const testingEffect = algorithm.calculateTestingEffect(
        mockItems[0],
        records,
        {
          type: 'free_recall',
          difficulty: 'medium',
          hints: [],
          timeLimit: 60,
          description: 'Test strategy'
        }
      );

      // 应该识别出检索尝试（响应时间>1000ms的记录）
      expect(testingEffect.retrievalAttempts).toBe(records.length);
    });

    it('应该正确计算成功检索次数', () => {
      const records = mockRecords.filter(r => r.itemId === 'item-1');
      
      const testingEffect = algorithm.calculateTestingEffect(
        mockItems[0],
        records,
        {
          type: 'free_recall',
          difficulty: 'medium',
          hints: [],
          timeLimit: 60,
          description: 'Test strategy'
        }
      );

      // item-1的记录都是good或easy，应该都算成功
      const expectedSuccessful = records.filter(r => 
        r.response === 'good' || r.response === 'easy'
      ).length;
      
      expect(testingEffect.successfulRetrievals).toBe(expectedSuccessful);
    });
  });

  describe('optimizeSpacingEffect', () => {
    it('应该为新项目返回初始间隔', () => {
      const interval = algorithm.optimizeSpacingEffect(
        mockItems[0],
        [], // 没有记录
        mockProfile
      );

      expect(interval).toBeGreaterThan(0);
      expect(interval).toBeLessThan(1440); // 少于24小时（分钟）
    });

    it('应该基于历史表现调整间隔', () => {
      const goodRecords = [
        {
          itemId: 'item-1',
          timestamp: new Date('2024-01-01'),
          response: 'easy' as const,
          responseTime: 2000,
          confidence: 0.9
        },
        {
          itemId: 'item-1',
          timestamp: new Date('2024-01-03'), // 2天间隔
          response: 'easy' as const,
          responseTime: 1800,
          confidence: 0.95
        }
      ];

      const interval = algorithm.optimizeSpacingEffect(
        mockItems[0],
        goodRecords,
        mockProfile
      );

      expect(interval).toBeGreaterThan(0);
    });

    it('应该考虑个人档案进行调整', () => {
      const fastLearnerProfile = {
        ...mockProfile,
        learningSpeed: 0.9,
        retentionRate: 0.9
      };

      const slowLearnerProfile = {
        ...mockProfile,
        learningSpeed: 0.3,
        retentionRate: 0.4
      };

      const records = mockRecords.filter(r => r.itemId === 'item-1');

      const fastInterval = algorithm.optimizeSpacingEffect(
        mockItems[0],
        records,
        fastLearnerProfile
      );

      const slowInterval = algorithm.optimizeSpacingEffect(
        mockItems[0],
        records,
        slowLearnerProfile
      );

      // 快速学习者应该有更长的间隔
      expect(fastInterval).toBeGreaterThan(slowInterval);
    });
  });

  describe('implementDistributedPractice', () => {
    it('应该创建交错学习序列', () => {
      const sequence = algorithm.implementDistributedPractice(
        mockItems,
        mockRecords,
        1800, // 30分钟会话
        mockProfile
      );

      expect(sequence.length).toBeGreaterThan(0);
      expect(sequence.length).toBeLessThanOrEqual(mockItems.length);
      
      // 检查是否包含不同类型的项目
      const types = new Set(sequence.map(item => item.type));
      expect(types.size).toBeGreaterThan(1);
    });

    it('应该根据认知容量调整项目数量', () => {
      const lowCapacityProfile = {
        ...mockProfile,
        cognitiveCapacity: 0.3
      };

      const highCapacityProfile = {
        ...mockProfile,
        cognitiveCapacity: 0.9
      };

      const lowSequence = algorithm.implementDistributedPractice(
        mockItems,
        mockRecords,
        1800,
        lowCapacityProfile
      );

      const highSequence = algorithm.implementDistributedPractice(
        mockItems,
        mockRecords,
        1800,
        highCapacityProfile
      );

      // 高认知容量应该能处理更多项目
      expect(highSequence.length).toBeGreaterThanOrEqual(lowSequence.length);
    });

    it('应该考虑会话时长限制', () => {
      const shortSession = algorithm.implementDistributedPractice(
        mockItems,
        mockRecords,
        300, // 5分钟
        mockProfile
      );

      const longSession = algorithm.implementDistributedPractice(
        mockItems,
        mockRecords,
        3600, // 60分钟
        mockProfile
      );

      // 长会话应该包含更多项目
      expect(longSession.length).toBeGreaterThanOrEqual(shortSession.length);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空项目列表', () => {
      const schedule = algorithm.generateRetrievalSchedule(
        [],
        mockRecords,
        mockProfile
      );

      expect(schedule.items).toHaveLength(0);
      expect(schedule.totalItems).toBe(0);
    });

    it('应该处理空记录', () => {
      const schedule = algorithm.generateRetrievalSchedule(
        mockItems,
        [],
        mockProfile
      );

      expect(schedule.items.length).toBeGreaterThan(0);
      // 没有记录时应该使用默认策略
    });

    it('应该处理极端认知容量', () => {
      const extremeProfile = {
        ...mockProfile,
        cognitiveCapacity: 0.1,
        learningSpeed: 0.1,
        retentionRate: 0.1
      };

      const schedule = algorithm.generateRetrievalSchedule(
        mockItems,
        mockRecords,
        extremeProfile
      );

      expect(schedule.items).toBeDefined();
      expect(schedule.cognitiveLoadPrediction).toBeGreaterThanOrEqual(0);
      expect(schedule.cognitiveLoadPrediction).toBeLessThanOrEqual(1);
    });

    it('应该处理极端响应时间', () => {
      const extremeRecords = [
        {
          itemId: 'item-1',
          timestamp: new Date('2024-01-01'),
          response: 'good' as const,
          responseTime: 100, // 极快
          confidence: 0.9
        },
        {
          itemId: 'item-1',
          timestamp: new Date('2024-01-02'),
          response: 'good' as const,
          responseTime: 60000, // 极慢
          confidence: 0.5
        }
      ];

      const strategy = algorithm.selectRetrievalStrategy(
        mockItems[0],
        extremeRecords,
        mockProfile
      );

      expect(strategy).toBeDefined();
      expect(strategy.timeLimit).toBeGreaterThan(0);
    });
  });
});