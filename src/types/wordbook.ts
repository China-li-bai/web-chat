// Shared Wordbook schema types and helper utilities

export interface ImportWord {
  word: string;
  phonetic?: string | null;
  definition: string;
  translation?: string | null;
  example?: string | null;
  // 与 DB "words"."type" 字段对齐，默认 'vocabulary'
  type?: string | null;
}

export interface ImportFile {
  name: string;
  description?: string;
  words: ImportWord[];
}

export interface Wordbook {
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

export const DEFAULT_WORD_TYPE = 'vocabulary';

// Validate and normalize an arbitrary object into ImportFile schema
export function ensureImportFileSchema(input: any): ImportFile {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid import content: not an object');
  }
  const name = String(input.name || '').trim();
  if (!name) throw new Error('Invalid import file: "name" is required');

  const description =
    typeof input.description === 'string' ? input.description : undefined;

  const wordsRaw = Array.isArray(input.words) ? input.words : [];
  if (!Array.isArray(wordsRaw) || wordsRaw.length === 0) {
    throw new Error('Invalid import file: "words" must be a non-empty array');
  }

  const words: ImportWord[] = wordsRaw.map((w: any) => {
    const word = String(w?.word || '').trim();
    const definition = String(w?.definition || '').trim();
    if (!word || !definition) {
      throw new Error('Each word must contain "word" and "definition"');
    }
    const phonetic = w?.phonetic != null ? String(w.phonetic) : null;
    const translation = w?.translation != null ? String(w.translation) : null;
    const example = w?.example != null ? String(w.example) : null;
    const type = w?.type != null && String(w.type).trim() ? String(w.type).trim() : DEFAULT_WORD_TYPE;
    return { word, phonetic, definition, translation, example, type };
  });

  return { name, description, words };
}