/**
 * 学习会话DAO类
 * 处理学习会话的数据库操作，包括会话管理、统计分析等
 */

import { BaseDAO } from './BaseDAO';
import type { 
  StudySessionRecord, 
  DatabaseResult, 
  QueryOptions
} from '../types';

// 会话统计接口
interface SessionStatistics {
  totalSessions: number;
  completedSessions: number;
  averageItemsPerSession: number;
  averageCompletedPerSession: number;
  averageCorrectPerSession: number;
  averageResponseTime: number;
  totalStudyTime: number;
  averageSessionDuration: number;
  dailyStats: Array<{
    date: string;
    sessionsCount: number;
    totalItems: number;
    completedItems: number;
    correctAnswers: number;
    averageResponseTime: number;
    studyTime: number;
  }>;
  sessionsByType: Record<string, {
    count: number;
    averageItems: number;
    averageCompleted: number;
    averageCorrect: number;
  }>;
}

export class StudySessionDAO extends BaseDAO<StudySessionRecord> {
  constructor() {
    super('study_sessions');
  }

  /**
   * 根据用户ID查找会话
   */
  async findByUserId(userId: string, options: QueryOptions = {}): Promise<DatabaseResult<StudySessionRecord[]>> {
    return this.findMany({
      ...options,
      where: {
        ...options.where,
        user_id: userId
      }
    });
  }

