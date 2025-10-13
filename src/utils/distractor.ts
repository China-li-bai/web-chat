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

// 内部小工具：按 seed 取前 n 个
function pick<T>(arr: T[], n: number, seed: number): T[] {
  if (!arr || arr.length === 0) return [];
  const shuffled = seededShuffle(arr, seed);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// 模板族：相近/相反/模糊（轻量，无外部词典）
function genNearSynLike(definition: string): string[] {
  const keys = extractKeywords(definition);
  if (keys.length === 0) return [];
  const k = keys[0];
  return [
    `A meaning closely related to ${k}, but not exact.`,
    `A similar definition to ${k} with a different focus.`,
    `An approximate sense around ${k}.`,
  ];
}

function genOppositeLike(definition: string): string[] {
  const keys = extractKeywords(definition);
  if (keys.length === 0) return [];
  const k = keys[0];
  return [
    `A meaning opposite to ${k}.`,
    `A contrasting concept against ${k}.`,
  ];
}

function genVague(definition: string): string[] {
  const keys = extractKeywords(definition);
  if (keys.length === 0) {
    return ['A broad, ambiguous definition.', 'An unclear, generic meaning.'];
  }
  const k = keys[0];
  return [
    `A broad and vague idea about ${k}.`,
    `An imprecise description vaguely involving ${k}.`,
  ];
}

// 依据检索性与滚动准确率挑选难度等级
export function pickLevel(R?: number, rollingAcc?: number): 'L1'|'L2'|'L3' {
  let level: 'L1'|'L2'|'L3' = 'L2';
  if (typeof R === 'number') {
    if (R < 0.6) level = 'L1';
    else if (R >= 0.85) level = 'L3';
    else level = 'L2';
  }
  if (typeof rollingAcc === 'number') {
    if (rollingAcc < 0.7 && level !== 'L1') level = 'L1';
    if (rollingAcc > 0.9 && level !== 'L3') level = 'L3';
  }
  return level;
}

// 构建选择题（4选1）：返回 options、correctIndex、level
export function buildMCQ(definition: string, seed: number, R?: number, rollingAcc?: number) {
  const level = pickLevel(R, rollingAcc);
  const correct = definition || 'No definition provided.';
  const near = genNearSynLike(definition);
  const opp = genOppositeLike(definition);
  const vague = genVague(definition);

  let distractors: string[] = [];
  if (level === 'L1') distractors = pick(vague, 3, seed);
  if (level === 'L2') distractors = [...pick(near, 1, seed), ...pick(vague, 2, seed + 1)];
  if (level === 'L3') distractors = [...pick(near, 2, seed), ...pick(opp, 1, seed + 2)];

  const combined = [correct, ...distractors].slice(0, 4);
  const options = seededShuffle(combined, seed);
  const correctIndex = options.findIndex(v => v === correct);
  return { options, correctIndex, level };
}