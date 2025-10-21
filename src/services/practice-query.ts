import { getDB } from './db';

export type DialogueMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  originalRole?: string | null;
  createdAt?: string | null;
  lang?: string | null;
};

export async function getTips(sessionId: number): Promise<string[]> {
  const db = await getDB();
  const rows: any = await db.exec({
    sql: `
      SELECT "content","meta"
      FROM "practice_messages"
      WHERE "sessionId" = ?1 AND "role" = 'system'
      ORDER BY "id" ASC;
    `,
    args: [sessionId]
  });

  const tips: string[] = [];
  for (const r of rows || []) {
    let meta: any = null;
    try { meta = r.meta ? JSON.parse(r.meta) : null; } catch {}
    if (meta?.type === 'tips') {
      // content 由 saveGeneratedPractice 以换行拼接
      const lines = String(r.content || '')
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean);
      tips.push(...lines);
    }
  }
  return tips;
}

export type VocabularyItem = { word: string; gloss: string };

export async function getVocabulary(sessionId: number): Promise<VocabularyItem[]> {
  const db = await getDB();
  const rows: any = await db.exec({
    sql: `
      SELECT "content","meta"
      FROM "practice_messages"
      WHERE "sessionId" = ?1 AND "role" = 'system'
      ORDER BY "id" ASC;
    `,
    args: [sessionId]
  });

  const items: VocabularyItem[] = [];
  for (const r of rows || []) {
    let meta: any = null;
    try { meta = r.meta ? JSON.parse(r.meta) : null; } catch {}
    if (meta?.type === 'vocabulary') {
      if (Array.isArray(meta.items) && meta.items.length) {
        // 优先使用结构化 items
        for (const it of meta.items) {
          if (it?.word && it?.gloss) items.push({ word: String(it.word), gloss: String(it.gloss) });
        }
      } else {
        // 回退：从 content 行解析 “word — gloss”
        const lines = String(r.content || '').split(/\r?\n/);
        for (const line of lines) {
          const m = line.split('—'); // em dash
          if (m.length >= 2) {
            const word = m[0].trim();
            const gloss = m.slice(1).join('—').trim();
            if (word && gloss) items.push({ word, gloss });
          }
        }
      }
    }
  }
  return items;
}

export async function getReferenceText(sessionId: number): Promise<string | null> {
  const db = await getDB();
  const rows: any = await db.exec({
    sql: `
      SELECT "referenceText"
      FROM "practice_turns"
      WHERE "sessionId" = ?1
      ORDER BY "id" DESC
      LIMIT 1;
    `,
    args: [sessionId]
  });
  return rows?.[0]?.referenceText ?? null;
}

export async function getDialogue(sessionId: number): Promise<DialogueMessage[]> {
  const db = await getDB();
  const rows: any = await db.exec({
    sql: `
      SELECT "role","content","lang","meta","createdAt"
      FROM "practice_messages"
      WHERE "sessionId" = ?1 AND "role" IN ('user','assistant')
      ORDER BY "id" ASC;
    `,
    args: [sessionId]
  });

  const messages: DialogueMessage[] = [];
  for (const r of rows || []) {
    let meta: any = null;
    try { meta = r.meta ? JSON.parse(r.meta) : null; } catch {}
    messages.push({
      role: r.role,
      content: r.content,
      originalRole: meta?.originalRole ?? null,
      createdAt: r.createdAt ?? null,
      lang: r.lang ?? null
    });
  }
  return messages;
}