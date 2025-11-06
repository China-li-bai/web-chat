import { databaseService } from './database';
import sampleData from '../data/sample-learning-data.json';
/**
 * Initializes the database with sample data if it's empty.
 */
export async function initializeDatabase(userId: string): Promise<void> {
  const db = await databaseService.getConnection();
  
  try {
    // Check if we need to seed data
    const existingData = await db.exec({
      sql: 'SELECT COUNT(*) as count FROM wordbooks'
    });
    const existingCount = Number((existingData && existingData[0] && (existingData[0] as any).count) ?? 0);
    
    if (existingCount === 0) {
      // Insert sample data
      await insertSampleData(db, userId);
      console.log('Sample data initialized successfully');
    } else {
      console.log('Database already contains data, skipping initialization');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Inserts sample data into the database.
 */
async function insertSampleData(db: any, userId: string): Promise<void> {
  // Insert wordbooks first
  await db.exec({
    sql: `INSERT INTO wordbooks (name, description) VALUES (?, ?)`,
    args: ['CET-4 Core Vocabulary', 'Essential vocabulary for CET-4 exam']
  });
  const wbRow = await db.exec({ sql: 'SELECT last_insert_rowid() as id' });
  const wbId = wbRow[0].id as number;

  // Insert words and their initial progress from the 'words' array in sample data
  for (const wordData of (sampleData as any).words) {
    if (!wordData.word || !wordData.definition) {
      console.warn('Skipping word with missing content:', wordData);
      continue;
    }
    // 幂等插入：忽略重复并查询已有ID
    await db.exec({
      sql: `INSERT OR IGNORE INTO words (wordbookId, userId, word, type, phonetic, definition, example)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [wbId, userId, wordData.word, 'vocabulary', wordData.phonetic || null, wordData.definition, wordData.example || null]
    });
    const existing = await db.exec({
      sql: 'SELECT id FROM words WHERE wordbookId = ? AND word = ?',
      args: [wbId, wordData.word]
    });
    const newWordId = Number(existing?.[0]?.id);

    // Find corresponding progress data, if it exists
    const progress = sampleData.learningProgress.find(p => Number(p.itemId) === newWordId);
    
    // 幂等插入学习进度（wordId 唯一）
    await db.exec({
      sql: `INSERT OR IGNORE INTO learning_progress (wordId, userId, nextReview, state, stability, difficulty, retrievability, reviewCount, lapseCount) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newWordId,
        userId,
        progress?.nextReview ?? new Date().toISOString(),
        progress?.state ?? 'new',
        progress?.stability ?? 0,
        progress?.difficulty ?? 0.3,
        progress?.retrievability ?? 1,
        progress?.reviewCount ?? 0,
        (progress as any)?.lapseCount ?? 0
      ]
    });
  }

  // Insert study logs
  for (const log of sampleData.studyLogs) {
    const itemId = Number(log.itemId);
    if (isNaN(itemId) || itemId === 0) {
      console.warn('Skipping study_logs record with invalid or missing itemId:', log);
      continue;
    }
    await db.exec({
      sql: `INSERT INTO study_logs 
        (itemId, userId, timestamp, response, responseTime, confidence, previousStability, previousRetrievability, newStability, newRetrievability)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        itemId,
        userId,
        log.timestamp,
        log.response,
        log.responseTime,
        (log as any).confidence,
        (log as any).previousStability,
        (log as any).previousRetrievability,
        (log as any).newStability,
        (log as any).newRetrievability
      ]
    });
  }

  // Insert learning statistics
  for (const stat of sampleData.learningStatistics) {
    await db.exec({
      sql: `INSERT OR REPLACE INTO learning_statistics 
        (userId, date, totalReviews, correctReviews, totalResponseTime, avgResponseTime, avgStability, avgRetrievability, streakDays)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        userId, // Use the passed userId
        stat.date,
        stat.totalReviews,
        stat.correctReviews,
        stat.totalResponseTime,
        stat.avgResponseTime,
        stat.avgStability,
        stat.avgRetrievability,
        stat.streakDays
      ]
    });
  }

  // Insert word type statistics
  for (const wordTypeStat of sampleData.wordTypeStatistics) {
    await db.exec({
      sql: `INSERT OR REPLACE INTO word_type_statistics 
        (userId, date, wordType, totalReviews, correctReviews, avgStability, avgRetrievability)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        userId,
        (wordTypeStat as any).date || new Date().toISOString().split('T')[0],
        wordTypeStat.wordType,
        wordTypeStat.totalReviews,
        wordTypeStat.correctReviews,
        wordTypeStat.avgStability,
        wordTypeStat.avgRetrievability
      ]
    });
  }
}

/**
 * Checks if the database has been initialized with data.
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    const db = await databaseService.getConnection();
    const result = await db.exec({
      sql: 'SELECT COUNT(*) as count FROM wordbooks'
    });
    const count = Number((result && result[0] && (result[0] as any).count) ?? 0);
    return count > 0;
  } catch (error) {
    console.error('Error checking database initialization:', error);
    return false;
  }
}