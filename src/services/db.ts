import { BasicDatabase, type Database } from '@/packages/wa-sqlite-adapter/database';

// SQL statements for creating the tables
const CREATE_TABLE_STATEMENTS = [
  `
  CREATE TABLE IF NOT EXISTS "wordbooks" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `,
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
  `,
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
  `,
  `CREATE INDEX IF NOT EXISTS idx_practice_turns_session ON "practice_turns"("sessionId");`,
  `CREATE INDEX IF NOT EXISTS idx_practice_messages_session ON "practice_messages"("sessionId");`,
  
  // 游戏化学习系统表
  `
  CREATE TABLE IF NOT EXISTS "game_sessions" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "wordbookId" INTEGER NOT NULL,
    "gameType" TEXT NOT NULL CHECK("gameType" IN ('vocabulary-match', 'definition-match', 'listening-match', 'spelling-bee')),
    "difficulty" TEXT NOT NULL CHECK("difficulty" IN ('easy', 'medium', 'hard', 'expert')),
    "status" TEXT NOT NULL CHECK("status" IN ('waiting', 'countdown', 'playing', 'paused', 'finished')) DEFAULT 'waiting',
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "timeRemaining" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "settings" TEXT NOT NULL,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("wordbookId") REFERENCES "wordbooks" ("id") ON DELETE CASCADE
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS "game_questions" (
    "id" TEXT PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "translation" TEXT,
    "phonetic" TEXT,
    "example" TEXT,
    "options" TEXT NOT NULL, -- JSON string of options
    "correctAnswer" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL CHECK("difficulty" IN ('easy', 'medium', 'hard', 'expert')),
    "timeLimit" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sessionId") REFERENCES "game_sessions" ("id") ON DELETE CASCADE
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS "game_answers" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "questionId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userAnswer" INTEGER NOT NULL,
    "isCorrect" INTEGER NOT NULL CHECK("isCorrect" IN (0, 1)),
    "responseTime" INTEGER NOT NULL,
    "timeUsed" INTEGER NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TEXT NOT NULL,
    "feedback" TEXT, -- JSON string of feedback data
    FOREIGN KEY ("questionId") REFERENCES "game_questions" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("sessionId") REFERENCES "game_sessions" ("id") ON DELETE CASCADE
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS "game_results" (
    "id" TEXT PRIMARY KEY,
    "sessionId" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "wordbookId" INTEGER NOT NULL,
    "gameType" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "finalAccuracy" REAL NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "averageResponseTime" REAL NOT NULL,
    "maxStreak" INTEGER NOT NULL,
    "achievements" TEXT, -- JSON string of achievement IDs
    "timeBonus" INTEGER NOT NULL DEFAULT 0,
    "difficultyBonus" INTEGER NOT NULL DEFAULT 0,
    "perfectScore" INTEGER NOT NULL CHECK("perfectScore" IN (0, 1)),
    "speedBonus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sessionId") REFERENCES "game_sessions" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("wordbookId") REFERENCES "wordbooks" ("id") ON DELETE CASCADE
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS "game_statistics" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "wordbookId" INTEGER,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "averageAccuracy" REAL NOT NULL DEFAULT 0,
    "averageResponseTime" REAL NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "favoriteGameType" TEXT,
    "favoriteDifficulty" TEXT,
    "totalPlayTime" INTEGER NOT NULL DEFAULT 0, -- 毫秒
    "lastPlayed" TEXT,
    "achievements" TEXT, -- JSON string of achievement IDs
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("wordbookId") REFERENCES "wordbooks" ("id") ON DELETE CASCADE,
    UNIQUE("userId", "wordbookId")
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS "achievements" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK("type" IN ('accuracy', 'speed', 'streak', 'volume', 'persistence', 'milestone')),
    "condition" TEXT NOT NULL, -- JSON string of condition
    "rewards" TEXT NOT NULL, -- JSON string of rewards
    "rarity" TEXT NOT NULL CHECK("rarity" IN ('common', 'rare', 'epic', 'legendary')),
    "unlockedAt" TEXT,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS "user_achievements" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TEXT NOT NULL,
    "gameSessionId" TEXT, -- 获得成就的游戏会话
    FOREIGN KEY ("achievementId") REFERENCES "achievements" ("id") ON DELETE CASCADE,
    UNIQUE("userId", "achievementId")
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS "user_levels" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL UNIQUE,
    "level" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "experience" INTEGER NOT NULL,
    "nextLevelExperience" INTEGER NOT NULL,
    "benefits" TEXT, -- JSON string of benefits
    "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS "leaderboards" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "period" TEXT NOT NULL CHECK("period" IN ('daily', 'weekly', 'monthly', 'allTime')),
    "gameType" TEXT CHECK("gameType" IN ('vocabulary-match', 'definition-match', 'listening-match', 'spelling-bee')),
    "difficulty" TEXT CHECK("difficulty" IN ('easy', 'medium', 'hard', 'expert')),
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "score" INTEGER NOT NULL,
    "accuracy" REAL NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 1,
    "lastPlayed" TEXT NOT NULL,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON "game_sessions"("userId");`,
  `CREATE INDEX IF NOT EXISTS idx_game_sessions_wordbook ON "game_sessions"("wordbookId");`,
  `CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON "game_sessions"("status");`,
  `CREATE INDEX IF NOT EXISTS idx_game_questions_session ON "game_questions"("sessionId");`,
  `CREATE INDEX IF NOT EXISTS idx_game_answers_session ON "game_answers"("sessionId");`,
  `CREATE INDEX IF NOT EXISTS idx_game_answers_question ON "game_answers"("questionId");`,
  `CREATE INDEX IF NOT EXISTS idx_game_results_user ON "game_results"("userId");`,
  `CREATE INDEX IF NOT EXISTS idx_game_statistics_user ON "game_statistics"("userId");`,
  `CREATE INDEX IF NOT EXISTS idx_game_statistics_wordbook ON "game_statistics"("wordbookId");`,
  `CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON "user_achievements"("userId");`,
  `CREATE INDEX IF NOT EXISTS idx_leaderboards_period ON "leaderboards"("period");`,
  `CREATE INDEX IF NOT EXISTS idx_leaderboards_user ON "leaderboards"("userId");`
];

