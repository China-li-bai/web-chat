import { getDB } from './db';
import type { Row } from '@/packages/wa-sqlite-adapter/types';
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
      sql: 'INSERT INTO "learning_progress" ("wordId", "dueDate") VALUES (?, ?)',
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
  const books = await db.exec({
    sql: 'SELECT * FROM "wordbooks" ORDER BY "createdAt" DESC',
  });

  const statsPromises = (books as Wordbook[]).map(async (book) => {
    const wordCountResult = await db.exec({
      sql: 'SELECT COUNT(*) as count FROM "words" WHERE "wordbookId" = ?',
      args: [book.id],
    });
    const wordCount = (wordCountResult[0]?.count as number) || 0;

    let progress = 0;
    if (wordCount > 0) {
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
      progress = (masteredCount / wordCount) * 100;
    }

    return {
      ...book,
      wordCount,
      progress,
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
      sql: 'INSERT INTO "learning_progress" ("wordId", "dueDate") VALUES (?, ?)',
      args: [wordId, new Date().toISOString()],
    });
  }
}