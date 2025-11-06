/**
 * Learning Domain Schema - 学习相关表结构
 * 包括: wordbooks, words, learning_progress, study_logs, learning_statistics, word_type_statistics
 */

export const LEARNING_SCHEMA = [
  // 词书表
  `
  CREATE TABLE IF NOT EXISTS "wordbooks" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `,
  
  // 单词表
  `
  CREATE TABLE IF NOT EXISTS "words" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "wordbookId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'vocabulary',
    "phonetic" TEXT,
    "definition" TEXT NOT NULL,
    "translation" TEXT,
    "example" TEXT,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("wordbookId") REFERENCES "wordbooks" ("id") ON DELETE CASCADE,
    UNIQUE ("wordbookId", "userId", "word")
  );
  `,

  // 学习进度表 - FSRS算法核心
  `
  CREATE TABLE IF NOT EXISTS "learning_progress" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "wordId" INTEGER NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "stability" REAL NOT NULL DEFAULT 0,
    "retrievability" REAL NOT NULL DEFAULT 1,
    "difficulty" REAL NOT NULL DEFAULT 0.3,
    "nextReview" TEXT NOT NULL,
    "lastReview" TEXT,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lapseCount" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL CHECK("state" IN ('new', 'learning', 'review', 'relearning')) DEFAULT 'new',
    FOREIGN KEY ("wordId") REFERENCES "words" ("id") ON DELETE CASCADE
  );
  `,

  // 学习日志表 - 记录每次学习行为
  `
  CREATE TABLE IF NOT EXISTS "study_logs" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "itemId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "response" TEXT NOT NULL CHECK("response" IN ('again', 'hard', 'good', 'easy')),
    "responseTime" INTEGER NOT NULL,
    "confidence" REAL,
    "previousStability" REAL,
    "previousRetrievability" REAL,
    "newStability" REAL,
    "newRetrievability" REAL,
    FOREIGN KEY ("itemId") REFERENCES "words" ("id") ON DELETE CASCADE
  );
  `,

  // 学习统计表 - 每日汇总数据
  `
  CREATE TABLE IF NOT EXISTS "learning_statistics" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalReviews" INTEGER DEFAULT 0,
    "correctReviews" INTEGER DEFAULT 0,
    "totalResponseTime" INTEGER DEFAULT 0,
    "avgResponseTime" REAL DEFAULT 0,
    "avgStability" REAL DEFAULT 0,
    "avgRetrievability" REAL DEFAULT 0,
    "streakDays" INTEGER DEFAULT 0,
    "lastUpdated" TEXT NOT NULL,
    UNIQUE("userId", "date")
  );
  `,

  // 单词类型统计表
  `
  CREATE TABLE IF NOT EXISTS "word_type_statistics" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "wordType" TEXT NOT NULL,
    "totalReviews" INTEGER DEFAULT 0,
    "correctReviews" INTEGER DEFAULT 0,
    "avgStability" REAL DEFAULT 0,
    "avgRetrievability" REAL DEFAULT 0,
    "lastUpdated" TEXT NOT NULL,
    UNIQUE("userId", "date", "wordType")
  );
  `
];

export const LEARNING_INDICES = [
  // 学习进度查询优化
  `CREATE INDEX IF NOT EXISTS idx_learning_progress_word ON "learning_progress"("wordId");`,
  `CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON "learning_progress"("userId");`,
  `CREATE INDEX IF NOT EXISTS idx_learning_progress_nextReview ON "learning_progress"("nextReview");`,
  
  // 学习日志查询优化
  `CREATE INDEX IF NOT EXISTS idx_study_logs_item_user_time ON "study_logs"("itemId","userId","timestamp");`,
  `CREATE INDEX IF NOT EXISTS idx_study_logs_timestamp ON "study_logs"("timestamp");`,
  
  // 统计数据查询优化
  `CREATE INDEX IF NOT EXISTS idx_learning_statistics_user ON "learning_statistics"("userId");`,
  `CREATE INDEX IF NOT EXISTS idx_word_type_statistics_user ON "word_type_statistics"("userId");`
];

export interface WordbookEntity {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface WordEntity {
  id: number;
  wordbookId: number;
  userId: string;
  word: string;
  type: string;
  phonetic?: string;
  definition: string;
  translation?: string;
  example?: string;
  createdAt: string;
}

export interface LearningProgressEntity {
  id: number;
  wordId: number;
  userId: string;
  stability: number;
  retrievability: number;
  difficulty: number;
  nextReview: string;
  lastReview?: string;
  reviewCount: number;
  lapseCount: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
}

export interface StudyLogEntity {
  id: number;
  itemId: number;
  userId: string;
  timestamp: string;
  response: 'again' | 'hard' | 'good' | 'easy';
  responseTime: number;
  confidence?: number;
  previousStability?: number;
  previousRetrievability?: number;
  newStability?: number;
  newRetrievability?: number;
}

export interface LearningStatisticsEntity {
  id: number;
  userId: string;
  date: string;
  totalReviews: number;
  correctReviews: number;
  totalResponseTime: number;
  avgResponseTime: number;
  avgStability: number;
  avgRetrievability: number;
  streakDays: number;
  lastUpdated: string;
}

export interface WordTypeStatisticsEntity {
  id: number;
  userId: string;
  date: string;
  wordType: string;
  totalReviews: number;
  correctReviews: number;
  avgStability: number;
  avgRetrievability: number;
  lastUpdated: string;
}