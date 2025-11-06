/**
 * Practice Domain Schema - 练习相关表结构
 * 包括: practice_sessions, practice_turns, practice_messages
 */

export const PRACTICE_SCHEMA = [
  // 练习会话表
  `
  CREATE TABLE IF NOT EXISTS "practice_sessions" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TEXT
  );
  `,

  // 练习回合表
  `
  CREATE TABLE IF NOT EXISTS "practice_turns" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "referenceText" TEXT NOT NULL,
    "transcription" TEXT,
    "scoresOverall" INTEGER,
    "scoresPronunciation" INTEGER,
    "scoresFluency" INTEGER,
    "scoresCompleteness" INTEGER,
    "recordingKey" TEXT,
    "ttsCacheKey" TEXT,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sessionId") REFERENCES "practice_sessions" ("id") ON DELETE CASCADE
  );
  `,

  // 练习消息表 - 存储对话内容
  `
  CREATE TABLE IF NOT EXISTS "practice_messages" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "role" TEXT NOT NULL CHECK("role" IN ('system','user','assistant')),
    "content" TEXT NOT NULL,
    "contentZh" TEXT,
    "lang" TEXT,
    "meta" TEXT,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sessionId") REFERENCES "practice_sessions" ("id") ON DELETE CASCADE
  );
  `
];

export const PRACTICE_INDICES = [
  // 练习会话查询优化
  `CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_created ON "practice_sessions"("userId","createdAt");`,
  
  // 练习回合查询优化
  `CREATE INDEX IF NOT EXISTS idx_practice_turns_session ON "practice_turns"("sessionId");`,
  `CREATE INDEX IF NOT EXISTS idx_practice_turns_created ON "practice_turns"("createdAt");`,
  
  // 练习消息查询优化
  `CREATE INDEX IF NOT EXISTS idx_practice_messages_session ON "practice_messages"("sessionId");`,
  `CREATE INDEX IF NOT EXISTS idx_practice_messages_created ON "practice_messages"("createdAt");`
];

export interface PracticeSessionEntity {
  id: number;
  userId: string;
  topic: string;
  difficulty: string;
  createdAt: string;
  lastUpdated?: string;
}

export interface PracticeTurnEntity {
  id: number;
  sessionId: number;
  referenceText: string;
  transcription?: string;
  scoresOverall?: number;
  scoresPronunciation?: number;
  scoresFluency?: number;
  scoresCompleteness?: number;
  recordingKey?: string;
  ttsCacheKey?: string;
  createdAt: string;
}

export interface PracticeMessageEntity {
  id: number;
  sessionId: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
  contentZh?: string;
  lang?: string;
  meta?: string;
  createdAt: string;
}