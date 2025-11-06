import { getDB } from './database';
import cet4Data from '@/data/cet4-core.json';
import gmatData from '@/data/gmat-core.json';
import satData from '@/data/sat-advanced.json';
import { ImportFile, Wordbook, WordbookWithStats } from '@/types/wordbook';
import { ensureImportFileSchema } from '@/types/wordbook';


async function seedFromFile(db: any, fileData: ImportFile, userId: string) {
  const { name, description, words } = fileData;

  // Use INSERT OR IGNORE for idempotency, then fetch the ID.
  await db.exec({
    sql: 'INSERT OR IGNORE INTO "wordbooks" ("name", "description") VALUES (?, ?)',
    args: [name, description || ''],
  });
  
  const wordbookIdResult = await db.exec({
    sql: 'SELECT "id" FROM "wordbooks" WHERE "name" = ?',
    args: [name],
  });

  if (wordbookIdResult.length === 0) {
    console.error(`Failed to insert or find wordbook: ${name}`);
    return;
  }
  const wordbookId = wordbookIdResult[0].id as number;

  // Check if words for this user and wordbook already exist to prevent re-seeding
  const wordCountResult = await db.exec({
    sql: 'SELECT COUNT(*) as count FROM "words" WHERE "wordbookId" = ? AND "userId" = ?',
    args: [wordbookId, userId],
  });

  if ((wordCountResult[0]?.count as number) > 0) {
    console.log(`Words for "${name}" and user "${userId}" already exist, skipping word seed.`);
    return;
  }

  // Batch insert words and their learning progress
  for (const word of words) {
    // 幂等插入 words
    await db.exec({
      sql: 'INSERT OR IGNORE INTO "words" ("wordbookId", "userId", "word", "phonetic", "definition", "translation", "example") VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [wordbookId, userId, word.word, word.phonetic || null, word.definition, word.translation || null, word.example || null],
    });
    // 获取已存在或新插入的 wordId
    const gotWordId = await db.exec({
      sql: 'SELECT "id" FROM "words" WHERE "wordbookId" = ? AND "word" = ?',
      args: [wordbookId, word.word],
    });
    const wordId = gotWordId?.[0]?.id as number;

    // 幂等插入 learning_progress（wordId 唯一）
    await db.exec({
      sql: 'INSERT OR IGNORE INTO "learning_progress" ("wordId", "userId", "nextReview") VALUES (?, ?, ?)',
      args: [wordId, userId, new Date().toISOString()],
    });
  }
}

// Function to seed initial data
export async function seedInitialData(userId: string) {
  const db = await getDB();
  
  console.log('Seeding initial data if necessary...');
  
  await seedFromFile(db, cet4Data as ImportFile, userId);
  await seedFromFile(db, gmatData as ImportFile, userId);
  await seedFromFile(db, satData as ImportFile, userId);
  
  console.log('Seeding complete.');
}

