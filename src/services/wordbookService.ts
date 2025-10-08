import { getDB } from './db';
type Row = any;
import cet4Data from '@/data/cet4-core.json';
import gmatData from '@/data/gmat-core.json';
import satData from '@/data/sat-advanced.json';

export interface Wordbook extends Row {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface WordbookWithStats extends Wordbook {
  wordCount: number;
  progress: number; // 0-100
  masteredCount: number;
  dueCount: number;
  lastStudied?: string;
}

interface ImportWord {
  word: string;
  phonetic?: string;
  definition: string;
  example?: string;
}

interface ImportFile {
  name: string;
  description?: string;
  words: ImportWord[];
}

async function seedFromFile(db: any, fileData: ImportFile) {
  const { name, description, words } = fileData;
  
  // 1. Insert wordbook
  await db.exec({
    sql: 'INSERT INTO "wordbooks" ("name", "description") VALUES (?, ?)',
    args: [name, description || ''],
  });
  const wordbookIdResult = await db.exec({ sql: 'SELECT last_insert_rowid() as id' });
  const wordbookId = wordbookIdResult[0].id as number;

  // 2. Batch insert words and their learning progress
  for (const word of words) {
    await db.exec({
      sql: 'INSERT INTO "words" ("wordbookId", "word", "phonetic", "definition", "example") VALUES (?, ?, ?, ?, ?)',
      args: [wordbookId, word.word, word.phonetic || null, word.definition, word.example || null],
    });
    const wordIdResult = await db.exec({ sql: 'SELECT last_insert_rowid() as id' });
    const wordId = wordIdResult[0].id as number;

    await db.exec({
      sql: 'INSERT INTO "learning_progress" ("wordId", "nextReview") VALUES (?, ?)',
      args: [wordId, new Date().toISOString()],
    });
  }
}

// Function to seed initial data
export async function seedInitialData() {
  const db = await getDB();
  
  const existingWordbooks = await db.exec({ sql: 'SELECT "id" FROM "wordbooks" LIMIT 1' });
  if (existingWordbooks.length > 0) {
    console.log('Data already seeded.');
    return;
  }

  console.log('Seeding initial data...');
  
  await seedFromFile(db, cet4Data as ImportFile);
  await seedFromFile(db, gmatData as ImportFile);
  await seedFromFile(db, satData as ImportFile);
  
  console.log('Seeding complete.');
}

export async function getAllWordbooksWithStats(): Promise<WordbookWithStats[]> {
  const db = await getDB();
  const books = (await db.exec({
    sql: 'SELECT * FROM "wordbooks" ORDER BY "createdAt" DESC',
  })) as any[];

  const statsPromises = (books as Wordbook[]).map(async (book) => {
    const wordCountResult = await db.exec({
      sql: 'SELECT COUNT(*) as count FROM "words" WHERE "wordbookId" = ?',
      args: [book.id],
    });
    const wordCount = (wordCountResult[0]?.count as number) || 0;

    // Get mastered count
    const masteredCountResult = await db.exec({
      sql: `
        SELECT COUNT(*) as count
        FROM "learning_progress"
        WHERE "wordId" IN (SELECT "id" FROM "words" WHERE "wordbookId" = ?)
        AND "state" = 'review'
      `,
      args: [book.id],
    });
    const masteredCount = (masteredCountResult[0]?.count as number) || 0;

    // Get due count (words that need to be studied now)
    const now = new Date().toISOString();
    const dueCountResult = await db.exec({
      sql: `
        SELECT COUNT(*) as count
        FROM "learning_progress"
        WHERE "wordId" IN (SELECT "id" FROM "words" WHERE "wordbookId" = ?)
        AND "nextReview" <= ?
      `,
      args: [book.id, now],
    });
    const dueCount = (dueCountResult[0]?.count as number) || 0;

    // Get last studied date
    const lastStudiedResult = await db.exec({
      sql: `
        SELECT MAX("timestamp") as lastStudied
        FROM "study_logs"
        WHERE "itemId" IN (SELECT "id" FROM "words" WHERE "wordbookId" = ?)
      `,
      args: [book.id],
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

interface ImportWord {
  word: string;
  phonetic?: string;
  definition: string;
  example?: string;
}

interface ImportFile {
  name: string;
  description?: string;
  words: ImportWord[];
}

export async function importWordbook(jsonContent: string): Promise<void> {
  const db = await getDB();
  const data: ImportFile = JSON.parse(jsonContent);

  // 1. Check if wordbook with the same name already exists
  const existing = await db.exec({
    sql: 'SELECT "id" FROM "wordbooks" WHERE "name" = ?',
    args: [data.name],
  });

  if (existing.length > 0) {
    throw new Error(`A wordbook with the name "${data.name}" already exists.`);
  }

  // 2. Insert the new wordbook
  await db.exec({
    sql: 'INSERT INTO "wordbooks" ("name", "description") VALUES (?, ?)',
    args: [data.name, data.description || ''],
  });
  const wordbookIdResult = await db.exec({ sql: 'SELECT last_insert_rowid() as id' });
  const wordbookId = wordbookIdResult[0].id as number;

  // 3. Batch insert words and their learning progress
  for (const word of data.words) {
    // Insert word
    await db.exec({
      sql: 'INSERT INTO "words" ("wordbookId", "word", "phonetic", "definition", "example") VALUES (?, ?, ?, ?, ?)',
      args: [wordbookId, word.word, word.phonetic || null, word.definition, word.example || null],
    });
    const wordIdResult = await db.exec({ sql: 'SELECT last_insert_rowid() as id' });
    const wordId = wordIdResult[0].id as number;

    // Create initial learning progress for the new word
    await db.exec({
      sql: 'INSERT INTO "learning_progress" ("wordId", "nextReview") VALUES (?, ?)',
      args: [wordId, new Date().toISOString()],
    });
  }
}