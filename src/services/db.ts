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
  `CREATE INDEX IF NOT EXISTS idx_practice_messages_session ON "practice_messages"("sessionId");`
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