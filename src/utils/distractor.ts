/**
 * 轻量干扰项生成器（不依赖外部词典）
 * - 从释义中抽取关键词，组合近义/反向/模糊模板
 * - 稳定随机：基于 seed 的伪随机，保证每次渲染顺序稳定
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0; // LCG
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function extractKeywords(definition: string): string[] {
  const words = (definition || '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  // 去除停用词，保留名词/形容词样式的词（粗略）
  const stop = new Set(['a','an','the','to','of','in','on','for','with','by','and','or','as','is','are','be','being','been','that','which','who','whom','from','at','this','these','those','it','its','into']);
  const kept = words.filter(w => !stop.has(w) && w.length > 2);
  // 选取前若干关键词
  const uniq = Array.from(new Set(kept));
  return uniq.slice(0, 5);
}

export function generateDistractors(definition: string, seed: number, count = 3): string[] {
  const keys = extractKeywords(definition);
  const base: string[] = [];

  // 语义模板（轻量）：相近/反向/模糊
  const tSimilar = (k: string) => [`A general idea related to ${k}.`, `A term loosely associated with ${k}.`];
  const tOpposite = (k: string) => [`The opposite or contrast of ${k}.`, `A meaning contrary to ${k}.`];
  const tVague = (k: string) => [`A concept not exactly about ${k}.`, `A general vague meaning around ${k}.`];

  if (keys.length >= 1) {
    const [k] = keys;
    base.push(...tSimilar(k), ...tOpposite(k), ...tVague(k));
  }
  if (keys.length >= 2) {
    const [k1, k2] = keys;
    base.push(
      `A notion about ${k1} but not ${k2}.`,
      `A loosely connected concept to ${k2}.`,
      `A meaning mixing ${k1} with ${k2} (incorrect).`
    );
  }
  if (keys.length === 0) {
    base.push(
      'A commonly confused term.',
      'An unrelated concept.',
      'A close but not exact meaning.',
      'A generic definition for an abstract idea.'
    );
  }

  const uniq = Array.from(new Set(base)).filter(Boolean);
  const shuffled = seededShuffle(uniq, seed);
  return shuffled.slice(0, Math.max(1, count));
}

export function stableSeedFromWord(word: string): number {
  return hashString(word || 'seed');
}