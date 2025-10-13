import qtsTunables from '@/config/qts-config';

export type DifficultyTarget = 'easy' | 'medium' | 'hard';
export type QuestionType = 'flashcard' | 'choice' | 'spelling' | 'listening';

function estimateFatigue(recentRTs: number[], rollingAcc?: number): number {
  const N = Math.min(30, recentRTs.length);
  const avgRT = N > 0 ? recentRTs.slice(-N).reduce((a, b) => a + b, 0) / N : 0;
  const denom = Math.max(200, qtsTunables.fatigue.highRT - qtsTunables.fatigue.baseRT);
  const normRT = Math.max(0, Math.min(1, (avgRT - qtsTunables.fatigue.baseRT) / denom));
  const err = typeof rollingAcc === 'number' ? 1 - rollingAcc : 0.3;
  const fatigue = Math.max(0, Math.min(1, qtsTunables.fatigue.rtWeight * normRT + qtsTunables.fatigue.accWeight * err));
  return fatigue;
}

function inferDifficultyTarget(rollingAcc?: number, recentRTs?: number[]): DifficultyTarget {
  const N = recentRTs && recentRTs.length ? Math.min(20, recentRTs.length) : 0;
  const avgRT = N > 0 ? recentRTs!.slice(-N).reduce((a, b) => a + b, 0) / N : undefined;
  if (rollingAcc !== undefined && rollingAcc < qtsTunables.difficultyTarget.lowAcc) return 'easy';
  if (avgRT !== undefined && avgRT < qtsTunables.difficultyTarget.fastRT && rollingAcc !== undefined && rollingAcc >= qtsTunables.difficultyTarget.highAcc) return 'hard';
  return 'medium';
}

function baselineType(r: number | undefined, stType: string | undefined, idx: number): QuestionType {
  if (typeof r === 'number') {
    if (r < qtsTunables.retrievability.low) return 'spelling';
    if (r < qtsTunables.retrievability.medium) return 'choice';
    return (idx % 4 === 3) ? 'listening' : 'flashcard';
  }
  if (stType === 'free_recall') return 'spelling';
  if (stType === 'recognition') return 'choice';
  return (idx % 5 === 4) ? 'listening' : 'flashcard';
}

function weightedPickStable(weights: Record<QuestionType, number>, seedStr: string, baseline: QuestionType): QuestionType {
  const buckets = [
    { t: 'flashcard' as QuestionType, w: weights.flashcard },
    { t: 'choice' as QuestionType, w: weights.choice },
    { t: 'spelling' as QuestionType, w: weights.spelling },
    { t: 'listening' as QuestionType, w: weights.listening },
  ];
  const total = buckets.reduce((s, b) => s + (b.w || 0), 0) || 1;
  const normalized = buckets.map(b => ({ t: b.t, w: (b.w || 0) / total }));
  // FNV-1a 稳定扰动
  const seed = (seedStr || '') + ':' + baseline;
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) { hash ^= seed.charCodeAt(i); hash = Math.imul(hash, 16777619) >>> 0; }
  const rnd = (hash % 1000) / 1000;
  let acc = 0;
  for (const b of normalized) {
    acc += b.w;
    if (rnd <= acc) {
      if (b.t !== baseline && (hash & 0xf) < qtsTunables.fallback.baselineRollbackOdds_16) return baseline;
      return b.t;
    }
  }
  return baseline;
}

export function selectNextQuestionType(opts: {
  currentItem: any;
  currentItemIndex: number;
  segmentWeights: { flashcard: number; choice: number; spelling: number; listening: number };
  rollingAcc?: number;
  recentRTs: number[];
}): { type: QuestionType; difficultyTarget: DifficultyTarget; reason: string; debug: any } {
  const { currentItem, currentItemIndex, segmentWeights, rollingAcc, recentRTs } = opts;
  const ms: any = currentItem?.memoryStrength || {};
  const r: number | undefined = typeof ms.retrievability === 'number' ? ms.retrievability : undefined;
  const stType: string | undefined = currentItem?.strategy?.type;

  const fatigue = estimateFatigue(recentRTs, rollingAcc);
  const target = inferDifficultyTarget(rollingAcc, recentRTs);

  const base = baselineType(r, stType, currentItemIndex);
  // 疲劳高时提升 choice 权重，低时提升 spelling 权重
  const adjWeights = {
    flashcard: segmentWeights.flashcard,
    choice: Math.min(1, segmentWeights.choice + qtsTunables.adjust.choiceBoostPerFatigue * fatigue),
    spelling: Math.max(qtsTunables.adjust.minSpellingWeight, segmentWeights.spelling - qtsTunables.adjust.spellingPenaltyPerFatigue * fatigue),
    listening: segmentWeights.listening,
  };
  const seed = String(currentItem?.item?.content || '') + ':' + currentItemIndex;
  const picked = weightedPickStable(adjWeights, seed, base);

  const reason = `target=${target}, fatigue=${fatigue.toFixed(2)}, baseline=${base}, picked=${picked}`;
  const debug = { r, stType, fatigue, target, base, weights: adjWeights };
  return { type: picked, difficultyTarget: target, reason, debug };
}

export default selectNextQuestionType;