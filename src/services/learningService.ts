import { getDB } from './db';
import { MemoryLearningManager } from '@/lib/memo/MemoryLearningManager';
import type { LearningItem, LearningItemType, StudyRecord, MemoryStrength } from '@/lib/memo/types';
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
  })) as any[];

  // 2. Map to the format expected by the MemoryLearningManager
  const learningItems: LearningItem[] = wordsAndProgress.map((row: any) => ({
    id: String(row.id),
    content: row.word,
    type: row.type as LearningItemType,
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
  } as any));

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
  responseTime: number,
  userId: string
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
    args: [wordId, userId],
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

  const ms = result.updatedMemoryStrength as any;

  // 使用 FSRS 返回的标准字段
  const nextReview: Date | undefined = ms?.nextReview;
  const stability = ms?.stability ?? 0; // Default to 0 if null/undefined
  const retrievability = ms?.retrievability ?? 1; // Default to 1 if null/undefined
  const difficulty = ms?.difficulty ?? 0.5; // Default to 0.5 if null/undefined
  const state = ms?.state ?? 'new'; // 如果没有状态，保持原有默认

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
    args: [stability, retrievability, difficulty, nextReview ? nextReview.toISOString() : new Date().toISOString(), new Date().toISOString(), state, wordId, userId],
  });

  // 2. Insert a new record into study_logs
  await db.exec({
    sql: `
      INSERT INTO study_logs
      (itemId, userId, timestamp, response, responseTime, confidence, previousStability, previousRetrievability, newStability, newRetrievability)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [wordId, userId, new Date().toISOString(), response, responseTime, confidence, previousStability || 0, previousRetrievability || 1, stability, retrievability],
  });
  // 3. Update long-term learning statistics
  await updateLearningStatistics(userId, wordId, response, responseTime, stability, retrievability);

  return result;
}

/**
 * Updates long-term learning statistics by accumulating a single study record.
 * Aligns with the database schema defined in `db.ts`.
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
  const today = now.split('T')[0];

  try {
    const isCorrect = response === 'good' || response === 'easy';
    const correctReviewsInc = isCorrect ? 1 : 0;

    const existingStats = await db.exec({
      sql: 'SELECT * FROM learning_statistics WHERE userId = ? AND date = ?',
      args: [userId, today],
    });

    if (existingStats.length > 0) {
      const currentStats = existingStats[0] as any;
      const newTotalReviews = (currentStats.totalReviews as number) + 1;
      
      // Weighted averages
      const newAvgResponseTime = ((currentStats.avgResponseTime * currentStats.totalReviews) + responseTime) / newTotalReviews;
      const newAvgStability = ((currentStats.avgStability * currentStats.totalReviews) + stability) / newTotalReviews;
      const newAvgRetrievability = ((currentStats.avgRetrievability * currentStats.totalReviews) + retrievability) / newTotalReviews;

      await db.exec({
        sql: `
          UPDATE learning_statistics
          SET 
            totalReviews = totalReviews + 1,
            correctReviews = correctReviews + ?,
            avgResponseTime = ?,
            avgStability = ?,
            avgRetrievability = ?,
            lastUpdated = ?
          WHERE userId = ? AND date = ?
        `,
        args: [correctReviewsInc, newAvgResponseTime, newAvgStability, newAvgRetrievability, now, userId, today],
      });
    } else {
      // TODO: Streak calculation needs to check yesterday's record
      await db.exec({
        sql: `
          INSERT INTO learning_statistics
          (userId, date, totalReviews, correctReviews, avgResponseTime, avgStability, avgRetrievability, streakDays, lastUpdated)
          VALUES (?, ?, 1, ?, ?, ?, ?, 1, ?)
        `,
        args: [userId, today, correctReviewsInc, responseTime, stability, retrievability, now],
      });
    }

    // Also update the word type statistics
    await updateWordTypeStatistics(userId, wordId, response, stability, retrievability);

  } catch (error: any) {
    console.error('Failed to update learning statistics:', error);
  }
}

/**
 * Updates learning statistics for a specific word type.
 * Aligns with the database schema defined in `db.ts`.
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
  const today = now.split('T')[0];

  try {
    const wordInfo = await db.exec({
      sql: 'SELECT type FROM words WHERE id = ?',
      args: [wordId],
    });

    if (wordInfo.length === 0) return;
    const wordType = wordInfo[0].type as string;

    const existingStats = await db.exec({
      sql: 'SELECT * FROM word_type_statistics WHERE userId = ? AND date = ? AND wordType = ?',
      args: [userId, today, wordType],
    });

    const isCorrect = response === 'good' || response === 'easy';
    const correctReviewsInc = isCorrect ? 1 : 0;

    if (existingStats.length > 0) {
      const currentStats = existingStats[0] as any;
      const newTotalReviews = (currentStats.totalReviews as number) + 1;

      const newAvgStability = ((currentStats.avgStability * currentStats.totalReviews) + stability) / newTotalReviews;
      const newAvgRetrievability = ((currentStats.avgRetrievability * currentStats.totalReviews) + retrievability) / newTotalReviews;

      await db.exec({
        sql: `
          UPDATE word_type_statistics
          SET 
            totalReviews = totalReviews + 1,
            correctReviews = correctReviews + ?,
            avgStability = ?,
            avgRetrievability = ?,
            lastUpdated = ?
          WHERE userId = ? AND date = ? AND wordType = ?
        `,
        args: [correctReviewsInc, newAvgStability, newAvgRetrievability, now, userId, today, wordType],
      });
    } else {
      await db.exec({
        sql: `
          INSERT INTO word_type_statistics
          (userId, date, wordType, totalReviews, correctReviews, avgStability, avgRetrievability, lastUpdated)
          VALUES (?, ?, ?, 1, ?, ?, ?, ?)
        `,
        args: [userId, today, wordType, correctReviewsInc, stability, retrievability, now],
      });
    }
  } catch (error: any) {
    console.error('Failed to update word type statistics:', error);
  }
}

/**
 * 安排下次复习：根据 planned 列表更新各词条的 nextReview
 * planned.itemId 为字符串形式的词ID；nextReview 为 Date
 */
export async function schedulePlannedReviews(params: {
  userId: string;
  wordbookId: number;
  planned: Array<{ itemId: string; category: 'mastered' | 'shaky' | 'forgotten'; nextReview: Date }>;
}): Promise<{ updated: number }> {
  const db = await getDB();
  const { userId, planned } = params;
  let updated = 0;

  for (const p of planned) {
    const wordId = Number(p.itemId);
    if (!wordId || !isFinite(wordId)) {
      continue;
    }
    try {
      await db.exec({
        sql: `
          UPDATE learning_progress
          SET nextReview = ?
          WHERE wordId = ? AND userId = ?
        `,
        args: [p.nextReview.toISOString(), wordId, userId],
      });
      updated++;
    } catch (e: any) {
      console.error('schedulePlannedReviews failed for wordId:', wordId, e?.message || e);
    }
  }

  return { updated };
}

// 按词书分组统计到期/即将到期（基于 FSRS 的 nextReview）
export async function getReviewQueueGroupedByWordbook(params: {
  userId: string;
  timeWindowHours?: number; // 0=仅到期；24=含24小时内
  page?: number;
  pageSize?: number;
}) {
  const db = await getDB();
  const userId = params.userId;
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize || 10));
  const offset = (page - 1) * pageSize;

  const now = new Date();
  const timeWindowHours = typeof params.timeWindowHours === 'number' ? params.timeWindowHours : 0;
  const upper = new Date(now.getTime() + timeWindowHours * 3600 * 1000);

  // 1) 基础分组统计（严格按 nextReview 窗口）
  const rows = await db.exec({
    sql: `
      SELECT 
        w.wordbookId AS wordbookId,
        COUNT(*) AS totalPlanned,
        SUM(CASE WHEN lp.nextReview <= ? THEN 1 ELSE 0 END) AS dueCount,
        SUM(CASE WHEN lp.nextReview > ? AND lp.nextReview <= ? THEN 1 ELSE 0 END) AS upcomingCount
      FROM words w
      JOIN learning_progress lp ON w.id = lp.wordId
      WHERE w.userId = ?
      GROUP BY w.wordbookId
      ORDER BY dueCount DESC, upcomingCount DESC
      LIMIT ? OFFSET ?
    `,
    args: [now.toISOString(), now.toISOString(), upper.toISOString(), userId, pageSize, offset],
  });

  // 2) 统计总组数（用于分页）
  const totalGroupsRows = await db.exec({
    sql: `
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT w.wordbookId
        FROM words w
        JOIN learning_progress lp ON w.id = lp.wordId
        WHERE w.userId = ?
        GROUP BY w.wordbookId
      ) t
    `,
    args: [userId],
  });
  const total = (totalGroupsRows[0]?.cnt as number) || 0;

  // 3) 词书名映射（若有 wordbooks 表，则补充名称；失败则忽略）
  const idList = rows.map((r: any) => Number(r.wordbookId)).filter((n: number) => Number.isFinite(n));
  const nameMap = new Map<number, string>();
  if (idList.length > 0) {
    try {
      const placeholders = idList.map(() => '?').join(',');
      const nameRows = await db.exec({
        sql: `
          SELECT id, name 
          FROM wordbooks 
          WHERE userId = ? AND id IN (${placeholders})
        `,
        args: [userId, ...idList],
      });
      (nameRows || []).forEach((nr: any) => {
        if (nr && typeof nr.id !== 'undefined') {
          nameMap.set(Number(nr.id), String(nr.name || ''));
        }
      });
    } catch (e: any) {
      console.error('Optional wordbookName mapping failed (ok to ignore):', e?.message || e);
    }
  }

  return {
    items: rows.map((r: any) => {
      const wid = Number(r.wordbookId);
      return {
        wordbookId: wid,
        wordbookName: nameMap.get(wid) || '',
        dueCount: Number(r.dueCount || 0),
        upcomingCount: Number(r.upcomingCount || 0),
        totalPlanned: Number(r.totalPlanned || 0),
        topSamples: [] as Array<{ id: string; word: string; retrievability?: number }>,
      };
    }),
    page,
    pageSize,
    total,
  };
}

// 获取某词书到期（或含24h内）候选集合，支持首字母筛选与分页
export async function getDueItems(params: {
  userId: string;
  wordbookId: number;
  includeUpcoming?: boolean; // false=仅到期；true=含24h内
  startsWith?: string; // 'A'-'Z' 或 '#'
  page?: number;
  pageSize?: number;
}) {
  const db = await getDB();
  const userId = params.userId;
  const wordbookId = params.wordbookId;
  const includeUpcoming = !!params.includeUpcoming;
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(200, params.pageSize || 50));
  const offset = (page - 1) * pageSize;

  const now = new Date();
  const upper = new Date(now.getTime() + 24 * 3600 * 1000);
  const letter = (params.startsWith || '').trim().toLowerCase();

  // 先按到期窗口过滤；首字母过滤尽量在 SQL 中做（A-Z），'#' 在内存中过滤
  const timePredicate = includeUpcoming
    ? 'lp.nextReview <= ?'
    : 'lp.nextReview <= ?';

  const timeArgs = includeUpcoming
    ? [upper.toISOString()]
    : [now.toISOString()];

  // 如果是 A-Z 之一，使用 LIKE；否则先不加首字母谓词
  const isAZ = letter.length === 1 && letter >= 'a' && letter <= 'z';
  const letterPredicate = isAZ ? 'AND (w.word LIKE ? OR w.word LIKE ?)' : '';
  const letterArgs = isAZ ? [`${letter}%`, `${letter.toUpperCase()}%`] : [];

  const baseSql = `
    FROM words w
    JOIN learning_progress lp ON w.id = lp.wordId
    WHERE w.userId = ? AND w.wordbookId = ? AND ${timePredicate}
    ${letterPredicate}
  `;

  const listRows = await db.exec({
    sql: `
      SELECT 
        w.id, w.word, lp.nextReview, lp.retrievability
      ${baseSql}
      ORDER BY lp.nextReview ASC
      LIMIT ? OFFSET ?
    `,
    args: [userId, wordbookId, ...timeArgs, ...letterArgs, pageSize, offset],
  });

  // 统计总数
  const countRows = await db.exec({
    sql: `
      SELECT COUNT(*) AS cnt
      ${baseSql}
    `,
    args: [userId, wordbookId, ...timeArgs, ...letterArgs],
  });
  let items = listRows.map((r: any) => ({
    id: String(r.id),
    word: r.word as string,
    nextReview: r.nextReview as string,
    retrievability: typeof r.retrievability === 'number' ? r.retrievability : undefined,
  }));

  // 若选择了 '#'，在内存中过滤“非字母开头”
  if (letter === '#') {
    items = items.filter(it => !/^[A-Za-z]/.test(it.word || ''));
  }

  return {
    items,
    page,
    pageSize,
    total: (countRows[0]?.cnt as number) || 0,
  };
}

// 扩展版：支持 includeUpcoming 与 startsWith，仅筛选候选集合，算法与写回保持一致
export async function createLearningSessionForWordbookExtended(params: {
  userId: string;
  wordbookId: number;
  includeUpcoming?: boolean; // false=仅到期；true=含24h内
  startsWith?: string; // 'A'-'Z' 或 '#'
}) {
  const db = await getDB();
  const { userId, wordbookId } = params;
  const includeUpcoming = !!params.includeUpcoming;
  const letter = (params.startsWith || '').trim().toLowerCase();

  const now = new Date();
  const upper = new Date(now.getTime() + 24 * 3600 * 1000);

  // 时间窗口：仅到期或含24h内
  const timePredicate = includeUpcoming ? 'lp.nextReview <= ?' : 'lp.nextReview <= ?';
  const timeArgs = includeUpcoming ? [upper.toISOString()] : [now.toISOString()];

  // 首字母过滤（A-Z 走 SQL LIKE；'#' 与其他情况后续在内存中过滤）
  const isAZ = letter.length === 1 && letter >= 'a' && letter <= 'z';
  const letterPredicate = isAZ ? 'AND (w.word LIKE ? OR w.word LIKE ?)' : '';
  const letterArgs = isAZ ? [`${letter}%`, `${letter.toUpperCase()}%`] : [];

  const rows = await db.exec({
    sql: `
      SELECT
        w.id, w.word, w.type, w.phonetic, w.definition, w.example, w.createdAt,
        lp.stability, lp.retrievability, lp.difficulty, lp.nextReview, lp.lastReview, lp.state
      FROM words w
      JOIN learning_progress lp ON w.id = lp.wordId
      WHERE w.userId = ? AND w.wordbookId = ? AND ${timePredicate}
      ${letterPredicate}
      ORDER BY lp.nextReview ASC
    `,
    args: [userId, wordbookId, ...timeArgs, ...letterArgs],
  });

  // 内存中过滤“非字母开头”
  const filteredRows = letter === '#'
    ? rows.filter((r: any) => !/^[A-Za-z]/.test((r.word || '') as string))
    : rows;

  // 构建 LearningItem
  const learningItems: LearningItem[] = filteredRows.map((row: any) => ({
    id: String(row.id),
    content: row.word,
    type: row.type as LearningItemType,
    difficulty: row.difficulty,
    createdAt: new Date(row.createdAt),
    details: {
      phonetic: row.phonetic,
      definition: row.definition,
      example: row.example,
      stability: row.stability,
      retrievability: row.retrievability,
      state: row.state,
    }
  } as any));

  // 拉取最近学习日志
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

  // 初始化并创建会话（与原函数一致）
  const manager = new MemoryLearningManager({
    fsrsParams: { requestRetention: 0.9, maximumInterval: 36500 },
    adaptiveConfig: { minDifficulty: 0.1, maxDifficulty: 0.9, adaptationRate: 0.1 },
    retrievalConfig: { maxSessionDuration: 1800, targetCognitiveLoad: 0.7, interleaveTypes: true },
  });

  const learningSession = await manager.createLearningSession(
    userId,
    learningItems,
    studyRecords,
    [] // mockSessions
  );

  // 回填 details
  const detailsById = new Map(learningItems.map(li => [li.id, (li as any).details]));
  (learningSession.items as any[]).forEach(si => {
    const itemId = si.item?.id;
    if (itemId && detailsById.has(itemId)) {
      si.item.details = detailsById.get(itemId);
    }
  });

  (learningSession as any).userId = userId;
  (learningSession as any).manager = manager;

  return learningSession;
}