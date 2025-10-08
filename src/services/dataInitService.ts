import { getDB } from './db';
import sampleData from '../data/sample-learning-data.json';

/**
 * 初始化数据库表结构和示例数据
 */
export async function initializeDatabase(): Promise<void> {
  const db = await getDB();
  
  try {
    // 创建所有必要的表
    await createTables(db);
    
    // 检查是否已有数据
    const existingData = await db.exec({
      sql: 'SELECT COUNT(*) as count FROM learning_statistics'
    });
    
    if (existingData[0]?.count === 0) {
      // 插入示例数据
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
      wordType TEXT NOT NULL,
      totalReviews INTEGER NOT NULL DEFAULT 0,
      correctReviews INTEGER NOT NULL DEFAULT 0,
      avgStability REAL NOT NULL DEFAULT 0,
      avgRetrievability REAL NOT NULL DEFAULT 0,
      UNIQUE(userId, wordType)
    )`
  });

  // 创建学习进度表
  await db.exec({
    sql: `CREATE TABLE IF NOT EXISTS learning_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'new',
      nextReview TEXT,
      lastReview TEXT,
      reviewCount INTEGER NOT NULL DEFAULT 0,
      stability REAL NOT NULL DEFAULT 0,
      difficulty REAL NOT NULL DEFAULT 0,
      retrievability REAL NOT NULL DEFAULT 0,
      UNIQUE(userId, itemId)
    )`
  });

  // 创建学习日志表
  await db.exec({
    sql: `CREATE TABLE IF NOT EXISTS study_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      response TEXT NOT NULL,
      responseTime INTEGER NOT NULL,
      timestamp TEXT NOT NULL
    )`
  });

  // 创建单词表（如果不存在）
  await db.exec({
    sql: `CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL,
      definition TEXT NOT NULL,
      pronunciation TEXT,
      partOfSpeech TEXT,
      example TEXT,
      wordbookId TEXT NOT NULL
    )`
  });

  // 创建单词本表（如果不存在）
  await db.exec({
    sql: `CREATE TABLE IF NOT EXISTS wordbooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      totalWords INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
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
  for (const wordTypeStat of sampleData.wordTypeStatistics) {
    await db.exec({
      sql: `INSERT OR REPLACE INTO word_type_statistics 
        (userId, wordType, totalReviews, correctReviews, avgStability, avgRetrievability)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        wordTypeStat.userId,
        wordTypeStat.wordType,
        wordTypeStat.totalReviews,
        wordTypeStat.correctReviews,
        wordTypeStat.avgStability,
        wordTypeStat.avgRetrievability
      ]
    });
  }

  // 插入学习进度数据
  for (const progress of sampleData.learningProgress) {
    await db.exec({
      sql: `INSERT OR REPLACE INTO learning_progress 
        (userId, itemId, state, nextReview, lastReview, reviewCount, stability, difficulty, retrievability)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        progress.userId,
        progress.itemId,
        progress.state,
        progress.nextReview,
        progress.lastReview,
        progress.reviewCount,
        progress.stability,
        progress.difficulty,
        progress.retrievability
      ]
    });
  }

  // 插入学习日志数据
  for (const log of sampleData.studyLogs) {
    await db.exec({
      sql: `INSERT INTO study_logs 
        (userId, itemId, response, responseTime, timestamp)
        VALUES (?, ?, ?, ?, ?)`,
      args: [
        log.userId,
        log.itemId,
        log.response,
        log.responseTime,
        log.timestamp
      ]
    });
  }

  // 插入示例单词本
  await db.exec({
    sql: `INSERT OR REPLACE INTO wordbooks (id, name, description, totalWords, createdAt)
      VALUES (?, ?, ?, ?, ?)`,
    args: ['cet4-core', 'CET-4 Core Vocabulary', 'Essential vocabulary for CET-4 exam', 100, new Date().toISOString()]
  });

  // 插入一些示例单词
  const sampleWords = [
    { id: 'word-1', word: 'abandon', definition: 'to give up completely', pronunciation: '/əˈbændən/', partOfSpeech: 'verb', example: 'He had to abandon his car in the snow.', wordbookId: 'cet4-core' },
    { id: 'word-2', word: 'ability', definition: 'the capacity to do something', pronunciation: '/əˈbɪləti/', partOfSpeech: 'noun', example: 'She has the ability to learn quickly.', wordbookId: 'cet4-core' },
    { id: 'word-3', word: 'absolute', definition: 'complete and total', pronunciation: '/ˈæbsəluːt/', partOfSpeech: 'adjective', example: 'There was absolute silence in the room.', wordbookId: 'cet4-core' }
  ];

  for (const word of sampleWords) {
    await db.exec({
      sql: `INSERT OR REPLACE INTO words (id, word, definition, pronunciation, partOfSpeech, example, wordbookId)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [word.id, word.word, word.definition, word.pronunciation, word.partOfSpeech, word.example, word.wordbookId]
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
    return result[0]?.count > 0;
  } catch (error) {
    return false;
  }
}