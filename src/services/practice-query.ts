import { getDB } from './database';

export type DialogueItem = {
  role: 'user' | 'assistant';
  originalRole?: string | null;
  content: string;
  contentZh?: string;
  createdAt?: string | null;
};

export type VocabularyItem = {
  word: string;
  gloss: string;
  glossZh?: string;
};

export type PracticePromptOutput = {
  referenceText: string;
  dialogue: DialogueItem[];
  tips: string[];
  tipsZh?: string[];
  vocabulary: VocabularyItem[];
  meta: {
    goal: string;
    lang: string | null;
    level: string;
    tone: string | null;
  };
};

/**
 * Build practice session JSON matching practice-goal-driven.md Output Format (JSON only)
 */
export async function getPracticeSessionJSON(sessionId: number): Promise<PracticePromptOutput> {
  const db = await getDB();

  // session meta
  const sessionRow = await db.exec({
    sql: `SELECT "topic","difficulty","createdAt" FROM "practice_sessions" WHERE "id" = ?1 LIMIT 1;`,
    args: [sessionId]
  }).then((rows: any) => rows?.[0] || null);

  const goal = sessionRow?.topic || 'practice';
  const level = sessionRow?.difficulty || 'unknown';

  // latest turn referenceText
  const turnRow = await db.exec({
    sql: `SELECT "referenceText" FROM "practice_turns" WHERE "sessionId" = ?1 ORDER BY "id" DESC LIMIT 1;`,
    args: [sessionId]
  }).then((rows: any) => rows?.[0] || null);

  const referenceText = String(turnRow?.referenceText || '');

  // messages
  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    contentZh: string | null;
    lang: string | null;
    meta: any | null;
    id: number;
    createdAt: string | null;
  }> = await db.exec({
    sql: `
      SELECT "id","role","content","contentZh","lang","meta","createdAt"
      FROM "practice_messages"
      WHERE "sessionId" = ?1
      ORDER BY "id" ASC;
    `,
    args: [sessionId]
  }).then((rows: any) => {
    console.log({rows});
    
    return (rows || []).map((r: any) => ({
      id: Number(r.id),
      role: r.role as 'system' | 'user' | 'assistant',
      content: String(r.content || ''),
      contentZh: r.contentZh ?? null,
      lang: r.lang ?? null,
      meta: safeParseJSON(r.meta),
      createdAt: r.createdAt ? String(r.createdAt) : null
    }));
  });

  // infer lang from first message having lang
  const firstWithLang = messages.find(m => m.lang);
  const lang = firstWithLang?.lang ?? null;

  // extract tips and vocabulary system messages
  const tipsMsg = messages.find(m => m.role === 'system' && m.meta?.type === 'tips');
  const vocabMsg = messages.find(m => m.role === 'system' && m.meta?.type === 'vocabulary');

  const tips: string[] = tipsMsg ? splitByLines(tipsMsg.content) : [];
  const tipsZh: string[] | undefined = Array.isArray(tipsMsg?.meta?.tipsZh) ? tipsMsg!.meta!.tipsZh : undefined;

  const vocabulary: VocabularyItem[] = buildVocabulary(vocabMsg);

  const dialogue: DialogueItem[] = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role,
      originalRole: (m.meta && 'originalRole' in m.meta) ? (m.meta.originalRole ?? null) : null,
      content: m.content,
      contentZh: m.contentZh || (m.meta?.contentZh ?? m.meta?.translationZh),
      createdAt: m.createdAt ?? null
    }));

  return {
    referenceText,
    dialogue,
    tips,
    tipsZh,
    vocabulary,
    meta: {
      goal,
      lang,
      level,
      tone: null
    }
  };
}

function safeParseJSON(input: any): any | null {
  if (!input) return null;
  try {
    if (typeof input === 'string') return JSON.parse(input);
    return input;
  } catch {
    return null;
  }
}

