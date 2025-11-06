/**
 * Game Domain Schema - 游戏化学习相关表结构
 * 包括: game_sessions, game_questions, game_answers, game_results, game_statistics
 */

export const GAME_SCHEMA = [
  // 游戏会话表
  `
  CREATE TABLE IF NOT EXISTS "game_sessions" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "wordbookId" INTEGER NOT NULL,
    "gameType" TEXT NOT NULL CHECK("gameType" IN ('vocabulary-match', 'definition-match', 'listening-match', 'spelling-bee')),
    "difficulty" TEXT NOT NULL CHECK("difficulty" IN ('easy', 'medium', 'hard', 'expert')),
    "status" TEXT NOT NULL CHECK("status" IN ('waiting', 'countdown', 'playing', 'paused', 'finished')) DEFAULT 'waiting',
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "timeRemaining" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "settings" TEXT NOT NULL,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("wordbookId") REFERENCES "wordbooks" ("id") ON DELETE CASCADE
  );
  `,

  // 游戏问题表
  `
  CREATE TABLE IF NOT EXISTS "game_questions" (
    "id" TEXT PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "translation" TEXT,
    "phonetic" TEXT,
    "example" TEXT,
    "options" TEXT NOT NULL, -- JSON string of options
    "correctAnswer" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL CHECK("difficulty" IN ('easy', 'medium', 'hard', 'expert')),
    "timeLimit" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sessionId") REFERENCES "game_sessions" ("id") ON DELETE CASCADE
  );
  `,

  // 游戏答题记录表
  `
  CREATE TABLE IF NOT EXISTS "game_answers" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "questionId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userAnswer" INTEGER NOT NULL,
    "isCorrect" INTEGER NOT NULL CHECK("isCorrect" IN (0, 1)),
    "responseTime" INTEGER NOT NULL,
    "timeUsed" INTEGER NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TEXT NOT NULL,
    "feedback" TEXT, -- JSON string of feedback data
    FOREIGN KEY ("questionId") REFERENCES "game_questions" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("sessionId") REFERENCES "game_sessions" ("id") ON DELETE CASCADE
  );
  `,

  // 游戏结果表 - 会话结束后的汇总数据
  `
  CREATE TABLE IF NOT EXISTS "game_results" (
    "id" TEXT PRIMARY KEY,
    "sessionId" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "wordbookId" INTEGER NOT NULL,
    "gameType" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "finalAccuracy" REAL NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "averageResponseTime" REAL NOT NULL,
    "maxStreak" INTEGER NOT NULL,
    "achievements" TEXT, -- JSON string of achievement IDs
    "timeBonus" INTEGER NOT NULL DEFAULT 0,
    "difficultyBonus" INTEGER NOT NULL DEFAULT 0,
    "perfectScore" INTEGER NOT NULL CHECK("perfectScore" IN (0, 1)),
    "speedBonus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sessionId") REFERENCES "game_sessions" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("wordbookId") REFERENCES "wordbooks" ("id") ON DELETE CASCADE
  );
  `,

  // 游戏统计表
  `
  CREATE TABLE IF NOT EXISTS "game_statistics" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "wordbookId" INTEGER,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "averageAccuracy" REAL NOT NULL DEFAULT 0,
    "averageResponseTime" REAL NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "favoriteGameType" TEXT,
    "favoriteDifficulty" TEXT,
    "totalPlayTime" INTEGER NOT NULL DEFAULT 0, -- 毫秒
    "lastPlayed" TEXT,
    "achievements" TEXT, -- JSON string of achievement IDs
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("wordbookId") REFERENCES "wordbooks" ("id") ON DELETE CASCADE,
    UNIQUE("userId", "wordbookId")
  );
  `
];

export const GAME_INDICES = [
  // 游戏会话查询优化
  `CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON "game_sessions"("userId");`,
  `CREATE INDEX IF NOT EXISTS idx_game_sessions_wordbook ON "game_sessions"("wordbookId");`,
  `CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON "game_sessions"("status");`,
  
  // 游戏问题查询优化
  `CREATE INDEX IF NOT EXISTS idx_game_questions_session ON "game_questions"("sessionId");`,
  
  // 游戏答题记录查询优化
  `CREATE INDEX IF NOT EXISTS idx_game_answers_session ON "game_answers"("sessionId");`,
  `CREATE INDEX IF NOT EXISTS idx_game_answers_question ON "game_answers"("questionId");`,
  
  // 游戏结果查询优化
  `CREATE INDEX IF NOT EXISTS idx_game_results_user ON "game_results"("userId");`,
  
  // 游戏统计查询优化
  `CREATE INDEX IF NOT EXISTS idx_game_statistics_user ON "game_statistics"("userId");`,
  `CREATE INDEX IF NOT EXISTS idx_game_statistics_wordbook ON "game_statistics"("wordbookId");`
];

export type GameType = 'vocabulary-match' | 'definition-match' | 'listening-match' | 'spelling-bee';
export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type GameStatus = 'waiting' | 'countdown' | 'playing' | 'paused' | 'finished';

export interface GameSessionEntity {
  id: string;
  userId: string;
  wordbookId: number;
  gameType: GameType;
  difficulty: GameDifficulty;
  status: GameStatus;
  startTime: string;
  endTime?: string;
  currentQuestionIndex: number;
  timeRemaining: number;
  totalScore: number;
  correctAnswers: number;
  totalQuestions: number;
  streak: number;
  maxStreak: number;
  settings: string; // JSON
  createdAt: string;
}

export interface GameQuestionEntity {
  id: string;
  sessionId: string;
  word: string;
  definition: string;
  translation?: string;
  phonetic?: string;
  example?: string;
  options: string; // JSON array
  correctAnswer: number;
  difficulty: GameDifficulty;
  timeLimit: number;
  points: number;
  orderIndex: number;
  createdAt: string;
}

export interface GameAnswerEntity {
  id: number;
  questionId: string;
  sessionId: string;
  userAnswer: number;
  isCorrect: 0 | 1;
  responseTime: number;
  timeUsed: number;
  pointsEarned: number;
  timestamp: string;
  feedback?: string; // JSON
}

export interface GameResultEntity {
  id: string;
  sessionId: string;
  userId: string;
  wordbookId: number;
  gameType: GameType;
  difficulty: GameDifficulty;
  startTime: string;
  endTime: string;
  totalScore: number;
  finalAccuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  averageResponseTime: number;
  maxStreak: number;
  achievements?: string; // JSON
  timeBonus: number;
  difficultyBonus: number;
  perfectScore: 0 | 1;
  speedBonus: number;
  createdAt: string;
}

export interface GameStatisticsEntity {
  id: number;
  userId: string;
  wordbookId?: number;
  totalGames: number;
  totalQuestions: number;
  totalCorrect: number;
  averageAccuracy: number;
  averageResponseTime: number;
  bestStreak: number;
  favoriteGameType?: GameType;
  favoriteDifficulty?: GameDifficulty;
  totalPlayTime: number;
  lastPlayed?: string;
  achievements?: string; // JSON
  level: number;
  experience: number;
  createdAt: string;
  updatedAt: string;
}