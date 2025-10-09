import { getDB } from './db';
import type { Row } from '@/packages/wa-sqlite-adapter/types';

export interface OverallStats {
  totalWords: number;
  masteredWords: number;
  learningDays: number;
  streakDays: number;
  totalReviews: number;
  correctRate: number;
}

export interface HeatmapData {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ProficiencyData {
  state: 'new' | 'learning' | 'review' | 'relearning';
  count: number;
}

export interface LearningStatistics {
  date: string;
  totalReviews: number;
  correctReviews: number;
  correctRate: number;
  avgResponseTime: number;
  avgStability: number;
  avgRetrievability: number;
  streakDays: number;
}

export interface WordTypeStatistics {
  wordType: string;
  totalReviews: number;
  correctReviews: number;
  correctRate: number;
  avgStability: number;
  avgRetrievability: number;
}

export async function getOverallStats(userId: string): Promise<OverallStats> {
  const db = await getDB();

  // 获取用户相关的单词总数
  const totalWordsResult = await db.exec({
    sql: 'SELECT COUNT(id) as count FROM words WHERE userId = ?',
    args: [userId]
  });
  const totalWords = (totalWordsResult[0]?.count as number) || 0;

  // 获取用户已掌握的单词数
  const masteredWordsResult = await db.exec({
    sql: `SELECT COUNT(id) as count FROM learning_progress WHERE "state" = 'review' AND userId = ?`,
    args: [userId]
  });
  const masteredWords = (masteredWordsResult[0]?.count as number) || 0;

  // 获取用户学习天数
  const learningDaysResult = await db.exec({
    sql: `SELECT COUNT(DISTINCT date) as count FROM learning_statistics WHERE userId = ?`,
    args: [userId]
  });
  const learningDays = (learningDaysResult[0]?.count as number) || 0;
  
  // 获取当前连续学习天数
  const streakDaysResult = await db.exec({
    sql: `SELECT MAX(streakDays) as streakDays FROM learning_statistics WHERE userId = ?`,
    args: [userId]
  });
  const streakDays = (streakDaysResult[0]?.streakDays as number) || 0;
  
  // 获取总复习次数和正确率
  const reviewsResult = await db.exec({
    sql: `SELECT SUM(totalReviews) as totalReviews, SUM(correctReviews) as correctReviews FROM learning_statistics WHERE userId = ?`,
    args: [userId]
  });
  
  const totalReviews = (reviewsResult[0]?.totalReviews as number) || 0;
  const correctReviews = (reviewsResult[0]?.correctReviews as number) || 0;
  const correctRate = totalReviews > 0 ? correctReviews / totalReviews : 0;

  return { 
    totalWords, 
    masteredWords, 
    learningDays,
    streakDays,
    totalReviews,
    correctRate
  };
}

export async function getHeatmapData(userId: string): Promise<HeatmapData[]> {
  const db = await getDB();
  const rows = await db.exec({
    sql: `
      SELECT
        date,
        SUM(totalReviews) as count
      FROM "learning_statistics"
      WHERE date >= date('now', '-1 year') AND userId = ?
      GROUP BY date
      ORDER BY date ASC
    `,
    args: [userId],
  });
  
  // 正确映射Row到HeatmapData
  return rows.map((row: any) => ({
    date: row.date as string,
    count: row.count as number
  })) as HeatmapData[];
}

export async function getProficiencyStats(userId: string): Promise<ProficiencyData[]> {
  const db = await getDB();
  const rows = await db.exec({
    sql: `
      SELECT
        "state",
        COUNT(*) as count
      FROM "learning_progress"
      WHERE userId = ?
      GROUP BY "state"
    `,
    args: [userId],
  });
  
  // 正确映射Row到ProficiencyData
  return rows.map((row: any) => ({
    state: row.state as 'new' | 'learning' | 'review' | 'relearning',
    count: row.count as number
  })) as ProficiencyData[];
}

/**
 * 获取长期学习统计数据
 * @param userId 用户ID
 * @param days 获取最近多少天的数据，默认为30天
 * @returns 长期学习统计数据
 */
export async function getLearningStatistics(userId: string, days: number = 30): Promise<LearningStatistics[]> {
  const db = await getDB();
  
  // 获取最近N天的学习统计数据
  const result = await db.exec({
    sql: `SELECT 
      date, 
      totalReviews, 
      correctReviews, 
      (correctReviews * 1.0 / totalReviews) as correctRate, 
      avgResponseTime, 
      avgStability, 
      avgRetrievability, 
      streakDays 
    FROM learning_statistics 
    WHERE userId = ? AND date >= date('now', '-' || ? || ' days') 
    ORDER BY date DESC`,
    args: [userId, days]
  });
  
  return result.map((row: any) => ({
    date: row.date as string,
    totalReviews: row.totalReviews as number,
    correctReviews: row.correctReviews as number,
    correctRate: row.correctRate as number,
    avgResponseTime: row.avgResponseTime as number,
    avgStability: row.avgStability as number,
    avgRetrievability: row.avgRetrievability as number,
    streakDays: row.streakDays as number
  }));
}

/**
 * 获取单词类型统计数据
 * @param userId 用户ID
 * @param days 获取最近多少天的数据，默认为30天
 * @returns 单词类型统计数据
 */
export async function getWordTypeStatistics(userId: string, days: number = 30): Promise<WordTypeStatistics[]> {
  const db = await getDB();
  
  // 获取最近N天的单词类型统计数据
  const result = await db.exec({
    sql: `SELECT 
      wordType, 
      SUM(totalReviews) as totalReviews, 
      SUM(correctReviews) as correctReviews, 
      (SUM(correctReviews) * 1.0 / SUM(totalReviews)) as correctRate, 
      AVG(avgStability) as avgStability, 
      AVG(avgRetrievability) as avgRetrievability 
    FROM word_type_statistics 
    WHERE userId = ? AND date >= date('now', '-' || ? || ' days') 
    GROUP BY wordType 
    ORDER BY totalReviews DESC`,
    args: [userId, days]
  });
  
  return result.map((row: any) => ({
    wordType: row.wordType as string,
    totalReviews: row.totalReviews as number,
    correctReviews: row.correctReviews as number,
    correctRate: row.correctRate as number,
    avgStability: row.avgStability as number,
    avgRetrievability: row.avgRetrievability as number
  }));
}