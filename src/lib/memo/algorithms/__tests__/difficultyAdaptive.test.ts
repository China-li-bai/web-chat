/**
 * 难度自适应算法测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DifficultyAdaptiveAlgorithm } from '../difficultyAdaptive';
import type { LearningItem, StudyRecord, StudySession } from '../../types';

describe('DifficultyAdaptiveAlgorithm', () => {
  let algorithm: DifficultyAdaptiveAlgorithm;
  let mockItem: LearningItem;
  let mockRecords: StudyRecord[];
  let mockSessions: StudySession[];

  beforeEach(() => {
    algorithm = new DifficultyAdaptiveAlgorithm();
    
    mockItem = {
      id: 'test-item-1',
      content: 'Test vocabulary word',
      type: 'vocabulary',
      difficulty: 0.5,
      createdAt: new Date('2024-01-01')
    };

    mockRecords = [
      {
        itemId: 'test-item-1',
        timestamp: new Date('2024-01-01'),
        response: 'good',
        responseTime: 3000,
        confidence: 0.8
      },
      {
        itemId: 'test-item-1',
        timestamp: new Date('2024-01-02'),
        response: 'good',
        responseTime: 2500,
        confidence: 0.85
      },
      {
        itemId: 'test-item-1',
        timestamp: new Date('2024-01-03'),
        response: 'easy',
        responseTime: 2000,
        confidence: 0.9
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
      },
      {
        sessionId: 'session-2',
        startTime: new Date('2024-01-02T14:00:00'),
        endTime: new Date('2024-01-02T14:45:00'),
        itemsStudied: 15,
        correctResponses: 12,
        averageResponseTime: 2200,
        cognitiveLoad: 0.5
      }
    ];
  });

  describe('analyzeLearningProfile', () => {
    it('应该为新用户返回默认档案', () => {
      const profile = algorithm.analyzeLearningProfile('user-1', [], []);
      
      expect(profile.userId).toBe('user-1');
      expect(profile.cognitiveCapacity).toBe(0.7);
      expect(profile.learningSpeed).toBe(0.5);
      expect(profile.retentionRate).toBe(0.6);
      expect(profile.preferredDifficulty).toBe(0.5);
      expect(profile.adaptationRate).toBe(0.5);
    });

    it('应该基于学习数据分析档案', () => {
      const extendedRecords = [
        ...mockRecords,
        {
          itemId: 'test-item-2',
          timestamp: new Date('2024-01-04'),
          response: 'good' as const,
          responseTime: 2800,
          confidence: 0.75
        },
        {
          itemId: 'test-item-3',
          timestamp: new Date('2024-01-05'),
          response: 'easy' as const,
          responseTime: 1800,
          confidence: 0.95
        }
      ];

      const profile = algorithm.analyzeLearningProfile('user-1', extendedRecords, mockSessions);
      
      expect(profile.userId).toBe('user-1');
      expect(profile.cognitiveCapacity).toBeGreaterThan(0);
      expect(profile.cognitiveCapacity).toBeLessThanOrEqual(1);
      expect(profile.learningSpeed).toBeGreaterThan(0);
      expect(profile.learningSpeed).toBeLessThanOrEqual(1);
      expect(profile.retentionRate).toBeGreaterThan(0);
      expect(profile.retentionRate).toBeLessThanOrEqual(1);
    });

    it('应该基于会话数据计算认知容量', () => {
      const highPerformanceSessions: StudySession[] = [
        {
          sessionId: 'session-1',
          startTime: new Date('2024-01-01T10:00:00'),
          endTime: new Date('2024-01-01T11:00:00'), // 60分钟
          itemsStudied: 30,
          correctResponses: 28,
          averageResponseTime: 1500,
          cognitiveLoad: 0.4
        }
      ];

      const profile = algorithm.analyzeLearningProfile('user-1', mockRecords, highPerformanceSessions);
      
      expect(profile.cognitiveCapacity).toBeGreaterThan(0.7);
    });
  });

  describe('adjustDifficulty', () => {
    it('应该为数据不足的情况返回原难度', () => {
      const singleRecord = [mockRecords[0]];
      const profile = algorithm.analyzeLearningProfile('user-1', mockRecords, mockSessions);
      
      const adjustment = algorithm.adjustDifficulty(mockItem, singleRecord, profile);
      
      expect(adjustment.adjustedDifficulty).toBe(mockItem.difficulty);
      expect(adjustment.confidence).toBeLessThan(0.5);
    });

    it('应该基于成功率调整难度', () => {
      const profile = algorithm.analyzeLearningProfile('user-1', mockRecords, mockSessions);
      
      // 高成功率记录
      const highSuccessRecords: StudyRecord[] = [
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-01'),
          response: 'easy',
          responseTime: 1500,
          confidence: 0.95
        },
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-02'),
          response: 'easy',
          responseTime: 1200,
          confidence: 0.98
        },
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-03'),
          response: 'easy',
          responseTime: 1000,
          confidence: 0.99
        }
      ];

      const adjustment = algorithm.adjustDifficulty(mockItem, highSuccessRecords, profile);
      
      expect(adjustment.adjustedDifficulty).toBeGreaterThan(mockItem.difficulty);
      expect(adjustment.adjustmentReason).toContain('Success rate too high');
    });

    it('应该基于低成功率降低难度', () => {
      const profile = algorithm.analyzeLearningProfile('user-1', mockRecords, mockSessions);
      
      // 低成功率记录
      const lowSuccessRecords: StudyRecord[] = [
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-01'),
          response: 'again',
          responseTime: 8000,
          confidence: 0.2
        },
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-02'),
          response: 'again',
          responseTime: 7500,
          confidence: 0.3
        },
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-03'),
          response: 'hard',
          responseTime: 6000,
          confidence: 0.4
        }
      ];

      const adjustment = algorithm.adjustDifficulty(mockItem, lowSuccessRecords, profile);
      
      expect(adjustment.adjustedDifficulty).toBeLessThan(mockItem.difficulty);
      expect(adjustment.adjustmentReason).toContain('Success rate too low');
    });

    it('应该限制调整幅度', () => {
      const profile = algorithm.analyzeLearningProfile('user-1', mockRecords, mockSessions);
      
      // 极端情况
      const extremeRecords: StudyRecord[] = [
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-01'),
          response: 'again',
          responseTime: 15000,
          confidence: 0.1
        },
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-02'),
          response: 'again',
          responseTime: 12000,
          confidence: 0.1
        }
      ];

      const adjustment = algorithm.adjustDifficulty(mockItem, extremeRecords, profile);
      
      // 调整幅度不应超过0.2
      expect(Math.abs(adjustment.adjustedDifficulty - mockItem.difficulty)).toBeLessThanOrEqual(0.2);
    });
  });

  describe('calculateCognitiveLoad', () => {
    it('应该计算认知负荷各个组成部分', () => {
      const load = algorithm.calculateCognitiveLoad(mockRecords);
      
      expect(load.intrinsic).toBeGreaterThanOrEqual(0);
      expect(load.intrinsic).toBeLessThanOrEqual(1);
      expect(load.extraneous).toBeGreaterThanOrEqual(0);
      expect(load.extraneous).toBeLessThanOrEqual(1);
      expect(load.germane).toBeGreaterThanOrEqual(0);
      expect(load.germane).toBeLessThanOrEqual(1);
      expect(load.total).toBeGreaterThanOrEqual(0);
      expect(load.total).toBeLessThanOrEqual(1);
    });

    it('应该反映响应时间对内在负荷的影响', () => {
      const fastRecords: StudyRecord[] = [
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-01'),
          response: 'good',
          responseTime: 1000, // 快速响应
          confidence: 0.9
        }
      ];

      const slowRecords: StudyRecord[] = [
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-01'),
          response: 'good',
          responseTime: 8000, // 慢速响应
          confidence: 0.9
        }
      ];

      const fastLoad = algorithm.calculateCognitiveLoad(fastRecords);
      const slowLoad = algorithm.calculateCognitiveLoad(slowRecords);
      
      expect(slowLoad.intrinsic).toBeGreaterThan(fastLoad.intrinsic);
    });

    it('应该反映错误率对外在负荷的影响', () => {
      const goodRecords: StudyRecord[] = [
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-01'),
          response: 'good',
          responseTime: 3000,
          confidence: 0.9
        },
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-02'),
          response: 'good',
          responseTime: 2800,
          confidence: 0.85
        }
      ];

      const poorRecords: StudyRecord[] = [
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-01'),
          response: 'again',
          responseTime: 3000,
          confidence: 0.3
        },
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-02'),
          response: 'again',
          responseTime: 2800,
          confidence: 0.2
        }
      ];

      const goodLoad = algorithm.calculateCognitiveLoad(goodRecords);
      const poorLoad = algorithm.calculateCognitiveLoad(poorRecords);
      
      expect(poorLoad.extraneous).toBeGreaterThan(goodLoad.extraneous);
    });
  });

  describe('predictOptimalDifficulty', () => {
    it('应该基于个人档案预测最优难度', () => {
      const profile = algorithm.analyzeLearningProfile('user-1', mockRecords, mockSessions);
      
      const optimalDifficulty = algorithm.predictOptimalDifficulty(
        profile,
        'vocabulary',
        0.8 // 当前表现
      );
      
      expect(optimalDifficulty).toBeGreaterThan(0);
      expect(optimalDifficulty).toBeLessThan(1);
    });

    it('应该根据项目类型调整难度', () => {
      const profile = algorithm.analyzeLearningProfile('user-1', mockRecords, mockSessions);
      
      const vocabDifficulty = algorithm.predictOptimalDifficulty(profile, 'vocabulary', 0.75);
      const procedureDifficulty = algorithm.predictOptimalDifficulty(profile, 'procedure', 0.75);
      
      // 程序性知识通常更难
      expect(procedureDifficulty).toBeGreaterThan(vocabDifficulty);
    });

    it('应该根据当前表现调整难度', () => {
      const profile = algorithm.analyzeLearningProfile('user-1', mockRecords, mockSessions);
      
      const highPerformanceDifficulty = algorithm.predictOptimalDifficulty(profile, 'vocabulary', 0.9);
      const lowPerformanceDifficulty = algorithm.predictOptimalDifficulty(profile, 'vocabulary', 0.5);
      
      expect(highPerformanceDifficulty).toBeGreaterThan(lowPerformanceDifficulty);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空记录', () => {
      const profile = algorithm.analyzeLearningProfile('user-1', [], []);
      const load = algorithm.calculateCognitiveLoad([]);
      
      expect(profile).toBeDefined();
      expect(load.total).toBeGreaterThan(0);
    });

    it('应该处理极端认知容量', () => {
      const lowCapacityProfile = {
        userId: 'user-1',
        cognitiveCapacity: 0.1,
        learningSpeed: 0.5,
        retentionRate: 0.6,
        preferredDifficulty: 0.3,
        adaptationRate: 0.5,
        lastUpdated: new Date()
      };

      const adjustment = algorithm.adjustDifficulty(mockItem, mockRecords, lowCapacityProfile);
      
      expect(adjustment.adjustedDifficulty).toBeGreaterThanOrEqual(0);
      expect(adjustment.adjustedDifficulty).toBeLessThanOrEqual(1);
    });

    it('应该处理极端响应时间', () => {
      const extremeRecords: StudyRecord[] = [
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-01'),
          response: 'good',
          responseTime: 100, // 极快
          confidence: 0.9
        },
        {
          itemId: 'test-item-1',
          timestamp: new Date('2024-01-02'),
          response: 'good',
          responseTime: 60000, // 极慢
          confidence: 0.5
        }
      ];

      const load = algorithm.calculateCognitiveLoad(extremeRecords);
      
      expect(load.total).toBeGreaterThanOrEqual(0);
      expect(load.total).toBeLessThanOrEqual(1);
    });
  });
});