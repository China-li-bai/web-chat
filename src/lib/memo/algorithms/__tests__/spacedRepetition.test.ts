/**
 * 间隔重复算法测试（FSRS单栈）
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FSRSAlgorithm, SpacedRepetitionFactory } from '../spacedRepetition';
import type { LearningItem, StudyRecord, StrategyConfig } from '../../types';

describe('FSRS-only SpacedRepetition', () => {
  let mockItem: LearningItem;
  let mockRecords: StudyRecord[];

  beforeEach(() => {
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
      }
    ];
  });

  describe('FSRSAlgorithm', () => {
    let algorithm: FSRSAlgorithm;

    beforeEach(() => {
      algorithm = new FSRSAlgorithm();
    });

    it('应该为新项目计算初始复习计划', () => {
      const strength = algorithm.calculateNextReview(mockItem, [], 'good');
      expect(strength).toBeDefined();
      expect(strength.stability).toBeGreaterThan(0);
      expect(strength.difficulty).toBeGreaterThanOrEqual(0);
      expect(strength.difficulty).toBeLessThanOrEqual(1);
      expect(strength.retrievability).toBeGreaterThan(0);
    });

    it('应该基于历史记录计算复习计划', () => {
      const strength = algorithm.calculateNextReview(mockItem, mockRecords, 'good');
      expect(strength.reviewCount).toBe(mockRecords.length);
      expect(strength.nextReview).toBeInstanceOf(Date);
      expect(strength.nextReview.getTime()).toBeGreaterThan(Date.now());
    });

    it('应该使用FSRS遗忘曲线计算保持率', () => {
      const strength = algorithm.calculateNextReview(mockItem, mockRecords, 'good');
      const immediateRetention = algorithm.estimateRetention(strength, 0);
      const dayLaterRetention = algorithm.estimateRetention(strength, 24 * 60 * 60 * 1000);
      expect(immediateRetention).toBeGreaterThan(dayLaterRetention);
      expect(dayLaterRetention).toBeGreaterThan(0);
    });

    it('应该处理错误情况并返回默认值', () => {
      const strength = algorithm.calculateNextReview(mockItem, [], 'good');
      expect(strength).toBeDefined();
      expect(strength.stability).toBeGreaterThan(0);
    });
  });

  describe('SpacedRepetitionFactory', () => {
    it('应该创建FSRS算法', () => {
      const config: StrategyConfig = {
        algorithm: 'fsrs',
        parameters: {},
        adaptiveMode: true,
        maxReviewsPerDay: 50,
        targetRetention: 0.9
      };
      const algorithm = SpacedRepetitionFactory.createAlgorithm(config);
      expect(algorithm).toBeInstanceOf(FSRSAlgorithm);
    });

    it('应该为不同用户级别提供推荐配置', () => {
      const beginnerConfig = SpacedRepetitionFactory.getRecommendedConfig('beginner');
      const intermediateConfig = SpacedRepetitionFactory.getRecommendedConfig('intermediate');
      const advancedConfig = SpacedRepetitionFactory.getRecommendedConfig('advanced');

      expect(beginnerConfig.algorithm).toBe('fsrs');
      expect(beginnerConfig.maxReviewsPerDay).toBe(20);
      expect(beginnerConfig.targetRetention).toBe(0.85);

      expect(intermediateConfig.algorithm).toBe('fsrs');
      expect(intermediateConfig.maxReviewsPerDay).toBe(50);

      expect(advancedConfig.algorithm).toBe('fsrs');
      expect(advancedConfig.maxReviewsPerDay).toBe(100);
      expect(advancedConfig.targetRetention).toBe(0.95);
    });

    it('应该抛出自定义算法未实现错误', () => {
      const config: StrategyConfig = {
        algorithm: 'custom',
        parameters: {},
        adaptiveMode: true,
        maxReviewsPerDay: 50,
        targetRetention: 0.9
      };
      expect(() => SpacedRepetitionFactory.createAlgorithm(config)).toThrow('Custom algorithm not implemented yet');
    });
  });
});