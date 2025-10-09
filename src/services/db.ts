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
export async function getDB(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbName = 'language-learning.db';
  const db = await BasicDatabase.init(dbName);

  for (const sql of CREATE_TABLE_STATEMENTS) {
    try {
      await db.exec({ sql });
    } catch (e) {
      console.error(`Failed to execute schema statement for db ${dbName}`, e);
      console.error('Statement: ', sql);
      throw e;
    }
  }

  // After ensuring tables exist, run migrations to add columns.
  await migrateDB(db);

  dbInstance = db;
  return dbInstance;
}