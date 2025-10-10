/**
 * 学习项目DAO类
 * 处理学习项目的数据库操作，包括难度调整、记忆强度更新等
 */

import { BaseDAO } from './BaseDAO';
import type { 
  LearningItemRecord, 
  DatabaseResult, 
  QueryOptions,
  LearningProgress,
  AlgorithmMetrics
} from '../types';

export class LearningItemDAO extends BaseDAO<LearningItemRecord> {
  constructor() {
    super('learning_items');
  }

  /**
   * 根据用户ID查找学习项目
   */
  async findByUserId(userId: string, options: QueryOptions = {}): Promise<DatabaseResult<LearningItemRecord[]>> {
    return this.findMany({
      ...options,
      where: {
        ...options.where,
        user_id: userId
      }
    });
  }

  /**
   * 根据类型查找学习项目
   */
  async findByContentType(contentType: string, options: QueryOptions = {}): Promise<DatabaseResult<LearningItemRecord[]>> {
    return this.findMany({
      ...options,
      where: {
        ...options.where,
        content_type: contentType
      }
    });
  }

  /**
   * 查找需要复习的项目
   */
  async findDueForReview(userId: string, currentTime: Date = new Date()): Promise<DatabaseResult<LearningItemRecord[]>> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = ? 
        AND due_date <= ?
        AND is_active = 1
      ORDER BY due_date ASC
    `;
    
    try {
      const results = await this.db.query<LearningItemRecord>(sql, [
        userId, 
        currentTime.toISOString()
      ]);
      
      return {
        success: true,
        data: results.map(record => this.transformRecord(record))
      };
    } catch (error) {
      console.error('查找待复习项目失败:', error);
      return {
        success: false,
        error: `查找待复习项目失败: ${error}`
      };
    }
  }

  /**
   * 更新FSRS相关字段
   */
  async updateFSRSData(
    itemId: string, 
    fsrsData: {
      stability: number;
      difficulty: number;
      due_date: Date;
      reps: number;
      lapses: number;
      state: 0 | 1 | 2 | 3;
      elapsed_days: number;
      scheduled_days: number;
    }
  ): Promise<DatabaseResult<LearningItemRecord>> {
    const updateData = {
      stability: fsrsData.stability,
      difficulty_fsrs: fsrsData.difficulty,
      due_date: fsrsData.due_date,
      reps: fsrsData.reps,
      lapses: fsrsData.lapses,
      state: fsrsData.state,
      elapsed_days: fsrsData.elapsed_days,
      scheduled_days: fsrsData.scheduled_days,
      last_review: new Date()
    };

    return this.update(itemId, updateData);
  }

  /**
   * 更新复习时间
   */
  async updateDueDate(itemId: string, dueDate: Date): Promise<DatabaseResult<LearningItemRecord>> {
    return this.update(itemId, {
      due_date: dueDate
    });
  }

  /**
   * 批量更新复习时间
   */
  async batchUpdateDueDates(updates: Array<{ id: string; dueDate: Date }>): Promise<DatabaseResult<LearningItemRecord[]>> {
    const updateData = updates.map(({ id, dueDate }) => ({
      id,
      data: { due_date: dueDate }
    }));

    return this.updateMany(updateData);
  }

  /**
   * 获取学习进度统计
   */
  async getLearningProgress(userId: string): Promise<DatabaseResult<LearningProgress>> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN state = 0 THEN 1 END) as new_items,
          COUNT(CASE WHEN state = 1 THEN 1 END) as learning_items,
          COUNT(CASE WHEN state = 2 THEN 1 END) as review_items,
          COUNT(CASE WHEN state = 3 THEN 1 END) as relearning_items,
          COUNT(CASE WHEN due_date <= datetime('now') THEN 1 END) as due_today,
          COUNT(CASE WHEN due_date < datetime('now', '-1 day') THEN 1 END) as overdue,
          AVG(difficulty) as avg_difficulty,
          AVG(stability) as avg_stability,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_items
        FROM ${this.tableName}
        WHERE user_id = ?
      `;

      const results = await this.db.query<any>(sql, [userId]);
      const stats = results[0];

      const progress: LearningProgress = {
        userId,
        totalItems: stats.total_items || 0,
        newItems: stats.new_items || 0,
        learningItems: stats.learning_items || 0,
        reviewItems: stats.review_items || 0,
        masteredItems: stats.review_items || 0, // 简化处理
        dueToday: stats.due_today || 0,
        overdue: stats.overdue || 0,
        estimatedStudyTime: (stats.due_today || 0) * 30 // 假设每项30秒
      };

