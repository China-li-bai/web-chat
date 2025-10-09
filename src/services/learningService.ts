import { getDB } from './db';
import { MemoryLearningManager } from '@/lib/memo/MemoryLearningManager';
import type { LearningItem, StudyRecord, MemoryStrength } from '@/lib/memo/types';
import type { Row } from '@/packages/wa-sqlite-adapter/types';
import type { LearningSession } from '@/lib/memo/MemoryLearningManager';

interface WordWithProgress {
  id: number;
  word: string;
  type: string;
  phonetic: string | null;
  definition: string;
  example: string | null;
  createdAt: string;
  stability: number;
  retrievability: number;
  difficulty: number;
  nextReview: string;
  lastReview: string | null;
  state: string;
}

export async function createLearningSessionForWordbook(wordbookId: number, userId: string) {
  const db = await getDB();

  // 1. Fetch all words and their progress for the given wordbook that are due
  const now = new Date().toISOString();
  const wordsAndProgress = (await db.exec({
    sql: `
      SELECT
        w.id, w.word, w.type, w.phonetic, w.definition, w.example, w.createdAt,
        lp.stability, lp.retrievability, lp.difficulty, lp.nextReview, lp.lastReview, lp.state
      FROM words w
      JOIN learning_progress lp ON w.id = lp.wordId
      WHERE w.wordbookId = ? AND lp.nextReview <= ? AND w.userId = ?
    `,
    args: [wordbookId, now, userId],
  })) as WordWithProgress[];

  // 2. Map to the format expected by the MemoryLearningManager
  const learningItems: LearningItem[] = wordsAndProgress.map((row) => ({
    id: String(row.id),
    content: row.word,
    type: row.type,
    difficulty: row.difficulty,
    createdAt: new Date(row.createdAt),
    // Attach full data for UI use
    details: {
      phonetic: row.phonetic,
      definition: row.definition,
      example: row.example,
      stability: row.stability,
      retrievability: row.retrievability,
      state: row.state,
    }
  }));

  // 3. Fetch recent study history for these words to provide context to the algorithm
  const wordIds = learningItems.map(item => Number(item.id));
  let studyRecords: StudyRecord[] = [];
  if (wordIds.length > 0) {
    const placeholders = wordIds.map(() => '?').join(',');
    const logs = await db.exec({
      sql: `SELECT * FROM study_logs WHERE itemId IN (${placeholders}) ORDER BY timestamp DESC LIMIT 100`,
      args: wordIds,
    });

    studyRecords = logs.map((log: any) => ({
      itemId: String(log.itemId),
      timestamp: new Date(log.timestamp as string),
      response: log.response as 'again' | 'hard' | 'good' | 'easy',
      responseTime: log.responseTime as number,
      confidence: log.confidence as number,
    }));
  }

  // 4. Initialize the manager and create the session
  // TODO: User-specific parameters should be fetched from a user settings store
  const manager = new MemoryLearningManager({
    fsrsParams: { requestRetention: 0.9, maximumInterval: 36500 },
    adaptiveConfig: { minDifficulty: 0.1, maxDifficulty: 0.9, adaptationRate: 0.1 },
    retrievalConfig: { maxSessionDuration: 1800, targetCognitiveLoad: 0.7, interleaveTypes: true },
  });

  // We don't have a sessions table yet, so we pass an empty array
  const learningSession = await manager.createLearningSession(
    userId,
    learningItems,
    studyRecords,
    [] // mockSessions
  );

  // Reattach item details lost during scheduling
  const detailsById = new Map(learningItems.map(li => [li.id, (li as any).details]));
  (learningSession.items as any[]).forEach(si => {
    const itemId = si.item?.id;
    if (itemId && detailsById.has(itemId)) {
      si.item.details = detailsById.get(itemId);
    }
  });

  // Attach the manager instance to the session for later use
  (learningSession as any).userId = userId;
  (learningSession as any).manager = manager;

  return learningSession;
}

