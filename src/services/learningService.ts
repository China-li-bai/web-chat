import { getDB } from './db';
import { MemoryLearningManager } from '@/lib/memo/MemoryLearningManager';
import type { LearningItem, StudyRecord } from '@/lib/memo/types';
import type { Row } from '@/packages/wa-sqlite-adapter/types';

interface WordWithProgress extends Row {
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
  dueDate: string;
  lastReviewed: string | null;
  state: string;
}

export async function createLearningSessionForWordbook(wordbookId: number) {
  const db = await getDB();

  // 1. Fetch all words and their progress for the given wordbook that are due
  const now = new Date().toISOString();
  const wordsAndProgress = (await db.exec({
    sql: `
      SELECT
        w.id, w.word, w.type, w.phonetic, w.definition, w.example, w.createdAt,
        lp.stability, lp.retrievability, lp.difficulty, lp.dueDate, lp.lastReviewed, lp.state
      FROM words w
      JOIN learning_progress lp ON w.id = lp.wordId
      WHERE w.wordbookId = ? AND lp.dueDate <= ?
    `,
    args: [wordbookId, now],
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
      sql: `SELECT * FROM study_logs WHERE wordId IN (${placeholders}) ORDER BY timestamp DESC LIMIT 100`,
      args: wordIds,
    });

    studyRecords = logs.map((log: Row) => ({
      itemId: String(log.wordId),
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
    'user-1', // TODO: Replace with actual user ID
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
  (learningSession as any).manager = manager;

  return learningSession;
}

export async function processStudyResponse(
  session: LearningSession,
  itemId: string,
  response: 'again' | 'hard' | 'good' | 'easy',
  responseTime: number
) {
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
    sql: 'SELECT stability, retrievability FROM learning_progress WHERE wordId = ?',
    args: [wordId],
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

  // 1. Update the learning_progress table
  await db.exec({
    sql: `
      UPDATE learning_progress
      SET
        stability = ?,
        retrievability = ?,
        difficulty = ?,
        dueDate = ?,
        lastReviewed = ?,
        state = ?,
        reps = reps + 1
      WHERE wordId = ?
    `,
    args: [newStability, newRetrievability, newDifficulty, newDueDate.toISOString(), new Date().toISOString(), newState, wordId],
  });

  // 2. Insert a new record into study_logs
  await db.exec({
    sql: `
      INSERT INTO study_logs
      (wordId, timestamp, response, responseTime, confidence, previousStability, previousRetrievability, newStability, newRetrievability)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [wordId, new Date().toISOString(), response, responseTime, confidence, previousStability, previousRetrievability, newStability, newRetrievability],
  });

  return result;
}