  /**
   * 获取活跃会话
   */
  async getActiveSessions(userId: string): Promise<DatabaseResult<StudySessionRecord[]>> {
    return this.findMany({
      where: {
        user_id: userId,
        status: 'active'
      },
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
  }

  /**
   * 获取最近的会话
   */
  async getRecentSessions(userId: string, limit: number = 10): Promise<DatabaseResult<StudySessionRecord[]>> {
    return this.findMany({
      where: { user_id: userId },
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit
    });
  }

  /**
   * 结束会话
   */
  async endSession(sessionId: string, endTime?: Date): Promise<DatabaseResult<StudySessionRecord>> {
    const now = endTime || new Date();
    
    return this.update(sessionId, {
      end_time: now,
      is_completed: true,
      updated_at: now
    });
  }

  /**
   * 更新会话统计
   */
  async updateSessionStats(
    sessionId: string, 
    stats: {
      totalItems?: number;
      completedItems?: number;
      correctAnswers?: number;
      averageResponseTime?: number;
      totalStudyTime?: number;
    }
  ): Promise<DatabaseResult<StudySessionRecord>> {
    const updateData: Partial<StudySessionRecord> = {
      updated_at: new Date()
    };

    if (stats.totalItems !== undefined) {
      updateData.total_items = stats.totalItems;
    }
    if (stats.completedItems !== undefined) {
      updateData.completed_items = stats.completedItems;
    }
    if (stats.correctAnswers !== undefined) {
      updateData.correct_items = stats.correctAnswers;
    }
    if (stats.averageResponseTime !== undefined) {
      updateData.average_response_time = stats.averageResponseTime;
    }
    if (stats.totalStudyTime !== undefined) {
      updateData.actual_duration = stats.totalStudyTime;
    }

    return this.update(sessionId, updateData);
  }

  /**
   * 获取会话统计信息
   */
  async getSessionStatistics(userId: string, days: number = 30): Promise<DatabaseResult<SessionStatistics>> {
    try {
      // 基础会话统计
      const basicStatsSQL = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
          AVG(total_items) as avg_items_per_session,
          AVG(completed_items) as avg_completed_per_session,
          AVG(correct_answers) as avg_correct_per_session,
          AVG(average_response_time) as avg_response_time,
          SUM(total_study_time) / 1000.0 as total_study_time,
          AVG(total_study_time) / 1000.0 as avg_session_duration
        FROM ${this.tableName}
        WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')
      `;

      const basicResults = await this.db.query<any>(basicStatsSQL, [userId]);
      const basicStats = basicResults[0];

      // 每日会话统计
      const dailyStatsSQL = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as sessions_count,
          SUM(total_items) as total_items,
          SUM(completed_items) as completed_items,
          SUM(correct_answers) as correct_answers,
          AVG(average_response_time) as avg_response_time,
          SUM(total_study_time) / 1000.0 as study_time
        FROM ${this.tableName}
        WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const dailyResults = await this.db.query<any>(dailyStatsSQL, [userId]);

      // 会话类型统计
      const typeStatsSQL = `
        SELECT 
          session_type,
          COUNT(*) as count,
          AVG(total_items) as avg_items,
          AVG(completed_items) as avg_completed,
          AVG(correct_answers) as avg_correct
        FROM ${this.tableName}
        WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')
          AND session_type IS NOT NULL
        GROUP BY session_type
      `;

      const typeResults = await this.db.query<any>(typeStatsSQL, [userId]);

      const statistics: SessionStatistics = {
        totalSessions: basicStats.total_sessions || 0,
        completedSessions: basicStats.completed_sessions || 0,
        averageItemsPerSession: basicStats.avg_items_per_session || 0,
        averageCompletedPerSession: basicStats.avg_completed_per_session || 0,
        averageCorrectPerSession: basicStats.avg_correct_per_session || 0,
        averageResponseTime: basicStats.avg_response_time || 0,
        totalStudyTime: basicStats.total_study_time || 0,
        averageSessionDuration: basicStats.avg_session_duration || 0,
        dailyStats: dailyResults.map(row => ({
          date: row.date,
          sessionsCount: row.sessions_count,
          totalItems: row.total_items || 0,
          completedItems: row.completed_items || 0,
          correctAnswers: row.correct_answers || 0,
          averageResponseTime: row.avg_response_time || 0,
          studyTime: row.study_time || 0
        })),
        sessionsByType: typeResults.reduce((acc, row) => {
          acc[row.session_type] = {
            count: row.count,
            averageItems: row.avg_items || 0,
            averageCompleted: row.avg_completed || 0,
            averageCorrect: row.avg_correct || 0
          };
          return acc;
        }, {} as Record<string, any>)
      };

      return {
        success: true,
        data: statistics
      };
    } catch (error) {
      console.error('获取会话统计失败:', error);
      return {
        success: false,
        error: `获取会话统计失败: ${error}`
      };
    }
  }

  /**
   * 获取学习模式效果分析
   */
  async getLearningModeAnalysis(userId: string, days: number = 30): Promise<DatabaseResult<{
    modeEffectiveness: Record<string, {
      sessionsCount: number;
      averageAccuracy: number;
      averageCompletionRate: number;
      averageStudyTime: number;
    }>;
    recommendedMode: string;
  }>> {
    try {
      const sql = `
        SELECT 
          session_type,
          COUNT(*) as sessions_count,
          AVG(CASE WHEN total_items > 0 THEN CAST(correct_answers AS REAL) / total_items ELSE 0 END) as avg_accuracy,
          AVG(CASE WHEN total_items > 0 THEN CAST(completed_items AS REAL) / total_items ELSE 0 END) as avg_completion_rate,
          AVG(total_study_time) / 1000.0 as avg_study_time
        FROM ${this.tableName}
        WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')
          AND session_type IS NOT NULL
          AND status = 'completed'
        GROUP BY session_type
      `;

      const results = await this.db.query<any>(sql, [userId]);

      const modeEffectiveness: Record<string, {
        sessionsCount: number;
        averageAccuracy: number;
        averageCompletionRate: number;
        averageStudyTime: number;
      }> = {};

      let bestMode = '';
      let bestScore = 0;

      results.forEach(row => {
        const effectiveness = {
          sessionsCount: row.sessions_count,
          averageAccuracy: row.avg_accuracy || 0,
          averageCompletionRate: row.avg_completion_rate || 0,
          averageStudyTime: row.avg_study_time || 0
        };

        modeEffectiveness[row.session_type] = effectiveness;

        // 计算综合评分（准确率 * 0.5 + 完成率 * 0.3 + 效率 * 0.2）
        const efficiencyScore = effectiveness.averageStudyTime > 0 ? 
          Math.min(1, 300 / effectiveness.averageStudyTime) : 0; // 5分钟内完成得满分
        
        const compositeScore = 
          effectiveness.averageAccuracy * 0.5 + 
          effectiveness.averageCompletionRate * 0.3 + 
          efficiencyScore * 0.2;

        if (compositeScore > bestScore) {
          bestScore = compositeScore;
          bestMode = row.session_type;
        }
      });

      return {
        success: true,
        data: {
          modeEffectiveness,
          recommendedMode: bestMode
        }
      };
    } catch (error) {
      console.error('获取学习模式分析失败:', error);
      return {
        success: false,
        error: `获取学习模式分析失败: ${error}`
      };
    }
  }

  /**
   * 获取学习时间分布
   */
  async getStudyTimeDistribution(userId: string, days: number = 30): Promise<DatabaseResult<{
    hourlyDistribution: Record<number, number>;
    weeklyDistribution: Record<string, number>;
    optimalStudyTimes: Array<{ hour: number; effectiveness: number }>;
  }>> {
    try {
      // 按小时统计
      const hourlySQL = `
        SELECT 
          CAST(strftime('%H', created_at) AS INTEGER) as hour,
          COUNT(*) as sessions_count,
          AVG(CASE WHEN total_items > 0 THEN CAST(correct_answers AS REAL) / total_items ELSE 0 END) as avg_accuracy
        FROM ${this.tableName}
        WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')
          AND status = 'completed'
        GROUP BY hour
        ORDER BY hour
      `;

      const hourlyResults = await this.db.query<any>(hourlySQL, [userId]);

      // 按星期统计
      const weeklySQL = `
        SELECT 
          CASE CAST(strftime('%w', created_at) AS INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as day_of_week,
          COUNT(*) as sessions_count
        FROM ${this.tableName}
        WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')
          AND status = 'completed'
        GROUP BY strftime('%w', created_at)
      `;

      const weeklyResults = await this.db.query<any>(weeklySQL, [userId]);

      const hourlyDistribution: Record<number, number> = {};
      const optimalStudyTimes: Array<{ hour: number; effectiveness: number }> = [];

      hourlyResults.forEach(row => {
        hourlyDistribution[row.hour] = row.sessions_count;
        optimalStudyTimes.push({
          hour: row.hour,
          effectiveness: row.avg_accuracy || 0
        });
      });

      // 按效果排序
      optimalStudyTimes.sort((a, b) => b.effectiveness - a.effectiveness);

      const weeklyDistribution: Record<string, number> = {};
      weeklyResults.forEach(row => {
        weeklyDistribution[row.day_of_week] = row.sessions_count;
      });

      return {
        success: true,
        data: {
          hourlyDistribution,
          weeklyDistribution,
          optimalStudyTimes
        }
      };
    } catch (error) {
      console.error('获取学习时间分布失败:', error);
      return {
        success: false,
        error: `获取学习时间分布失败: ${error}`
      };
    }
  }

  /**
   * 清理旧会话
   */
  async cleanupOldSessions(days: number = 90): Promise<DatabaseResult<boolean>> {
    try {
      const sql = `
        DELETE FROM ${this.tableName}
        WHERE created_at < datetime('now', '-${days} days')
          AND status = 'completed'
      `;

      const result = await this.db.execute(sql);
      
      return {
        success: true,
        data: true,
        rowsAffected: result.changes
      };
    } catch (error) {
      console.error('清理旧会话失败:', error);
      return {
        success: false,
        error: `清理旧会话失败: ${error}`
      };
    }
  }
}