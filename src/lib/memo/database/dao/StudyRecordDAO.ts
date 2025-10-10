/**
 * 学习记录DAO类
 * 处理学习记录的数据库操作，包括性能统计、学习分析等
 */

import { BaseDAO } from './BaseDAO';
import type { 
  StudyRecordDB, 
  DatabaseResult, 
  QueryOptions,
  StudyStatistics
} from '../types';

export class StudyRecordDAO extends BaseDAO<StudyRecordDB> {
  constructor() {
    super('study_records');
  }

  /**
   * 根据用户ID查找学习记录
   */
  async findByUserId(userId: string, options: QueryOptions = {}): Promise<DatabaseResult<StudyRecordDB[]>> {
    return this.findMany({
      ...options,
      where: {
        ...options.where,
        user_id: userId
      }
    });
  }

  /**
   * 根据学习项目ID查找记录
   */
  async findByItemId(itemId: string, options: QueryOptions = {}): Promise<DatabaseResult<StudyRecordDB[]>> {
    return this.findMany({
      ...options,
      where: {
        ...options.where,
        item_id: itemId
      }
    });
  }

  /**
   * 根据会话ID查找记录
   */
  async findBySessionId(sessionId: string, options: QueryOptions = {}): Promise<DatabaseResult<StudyRecordDB[]>> {
    return this.findMany({
      ...options,
      where: {
        ...options.where,
        session_id: sessionId
      }
    });
  }

