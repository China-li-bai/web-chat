import { getDB } from './db';
import type { Row } from '@/packages/wa-sqlite-adapter/types';

export interface OverallStats {
  totalWords: number;
  masteredWords: number;
  learningDays: number;
}

export interface HeatmapData {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ProficiencyData {
  state: 'new' | 'learning' | 'review' | 'relearning';
  count: number;
}

export async function getOverallStats(): Promise<OverallStats> {
  const db = await getDB();

  const totalWordsResult = await db.exec({ sql: 'SELECT COUNT(*) as count FROM "words"' });
  const totalWords = (totalWordsResult[0]?.count as number) || 0;

  const masteredWordsResult = await db.exec({
    sql: `SELECT COUNT(*) as count FROM "learning_progress" WHERE "state" = 'review'`,
  });
  const masteredWords = (masteredWordsResult[0]?.count as number) || 0;

  const learningDaysResult = await db.exec({
    sql: `SELECT COUNT(DISTINCT date("timestamp")) as count FROM "study_logs"`,
  });
  const learningDays = (learningDaysResult[0]?.count as number) || 0;

  return { totalWords, masteredWords, learningDays };
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