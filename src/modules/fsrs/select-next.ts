import fsrsConfig from '@/config/fsrs-config';

// 供页面最小集成使用的输入结构（从现有数据提取）
// 注意：不引入外部状态源，全部由调用方传入，避免双源
export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface FsrsMeta {
  dueAt?: string | Date;     // 到期时间
  stability?: number;        // 稳定性（天）
  difficulty?: number;       // [0..1]
  lapses?: number;
  lastRating?: Rating;
}

export interface CandidateItem {
  id: string;
  kind: 'review' | 'learning' | 'new';
  fsrs?: FsrsMeta;
}

export interface SessionSnapshot {
  now: Date;
  newCount: number;
  reviewCount: number;
  learningCount: number;
  seenToday: number;
}

export interface SelectInput {
  items: CandidateItem[]; // 与 itemsSource 对齐（顺序不重要）
  // 当前索引（回退用）
  currentIndex: number;
  // 从页面 Session/Store 传入的快照
  session: SessionSnapshot;
}

export interface SelectResult {
  index: number; // 选择的 items 索引
  reason: string;
  debug: any;
}

// 计算 due 分数：到期/过期越久，得分越高
function dueScore(meta?: FsrsMeta, now = new Date()): number {
  if (!meta?.dueAt) return 0;
  const dueTs = typeof meta.dueAt === 'string' ? Date.parse(meta.dueAt) : meta.dueAt.getTime();
  const deltaMs = now.getTime() - dueTs;
  if (deltaMs <= 0) return 0;
  const hours = deltaMs / 3600000;
  const boost = Math.min(fsrsConfig.due.maxBoost, fsrsConfig.due.overdueBoostPerHour * hours);
  return Math.max(0, fsrsConfig.due.baseWeight + boost);
}

// 稳定性剪裁（防止极端值）
function clampStability(s?: number): number {
  if (typeof s !== 'number') return fsrsConfig.clip.minStability;
  return Math.max(fsrsConfig.clip.minStability, Math.min(fsrsConfig.clip.maxStability, s));
}

// 基于 session 状态动态推导期望新词比例
function desiredNewRatio(session: SessionSnapshot): number {
  const { dailyNewTarget, minNewRatio, maxNewRatio } = fsrsConfig.ratio;
  const progress = session.newCount / Math.max(1, dailyNewTarget);
  // 进度不足时抬高新词比例，超额则压低
  const ratio = maxNewRatio - (maxNewRatio - minNewRatio) * Math.min(1, progress);
  return Math.max(minNewRatio, Math.min(maxNewRatio, ratio));
}

export function selectNextFromFsrs(input: SelectInput): SelectResult | null {
  try {
    if (!fsrsConfig.enabled) return null;

    const { items, currentIndex, session } = input;
    if (!items?.length) return null;

    const now = session.now ?? new Date();
    const wantNewRatio = desiredNewRatio(session);

    // 统计当前比例
    const totalSeen = Math.max(1, session.newCount + session.reviewCount + session.learningCount);
    const currentNewRatio = session.newCount / totalSeen;

    // 对每个候选计算综合得分
    const scored: { idx: number; score: number; why: string; parts: any }[] = items.map((it, idx) => {
      const due = dueScore(it.fsrs, now);
      const s = clampStability(it.fsrs?.stability);
      // 队列权重
      const queueW =
        it.kind === 'review' ? fsrsConfig.queues.review :
        it.kind === 'learning' ? fsrsConfig.queues.learning :
        fsrsConfig.queues.new;

      // 新词比例校正：若当前新词比例低于期望，则对新词加分，反之减分
      let ratioAdj = 1.0;
      if (it.kind === 'new') {
        if (currentNewRatio < wantNewRatio) ratioAdj = 1.2;
        if (currentNewRatio > wantNewRatio) ratioAdj = 0.85;
      }

      // 简化的稳定性逆权重：稳定性越低越应优先复习
      const stabilityAdj = 1 + (1 - Math.min(1, s / fsrsConfig.clip.maxStability)) * 0.5;

      const score = (due + 0.0001) * queueW * ratioAdj * stabilityAdj;

      return {
        idx,
        score,
        why: `due=${due.toFixed(2)} q=${it.kind} ratioAdj=${ratioAdj.toFixed(2)} stabAdj=${stabilityAdj.toFixed(2)}`,
        parts: { due, queueW, ratioAdj, stabilityAdj, s }
      };
    });

    // 取最高分；如并列，用索引稳定选择
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (fsrsConfig.debug) {
      // eslint-disable-next-line no-console
      console.debug('[FSRS] select', {
        wantNewRatio: wantNewRatio.toFixed(2),
        currentNewRatio: currentNewRatio.toFixed(2),
        currentIndex,
        bestIndex: best?.idx,
        best
      });
    }

    if (best && Number.isFinite(best.score) && best.score > 0) {
      return { index: best.idx, reason: best.why, debug: best.parts };
    }
    return null;
  } catch (e) {
    console.error('FSRS select failed:', e);
    return null;
  }
}