export async function getAllWordbooksWithStats(userId: string): Promise<WordbookWithStats[]> {
  const db = await getDB();
  const books = (await db.exec({
    sql: 'SELECT * FROM "wordbooks" ORDER BY "createdAt" DESC',
  })) as any[];

  const statsPromises = (books as Wordbook[]).map(async (book) => {
    const wordCountResult = await db.exec({
      sql: 'SELECT COUNT(*) as count FROM "words" WHERE "wordbookId" = ? AND "userId" = ?',
      args: [book.id, userId],
    });
    const wordCount = (wordCountResult[0]?.count as number) || 0;

    // Get mastered count
    const masteredCountResult = await db.exec({
      sql: `
        SELECT COUNT(*) as count
        FROM "learning_progress"
        WHERE "userId" = ? AND "wordId" IN (SELECT "id" FROM "words" WHERE "wordbookId" = ? AND "userId" = ?)
        AND "state" = 'review'
      `,
      args: [userId, book.id, userId],
    });
    const masteredCount = (masteredCountResult[0]?.count as number) || 0;

    // Get due count (words that need to be studied now)
    const now = new Date().toISOString();
    const dueCountResult = await db.exec({
      sql: `
        SELECT COUNT(*) as count
        FROM "learning_progress"
        WHERE "userId" = ? AND "wordId" IN (SELECT "id" FROM "words" WHERE "wordbookId" = ? AND "userId" = ?)
        AND "nextReview" <= ?
      `,
      args: [userId, book.id, userId, now],
    });
    const dueCount = (dueCountResult[0]?.count as number) || 0;

    // Get last studied date
    const lastStudiedResult = await db.exec({
      sql: `
        SELECT MAX("timestamp") as lastStudied
        FROM "study_logs"
        WHERE "userId" = ? AND "itemId" IN (SELECT "id" FROM "words" WHERE "wordbookId" = ? AND "userId" = ?)
      `,
      args: [userId, book.id, userId],
    });
    const lastStudied = lastStudiedResult[0]?.lastStudied as string | null;

    const progress = wordCount > 0 ? (masteredCount / wordCount) * 100 : 0;

    return {
      ...book,
      wordCount,
      progress,
      masteredCount,
      dueCount,
      lastStudied: lastStudied || undefined,
    } as WordbookWithStats;
  });

  return Promise.all(statsPromises);
}

export async function checkWordbookExists(name: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.exec({
    sql: 'SELECT "id" FROM "wordbooks" WHERE "name" = ?',
    args: [name],
  });
  return existing.length > 0;
}


export async function importWordbook(jsonContent: string, userId: string): Promise<{ status: 'created' | 'updated', wordbookId: number }> {
  const db = await getDB();
  const parsed = JSON.parse(jsonContent);
  const data: ImportFile = ensureImportFileSchema(parsed);

  // 1. Check if wordbook with the same name already exists
  const existingResult = await db.exec({
    sql: 'SELECT "id" FROM "wordbooks" WHERE "name" = ?',
    args: [data.name],
  });

  let wordbookId: number;
  let status: 'created' | 'updated';

  if (existingResult.length > 0) {
    // Wordbook exists, get its ID and prepare for update
    status = 'updated';
    wordbookId = existingResult[0].id as number;
    console.log(`Updating existing wordbook for user ${userId}: ${data.name} (ID: ${wordbookId})`);
    
    // Delete old words for this user in this wordbook.
    await db.exec({
      sql: 'DELETE FROM "words" WHERE "wordbookId" = ? AND "userId" = ?',
      args: [wordbookId, userId],
    });
  } else {
    // Wordbook doesn't exist, insert it
    status = 'created';
    console.log(`Importing new wordbook: ${data.name}`);
    await db.exec({
      sql: 'INSERT INTO "wordbooks" ("name", "description") VALUES (?, ?)',
      args: [data.name, data.description || ''],
    });
    const wordbookIdResult = await db.exec({ sql: 'SELECT last_insert_rowid() as id' });
    wordbookId = wordbookIdResult[0].id as number;
  }

  // 3. Batch insert new words and their learning progress for the given user
  for (const word of data.words) {
    // 幂等插入 words
    await db.exec({
      sql: 'INSERT OR IGNORE INTO "words" ("wordbookId", "userId", "word", "phonetic", "definition", "translation", "example") VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [wordbookId, userId, word.word, word.phonetic || null, word.definition, word.translation || null, word.example || null],
    });
    // 获取已存在或新插入的 wordId
    const gotWordId = await db.exec({
      sql: 'SELECT "id" FROM "words" WHERE "wordbookId" = ? AND "word" = ?',
      args: [wordbookId, word.word],
    });
    const wordId = gotWordId?.[0]?.id as number;

    // 幂等插入 learning_progress
    await db.exec({
      sql: 'INSERT OR IGNORE INTO "learning_progress" ("wordId", "userId", "nextReview") VALUES (?, ?, ?)',
      args: [wordId, userId, new Date().toISOString()],
    });
  }
  
  return { status, wordbookId };
}