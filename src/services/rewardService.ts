export type RewardType = 'streak' | 'daily-goal' | 'weekly-consistency' | 'mastery';
export type RewardLevel = 'bronze' | 'silver' | 'gold' | 'diamond' | 'focus' | 'overachiever';

export interface Reward {
  id: string;
  type: RewardType;
  level: RewardLevel;
  title: string;
  desc: string;
  icon: string;
  grantedAt: string; // ISO date
}

export interface EvaluateEventInput {
  userId: string;
  eventType: 'sessionCompleted' | 'progressUpdated';
  date?: string; // ISO date, defaults to today
  dailyQuota?: number;
}

/**
 * 简易持久化：localStorage
 * 结构：
 * - rewards:{userId} => Reward[]
 * - streak:{userId} => number
 * - dailyFocus:{userId}:{yyyy-mm-dd} => number（当日完成数）
 */
function readRewards(userId: string): Reward[] {
  const raw = localStorage.getItem(`rewards:${userId}`);
  return raw ? JSON.parse(raw) : [];
}
function writeRewards(userId: string, rewards: Reward[]) {
  localStorage.setItem(`rewards:${userId}`, JSON.stringify(rewards));
}
function readStreak(userId: string): number {
  const raw = localStorage.getItem(`streak:${userId}`);
  return raw ? Number(raw) : 0;
}
function writeStreak(userId: string, value: number) {
  localStorage.setItem(`streak:${userId}`, String(value));
}
function readDailyFocusCount(userId: string, dateISO: string): number {
  const key = `dailyFocus:${userId}:${dateISO.slice(0,10)}`;
  const raw = localStorage.getItem(key);
  return raw ? Number(raw) : 0;
}
export function addDailyFocusProgress(userId: string, dateISO: string, countDelta: number) {
  const key = `dailyFocus:${userId}:${dateISO.slice(0,10)}`;
  const prev = readDailyFocusCount(userId, dateISO);
  localStorage.setItem(key, String(prev + countDelta));
}

/**
 * 计算 streak（初版：读取 localStorage；后续可由 study_logs 真实计算替换）
 */
export function computeStreak(params: { userId: string }): number {
  const { userId } = params;
  return readStreak(userId);
}

/**
 * 计算当日目标达成（初版：根据 localStorage 的 dailyFocus 计数与传入配额判断）
 */
export function computeDailyGoal(params: { userId: string; date: string; dailyQuota: number }): { achieved: boolean; overachiever: boolean; count: number } {
  const { userId, date, dailyQuota } = params;
  const count = readDailyFocusCount(userId, date);
  const achieved = count >= dailyQuota;
  const overachiever = count >= Math.ceil(dailyQuota * 1.5);
  return { achieved, overachiever, count };
}

function hasReward(existing: Reward[], type: RewardType, level: RewardLevel): boolean {
  return existing.some(r => r.type === type && r.level === level);
}

function makeReward(type: RewardType, level: RewardLevel): Reward {
  const id = `${type}:${level}:${Date.now()}`;
  const grantedAt = new Date().toISOString();
  if (type === 'streak') {
    const titleMap: Record<RewardLevel, string> = { bronze: '连击·青铜', silver: '连击·白银', gold: '连击·黄金', diamond: '连击·钻石', focus: '今日目标', overachiever: '超额完成' };
    const descMap: Record<RewardLevel, string> = {
      bronze: '连续 3 天坚持学习',
      silver: '连续 7 天坚持学习',
      gold: '连续 14 天坚持学习',
      diamond: '连续 30 天坚持学习',
      focus: '达成今日目标',
      overachiever: '超额完成每日目标'
    };
    const icon = 'fire';
    return { id, type, level, title: titleMap[level], desc: descMap[level], icon, grantedAt };
  }
  if (type === 'daily-goal') {
    const title = level === 'overachiever' ? '超额完成' : '今日目标达成';
    const desc = level === 'overachiever' ? '完成了 1.5× 的今日任务' : '完成了今日任务配额';
    const icon = 'trophy';
    return { id, type, level, title, desc, icon, grantedAt };
  }
  if (type === 'weekly-consistency') {
    return { id, type, level: 'gold', title: '周度稳定', desc: '本周 5 天达成每日目标', icon: 'calendar', grantedAt };
  }
  return { id, type, level: 'gold', title: '掌握里程碑', desc: '词书掌握率达到 80%', icon: 'star', grantedAt };
}

/**
 * 奖励评估（初版）：评估 streak 徽章与当日目标徽章
 * - streak：读取本地 streak 值，授予对应等级（不重复）
 * - daily-goal：根据 dailyQuota 与当日完成数授予 focus/overachiever
 */
export function evaluateRewardsOnEvent(input: EvaluateEventInput): { granted: Reward[] } {
  const { userId, eventType } = input;
  const dateISO = (input.date && input.date.length > 0) ? input.date : new Date().toISOString();
  const existing = readRewards(userId);
  const granted: Reward[] = [];

  // streak 评估
  const streak = readStreak(userId);
  const streakLevels: Array<{ min: number; level: RewardLevel }> = [
    { min: 30, level: 'diamond' },
    { min: 14, level: 'gold' },
    { min: 7, level: 'silver' },
    { min: 3, level: 'bronze' }
  ];
  for (const s of streakLevels) {
    if (streak >= s.min && !hasReward(existing, 'streak', s.level)) {
      const r = makeReward('streak', s.level);
      existing.push(r);
      granted.push(r);
      break; // 授予最高等级一次
    }
  }

  // 当日目标评估（仅在 sessionCompleted/progressUpdated 事件进行）
  const dailyQuota = input.dailyQuota ?? 60;
  const dg = computeDailyGoal({ userId, date: dateISO, dailyQuota });
  if (dg.overachiever && !hasReward(existing, 'daily-goal', 'overachiever')) {
    const r = makeReward('daily-goal', 'overachiever');
    existing.push(r);
    granted.push(r);
  } else if (dg.achieved && !hasReward(existing, 'daily-goal', 'focus')) {
    const r = makeReward('daily-goal', 'focus');
    existing.push(r);
    granted.push(r);
  }

  writeRewards(userId, existing);
  return { granted };
}

/**
 * 获取用户奖励列表
 */
export function getUserRewards(params: { userId: string }): Reward[] {
  return readRewards(params.userId);
}