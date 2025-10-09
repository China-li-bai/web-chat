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

export async function getOverallStats(userId: string = 'user-1'): Promise<OverallStats> {
  const db = await getDB();

  // 获取用户相关的单词总数
  const totalWordsResult = await db.exec({ 
    sql: 'SELECT COUNT(*) as count FROM "words" WHERE "userId" = ?',
    args: [userId]
  });
  const totalWords = (totalWordsResult[0]?.count as number) || 0;

  // 获取用户已掌握的单词数
  const masteredWordsResult = await db.exec({
    sql: `SELECT COUNT(*) as count FROM "learning_progress" WHERE "state" = 'review' AND "userId" = ?`,
    args: [userId]
  });
  const masteredWords = (masteredWordsResult[0]?.count as number) || 0;

  // 获取用户学习天数
  const learningDaysResult = await db.exec({
    sql: `SELECT COUNT(DISTINCT date("timestamp")) as count FROM "study_logs" WHERE "userId" = ?`,
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

export async function getHeatmapData(): Promise<HeatmapData[]> {
  const db = await getDB();
  const rows = await db.exec({
    sql: `
      SELECT
        date("timestamp") as date,
        COUNT(*) as count
      FROM "study_logs"
      WHERE "timestamp" >= date('now', '-1 year')
      GROUP BY date
      ORDER BY date ASC
    `,
  });
  return rows as HeatmapData[];
}

export async function getProficiencyStats(): Promise<ProficiencyData[]> {
  const db = await getDB();
  const rows = await db.exec({
    sql: `
      SELECT
        "state",
        COUNT(*) as count
      FROM "learning_progress"
      GROUP BY "state"
    `,
  });
  return rows as ProficiencyData[];
}

/**
 * 获取长期学习统计数据
 * @param userId 用户ID
 * @param days 获取最近多少天的数据，默认为30天
 * @returns 长期学习统计数据
 */
export async function getLearningStatistics(userId: string = 'user-1', days: number = 30): Promise<LearningStatistics[]> {
  const db = await getDB();
  
  // 确保learning_statistics表存在
  await db.exec({
    sql: `CREATE TABLE IF NOT EXISTS learning_statistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      totalReviews INTEGER NOT NULL DEFAULT 0,
      correctReviews INTEGER NOT NULL DEFAULT 0,
      totalResponseTime REAL NOT NULL DEFAULT 0,
      avgResponseTime REAL NOT NULL DEFAULT 0,
      avgStability REAL NOT NULL DEFAULT 0,
      avgRetrievability REAL NOT NULL DEFAULT 0,
      streakDays INTEGER NOT NULL DEFAULT 0,
      UNIQUE(userId, date)
    )`
  });
  
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
  
  return result.map((row: Row) => ({
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
export async function getWordTypeStatistics(userId: string = 'user-1', days: number = 30): Promise<WordTypeStatistics[]> {
  const db = await getDB();
  
  // 确保word_type_statistics表存在
  await db.exec({
    sql: `CREATE TABLE IF NOT EXISTS word_type_statistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      wordType TEXT NOT NULL,
      totalReviews INTEGER NOT NULL DEFAULT 0,
      correctReviews INTEGER NOT NULL DEFAULT 0,
      avgStability REAL NOT NULL DEFAULT 0,
      avgRetrievability REAL NOT NULL DEFAULT 0,
      UNIQUE(userId, date, wordType)
    )`
  });
  
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
  
  return result.map((row: Row) => ({
    wordType: row.wordType as string,
    totalReviews: row.totalReviews as number,
    correctReviews: row.correctReviews as number,
    correctRate: row.correctRate as number,
    avgStability: row.avgStability as number,
    avgRetrievability: row.avgRetrievability as number
  }));
}