      return {
        success: true,
        data: progress
      };
    } catch (error) {
      console.error('获取学习进度失败:', error);
      return {
        success: false,
        error: `获取学习进度失败: ${error}`
      };
    }
  }

  /**
   * 获取难度分布统计
   */
  async getDifficultyDistribution(userId: string): Promise<DatabaseResult<{ difficulty: number; count: number }[]>> {
    try {
      const sql = `
        SELECT 
          ROUND(difficulty, 1) as difficulty,
          COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = ? AND is_active = 1
        GROUP BY ROUND(difficulty, 1)
        ORDER BY difficulty
      `;

      const results = await this.db.query<{ difficulty: number; count: number }>(sql, [userId]);
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('获取难度分布失败:', error);
      return {
        success: false,
        error: `获取难度分布失败: ${error}`
      };
    }
  }

  /**
   * 获取算法指标
   */
  async getAlgorithmMetrics(userId: string): Promise<DatabaseResult<AlgorithmMetrics>> {
    try {
      // 获取FSRS指标
      const fsrsSQL = `
        SELECT 
          AVG(stability) as avg_stability,
          COUNT(*) as total_items,
          AVG(CASE WHEN state = 2 THEN 1.0 ELSE 0.0 END) as retention_rate
        FROM ${this.tableName}
        WHERE user_id = ? AND is_active = 1
      `;

      const fsrsResults = await this.db.query<any>(fsrsSQL, [userId]);
      const fsrsStats = fsrsResults[0];

      const metrics: AlgorithmMetrics = {
        fsrs: {
          averageRetention: fsrsStats.retention_rate || 0,
          intervalAccuracy: 0.85, // 默认值，需要更复杂的计算
          stabilityTrend: fsrsStats.avg_stability || 0
        },
        difficultyAdaptive: {
          adaptationFrequency: 0.2, // 默认值
          adaptationAccuracy: 0.8, // 默认值
          userSatisfaction: 0.75 // 默认值
        },
        activeRetrieval: {
          testingEffectStrength: 0.7, // 默认值
          strategyEffectiveness: {
            'recognition': 0.8,
            'free_recall': 0.9,
            'cued_recall': 0.85,
            'elaborative_retrieval': 0.95
          },
          optimalCognitiveLoad: 0.7 // 默认值
        }
      };

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      console.error('获取算法指标失败:', error);
      return {
        success: false,
        error: `获取算法指标失败: ${error}`
      };
    }
  }

  /**
   * 搜索学习项目
   */
  async search(userId: string, query: string, options: QueryOptions = {}): Promise<DatabaseResult<LearningItemRecord[]>> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE user_id = ? 
          AND (
            content LIKE ? OR 
            category LIKE ? OR 
            tags LIKE ?
          )
          AND is_active = 1
        ORDER BY 
          CASE 
            WHEN content LIKE ? THEN 1
            WHEN category LIKE ? THEN 2
            ELSE 3
          END,
          updated_at DESC
        ${options.limit ? `LIMIT ${options.limit}` : ''}
      `;

      const searchPattern = `%${query}%`;

      const results = await this.db.query<LearningItemRecord>(sql, [
        userId,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      ]);

      return {
        success: true,
        data: results.map(record => this.transformRecord(record))
      };
    } catch (error) {
      console.error('搜索学习项目失败:', error);
      return {
        success: false,
        error: `搜索失败: ${error}`
      };
    }
  }

  /**
   * 激活/停用学习项目
   */
  async toggleActive(itemId: string, isActive: boolean): Promise<DatabaseResult<LearningItemRecord>> {
    return this.update(itemId, {
      is_active: isActive
    });
  }

  /**
   * 批量激活/停用
   */
  async batchToggleActive(itemIds: string[], isActive: boolean): Promise<DatabaseResult<LearningItemRecord[]>> {
    const updates = itemIds.map(id => ({
      id,
      data: { is_active: isActive }
    }));

    return this.updateMany(updates);
  }

  /**
   * 获取最近学习的项目
   */
  async getRecentlyStudied(userId: string, limit: number = 10): Promise<DatabaseResult<LearningItemRecord[]>> {
    return this.findMany({
      where: {
        user_id: userId,
        is_active: true
      },
      orderBy: 'last_review',
      orderDirection: 'DESC',
      limit
    });
  }

  /**
   * 获取最难的项目
   */
  async getMostDifficult(userId: string, limit: number = 10): Promise<DatabaseResult<LearningItemRecord[]>> {
    return this.findMany({
      where: {
        user_id: userId,
        is_active: true
      },
      orderBy: 'difficulty',
      orderDirection: 'DESC',
      limit
    });
  }

  /**
   * 获取最容易的项目
   */
  async getEasiest(userId: string, limit: number = 10): Promise<DatabaseResult<LearningItemRecord[]>> {
    return this.findMany({
      where: {
        user_id: userId,
        is_active: true
      },
      orderBy: 'difficulty',
      orderDirection: 'ASC',
      limit
    });
  }
}