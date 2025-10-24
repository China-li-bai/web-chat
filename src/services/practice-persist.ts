import { getDB } from './db';

type GeneratedPractice = {
  referenceText: string;
  dialogue: Array<{
    role: 'user' | 'assistant';
    originalRole?: string;
    content: string;
    contentZh?: string;
  }>;
  tips: string[];
  tipsZh?: string[];
  vocabulary: Array<{ word: string; gloss: string; glossZh?: string }>;
  meta: {
    goal: string;
    lang: string;
    level: string;
    tone: string;
  };
};

/**
 * Persist generated practice JSON into DB:
 * - Create a practice_sessions row (topic from meta.goal, difficulty from meta.level, userId)
 * - Create a practice_turns row with referenceText
 * - Map dialogue items to practice_messages (role user/assistant; store originalRole in meta)
 * - Store tips and vocabulary as system messages with meta.type
 */
export async function saveGeneratedPractice(payload: GeneratedPractice, userId: string): Promise<{ sessionId: number, turnId: number }> {
  const db = await getDB();

  // Create session
  const topic = payload?.meta?.goal || 'practice';
  const difficulty = payload?.meta?.level || 'unknown';
  const createdAt = new Date().toISOString();

  const sessionId = await db.exec({
    sql: `
      INSERT INTO "practice_sessions" ("userId","topic","difficulty","createdAt","lastUpdated")
      VALUES (?1, ?2, ?3, ?4, ?4);
    `,
    args: [userId, topic, difficulty, createdAt]
  }).then(() => db.exec({ sql: 'SELECT last_insert_rowid() AS id;' }))
    .then((rows: any) => {
      if (Array.isArray(rows) && rows[0]?.id != null) return Number(rows[0].id);
      // Fallback: query latest session by user and createdAt
      return db.exec({
        sql: `SELECT "id" FROM "practice_sessions" WHERE "userId" = ?1 ORDER BY "id" DESC LIMIT 1;`,
        args: [userId]
      }).then((r: any) => Number(r[0]?.id));
    });

  // Create turn with referenceText
  await db.exec({
    sql: `
      INSERT INTO "practice_turns" ("sessionId","referenceText","createdAt")
      VALUES (?1, ?2, ?3);
    `,
    args: [sessionId, payload.referenceText || '', createdAt]
  });
  const turnId: number = await db.exec({ sql: 'SELECT last_insert_rowid() AS id;' })
    .then((rows: any) => Number(rows?.[0]?.id));

  // Helper to insert a practice message
  const insertMessage = async (role: 'system' | 'user' | 'assistant', content: string, contentZh: string, metaObj?: any, langOverride?: string | null) => {
    const metaStr = metaObj ? JSON.stringify(metaObj) : null;
    await db.exec({
      sql: `
        INSERT INTO "practice_messages" ("sessionId","role","content","contentZh","lang","meta","createdAt")
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7);
      `,
      args: [sessionId, role, content, contentZh, langOverride ?? (payload?.meta?.lang || null), metaStr, new Date().toISOString()]
    });
  };

  // Insert dialogue messages
  for (const item of payload.dialogue || []) {
    // role already user/assistant per adjusted prompt; keep originalRole in meta
    const meta: any = {
      originalRole: item.originalRole || null
    };
    // 保存 contentZh，即使是空字符串也要保存
    if (item.contentZh !== undefined) {
      meta.contentZh = item.contentZh;
    }
    await insertMessage(item.role, item.content, item.contentZh || '', meta, 'en-US');
  }

  // Insert tips as system message
  if (payload.tips?.length) {
    {
      const tipsMeta: any = { type: 'tips' };
      if (Array.isArray(payload.tipsZh) && payload.tipsZh.length) {
        tipsMeta.tipsZh = payload.tipsZh;
      }
      await insertMessage('system', payload.tips.join('\n'), tipsMeta);
    }
  }

  // Insert vocabulary as system message
  if (payload.vocabulary?.length) {
    const vocabText = payload.vocabulary.map(v => `${v.word} — ${v.gloss}${v.glossZh ? ' ｜ ' + v.glossZh : ''}`).join('\n');
    await insertMessage('system', vocabText, { type: 'vocabulary', items: payload.vocabulary });
  }

  // Update session lastUpdated
  await db.exec({
    sql: `UPDATE "practice_sessions" SET "lastUpdated" = ?1 WHERE "id" = ?2;`,
    args: [new Date().toISOString(), sessionId]
  });

  return { sessionId, turnId };
}

/**
 * If prompt still outputs roles like "Learner"/"Partner", map them here safely.
 */
export function normalizeDialogueRoles(dialogue: Array<{ role: string; content: string }>): GeneratedPractice['dialogue'] {
  const mapRole = (r: string): 'user' | 'assistant' => {
    const lower = (r || '').toLowerCase();
    if (['user', 'learner', 'candidate', 'speaker a'].includes(lower)) return 'user';
    return 'assistant'; // interviewer, partner, coach, speaker b -> assistant
  };
  return (dialogue || []).map(d => ({
    ...d,
    role: mapRole(d.role),
    originalRole: d.role,
    content: d.content
  }));
}