  /**
   * 获取用户学习统计
   */
  async getStudyStatistics(userId: string, days: number = 30): Promise<DatabaseResult<StudyStatistics>> {
    try {
      // 基础统计
      const basicStatsSQL = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN response IN ('good', 'easy') THEN 1 END) as completed_items,
          AVG(CASE WHEN response IN ('good', 'easy') THEN 1.0 ELSE 0.0 END) as success_rate,
          AVG(response_time) as avg_response_time,
          SUM(response_time) / 1000.0 as total_study_time,
          COUNT(DISTINCT DATE(created_at)) as streak_days
        FROM ${this.tableName}
        WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')
      `;

      const basicResults = await this.db.query<any>(basicStatsSQL, [userId]);
      const basicStats = basicResults[0];

      // 难度分布统计
      const difficultyStatsSQL = `
        SELECT 
          CASE 
            WHEN difficulty_before <= 0.3 THEN 'easy'
            WHEN difficulty_before <= 0.7 THEN 'medium'
            ELSE 'hard'
          END as difficulty_level,
          COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')
          AND difficulty_before IS NOT NULL
        GROUP BY difficulty_level
      `;

      const difficultyResults = await this.db.query<{ difficulty_level: string; count: number }>(difficultyStatsSQL, [userId]);
      const itemsByDifficulty = difficultyResults.reduce((acc, row) => {
        acc[row.difficulty_level] = row.count;
        return acc;
      }, {} as Record<string, number>);

      // 性能趋势
      const trendSQL = `
        SELECT 
          DATE(created_at) as date,
          AVG(CASE WHEN response IN ('good', 'easy') THEN 1.0 ELSE 0.0 END) as success_rate,
          COUNT(*) as items_studied
        FROM ${this.tableName}
        WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const trendResults = await this.db.query<{ date: string; success_rate: number; items_studied: number }>(trendSQL, [userId]);

      const statistics: StudyStatistics = {
        totalItems: basicStats.total_items || 0,
        completedItems: basicStats.completed_items || 0,
        successRate: basicStats.success_rate || 0,
        averageResponseTime: basicStats.avg_response_time || 0,
        totalStudyTime: basicStats.total_study_time || 0,
        streakDays: basicStats.streak_days || 0,
        itemsByDifficulty,
        itemsByCategory: {}, // 需要关联学习项目表获取
        performanceTrend: trendResults.map(row => ({
          date: row.date,
          successRate: row.success_rate,
          itemsStudied: row.items_studied
        }))
      };

      return {
        success: true,
        data: statistics
      };
    } catch (error) {
      console.error('获取学习统计失败:', error);
      return {
        success: false,
        error: `获取学习统计失败: ${error}`
      };
    }
  }

  /**
   * 获取响应时间分析
   */
  async getResponseTimeAnalysis(userId: string, days: number = 30): Promise<DatabaseResult<{
    average: number;
    median: number;
    percentile95: number;
    byDifficulty: Record<string, number>;
  }>> {
    try {
      const sql = `
        SELECT 
          AVG(response_time) as average,
          response_time as median_calc,
          CASE 
            WHEN difficulty_before <= 0.3 THEN 'easy'
            WHEN difficulty_before <= 0.7 THEN 'medium'
            ELSE 'hard'
          END as difficulty_level,
          response_time
        FROM ${this.tableName}
        WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')
          AND response_time IS NOT NULL
        ORDER BY response_time
      `;

      const results = await this.db.query<any>(sql, [userId]);
      
      if (results.length === 0) {
        return {
          success: true,
          data: {
            average: 0,
            median: 0,
            percentile95: 0,
            byDifficulty: {}
          }
        };
      }

      const responseTimes = results.map(r => r.response_time).sort((a, b) => a - b);
      const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const median = responseTimes[Math.floor(responseTimes.length / 2)];
      const percentile95 = responseTimes[Math.floor(responseTimes.length * 0.95)];

      // 按难度分组
      const byDifficulty: Record<string, number> = {};
      const difficultyGroups = results.reduce((acc, row) => {
        const level = row.difficulty_level || 'unknown';
        if (!acc[level]) acc[level] = [];
        acc[level].push(row.response_time);
        return acc;
      }, {} as Record<string, number[]>);

      Object.entries(difficultyGroups).forEach(([level, times]) => {
        const timeArray = times as number[];
        byDifficulty[level] = timeArray.reduce((sum: number, time: number) => sum + time, 0) / timeArray.length;
      });

      return {
        success: true,
        data: {
          average,
          median,
          percentile95,
          byDifficulty
        }
      };
    } catch (error) {
      console.error('获取响应时间分析失败:', error);
      return {
        success: false,
        error: `获取响应时间分析失败: ${error}`
      };
    }
  }

  /**
   * 获取学习效果分析
   */
  async getLearningEffectiveness(userId: string, itemId?: string): Promise<DatabaseResult<{
    improvementRate: number;
    retentionRate: number;
    difficultyProgression: Array<{ date: string; difficulty: number }>;
    stabilityProgression: Array<{ date: string; stability: number }>;
  }>> {
    try {
      const whereClause = itemId ? 'user_id = ? AND item_id = ?' : 'user_id = ?';
      const params = itemId ? [userId, itemId] : [userId];

      // 改进率计算
      const improvementSQL = `
        SELECT 
          difficulty_before,
          difficulty_after,
          stability_before,
          stability_after,
          DATE(created_at) as date
        FROM ${this.tableName}
        WHERE ${whereClause}
          AND difficulty_before IS NOT NULL 
          AND difficulty_after IS NOT NULL
          AND stability_before IS NOT NULL
          AND stability_after IS NOT NULL
        ORDER BY created_at
      `;

      const results = await this.db.query<any>(improvementSQL, params);

      if (results.length === 0) {
        return {
          success: true,
          data: {
            improvementRate: 0,
            retentionRate: 0,
            difficultyProgression: [],
            stabilityProgression: []
          }
        };
      }

      // 计算改进率
      const improvements = results.filter(r => r.difficulty_after < r.difficulty_before);
      const improvementRate = improvements.length / results.length;

      // 计算保持率（稳定性增加的比例）
      const retentions = results.filter(r => r.stability_after > r.stability_before);
      const retentionRate = retentions.length / results.length;

      // 难度进展
      const difficultyProgression = results.map(r => ({
        date: r.date,
        difficulty: r.difficulty_after
      }));

      // 稳定性进展
      const stabilityProgression = results.map(r => ({
        date: r.date,
        stability: r.stability_after
      }));

      return {
        success: true,
        data: {
          improvementRate,
          retentionRate,
          difficultyProgression,
          stabilityProgression
        }
      };
    } catch (error) {
      console.error('获取学习效果分析失败:', error);
      return {
        success: false,
        error: `获取学习效果分析失败: ${error}`
      };
    }
  }

  /**
   * 获取检索策略效果统计
   */
  async getRetrievalStrategyStats(userId: string, days: number = 30): Promise<DatabaseResult<{
    strategyEffectiveness: Record<string, {
      count: number;
      successRate: number;
      averageResponseTime: number;
    }>;
    optimalStrategies: Array<{
      difficulty: string;
      recommendedStrategy: string;
      effectiveness: number;
    }>;
  }>> {
    try {
      const sql = `
        SELECT 
          retrieval_strategy,
          strategy_difficulty,
          response,
          response_time,
          CASE 
            WHEN difficulty_before <= 0.3 THEN 'easy'
            WHEN difficulty_before <= 0.7 THEN 'medium'
            ELSE 'hard'
          END as difficulty_level
        FROM ${this.tableName}
        WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')
          AND retrieval_strategy IS NOT NULL
      `;

      const results = await this.db.query<any>(sql, [userId]);

      // 策略效果统计
      const strategyStats: Record<string, {
        count: number;
        successCount: number;
        totalResponseTime: number;
      }> = {};

      results.forEach(record => {
        const strategy = record.retrieval_strategy;
        if (!strategyStats[strategy]) {
          strategyStats[strategy] = {
            count: 0,
            successCount: 0,
            totalResponseTime: 0
          };
        }

        strategyStats[strategy].count++;
        strategyStats[strategy].totalResponseTime += record.response_time || 0;
        
        if (record.response === 'good' || record.response === 'easy') {
          strategyStats[strategy].successCount++;
        }
      });

      const strategyEffectiveness: Record<string, {
        count: number;
        successRate: number;
        averageResponseTime: number;
      }> = {};

      Object.entries(strategyStats).forEach(([strategy, stats]) => {
        strategyEffectiveness[strategy] = {
          count: stats.count,
          successRate: stats.successCount / stats.count,
          averageResponseTime: stats.totalResponseTime / stats.count
        };
      });

      // 最优策略推荐
      const difficultyStrategyStats: Record<string, Record<string, { count: number; successRate: number }>> = {};
      
      results.forEach(record => {
        const difficulty = record.difficulty_level;
        const strategy = record.retrieval_strategy;
        
        if (!difficultyStrategyStats[difficulty]) {
          difficultyStrategyStats[difficulty] = {};
        }
        if (!difficultyStrategyStats[difficulty][strategy]) {
          difficultyStrategyStats[difficulty][strategy] = { count: 0, successRate: 0 };
        }
        
        difficultyStrategyStats[difficulty][strategy].count++;
        if (record.response === 'good' || record.response === 'easy') {
          difficultyStrategyStats[difficulty][strategy].successRate += 1;
        }
      });

      const optimalStrategies = Object.entries(difficultyStrategyStats).map(([difficulty, strategies]) => {
        let bestStrategy = '';
        let bestEffectiveness = 0;

        Object.entries(strategies).forEach(([strategy, stats]) => {
          const effectiveness = stats.successRate / stats.count;
          if (effectiveness > bestEffectiveness) {
            bestEffectiveness = effectiveness;
            bestStrategy = strategy;
          }
        });

        return {
          difficulty,
          recommendedStrategy: bestStrategy,
          effectiveness: bestEffectiveness
        };
      });

      return {
        success: true,
        data: {
          strategyEffectiveness,
          optimalStrategies
        }
      };
    } catch (error) {
      console.error('获取检索策略统计失败:', error);
      return {
        success: false,
        error: `获取检索策略统计失败: ${error}`
      };
    }
  }

  /**
   * 获取最近的学习记录
   */
  async getRecentRecords(userId: string, limit: number = 20): Promise<DatabaseResult<StudyRecordDB[]>> {
    return this.findMany({
      where: { user_id: userId },
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit
    });
  }

  /**
   * 获取错误记录（需要重新学习的项目）
   */
  async getErrorRecords(userId: string, days: number = 7): Promise<DatabaseResult<StudyRecordDB[]>> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE user_id = ? 
          AND response IN ('again', 'hard')
          AND created_at >= datetime('now', '-${days} days')
        ORDER BY created_at DESC
      `;

      const results = await this.db.query<StudyRecordDB>(sql, [userId]);
      
      return {
        success: true,
        data: results.map(record => this.transformRecord(record))
      };
    } catch (error) {
      console.error('获取错误记录失败:', error);
      return {
        success: false,
        error: `获取错误记录失败: ${error}`
      };
    }
  }

  /**
   * 删除旧记录（数据清理）
   */
  async cleanupOldRecords(days: number = 365): Promise<DatabaseResult<boolean>> {
    try {
      const sql = `
        DELETE FROM ${this.tableName}
        WHERE created_at < datetime('now', '-${days} days')
      `;

      const result = await this.db.execute(sql);
      
      return {
        success: true,
        data: true,
        rowsAffected: result.changes
      };
    } catch (error) {
      console.error('清理旧记录失败:', error);
      return {
        success: false,
        error: `清理旧记录失败: ${error}`
      };
    }
  }
}