export async function processStudyResponse(
  session: LearningSession,
  itemId: string,
  response: 'again' | 'hard' | 'good' | 'easy',
  responseTime: number
) {
  // Ensure session has a valid startTime
  if (!session.startTime) {
    session.startTime = new Date();
  }
  
  const manager = (session as any).manager as MemoryLearningManager;
  if (!manager) {
    throw new Error('MemoryLearningManager instance not found in the session.');
  }

  // A simple mapping from response to confidence
  const confidenceMap = { again: 0.2, hard: 0.5, good: 0.8, easy: 0.95 };
  const confidence = confidenceMap[response];

  const wordId = Number(itemId);
  const db = await getDB();

  // Get current progress for logging
  const currentProgress = await db.exec({
    sql: 'SELECT stability, retrievability FROM learning_progress WHERE wordId = ? AND userId = ?',
    args: [wordId, (session as any).userId],
  });
  const previousStability = (currentProgress[0]?.stability as number) || 0;
  const previousRetrievability = (currentProgress[0]?.retrievability as number) || 1;

  const result = await manager.processStudyResponse(
    session,
    itemId,
    response,
    responseTime,
    confidence
  );

  const { newDueDate, newStability, newRetrievability, newDifficulty, newState } = result.updatedMemoryStrength;

  // Ensure we have valid values for required fields
  const stability = newStability ?? 0; // Default to 0 if null/undefined
  const retrievability = newRetrievability ?? 1; // Default to 1 if null/undefined
  const difficulty = newDifficulty ?? 0.5; // Default to 0.5 if null/undefined
  const state = newState ?? 'new'; // Default to 'new' if null/undefined

  // 1. Update the learning_progress table
  await db.exec({
    sql: `
      UPDATE learning_progress
      SET
        stability = ?,
        retrievability = ?,
        difficulty = ?,
        nextReview = ?,
        lastReview = ?,
        state = ?,
        reviewCount = reviewCount + 1
      WHERE wordId = ? AND userId = ?
    `,
    args: [stability, retrievability, difficulty, newDueDate ? newDueDate.toISOString() : new Date().toISOString(), new Date().toISOString(), state, wordId, (session as any).userId],
  });

  // 2. Insert a new record into study_logs
  await db.exec({
    sql: `
      INSERT INTO study_logs
      (itemId, userId, timestamp, response, responseTime, confidence, previousStability, previousRetrievability, newStability, newRetrievability)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [wordId, (session as any).userId, new Date().toISOString(), response, responseTime, confidence, previousStability || 0, previousRetrievability || 1, stability, retrievability],
  });

  // 3. Update long-term learning statistics
  const userIdForStats = (session as any).userId || 'user-1';
  await updateLearningStatistics(userIdForStats, wordId, response, responseTime, stability, retrievability);

  return result;
}

/**
 * 更新长期学习统计数据
 * 将单次学习记录累积到用户的长期学习统计中
 */
export async function updateLearningStatistics(
  userId: string,
  wordId: number,
  response: 'again' | 'hard' | 'good' | 'easy',
  responseTime: number,
  stability: number,
  retrievability: number
) {
  const db = await getDB();
  const now = new Date().toISOString();
  const today = now.split('T')[0]; // YYYY-MM-DD 格式

  
  try {
    // 1. 确保学习统计表存在
    await db.exec({
      sql: `
        CREATE TABLE IF NOT EXISTS learning_statistics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          date TEXT NOT NULL,
          totalReviews INTEGER DEFAULT 0,
          correctReviews INTEGER DEFAULT 0,
          totalResponseTime INTEGER DEFAULT 0,
          avgResponseTime REAL DEFAULT 0,
          avgStability REAL DEFAULT 0,
          avgRetrievability REAL DEFAULT 0,
          streakDays INTEGER DEFAULT 0,
          lastUpdated TEXT NOT NULL,
          UNIQUE(userId, date)
        )
      `
    });
    
    // 2. 检查今天的统计记录是否存在
    const existingStats = await db.exec({
      sql: 'SELECT * FROM learning_statistics WHERE userId = ? AND date = ?',
      args: [userId, today]
    });
    
    // 3. 计算正确回答（good 或 easy 视为正确）
    const isCorrect = response === 'good' || response === 'easy' ? 1 : 0;
    
    if (existingStats.length > 0) {
      // 更新现有记录
      const currentStats = existingStats[0] as any;
      const newTotalReviews = (currentStats.totalReviews as number) + 1;
      const newCorrectReviews = (currentStats.correctReviews as number) + isCorrect;
      const newTotalResponseTime = (currentStats.totalResponseTime as number) + responseTime;
      
      // 计算平均稳定性和可检索性（加权平均）
      const currentAvgStability = currentStats.avgStability as number;
      const currentAvgRetrievability = currentStats.avgRetrievability as number;
      const newAvgStability = (currentAvgStability * (newTotalReviews - 1) + stability) / newTotalReviews;
      const newAvgRetrievability = (currentAvgRetrievability * (newTotalReviews - 1) + retrievability) / newTotalReviews;
      
      const newAvgResponseTime = newTotalReviews > 0 ? (newTotalResponseTime * 1.0) / newTotalReviews : 0;
      await db.exec({
        sql: `
          UPDATE learning_statistics
          SET 
            totalReviews = ?,
            correctReviews = ?,
            totalResponseTime = ?,
            avgResponseTime = ?,
            avgStability = ?,
            avgRetrievability = ?,
            lastUpdated = ?
          WHERE userId = ? AND date = ?
        `,
        args: [
          newTotalReviews,
          newCorrectReviews,
          newTotalResponseTime,
          newAvgResponseTime,
          newAvgStability,
          newAvgRetrievability,
          now,
          userId,
          today
        ]
      });
    } else {
      // 创建新记录
      
      // 计算连续学习天数
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split('T')[0];
      
      const yesterdayStats = await db.exec({
        sql: 'SELECT streakDays FROM learning_statistics WHERE userId = ? AND date = ?',
        args: [userId, yesterday]
      });
      
      const streakDays = yesterdayStats.length > 0 ? (yesterdayStats[0].streakDays as number) + 1 : 1;
      
      const avgResponseTime = responseTime;
      await db.exec({
        sql: `
          INSERT INTO learning_statistics
          (userId, date, totalReviews, correctReviews, totalResponseTime, avgResponseTime, avgStability, avgRetrievability, streakDays, lastUpdated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [userId, today, 1, isCorrect, responseTime, avgResponseTime, stability, retrievability, streakDays, now]
      });
    }
    
    // 4. 更新单词类型的统计数据
    await updateWordTypeStatistics(userId, wordId, response, stability, retrievability);
    
  } catch (error) {
    console.error('更新学习统计数据失败:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 更新单词类型的学习统计
 * 按照单词类型（如词性、难度等）分类统计学习效果
 */
export async function updateWordTypeStatistics(
  userId: string,
  wordId: number,
  response: 'again' | 'hard' | 'good' | 'easy',
  stability: number,
  retrievability: number
) {
  const db = await getDB();
  const now = new Date().toISOString();

  
  try {
    // 1. 获取单词信息
    const wordInfo = await db.exec({
      sql: 'SELECT type FROM words WHERE id = ?',
      args: [wordId]
    });
    
    if (wordInfo.length === 0) return;
    
    const wordType = wordInfo[0].type as string;
    
    // 2. 确保单词类型统计表存在
    await db.exec({
      sql: `
        CREATE TABLE IF NOT EXISTS word_type_statistics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          date TEXT NOT NULL,
          wordType TEXT NOT NULL,
          totalReviews INTEGER DEFAULT 0,
          correctReviews INTEGER DEFAULT 0,
          avgStability REAL DEFAULT 0,
          avgRetrievability REAL DEFAULT 0,
          lastUpdated TEXT NOT NULL,
          UNIQUE(userId, date, wordType)
        )
      `
    });
    
    // 3. 检查该类型的统计记录是否存在
    const today = new Date().toISOString().split('T')[0];
    const existingStats = await db.exec({
      sql: 'SELECT * FROM word_type_statistics WHERE userId = ? AND date = ? AND wordType = ?',
      args: [userId, today, wordType]
    });
    
    // 4. 计算正确回答（good 或 easy 视为正确）
    const isCorrect = response === 'good' || response === 'easy' ? 1 : 0;
    
    if (existingStats.length > 0) {
      // 更新现有记录
      const currentStats = existingStats[0] as any;
      const newTotalReviews = (currentStats.totalReviews as number) + 1;
      const newCorrectReviews = (currentStats.correctReviews as number) + isCorrect;
      
      // 计算平均稳定性和可检索性（加权平均）
      const currentAvgStability = currentStats.avgStability as number;
      const currentAvgRetrievability = currentStats.avgRetrievability as number;
      const newAvgStability = (currentAvgStability * (newTotalReviews - 1) + stability) / newTotalReviews;
      const newAvgRetrievability = (currentAvgRetrievability * (newTotalReviews - 1) + retrievability) / newTotalReviews;
      
      await db.exec({
        sql: `
          UPDATE word_type_statistics
          SET 
            totalReviews = ?,
            correctReviews = ?,
            avgStability = ?,
            avgRetrievability = ?,
            lastUpdated = ?
          WHERE userId = ? AND date = ? AND wordType = ?
        `,
        args: [
          newTotalReviews,
          newCorrectReviews,
          newAvgStability,
          newAvgRetrievability,
          now,
          userId,
          today,
          wordType
        ]
      });
    } else {
      // 创建新记录
      await db.exec({
        sql: `
          INSERT INTO word_type_statistics
          (userId, date, wordType, totalReviews, correctReviews, avgStability, avgRetrievability, lastUpdated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [userId, today, wordType, 1, isCorrect, stability, retrievability, now]
      });
    }
  } catch (error) {
    console.error('更新单词类型统计数据失败:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 测试学习统计功能
 * 模拟用户学习过程并验证统计数据是否正确更新
 * 可以通过API端点调用此函数进行测试
 */
export async function testLearningStatistics() {
  try {
    const db = await getDB();
    const userId = 'test-user';
    const today = new Date().toISOString().split('T')[0];
    
    // 清理测试数据
    await db.exec({
      sql: 'DELETE FROM learning_statistics WHERE userId = ?',
      args: [userId]
    });
    
    // 模拟学习响应
    const mockResponses = [
      { response: 'good', responseTime: 2000, stability: 1.5, retrievability: 0.8 },
      { response: 'again', responseTime: 3000, stability: 0.5, retrievability: 0.4 },
      { response: 'easy', responseTime: 1500, stability: 2.5, retrievability: 0.9 }
    ];
    
    // 执行模拟学习
    for (const mock of mockResponses) {
      await updateLearningStatistics(
        userId,
        1, // 假设的wordId
        mock.response as 'again' | 'hard' | 'good' | 'easy',
        mock.responseTime,
        mock.stability,
        mock.retrievability
      );
    }
    
    // 验证结果
    const stats = await db.exec({
      sql: 'SELECT * FROM learning_statistics WHERE userId = ? AND date = ?',
      args: [userId, today]
    });
    
    console.log('Learning statistics test results:', stats);
    
    // 验证word_type_statistics
    const wordTypeStats = await db.exec({
      sql: 'SELECT * FROM word_type_statistics WHERE userId = ?',
      args: [userId]
    });
    
    console.log('Word type statistics test results:', wordTypeStats);
    
    return {
      success: stats.length > 0 && stats[0].totalReviews === 3 && stats[0].correctReviews === 2,
      learningStats: stats,
      wordTypeStats: wordTypeStats
    };
  } catch (error) {
    console.error('测试学习统计功能失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}