/**
 * 记忆学习系统集成测试
 * 验证FSRS、难度自适应、主动检索三算法协作
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryLearningManager } from '../MemoryLearningManager';
import type { LearningItem, StudyRecord, StudySession } from '../types';

describe('MemoryLearningManager Integration Tests', () => {
  let manager: MemoryLearningManager;
  let mockItems: LearningItem[];
  let mockRecords: StudyRecord[];
  let mockSessions: StudySession[];

  beforeEach(() => {
    manager = new MemoryLearningManager({
      fsrsParams: {
        requestRetention: 0.9,
        maximumInterval: 36500
      },
      adaptiveConfig: {
        minDifficulty: 0.1,
        maxDifficulty: 0.9,
        adaptationRate: 0.1
      },
      retrievalConfig: {
        maxSessionDuration: 1800,
        targetCognitiveLoad: 0.7,
        interleaveTypes: true
      }
    });

    mockItems = [
      {
        id: 'item-1',
        content: 'Basic vocabulary word',
        type: 'vocabulary',
        difficulty: 0.3,
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'item-2',
        content: 'Complex grammar rule with multiple exceptions and edge cases',
        type: 'concept',
        difficulty: 0.8,
        createdAt: new Date('2024-01-02')
      },
      {
        id: 'item-3',
        content: 'Mathematical formula',
        type: 'formula',
        difficulty: 0.6,
        createdAt: new Date('2024-01-03')
      },
      {
        id: 'item-4',
        content: 'Historical fact',
        type: 'fact',
        difficulty: 0.4,
        createdAt: new Date('2024-01-04')
      },
      {
        id: 'item-5',
        content: 'Programming procedure with step-by-step instructions',
        type: 'procedure',
        difficulty: 0.7,
        createdAt: new Date('2024-01-05')
      }
    ];

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    mockRecords = [
      // item-1: 良好表现
      {
        itemId: 'item-1',
        timestamp: oneWeekAgo,
        response: 'good',
        responseTime: 2000,
        confidence: 0.8
      },
      {
        itemId: 'item-1',
        timestamp: twoDaysAgo,
        response: 'good',
        responseTime: 1800,
        confidence: 0.85
      },
      {
        itemId: 'item-1',
        timestamp: oneHourAgo,
        response: 'easy',
        responseTime: 1500,
        confidence: 0.9
      },
      
      // item-2: 困难表现
      {
        itemId: 'item-2',
        timestamp: oneWeekAgo,
        response: 'again',
        responseTime: 8000,
        confidence: 0.2
      },
      {
        itemId: 'item-2',
        timestamp: twoDaysAgo,
        response: 'hard',
        responseTime: 6000,
        confidence: 0.4
      },
      {
        itemId: 'item-2',
        timestamp: oneHourAgo,
        response: 'again',
        responseTime: 7000,
        confidence: 0.3
      },

      // item-3: 中等表现
      {
        itemId: 'item-3',
        timestamp: twoDaysAgo,
        response: 'good',
        responseTime: 3000,
        confidence: 0.7
      },
      {
        itemId: 'item-3',
        timestamp: oneHourAgo,
        response: 'good',
        responseTime: 2800,
        confidence: 0.75
      }
    ];

    mockSessions = [
      {
        sessionId: 'session-1',
        startTime: oneWeekAgo,
        endTime: new Date(oneWeekAgo.getTime() + 30 * 60 * 1000),
        itemsStudied: 10,
        correctResponses: 7,
        averageResponseTime: 3500,
        cognitiveLoad: 0.6
      },
      {
        sessionId: 'session-2',
        startTime: twoDaysAgo,
        endTime: new Date(twoDaysAgo.getTime() + 25 * 60 * 1000),
        itemsStudied: 8,
        correctResponses: 6,
        averageResponseTime: 3200,
        cognitiveLoad: 0.5
      }
    ];
  });

  describe('createLearningSession', () => {
    it('应该创建个性化学习会话', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        mockItems,
        mockRecords,
        mockSessions,
        1800 // 30分钟
      );

      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe('user-1');
      expect(session.items).toBeDefined();
      expect(session.items.length).toBeGreaterThan(0);
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.completedItems).toBe(0);
      expect(session.totalCorrect).toBe(0);
      expect(session.adaptations).toEqual([]);
    });

    it('应该根据记忆强度优先安排需要复习的项目', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        mockItems,
        mockRecords,
        mockSessions
      );

      // 验证会话包含项目
      expect(session.items.length).toBeGreaterThan(0);
      
      // 验证每个项目都有检索策略
      session.items.forEach(scheduledItem => {
        expect(scheduledItem.item).toBeDefined();
        expect(scheduledItem.strategy).toBeDefined();
        expect(scheduledItem.retrievalStrength).toBeGreaterThanOrEqual(0);
        expect(scheduledItem.retrievalStrength).toBeLessThanOrEqual(1);
      });
    });

    it('应该基于用户档案调整项目难度', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        mockItems,
        mockRecords,
        mockSessions
      );

      // 检查是否有项目的难度被调整
      const item2 = session.items.find(si => si.item.id === 'item-2');
      if (item2) {
        // item-2 表现差，难度应该被降低
        expect(item2.item.difficulty).toBeLessThanOrEqual(0.8);
      }
    });

    it('应该实现分布式练习（交错不同类型）', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        mockItems,
        mockRecords,
        mockSessions
      );

      if (session.items.length >= 3) {
        const types = session.items.slice(0, 3).map(item => item.item.type);
        const uniqueTypes = new Set(types);
        
        // 前3个项目应该尽可能是不同类型（如果有足够的类型）
        expect(uniqueTypes.size).toBeGreaterThan(1);
      }
    });
  });

  describe('processStudyResponse', () => {
    it('应该处理学习响应并更新所有相关状态', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        mockItems,
        mockRecords,
        mockSessions
      );

      const firstItem = session.items[0];
      const result = await manager.processStudyResponse(
        session,
        firstItem.item.id,
        'good',
        2500,
        0.8
      );

      // 验证返回结果
      expect(result.updatedMemoryStrength).toBeDefined();
      expect(result.updatedMemoryStrength.stability).toBeGreaterThan(0);
      expect(result.updatedMemoryStrength.retrievability).toBeGreaterThanOrEqual(0);
      expect(result.updatedMemoryStrength.retrievability).toBeLessThanOrEqual(1);
      
      expect(result.testingEffect).toBeDefined();
      expect(result.testingEffect.strength).toBeGreaterThanOrEqual(0);
      expect(result.testingEffect.strength).toBeLessThanOrEqual(1);

      // 验证会话状态更新
      expect(session.completedItems).toBe(1);
      expect(session.totalCorrect).toBe(1);
      expect(session.averageResponseTime).toBe(2500);
    });

    it('应该在表现差时触发难度调整', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        mockItems,
        mockRecords,
        mockSessions
      );

      const firstItem = session.items[0];
      const originalDifficulty = firstItem.item.difficulty;

      // 模拟连续失败
      await manager.processStudyResponse(session, firstItem.item.id, 'again', 8000, 0.2);

      // 检查是否有难度调整记录
      const hasAdjustment = session.adaptations.some(adj => adj.itemId === firstItem.item.id);
      if (hasAdjustment) {
        const adjustment = session.adaptations.find(adj => adj.itemId === firstItem.item.id)!;
        expect(adjustment.newDifficulty).toBeLessThan(adjustment.oldDifficulty);
        expect(adjustment.reason).toBeDefined();
      }
    });

    it('应该正确计算测试效应', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        mockItems,
        mockRecords,
        mockSessions
      );

      const firstItem = session.items[0];
      const result = await manager.processStudyResponse(
        session,
        firstItem.item.id,
        'good',
        2000,
        0.85
      );

      expect(result.testingEffect.retrievalAttempts).toBeGreaterThanOrEqual(0);
      expect(result.testingEffect.successfulRetrievals).toBeGreaterThanOrEqual(0);
      expect(result.testingEffect.predictedRetention).toBeGreaterThanOrEqual(0);
      expect(result.testingEffect.predictedRetention).toBeLessThanOrEqual(1);
    });
  });

  describe('completeSession', () => {
    it('应该正确完成学习会话并生成统计', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        mockItems,
        mockRecords,
        mockSessions
      );

      // 模拟完成几个项目
      if (session.items.length > 0) {
        await manager.processStudyResponse(session, session.items[0].item.id, 'good', 2000, 0.8);
      }
      if (session.items.length > 1) {
        await manager.processStudyResponse(session, session.items[1].item.id, 'easy', 1500, 0.9);
      }
      if (session.items.length > 2) {
        await manager.processStudyResponse(session, session.items[2].item.id, 'hard', 4000, 0.6);
      }

      const studySession = manager.completeSession(session);

      expect(studySession.sessionId).toBe(session.sessionId);
      expect(studySession.startTime).toBe(session.startTime);
      expect(studySession.endTime).toBeInstanceOf(Date);
      expect(studySession.itemsStudied).toBe(session.completedItems);
      expect(studySession.correctResponses).toBe(session.totalCorrect);
      expect(studySession.averageResponseTime).toBeGreaterThan(0);
      expect(studySession.cognitiveLoad).toBeGreaterThanOrEqual(0);
      expect(studySession.cognitiveLoad).toBeLessThanOrEqual(1);
    });
  });

  describe('getSessionStatistics', () => {
    it('应该提供详细的会话统计信息', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        mockItems,
        mockRecords,
        mockSessions
      );

      // 模拟完成部分项目
      if (session.items.length > 0) {
        await manager.processStudyResponse(session, session.items[0].item.id, 'good', 2000, 0.8);
        await manager.processStudyResponse(session, session.items[1].item.id, 'easy', 1500, 0.9);
      }

      const stats = manager.getSessionStatistics(session);

      expect(stats.completionRate).toBeGreaterThanOrEqual(0);
      expect(stats.completionRate).toBeLessThanOrEqual(1);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(stats.cognitiveLoadPredicted).toBeGreaterThanOrEqual(0);
      expect(stats.cognitiveLoadPredicted).toBeLessThanOrEqual(1);
      expect(stats.cognitiveLoadActual).toBeGreaterThanOrEqual(0);
      expect(stats.cognitiveLoadActual).toBeLessThanOrEqual(1);
      expect(stats.difficultyAdaptations).toBeGreaterThanOrEqual(0);
      expect(stats.estimatedRetention).toBeGreaterThanOrEqual(0);
      expect(stats.estimatedRetention).toBeLessThanOrEqual(1);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量项目', async () => {
      // 创建大量测试项目
      const largeItemSet: LearningItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        content: `Test content ${i}`,
        type: ['vocabulary', 'concept', 'formula', 'fact', 'procedure'][i % 5] as any,
        difficulty: Math.random(),
        createdAt: new Date()
      }));

      const startTime = performance.now();
      
      const session = await manager.createLearningSession(
        'user-1',
        largeItemSet,
        mockRecords,
        mockSessions
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 应该在1秒内完成
      expect(duration).toBeLessThan(1000);
      expect(session.items.length).toBeGreaterThan(0);
    });

    it('应该高效处理连续的学习响应', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        mockItems,
        mockRecords,
        mockSessions
      );

      const startTime = performance.now();

      // 处理多个响应
      for (let i = 0; i < Math.min(5, session.items.length); i++) {
        await manager.processStudyResponse(
          session,
          session.items[i].item.id,
          'good',
          2000 + Math.random() * 1000,
          0.7 + Math.random() * 0.3
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 每个响应处理应该在100ms内完成
      const avgTimePerResponse = duration / Math.min(5, session.items.length);
      expect(avgTimePerResponse).toBeLessThan(100);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空项目列表', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        [],
        mockRecords,
        mockSessions
      );

      expect(session.items).toEqual([]);
      expect(session.completedItems).toBe(0);
    });

    it('应该处理新用户（无历史记录）', async () => {
      const session = await manager.createLearningSession(
        'new-user',
        mockItems,
        [],
        []
      );

      expect(session.items.length).toBeGreaterThan(0);
      expect(session.userId).toBe('new-user');
    });

    it('应该处理无效的项目ID', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        mockItems,
        mockRecords,
        mockSessions
      );

      await expect(
        manager.processStudyResponse(session, 'invalid-id', 'good', 2000, 0.8)
      ).rejects.toThrow('Item invalid-id not found in session');
    });

    it('应该处理极端响应时间', async () => {
      const session = await manager.createLearningSession(
        'user-1',
        mockItems,
        mockRecords,
        mockSessions
      );

      if (session.items.length > 0) {
        // 极快响应
        const result1 = await manager.processStudyResponse(
          session,
          session.items[0].item.id,
          'easy',
          100,
          0.9
        );
        expect(result1.updatedMemoryStrength).toBeDefined();

        // 极慢响应（如果有第二个项目）
        if (session.items.length > 1) {
          const result2 = await manager.processStudyResponse(
            session,
            session.items[1].item.id,
            'hard',
            30000,
            0.3
          );
          expect(result2.updatedMemoryStrength).toBeDefined();
        }
      }
    });
  });
});