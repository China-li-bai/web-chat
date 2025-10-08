import { getDB } from './db';
import sampleData from '../data/sample-learning-data.json';

/**
 * 初始化数据库表结构和示例数据
 */
export async function initializeDatabase(): Promise<void> {
  const db = await getDB();
  
  try {
    // Migration check: try to access a column from the new schema.
    // If it fails, assume old schema and wipe the tables.
    let needsMigration = false;
    try {
      const tablesResult = await db.exec({ sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='learning_progress'" });
      if (tablesResult.length > 0) {
        await db.exec({ sql: 'SELECT nextReview FROM learning_progress LIMIT 1' });
      }
    } catch (e: any) {
      if (e.message.includes('no such column')) {
        needsMigration = true;
      }
    }

    if (needsMigration) {
      console.warn('Detected legacy schema. Recreating tables to align with current schema.');
      await db.exec({ sql: 'DROP TABLE IF EXISTS study_logs' });
      await db.exec({ sql: 'DROP TABLE IF EXISTS learning_progress' });
      await db.exec({ sql: 'DROP TABLE IF EXISTS words' });
      await db.exec({ sql: 'DROP TABLE IF EXISTS wordbooks' });
      await db.exec({ sql: 'DROP TABLE IF EXISTS learning_statistics' });
      await db.exec({ sql: 'DROP TABLE IF EXISTS word_type_statistics' });
    }

    // Create all necessary tables (IF NOT EXISTS)
    await createTables(db);
    
    // Check if we need to seed data
    const existingData = await db.exec({
      sql: 'SELECT COUNT(*) as count FROM wordbooks'
    });
    const existingCount = Number((existingData && existingData[0] && (existingData[0] as any).count) ?? 0);
    
    if (existingCount === 0) {
      // Insert sample data
      await insertSampleData(db);
      console.log('Sample data initialized successfully');
    } else {
      console.log('Database already contains data, skipping initialization');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * 创建所有必要的数据库表
 */
async function createTables(db: any): Promise<void> {
  // 创建学习统计表
  await db.exec({
    sql: `CREATE TABLE IF NOT EXISTS learning_statistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      totalReviews INTEGER NOT NULL DEFAULT 0,
      correctReviews INTEGER NOT NULL DEFAULT 0,
      totalResponseTime REAL NOT NULL DEFAULT 0,
      avgResponseTime REAL NOT NULL DEFAULT 0,
      avgStability REAL NOT NULL DEFAULT 0,
      avgRetrievability REAL NOT NULL DEFAULT 0,
      streakDays INTEGER NOT NULL DEFAULT 0,
      UNIQUE(userId, date)
    )`
  });

  // 创建单词类型统计表
  await db.exec({
    sql: `CREATE TABLE IF NOT EXISTS word_type_statistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      wordType TEXT NOT NULL,
      totalReviews INTEGER NOT NULL DEFAULT 0,
      correctReviews INTEGER NOT NULL DEFAULT 0,
      avgStability REAL NOT NULL DEFAULT 0,
      avgRetrievability REAL NOT NULL DEFAULT 0,
      UNIQUE(userId, date, wordType)
    )`
  });

  // 创建学习进度表（与 db.ts 对齐）
  await db.exec({
    sql: `CREATE TABLE IF NOT EXISTS learning_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wordId INTEGER NOT NULL UNIQUE,
      stability REAL NOT NULL DEFAULT 0,
      retrievability REAL NOT NULL DEFAULT 1,
      difficulty REAL NOT NULL DEFAULT 0.3,
      nextReview TEXT NOT NULL,
      lastReview TEXT,
      reviewCount INTEGER NOT NULL DEFAULT 0,
      lapseCount INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL CHECK(state IN ('new','learning','review','relearning')) DEFAULT 'new',
      FOREIGN KEY (wordId) REFERENCES words (id) ON DELETE CASCADE
    )`
  });

  // 创建学习日志表（与 db.ts 对齐）
  await db.exec({
    sql: `CREATE TABLE IF NOT EXISTS study_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      itemId INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      response TEXT NOT NULL CHECK(response IN ('again','hard','good','easy')),
      responseTime INTEGER NOT NULL,
      confidence REAL,
      previousStability REAL,
      previousRetrievability REAL,
      newStability REAL,
      newRetrievability REAL,
      FOREIGN KEY (itemId) REFERENCES words (id) ON DELETE CASCADE
    )`
  });

  // 创建单词表（与 db.ts 对齐）
  await db.exec({
    sql: `CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wordbookId INTEGER NOT NULL,
      word TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'vocabulary',
      phonetic TEXT,
      definition TEXT NOT NULL,
      example TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wordbookId) REFERENCES wordbooks (id) ON DELETE CASCADE,
      UNIQUE (wordbookId, word)
    )`
  });

  // 创建单词本表（与 db.ts 对齐）
  await db.exec({
    sql: `CREATE TABLE IF NOT EXISTS wordbooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  });
}

/**
 * 插入示例数据
 */
async function insertSampleData(db: any): Promise<void> {
  // 插入学习统计数据
  for (const stat of sampleData.learningStatistics) {
    await db.exec({
      sql: `INSERT OR REPLACE INTO learning_statistics 
        (userId, date, totalReviews, correctReviews, totalResponseTime, avgResponseTime, avgStability, avgRetrievability, streakDays)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        stat.userId,
        stat.date,
        stat.totalReviews,
        stat.correctReviews,
        stat.totalResponseTime,
        stat.avgResponseTime,
        stat.avgStability,
        stat.avgRetrievability,
        stat.streakDays
      ]
    });
  }

  // 插入单词类型统计数据
  const today = new Date().toISOString().split('T')[0];
  for (const wordTypeStat of sampleData.wordTypeStatistics) {
    await db.exec({
      sql: `INSERT OR REPLACE INTO word_type_statistics 
        (userId, date, wordType, totalReviews, correctReviews, avgStability, avgRetrievability)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        wordTypeStat.userId,
        wordTypeStat.date || today,
        wordTypeStat.wordType,
        wordTypeStat.totalReviews,
        wordTypeStat.correctReviews,
        wordTypeStat.avgStability,
        wordTypeStat.avgRetrievability
      ]
    });
  }

  // 插入学习进度数据（与 schema 对齐：使用 wordId）
  for (const progress of sampleData.learningProgress) {
    await db.exec({
      sql: `INSERT OR REPLACE INTO learning_progress 
        (wordId, state, nextReview, lastReview, reviewCount, stability, difficulty, retrievability)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        Number(progress.itemId),
        progress.state ?? 'new',
        progress.nextReview ?? new Date().toISOString(),
        progress.lastReview ?? null,
        progress.reviewCount ?? 0,
        progress.stability ?? 0,
        progress.difficulty ?? 0.3,
        progress.retrievability ?? 1
      ]
    });
  }

  // 插入学习日志数据（插入必需字段）
  for (const log of sampleData.studyLogs) {
    await db.exec({
      sql: `INSERT INTO study_logs 
        (itemId, timestamp, response, responseTime)
        VALUES (?, ?, ?, ?)`,
      args: [
        Number(log.itemId),
        log.timestamp,
        log.response,
        log.responseTime
      ]
    });
  }

  // 插入示例单词本
  await db.exec({
    sql: `INSERT INTO wordbooks (name, description)
      VALUES (?, ?)`,
    args: ['CET-4 Core Vocabulary', 'Essential vocabulary for CET-4 exam']
  });
  const wbRow = await db.exec({ sql: 'SELECT last_insert_rowid() as id' });
  const wbId = wbRow[0].id as number;

  // 插入一些示例单词
  const sampleWords = [
    { word: 'abandon', definition: 'to give up completely', phonetic: '/əˈbændən/', example: 'He had to abandon his car in the snow.' },
    { word: 'ability', definition: 'the capacity to do something', phonetic: '/əˈbɪləti/', example: 'She has the ability to learn quickly.' },
    { word: 'absolute', definition: 'complete and total', phonetic: '/ˈæbsəluːt/', example: 'There was absolute silence in the room.' }
  ];

  for (const word of sampleWords) {
    await db.exec({
      sql: `INSERT INTO words (wordbookId, word, type, phonetic, definition, example)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [wbId, word.word, 'vocabulary', word.phonetic || null, word.definition, word.example || null]
    });
    const row = await db.exec({ sql: 'SELECT last_insert_rowid() as id' });
    const newWordId = row[0].id as number;
    await db.exec({
      sql: `INSERT INTO learning_progress (wordId, nextReview, state) VALUES (?, ?, ?)`,
      args: [newWordId, new Date().toISOString(), 'new']
    });
  }
}

/**
 * 检查数据库是否已初始化
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    const db = await getDB();
    const result = await db.exec({
      sql: 'SELECT COUNT(*) as count FROM learning_statistics'
    });
    const count = Number((result && result[0] && (result[0] as any).count) ?? 0);
    return count > 0;
  } catch (error) {
    return false;
  }
}