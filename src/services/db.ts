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
    "example" TEXT,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("wordbookId") REFERENCES "wordbooks" ("id") ON DELETE CASCADE,
    UNIQUE ("wordbookId", "word")
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
  `
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
    'ALTER TABLE "words" ADD COLUMN "userId" TEXT;',
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
 * Ensure words table unique constraint includes userId so that different users
 * can have the same word in the same wordbook without conflicts.
 * This migration rebuilds the table safely if needed.
 */
async function migrateWordsUniqueConstraint(db: Database) {
  // Check if the desired unique index exists
  let hasDesired = false;
  try {
    const indices = await db.exec({ sql: "PRAGMA index_list('words')" });
    if (Array.isArray(indices)) {
      hasDesired = indices.some((i: any) => String(i.name) === 'idx_words_unique_book_user_word');
    }
  } catch {
    // ignore
  }
  if (hasDesired) return;

  try {
    await db.exec({ sql: 'BEGIN' });

    await db.exec({
      sql: `
      CREATE TABLE "words_new" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "wordbookId" INTEGER NOT NULL,
        "userId" TEXT NOT NULL,
        "word" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'vocabulary',
        "phonetic" TEXT,
        "definition" TEXT NOT NULL,
        "example" TEXT,
        "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("wordbookId") REFERENCES "wordbooks" ("id") ON DELETE CASCADE,
        UNIQUE ("wordbookId","userId","word")
      );
    `
    });

    // Copy data; INSERT OR IGNORE to respect the new uniqueness if duplicates exist
    await db.exec({
      sql: `
      INSERT OR IGNORE INTO "words_new"
        ("id","wordbookId","userId","word","type","phonetic","definition","example","createdAt")
      SELECT
        "id","wordbookId","userId","word","type","phonetic","definition","example","createdAt"
      FROM "words";
    `
    });

    await db.exec({ sql: 'DROP TABLE "words";' });
    await db.exec({ sql: 'ALTER TABLE "words_new" RENAME TO "words";' });

    await db.exec({
      sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_words_unique_book_user_word ON "words" ("wordbookId","userId","word");'
    });

    await db.exec({ sql: 'COMMIT' });
  } catch (e) {
    await db.exec({ sql: 'ROLLBACK' }).catch(() => {});
    console.error('Migration migrateWordsUniqueConstraint failed', e);
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
    await migrateWordsUniqueConstraint(db);
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