let dbInstance: Database | null = null;
let hasTriedReset = false;

function isMalformedError(e: any): boolean {
  const msg = String(e?.message || e || '').toLowerCase();
  return msg.includes('malformed') || msg.includes('disk image is malformed');
}

async function deleteIndexedDB(dbName: string): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('indexedDB delete error'));
      req.onblocked = () => {
        // 依然 resolve，避免卡住；通常刷新页面可解除 blocked
        resolve();
      };
    });
  } catch (err) {
    console.warn('IndexedDB delete failed (ignored):', err);
  }
}

/**
 * Runs database migrations to update the schema.
 * This is a simple implementation that adds columns if they don't exist.
 */
async function migrateDB(db: Database) {
  const migrationStatements = [
    'ALTER TABLE "learning_progress" ADD COLUMN "userId" TEXT;',
    'ALTER TABLE "study_logs" ADD COLUMN "userId" TEXT;',
  ];

  for (const sql of migrationStatements) {
    try {
      await db.exec({ sql });

    } catch (e: any) {
      // Ignore "duplicate column name" error, which is expected if the migration has already run.
      if (!e.message.includes('duplicate column name')) {
        console.error(`Migration failed for: ${sql}`, e);
        throw e;
      }
    }
  }
}

/**
 * Initializes the database, creates tables if they don't exist,
 * and returns a database instance.
 */

/**
 * Ensure additional indices for common query patterns across learning and practice domains.
 * Uses IF NOT EXISTS to be idempotent and safe.
 */
async function ensureIndices(db: Database) {
  const indexStatements = [
    // Learning domain
    `CREATE INDEX IF NOT EXISTS idx_learning_progress_word ON "learning_progress"("wordId");`,
    `CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON "learning_progress"("userId");`,
    `CREATE INDEX IF NOT EXISTS idx_learning_progress_nextReview ON "learning_progress"("nextReview");`,

    `CREATE INDEX IF NOT EXISTS idx_study_logs_item_user_time ON "study_logs"("itemId","userId","timestamp");`,
    `CREATE INDEX IF NOT EXISTS idx_study_logs_timestamp ON "study_logs"("timestamp");`,

    // Statistics (UNIQUE constraints already create indexes, here we add single-field helpers if needed)
    `CREATE INDEX IF NOT EXISTS idx_learning_statistics_user ON "learning_statistics"("userId");`,
    `CREATE INDEX IF NOT EXISTS idx_word_type_statistics_user ON "word_type_statistics"("userId");`,

    // Practice domain
    `CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_created ON "practice_sessions"("userId","createdAt");`,
    `CREATE INDEX IF NOT EXISTS idx_practice_turns_created ON "practice_turns"("createdAt");`,
    `CREATE INDEX IF NOT EXISTS idx_practice_messages_created ON "practice_messages"("createdAt");`
  ];

  for (const sql of indexStatements) {
    try {
      await db.exec({ sql });
    } catch (e: any) {
      // Silently ignore errors for idempotency; CREATE INDEX IF NOT EXISTS should rarely throw.
      console.warn('Index creation warning:', e?.message || e);
    }
  }
}

export async function getDB(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbName = 'language-learning.db';

  async function initOnce(): Promise<Database> {
    const db = await BasicDatabase.init(dbName);

    for (const sql of CREATE_TABLE_STATEMENTS) {
      await db.exec({ sql });
    }

    await migrateDB(db);
    await ensureIndices(db);
    return db;
  }

  try {
    const db = await initOnce();
    dbInstance = db;
    return dbInstance!;
  } catch (e: any) {
    // 捕获“disk image is malformed”并自愈一次
    if (!hasTriedReset && isMalformedError(e)) {
      console.warn('Database is malformed. Attempting self-heal reset for IndexedDB:', dbName, e?.message);
      hasTriedReset = true;
      try {
        // 关闭旧连接（若有）
        try { if (dbInstance && typeof (dbInstance as any).close === 'function') await (dbInstance as any).close(); } catch {}
        dbInstance = null;
        // 删除 IndexedDB 库
        await deleteIndexedDB(dbName);
        // 重建
        const db = await initOnce();
        dbInstance = db;
        // 轻量提示（不依赖 UI 组件，避免循环依赖）
        try { console.warn('Database has been reset and rebuilt due to corruption.'); } catch {}
        return dbInstance!;
      } catch (e2) {
        console.error('Database self-heal reset failed:', e2);
        throw e2;
      }
    }
    throw e;
  }
}