function splitByLines(text: string): string[] {
  return (text || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

function buildVocabulary(vocabMsg: { content: string; meta: any | null } | undefined): VocabularyItem[] {
  if (!vocabMsg) return [];
  const items = Array.isArray(vocabMsg.meta?.items) ? vocabMsg.meta.items : null;
  if (items && items.length) {
    return items.map((it: any) => ({
      word: String(it.word || ''),
      gloss: String(it.gloss || ''),
      glossZh: it.glossZh ? String(it.glossZh) : undefined
    }));
  }
  // fallback: parse from content lines like "word — gloss ｜ glossZh"
  const lines = splitByLines(vocabMsg.content);
  return lines.map(line => {
    let word = '';
    let gloss = '';
    let glossZh: string | undefined = undefined;
    const zhSplit = line.split(' ｜ ');
    const left = zhSplit[0] ?? line;
    glossZh = zhSplit[1] ? zhSplit.slice(1).join(' ｜ ').trim() : undefined;

    const parts = left.split(' — ');
    word = parts[0]?.trim() || '';
    gloss = parts[1]?.trim() || '';
    return { word, gloss, glossZh };
  }).filter(it => it.word || it.gloss);
}

/**
 * List recent practice sessions for a user
 */
export async function getRecentPracticeSessions(userId: string, limit = 20, offset = 0): Promise<Array<{
  id: number;
  topic: string;
  difficulty: string;
  createdAt: string;
  lastUpdated: string | null;
}>> {
  const db = await getDB();
  const rows = await db.exec({
    sql: `
      SELECT "id","topic","difficulty","createdAt","lastUpdated"
      FROM "practice_sessions"
      WHERE "userId" = ?1
      ORDER BY COALESCE("lastUpdated","createdAt") DESC, "id" DESC
      LIMIT ?2 OFFSET ?3;
    `,
    args: [userId, limit, offset]
  });
  return (rows || []).map((r: any) => ({
    id: Number(r.id),
    topic: String(r.topic || ''),
    difficulty: String(r.difficulty || ''),
    createdAt: String(r.createdAt || ''),
    lastUpdated: r.lastUpdated ? String(r.lastUpdated) : null
  }));
}

/**
 * Get all turns under a session (ordered by id asc)
 */
export async function getPracticeTurns(sessionId: number): Promise<Array<{
  id: number;
  referenceText: string;
  createdAt: string;
  transcription: string | null;
}>> {
  const db = await getDB();
  const rows = await db.exec({
    sql: `
      SELECT "id","referenceText","createdAt","transcription"
      FROM "practice_turns"
      WHERE "sessionId" = ?1
      ORDER BY "id" ASC;
    `,
    args: [sessionId]
  });
  return (rows || []).map((r: any) => ({
    id: Number(r.id),
    referenceText: String(r.referenceText || ''),
    createdAt: String(r.createdAt || ''),
    transcription: r.transcription ? String(r.transcription) : null
  }));
}

/**
 * Frontend-friendly lightweight accessors to match existing imports in Practice.jsx
 */
export async function getDialogue(sessionId: number): Promise<DialogueItem[]> {
  const db = await getDB();
  const rows = await db.exec({
    sql: `
      SELECT "role","content","contentZh","lang","meta","createdAt"
      FROM "practice_messages"
      WHERE "sessionId" = ?1 AND "role" IN ('user','assistant')
      ORDER BY "id" ASC;
    `,
    args: [sessionId]
  });
  console.log({rows});
  
  return (rows || []).map((r: any) => {
    const meta = safeParseJSON(r.meta);
    return {
      role: r.role,
      originalRole: meta?.originalRole ?? null,
      content: String(r.content || ''),
      contentZh: r.contentZh || (meta?.contentZh ?? meta?.translationZh),
      createdAt: r.createdAt ? String(r.createdAt) : null
    } as DialogueItem;
  });
}

export async function getTips(sessionId: number): Promise<string[]> {
  const db = await getDB();
  const row = await db.exec({
    sql: `
      SELECT "content","meta"
      FROM "practice_messages"
      WHERE "sessionId" = ?1 AND "role" = 'system'
      ORDER BY CASE WHEN json_extract("meta",'$.type')='tips' THEN 0 ELSE 1 END, "id" ASC
      LIMIT 1;
    `,
    args: [sessionId]
  }).then((rows: any) => rows?.[0] || null);

  if (!row) return [];
  const meta = safeParseJSON(row.meta);
  if (meta?.type !== 'tips') return [];
  return splitByLines(String(row.content || ''));
}

export async function getVocabulary(sessionId: number): Promise<VocabularyItem[]> {
  const db = await getDB();
  const row = await db.exec({
    sql: `
      SELECT "content","meta"
      FROM "practice_messages"
      WHERE "sessionId" = ?1 AND "role" = 'system'
      ORDER BY CASE WHEN json_extract("meta",'$.type')='vocabulary' THEN 0 ELSE 1 END, "id" ASC
      LIMIT 1;
    `,
    args: [sessionId]
  }).then((rows: any) => rows?.[0] || null);

  if (!row) return [];
  const meta = safeParseJSON(row.meta);
  if (meta?.type !== 'vocabulary') return [];
  return buildVocabulary({ content: String(row.content || ''), meta });
}

export async function getReferenceText(sessionId: number): Promise<string> {
  const db = await getDB();
  const row = await db.exec({
    sql: `
      SELECT "referenceText"
      FROM "practice_turns"
      WHERE "sessionId" = ?1
      ORDER BY "id" DESC
      LIMIT 1;
    `,
    args: [sessionId]
  }).then((rows: any) => rows?.[0] || null);

  return row ? String(row.referenceText || '') : '';
}