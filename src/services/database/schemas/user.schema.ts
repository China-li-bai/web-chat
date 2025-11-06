/**
 * User Domain Schema - 用户相关表结构
 * 包括: achievements, user_achievements, user_levels, leaderboards
 */

export const USER_SCHEMA = [
  // 成就定义表
  `
  CREATE TABLE IF NOT EXISTS "achievements" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK("type" IN ('accuracy', 'speed', 'streak', 'volume', 'persistence', 'milestone')),
    "condition" TEXT NOT NULL, -- JSON string of condition
    "rewards" TEXT NOT NULL, -- JSON string of rewards
    "rarity" TEXT NOT NULL CHECK("rarity" IN ('common', 'rare', 'epic', 'legendary')),
    "unlockedAt" TEXT,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `,

  // 用户成就表
  `
  CREATE TABLE IF NOT EXISTS "user_achievements" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TEXT NOT NULL,
    "gameSessionId" TEXT, -- 获得成就的游戏会话
    FOREIGN KEY ("achievementId") REFERENCES "achievements" ("id") ON DELETE CASCADE,
    UNIQUE("userId", "achievementId")
  );
  `,

  // 用户等级表
  `
  CREATE TABLE IF NOT EXISTS "user_levels" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL UNIQUE,
    "level" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "experience" INTEGER NOT NULL,
    "nextLevelExperience" INTEGER NOT NULL,
    "benefits" TEXT, -- JSON string of benefits
    "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `,

  // 排行榜表
  `
  CREATE TABLE IF NOT EXISTS "leaderboards" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "period" TEXT NOT NULL CHECK("period" IN ('daily', 'weekly', 'monthly', 'allTime')),
    "gameType" TEXT CHECK("gameType" IN ('vocabulary-match', 'definition-match', 'listening-match', 'spelling-bee')),
    "difficulty" TEXT CHECK("difficulty" IN ('easy', 'medium', 'hard', 'expert')),
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "score" INTEGER NOT NULL,
    "accuracy" REAL NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 1,
    "lastPlayed" TEXT NOT NULL,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `
];

export const USER_INDICES = [
  // 用户成就查询优化
  `CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON "user_achievements"("userId");`,
  
  // 排行榜查询优化
  `CREATE INDEX IF NOT EXISTS idx_leaderboards_period ON "leaderboards"("period");`,
  `CREATE INDEX IF NOT EXISTS idx_leaderboards_user ON "leaderboards"("userId");`
];

export type AchievementType = 'accuracy' | 'speed' | 'streak' | 'volume' | 'persistence' | 'milestone';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'allTime';

export interface AchievementEntity {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: AchievementType;
  condition: string; // JSON
  rewards: string; // JSON
  rarity: AchievementRarity;
  unlockedAt?: string;
  createdAt: string;
}

export interface UserAchievementEntity {
  id: number;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  gameSessionId?: string;
}

export interface UserLevelEntity {
  id: number;
  userId: string;
  level: number;
  title: string;
  experience: number;
  nextLevelExperience: number;
  benefits?: string; // JSON
  updatedAt: string;
}

export interface LeaderboardEntity {
  id: number;
  period: LeaderboardPeriod;
  gameType?: string;
  difficulty?: string;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  accuracy: number;
  gamesPlayed: number;
  lastPlayed: string;
  createdAt: string;
  updatedAt: string;
}