// keep: Imports aligned with existing db.ts usage
import { getDB } from '@/services/database';

export interface CreateSessionInput {
  userId: string;
  topic: string;
  difficulty: string;
}

export interface StartTurnInput {
  sessionId: number;
  referenceText: string;
}

export interface CompleteTurnInput {
  turnId: number;
  transcription?: string;
  scoresOverall?: number;
  scoresPronunciation?: number;
  scoresFluency?: number;
  scoresCompleteness?: number;
  recordingKey?: string;
  ttsCacheKey?: string;
}

export interface AppendMessageInput {
  sessionId: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
  contentZh?: string;
  lang?: string;
  meta?: any; // will be JSON.stringified
}

// Linus-style minimal, explicit SQL-based DAO for wa-sqlite

export async function createSession(input: CreateSessionInput): Promise<number> {
  const db = await getDB();
  await db.exec({
    sql: `
      INSERT INTO "practice_sessions" ("userId","topic","difficulty","lastUpdated")
      VALUES (?, ?, ?, CURRENT_TIMESTAMP);
    `,
    args: [input.userId, input.topic, input.difficulty],
  } as any);
  // wa-sqlite adapter does not expose last_insert_rowid(); fallback by selecting latest for this user/topic/difficulty
  const rows = await db.exec({
    sql: `
      SELECT "id" FROM "practice_sessions"
      WHERE "userId" = ? AND "topic" = ? AND "difficulty" = ?
      ORDER BY "id" DESC LIMIT 1;
    `,
    args: [input.userId, input.topic, input.difficulty],
  } as any);
  return rows?.[0]?.id as number;
}

export async function startTurn(input: StartTurnInput): Promise<number> {
  const db = await getDB();
  await db.exec({
    sql: `
      INSERT INTO "practice_turns" ("sessionId","referenceText")
      VALUES (?, ?);
    `,
    args: [input.sessionId, input.referenceText],
  } as any);
  const rows = await db.exec({
    sql: `
      SELECT "id" FROM "practice_turns"
      WHERE "sessionId" = ?
      ORDER BY "id" DESC LIMIT 1;
    `,
    args: [input.sessionId],
  } as any);
  return rows?.[0]?.id as number;
}

export async function completeTurn(input: CompleteTurnInput): Promise<void> {
  const db = await getDB();
  await db.exec({
    sql: `
      UPDATE "practice_turns"
      SET
        "transcription" = COALESCE(?, "transcription"),
        "scoresOverall" = COALESCE(?, "scoresOverall"),
        "scoresPronunciation" = COALESCE(?, "scoresPronunciation"),
        "scoresFluency" = COALESCE(?, "scoresFluency"),
        "scoresCompleteness" = COALESCE(?, "scoresCompleteness"),
        "recordingKey" = COALESCE(?, "recordingKey"),
        "ttsCacheKey" = COALESCE(?, "ttsCacheKey")
      WHERE "id" = ?;
    `,
    args: [
      input.transcription ?? null,
      input.scoresOverall ?? null,
      input.scoresPronunciation ?? null,
      input.scoresFluency ?? null,
      input.scoresCompleteness ?? null,
      input.recordingKey ?? null,
      input.ttsCacheKey ?? null,
      input.turnId,
    ],
  } as any);
}

export async function appendMessage(input: AppendMessageInput): Promise<number> {
  const db = await getDB();
  const metaStr = input.meta ? JSON.stringify(input.meta) : null;
  await db.exec({
    sql: `
      INSERT INTO "practice_messages" ("sessionId","role","content","contentZh","lang","meta")
      VALUES (?, ?, ?, ?, ?, ?);
    `,
    args: [input.sessionId, input.role, input.content, input.contentZh ?? null, input.lang ?? null, metaStr],
  } as any);
  const rows = await db.exec({
    sql: `
      SELECT "id" FROM "practice_messages"
      WHERE "sessionId" = ?
      ORDER BY "id" DESC LIMIT 1;
    `,
    args: [input.sessionId],
  } as any);
  return rows?.[0]?.id as number;
}

export async function getLatestTurn(sessionId: number): Promise<any | null> {
  const db = await getDB();
  const rows = await db.exec({
    sql: `
      SELECT * FROM "practice_turns"
      WHERE "sessionId" = ?
      ORDER BY "id" DESC LIMIT 1;
    `,
    args: [sessionId],
  } as any);
  return rows?.[0] ?? null;
}

export async function listMessages(sessionId: number): Promise<Array<any>> {
  const db = await getDB();
  const rows = await db.exec({
    sql: `
      SELECT * FROM "practice_messages"
      WHERE "sessionId" = ?
      ORDER BY "id" ASC;
    `,
    args: [sessionId],
  } as any);
  return rows ?? [];
}

// Convenience: begin a session with referenceText and initial messages
export async function beginPracticeSession(
  userId: string,
  topic: string,
  difficulty: string,
  referenceText: string,
  initialMessages?: Array<AppendMessageInput>
): Promise<{ sessionId: number; turnId: number; }> {
  const sessionId = await createSession({ userId, topic, difficulty });
  const turnId = await startTurn({ sessionId, referenceText });
  if (initialMessages && initialMessages.length > 0) {
    for (const msg of initialMessages) {
      await appendMessage({ ...msg, sessionId });
    }
  }
  return { sessionId, turnId };
}

/** 获取某用户最新的练习会话 */
export async function getLatestSession(userId: string): Promise<any | null> {
  const db = await getDB();
  const rows = await db.exec({
    sql: `
      SELECT * FROM "practice_sessions"
      WHERE "userId" = ?
      ORDER BY "id" DESC
      LIMIT 1;
    `,
    args: [userId],
  } as any);
  return rows?.[0] ?? null;
}