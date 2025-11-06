import { databaseService } from './database/index';
import { MemoryLearningManager } from '@/lib/memo/MemoryLearningManager';
import type { LearningItem, LearningItemType, StudyRecord } from '@/lib/memo/types';
import type { LearningSession } from '@/lib/memo/MemoryLearningManager';
import cet4Data from '@/data/cet4-core.json';
import gmatData from '@/data/gmat-core.json';
import satData from '@/data/sat-advanced.json';
import { ImportFile, Wordbook, WordbookWithStats } from '@/types/wordbook';
import { ensureImportFileSchema } from '@/types/wordbook';

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
  // 1. Fetch all words and their progress for the given wordbook that are due
  const wordsAndProgress = await databaseService.getWordsForReview(wordbookId, userId, 200);

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
      translation: row.translation,
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
    const logs = await databaseService.exec({
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

/**
 * 从 TodayPlan 启动跨词书全局学习会话
 * 将 plan.items 映射为 LearningItem，并交由 MemoryLearningManager 生成会话
 */
export async function startSessionFromTodayPlan(params: {
  userId: string;
  plan: {
    items: Array<{ id: string; wordId: number; wordbookId: number; word: string }>;
  };
  targetDurationSeconds?: number; // 可选，会话目标时长
}): Promise<LearningSession> {
  const { userId, plan } = params;

  // 获取详细字段（type/phonetic/definition/example 及 progress）
  const ids = (plan.items || []).map(i => i.wordId).filter(n => Number.isFinite(n));
  let rows: any[] = [];
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    rows = await databaseService.exec({
      sql: `
        SELECT
          w.id, w.word, w.type, w.phonetic, w.definition, w.translation, w.example, w.createdAt,
          lp.stability, lp.retrievability, lp.difficulty, lp.nextReview, lp.lastReview, lp.state
        FROM words w
        JOIN learning_progress lp ON w.id = lp.wordId
        WHERE w.userId = ? AND w.id IN (${placeholders})
        ORDER BY lp.retrievability ASC, lp.nextReview ASC
      `,
      args: [userId, ...ids],
    });
  }

  const learningItems: LearningItem[] = rows.map((row: any) => ({
    id: String(row.id),
    content: row.word,
    type: row.type as LearningItemType,
    difficulty: row.difficulty,
    createdAt: new Date(row.createdAt),
    details: {
      phonetic: row.phonetic,
      definition: row.definition,
      translation: row.translation,
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
    const logs = await databaseService.exec({
      sql: `SELECT * FROM study_logs WHERE itemId IN (${placeholders}) ORDER BY timestamp DESC LIMIT 200`,
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

  // 初始化管理器
  const manager = new MemoryLearningManager({
    fsrsParams: { requestRetention: 0.9, maximumInterval: 36500 },
    adaptiveConfig: { minDifficulty: 0.1, maxDifficulty: 0.9, adaptationRate: 0.1 },
    retrievalConfig: {
      maxSessionDuration: params.targetDurationSeconds || 1800,
      targetCognitiveLoad: 0.7,
      interleaveTypes: true
    },
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

/** 今日计划类型（仅服务内部使用） */
interface TodayPlan {
  generatedAt: string;
  dailyQuota: number;
  perWordbookQuota: Array<{
    wordbookId: number;
    wordbookName?: string;
    quota: number;
    dueCount: number;
    upcomingCount: number;
  }>;
  items: Array<{
    id: string;
    wordId: number;
    wordbookId: number;
    word: string;
    nextReview: string;
    retrievability?: number;
    state?: 'new'|'learning'|'review'|'relearning';
  }>;
}

/**
 * 生成全局“今日计划”：按到期量比例 + 最小保障分配每日配额，并按 retrievability 选取
 */
export async function getTodayPlan(params: {
  userId: string;
  dailyQuota: number;
  includeUpcoming?: boolean; // false=仅到期；true=含24h内
  quotaBoostCap?: number; // 昨日困难占比上调上限（0~1），默认 0.2
}): Promise<TodayPlan> {
  const { userId } = params;
  const dailyQuota = Math.max(1, Math.min(500, params.dailyQuota || 60));
  const includeUpcoming = !!params.includeUpcoming;
  const timeWindowHours = includeUpcoming ? 24 : 0;
  const quotaBoostCap = typeof params.quotaBoostCap === 'number'
    ? Math.max(0, Math.min(1, params.quotaBoostCap))
    : 0.2;

  // 拉取分组统计（到期/24h内）
  const grouped = await getReviewQueueGroupedByWordbook({
    userId,
    timeWindowHours,
    page: 1,
    pageSize: 1000
  });

  const groups = grouped.items || [];
  const diList = groups.map(g => Number(g.dueCount || 0));
  const dTotal = diList.reduce((acc, n) => acc + n, 0);

  // 若无到期项，直接返回空计划
  if (dTotal === 0) {
    return {
      generatedAt: new Date().toISOString(),
      dailyQuota,
      perWordbookQuota: groups.map(g => ({
        wordbookId: g.wordbookId,
        wordbookName: g.wordbookName || '',
        quota: 0,
        dueCount: Number(g.dueCount || 0),
        upcomingCount: Number(g.upcomingCount || 0),
      })),
      items: []
    };
  }

  // 初始比例分配
  let quotas = groups.map(g => ({
    wordbookId: g.wordbookId,
    wordbookName: g.wordbookName || '',
    dueCount: Number(g.dueCount || 0),
    upcomingCount: Number(g.upcomingCount || 0),
    quota: 0
  }));

  let allocated = 0;
  quotas.forEach(q => {
    const share = Math.round((dailyQuota * q.dueCount) / dTotal);
    q.quota = Math.min(share, q.dueCount);
    allocated += q.quota;
  });

  // 基于昨日统计的轻量配额微调：按词书昨日 again/hard 占比，上调今日 quota，封顶 20%
  try {
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];
    const rows = await databaseService.exec({
      sql: `
        SELECT 
          w.wordbookId AS wordbookId,
          COUNT(*) AS total,
          SUM(CASE WHEN sl.response IN ('again','hard') THEN 1 ELSE 0 END) AS bad
        FROM study_logs sl
        JOIN words w ON w.id = sl.itemId
        WHERE sl.userId = ? AND sl.timestamp LIKE ?
        GROUP BY w.wordbookId
      `,
      args: [userId, yesterday + '%']
    });

    const byBook: Map<number, { total: number; bad: number }> = new Map();
    (rows || []).forEach((r: any) => {
      const wid = Number(r.wordbookId);
      const total = Number(r.total || 0);
      const bad = Number(r.bad || 0);
      if (Number.isFinite(wid) && total > 0) {
        byBook.set(wid, { total, bad });
      }
    });

    quotas.forEach(q => {
      const entry = byBook.get(q.wordbookId);
      if (entry && entry.total > 0 && q.quota > 0) {
        const ratio = entry.bad / entry.total; // 昨日困难占比
        const boost = Math.min(quotaBoostCap, ratio * quotaBoostCap); // 使用可配置上限
        const inc = Math.round(q.quota * boost);
        q.quota = Math.min(q.quota + inc, q.dueCount);
      }
    });

    // 重新计算 allocated，后续统一误差与最小保障处理
    allocated = quotas.reduce((acc, qq) => acc + qq.quota, 0);
  } catch (e: any) {
    console.error('Yesterday quota adjust failed:', e?.message || e);
  }

  // 处理取整误差：超分则减，未满则补
  const adjust = (delta: number) => {
    if (delta > 0) {
      // 需要减少
      for (let i = 0; i < quotas.length && delta > 0; i++) {
        const q = quotas[i];
        if (q.quota > 0) {
          q.quota -= 1;
          delta -= 1;
        }
      }
    } else if (delta < 0) {
      // 需要增加
      delta = -delta;
      for (let i = 0; i < quotas.length && delta > 0; i++) {
        const q = quotas[i];
        if (q.quota < q.dueCount) {
          q.quota += 1;
          delta -= 1;
        }
      }
    }
  };
  adjust(allocated - dailyQuota);

  // 最小保障：有到期但 q=0 的词书，至少分配1（若还有剩余空间）
  for (let i = 0; i < quotas.length; i++) {
    const q = quotas[i];
    if (q.dueCount > 0 && q.quota === 0 && allocated < dailyQuota) {
      q.quota = 1;
      allocated += 1;
    }
  }
  // 若超过总配额，再次回退
  adjust(allocated - dailyQuota);

  // 选取具体词条：按 retrievability 从低到高（undefined 置后）
  const items: TodayPlan['items'] = [];
  for (const q of quotas) {
    if (q.quota <= 0) continue;
    const res = await getDueItems({
      userId,
      wordbookId: q.wordbookId,
      includeUpcoming,
      page: 1,
      pageSize: Math.max(50, q.quota) // 拉取足够多以排序
    });
    const sorted = [...(res.items || [])].sort((a, b) => {
      const ra = typeof a.retrievability === 'number' ? a.retrievability! : Number.POSITIVE_INFINITY;
      const rb = typeof b.retrievability === 'number' ? b.retrievability! : Number.POSITIVE_INFINITY;
      return ra - rb;
    });
    const picked = sorted.slice(0, q.quota);
    picked.forEach(p => {
      items.push({
        id: p.id,
        wordId: Number(p.id),
        wordbookId: q.wordbookId,
        word: p.word,
        nextReview: p.nextReview,
        retrievability: p.retrievability
      });
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    dailyQuota,
    perWordbookQuota: quotas,
    items
  };
}

/**
 * 聚合当日学习日志，并计算各词书的 masteredCount 与 progress（百分比）
 * 注：掌握判定：state='review' 且 retrievability ≥ 0.85（可后续调整）
 */
export async function aggregateDailyStudyAndUpdateProgress(params: {
  userId: string;
  date?: string; // YYYY-MM-DD（可选，默认当天）
}): Promise<{ updatedWordbooks: Array<{ wordbookId: number; masteredCount: number; progress: number }> }> {
  const db = await databaseService.getConnection();
  const { userId } = params;
  const nowIso = new Date().toISOString();
  const todayStr = (params.date || nowIso.split('T')[0]);

  // 收集当天学习的唯一词ID
  const logs = await databaseService.exec({
    sql: `
      SELECT DISTINCT itemId 
      FROM study_logs 
      WHERE userId = ? AND timestamp LIKE ?
    `,
    args: [userId, `${todayStr}%`],
  });
  const studiedWordIds: number[] = (logs || []).map((r: any) => Number(r.itemId)).filter(n => Number.isFinite(n));
  if (studiedWordIds.length === 0) {
    // 无当日学习，返回当前进度快照
    const wbRows = await databaseService.exec({
      sql: `
        SELECT w.wordbookId AS wordbookId
        FROM words w
        WHERE w.userId = ?
        GROUP BY w.wordbookId
      `,
      args: [userId],
    });
    const updatedWordbooks: Array<{ wordbookId: number; masteredCount: number; progress: number }> = [];
    for (const r of wbRows) {
      const wid = Number(r.wordbookId);
      const wcRows = await databaseService.exec({
        sql: `
          SELECT COUNT(*) AS cnt
          FROM learning_progress lp
          JOIN words w ON w.id = lp.wordId
          WHERE lp.userId = ? AND w.wordbookId = ?
        `,
        args: [userId, wid],
      });
      const mcRows = await databaseService.exec({
        sql: `
          SELECT COUNT(*) AS cnt
          FROM learning_progress lp
          JOIN words w ON w.id = lp.wordId
          WHERE lp.userId = ? AND w.wordbookId = ? AND lp.state = 'review' AND lp.retrievability >= 0.85
        `,
        args: [userId, wid],
      });
      const wordCount = Number(wcRows[0]?.cnt || 0);
      const masteredCount = Number(mcRows[0]?.cnt || 0);
      const progress = wordCount > 0 ? (masteredCount / wordCount) * 100 : 0;
      updatedWordbooks.push({ wordbookId: wid, masteredCount, progress });
    }
    return { updatedWordbooks };
  }

  // 映射：词ID -> 词书ID
  const placeholders = studiedWordIds.map(() => '?').join(',');
  const wbMapRows = await databaseService.exec({
    sql: `
      SELECT id, wordbookId
      FROM words
      WHERE id IN (${placeholders}) AND userId = ?
    `,
    args: [...studiedWordIds, userId],
  });
  const wordToBook = new Map<number, number>();
  (wbMapRows || []).forEach((r: any) => {
    wordToBook.set(Number(r.id), Number(r.wordbookId));
  });

  // 计算每个词书的总词数与掌握数
  const updatedWordbooks: Array<{ wordbookId: number; masteredCount: number; progress: number }> = [];
  const uniqueBooks = new Set<number>(Array.from(wordToBook.values()));
  for (const wid of uniqueBooks) {
    const wcRows = await databaseService.exec({
      sql: `
        SELECT COUNT(*) AS cnt
        FROM learning_progress lp
        JOIN words w ON w.id = lp.wordId
        WHERE lp.userId = ? AND w.wordbookId = ?
      `,
      args: [userId, wid],
    });
    const mcRows = await databaseService.exec({
      sql: `
        SELECT COUNT(*) AS cnt
        FROM learning_progress lp
        JOIN words w ON w.id = lp.wordId
        WHERE lp.userId = ? AND w.wordbookId = ? AND lp.state = 'review' AND lp.retrievability >= 0.85
      `,
      args: [userId, wid],
    });
    const wordCount = Number(wcRows[0]?.cnt || 0);
    const masteredCount = Number(mcRows[0]?.cnt || 0);
    const progress = wordCount > 0 ? (masteredCount / wordCount) * 100 : 0;
    updatedWordbooks.push({ wordbookId: wid, masteredCount, progress });
  }

  return { updatedWordbooks };
}

export async function processStudyResponse(
  session: LearningSession,
  itemId: string,
  response: 'again' | 'hard' | 'good' | 'easy',
  responseTime: number,
  userId: string
) {
  const manager = (session as any).manager as MemoryLearningManager;
  if (!manager) {
    throw new Error('MemoryLearningManager instance not found in the session.');
  }

  // 简化置信度映射
  const confidenceMap = { again: 0.2, hard: 0.5, good: 0.8, easy: 0.95 };
  const confidence = confidenceMap[response];

  const wordId = Number(itemId);
  const db = await databaseService.getConnection();

  // 获取当前进度（仅用于日志记录）
  const currentProgress = await databaseService.exec({
    sql: 'SELECT stability, retrievability FROM learning_progress WHERE wordId = ? AND userId = ?',
    args: [wordId, userId],
  });
  const previousStability = (currentProgress[0]?.stability as number) || 0;
  const previousRetrievability = (currentProgress[0]?.retrievability as number) || 1;

  // 处理学习响应
  const result = await manager.processStudyResponse(session, itemId, response, responseTime, confidence);
  const ms = result.updatedMemoryStrength as any;

  // 简化的字段提取
  const nextReview = ms?.nextReview;
  const stability = ms?.stability ?? 0;
  const retrievability = ms?.retrievability ?? 1;
  const difficulty = ms?.difficulty ?? 0.5;
  const state = ms?.state ?? 'new';

  // 批量数据库更新（原子操作）
  await databaseService.exec({
    sql: 'BEGIN TRANSACTION',
    args: []
  });

  try {
    // 1. 更新学习进度
    await databaseService.exec({
      sql: `
        UPDATE learning_progress
        SET stability = ?, retrievability = ?, difficulty = ?, nextReview = ?, 
            lastReview = ?, state = ?, reviewCount = reviewCount + 1
        WHERE wordId = ? AND userId = ?
      `,
      args: [stability, retrievability, difficulty, 
             nextReview ? nextReview.toISOString() : new Date().toISOString(), 
             new Date().toISOString(), state, wordId, userId],
    });

    // 2. 插入学习日志
    await databaseService.exec({
      sql: `
        INSERT INTO study_logs
        (itemId, userId, timestamp, response, responseTime, confidence, 
         previousStability, previousRetrievability, newStability, newRetrievability)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [wordId, userId, new Date().toISOString(), response, responseTime, confidence,
             previousStability || 0, previousRetrievability || 1, stability, retrievability],
    });

    // 3. 更新统计数据
    await updateLearningStatistics(userId, wordId, response, responseTime, stability, retrievability);

    await databaseService.exec({
      sql: 'COMMIT',
      args: []
    });
  } catch (error) {
    await databaseService.exec({
      sql: 'ROLLBACK',
      args: []
    });
    throw error;
  }

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
  const db = await databaseService.getConnection();
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  try {
    const isCorrect = response === 'good' || response === 'easy';
    const correctReviewsInc = isCorrect ? 1 : 0;

    const existingStats = await databaseService.exec({
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

      await databaseService.exec({
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
      await databaseService.exec({
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
  const db = await databaseService.getConnection();
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  try {
    const wordInfo = await databaseService.exec({
      sql: 'SELECT type FROM words WHERE id = ?',
      args: [wordId],
    });

    if (wordInfo.length === 0) return;
    const wordType = wordInfo[0].type as string;

    const existingStats = await databaseService.exec({
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

      await databaseService.exec({
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
      await databaseService.exec({
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
  const db = await databaseService.getConnection();
  const { userId, planned } = params;
  let updated = 0;

  for (const p of planned) {
    const wordId = Number(p.itemId);
    if (!wordId || !isFinite(wordId)) {
      continue;
    }
    try {
      await databaseService.exec({
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
  const db = await databaseService.getConnection();
  const userId = params.userId;
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize || 10));
  const offset = (page - 1) * pageSize;

  const now = new Date();
  const timeWindowHours = typeof params.timeWindowHours === 'number' ? params.timeWindowHours : 0;
  const upper = new Date(now.getTime() + timeWindowHours * 3600 * 1000);

  // 1) 基础分组统计（严格按 nextReview 窗口）
  const rows = await databaseService.exec({
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
  const totalGroupsRows = await databaseService.exec({
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
      const nameRows = await databaseService.exec({
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
  const db = await databaseService.getConnection();
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

  const listRows = await databaseService.exec({
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
  const countRows = await databaseService.exec({
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
  const db = await databaseService.getConnection();
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

  const rows = await databaseService.exec({
    sql: `
      SELECT
        w.id, w.word, w.type, w.phonetic, w.definition, w.translation, w.example, w.createdAt,
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
      translation: row.translation,
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
    const logs = await databaseService.exec({
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

// ===== Wordbook Management Functions (merged from wordbookService.ts) =====

async function seedFromFile(db: any, fileData: ImportFile, userId: string) {
  const { name, description, words } = fileData;

  // Use INSERT OR IGNORE for idempotency, then fetch the ID.
  await db.exec({
    sql: 'INSERT OR IGNORE INTO "wordbooks" ("name", "description") VALUES (?, ?)',
    args: [name, description || ''],
  });
  
  const wordbookIdResult = await db.exec({
    sql: 'SELECT "id" FROM "wordbooks" WHERE "name" = ?',
    args: [name],
  });

  if (wordbookIdResult.length === 0) {
    console.error(`Failed to insert or find wordbook: ${name}`);
    return;
  }
  const wordbookId = wordbookIdResult[0].id as number;

  // Check if words for this user and wordbook already exist to prevent re-seeding
  const wordCountResult = await db.exec({
    sql: 'SELECT COUNT(*) as count FROM "words" WHERE "wordbookId" = ? AND "userId" = ?',
    args: [wordbookId, userId],
  });

  if ((wordCountResult[0]?.count as number) > 0) {
    console.log(`Words for "${name}" and user "${userId}" already exist, skipping word seed.`);
    return;
  }

  // Batch insert words and their learning progress
  for (const word of words) {
    // 幂等插入 words
    await db.exec({
      sql: 'INSERT OR IGNORE INTO "words" ("wordbookId", "userId", "word", "phonetic", "definition", "translation", "example") VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [wordbookId, userId, word.word, word.phonetic || null, word.definition, word.translation || null, word.example || null],
    });
    // 获取已存在或新插入的 wordId
    const gotWordId = await db.exec({
      sql: 'SELECT "id" FROM "words" WHERE "wordbookId" = ? AND "word" = ?',
      args: [wordbookId, word.word],
    });
    const wordId = gotWordId?.[0]?.id as number;

    // 幂等插入 learning_progress（wordId 唯一）
    await db.exec({
      sql: 'INSERT OR IGNORE INTO "learning_progress" ("wordId", "userId", "nextReview") VALUES (?, ?, ?)',
      args: [wordId, userId, new Date().toISOString()],
    });
  }
}

// Function to seed initial data
export async function seedInitialData(userId: string) {
  const db = await databaseService.getConnection();
  
  console.log('Seeding initial data if necessary...');
  
  await seedFromFile(db, cet4Data as ImportFile, userId);
  await seedFromFile(db, gmatData as ImportFile, userId);
  await seedFromFile(db, satData as ImportFile, userId);
  
  console.log('Seeding complete.');
}

export async function getAllWordbooksWithStats(userId: string): Promise<WordbookWithStats[]> {
  const db = await databaseService.getConnection();
  const books = (await db.exec({
    sql: 'SELECT * FROM "wordbooks" ORDER BY "createdAt" DESC',
  })) as any[];

  const statsPromises = (books as Wordbook[]).map(async (book) => {
    const wordCountResult = await db.exec({
      sql: 'SELECT COUNT(*) as count FROM "words" WHERE "wordbookId" = ? AND "userId" = ?',
      args: [book.id, userId],
    });
    const wordCount = (wordCountResult[0]?.count as number) || 0;

    // Get mastered count
    const masteredCountResult = await db.exec({
      sql: `
        SELECT COUNT(*) as count
        FROM "learning_progress"
        WHERE "userId" = ? AND "wordId" IN (SELECT "id" FROM "words" WHERE "wordbookId" = ? AND "userId" = ?)
        AND "state" = 'review'
      `,
      args: [userId, book.id, userId],
    });
    const masteredCount = (masteredCountResult[0]?.count as number) || 0;

    // Get due count (words that need to be studied now)
    const now = new Date().toISOString();
    const dueCountResult = await db.exec({
      sql: `
        SELECT COUNT(*) as count
        FROM "learning_progress"
        WHERE "userId" = ? AND "wordId" IN (SELECT "id" FROM "words" WHERE "wordbookId" = ? AND "userId" = ?)
        AND "nextReview" <= ?
      `,
      args: [userId, book.id, userId, now],
    });
    const dueCount = (dueCountResult[0]?.count as number) || 0;

    // Get last studied date
    const lastStudiedResult = await db.exec({
      sql: `
        SELECT MAX("timestamp") as lastStudied
        FROM "study_logs"
        WHERE "userId" = ? AND "itemId" IN (SELECT "id" FROM "words" WHERE "wordbookId" = ? AND "userId" = ?)
      `,
      args: [userId, book.id, userId],
    });
    const lastStudied = lastStudiedResult[0]?.lastStudied as string | null;

    const progress = wordCount > 0 ? (masteredCount / wordCount) * 100 : 0;

    return {
      ...book,
      wordCount,
      progress,
      masteredCount,
      dueCount,
      lastStudied: lastStudied || undefined,
    } as WordbookWithStats;
  });

  return Promise.all(statsPromises);
}

export async function checkWordbookExists(name: string): Promise<boolean> {
  const db = await databaseService.getConnection();
  const existing = await db.exec({
    sql: 'SELECT "id" FROM "wordbooks" WHERE "name" = ?',
    args: [name],
  });
  return existing.length > 0;
}

export async function importWordbook(jsonContent: string, userId: string): Promise<{ status: 'created' | 'updated', wordbookId: number }> {
  const db = await databaseService.getConnection();
  const parsed = JSON.parse(jsonContent);
  const data: ImportFile = ensureImportFileSchema(parsed);

  // 1. Check if wordbook with the same name already exists
  const existingResult = await db.exec({
    sql: 'SELECT "id" FROM "wordbooks" WHERE "name" = ?',
    args: [data.name],
  });

  let wordbookId: number;
  let status: 'created' | 'updated';

  if (existingResult.length > 0) {
    // Wordbook exists, get its ID and prepare for update
    status = 'updated';
    wordbookId = existingResult[0].id as number;
    console.log(`Updating existing wordbook for user ${userId}: ${data.name} (ID: ${wordbookId})`);
    
    // Delete old words for this user in this wordbook.
    await db.exec({
      sql: 'DELETE FROM "words" WHERE "wordbookId" = ? AND "userId" = ?',
      args: [wordbookId, userId],
    });
  } else {
    // Wordbook does not exist, insert it
    status = 'created';
    console.log(`Importing new wordbook: ${data.name}`);
    await db.exec({
      sql: 'INSERT INTO "wordbooks" ("name", "description") VALUES (?, ?)',
      args: [data.name, data.description || ''],
    });
    const wordbookIdResult = await db.exec({ sql: 'SELECT last_insert_rowid() as id' });
    wordbookId = wordbookIdResult[0].id as number;
  }

  // 3. Batch insert new words and their learning progress for the given user
  for (const word of data.words) {
    // 幂等插入 words
    await db.exec({
      sql: 'INSERT OR IGNORE INTO "words" ("wordbookId", "userId", "word", "phonetic", "definition", "translation", "example") VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [wordbookId, userId, word.word, word.phonetic || null, word.definition, word.translation || null, word.example || null],
    });
    // 获取已存在或新插入的 wordId
    const gotWordId = await db.exec({
      sql: 'SELECT "id" FROM "words" WHERE "wordbookId" = ? AND "word" = ?',
      args: [wordbookId, word.word],
    });
    const wordId = gotWordId?.[0]?.id as number;

    // 幂等插入 learning_progress
    await db.exec({
      sql: 'INSERT OR IGNORE INTO "learning_progress" ("wordId", "userId", "nextReview") VALUES (?, ?, ?)',
      args: [wordId, userId, new Date().toISOString()],
    });
  }
  
  return { status, wordbookId };
}
