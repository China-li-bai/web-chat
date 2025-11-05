// 游戏化学习系统的类型定义

export type GameType = 'vocabulary-match' | 'definition-match' | 'listening-match' | 'spelling-bee';
export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type GameStatus = 'waiting' | 'countdown' | 'playing' | 'paused' | 'finished';
export type GameResult = 'correct' | 'incorrect' | 'timeout';
export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export interface GameQuestion {
  id: string;
  word: string;
  definition: string;
  translation: string;
  options: string[]; // 选项（5个中文意思）
  correctAnswer: number; // 正确答案的索引
  difficulty: GameDifficulty;
  timeLimit: number; // 毫秒
  points: number; // 基础分数
}

export interface GameSession {
  id: string;
  userId: string;
  wordbookId: number;
  gameType: GameType;
  difficulty: GameDifficulty;
  status: GameStatus;
  startTime: string;
  endTime?: string;
  currentQuestionIndex: number;
  questions: GameQuestion[];
  timeRemaining: number; // 毫秒
  totalScore: number;
  correctAnswers: number;
  totalQuestions: number;
  streak: number; // 连续正确次数
  maxStreak: number;
  achievements: string[]; // 已获得的成就ID列表
  settings: GameSettings;
}

export interface GameSettings {
  timePerQuestion: number; // 每题时间限制（毫秒）
  showCountdown: boolean;
  showProgress: boolean;
  enableSound: boolean;
  enableVibration: boolean;
  autoNext: boolean;
  maxStreakBonus: number; // 最大连击奖励倍数
  timeBonusMultiplier: number; // 时间奖励倍数
  difficultyMultiplier: Record<GameDifficulty, number>; // 难度奖励倍数
}

export interface GameResult {
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
  achievements: Achievement[];
  timeBonus: number;
  difficultyBonus: number;
  perfectScore: boolean; // 全部正确
  speedBonus: number; // 快速完成奖励
}

export interface GameStatistics {
  userId: string;
  wordbookId: number;
  totalGames: number;
  totalQuestions: number;
  totalCorrect: number;
  averageAccuracy: number;
  averageResponseTime: number;
  bestStreak: number;
  favoriteGameType: GameType;
  favoriteDifficulty: GameDifficulty;
  totalPlayTime: number; // 总游戏时间（毫秒）
  lastPlayed: string;
  achievements: string[]; // 获得的成就ID
  level: number; // 游戏等级
  experience: number; // 经验值
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'accuracy' | 'speed' | 'streak' | 'volume' | 'persistence' | 'milestone';
  condition: AchievementCondition;
  rewards: AchievementReward;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
}

export interface AchievementCondition {
  type: string;
  value: number;
  gameType?: GameType;
  difficulty?: GameDifficulty;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'allTime';
}

export interface AchievementReward {
  experience: number;
  points: number;
  title?: string;
  badge?: string;
}

export interface GameFeedback {
  type: FeedbackType;
  message: string;
  points: number;
  timeBonus?: number;
  streakBonus?: number;
  nextAction?: 'next-question' | 'review' | 'finish';
  isCorrect: boolean;
  correctAnswer?: string;
  explanation?: string;
}

export interface UserLevel {
  level: number;
  title: string;
  experience: number;
  nextLevelExperience: number;
  progress: number; // 0-1
  benefits: string[];
}

export interface Leaderboard {
  period: 'daily' | 'weekly' | 'monthly' | 'allTime';
  gameType?: GameType;
  difficulty?: GameDifficulty;
  entries: LeaderboardEntry[];
  userRank?: number;
  userEntry?: LeaderboardEntry;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  accuracy: number;
  gamesPlayed: number;
  lastPlayed: string;
}

// 游戏状态管理接口
export interface GameStore {
  // 当前游戏会话
  currentSession: GameSession | null;
  
  // 游戏设置
  settings: GameSettings;
  
  // 用户游戏统计
  statistics: GameStatistics | null;
  
  // 可用成就
  achievements: Achievement[];
  
  // 用户等级信息
  userLevel: UserLevel;
  
  // 排行榜
  leaderboards: Record<string, Leaderboard>;
  
  // 动作
  startGame: (params: StartGameParams) => Promise<void>;
  pauseGame: () => void;
  resumeGame: () => void;
  finishGame: () => void;
  answerQuestion: (questionId: string, answerIndex: number, responseTime: number) => GameFeedback;
  skipQuestion: () => void;
  useHint: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  loadStatistics: (wordbookId: number) => Promise<void>;
  checkAchievements: () => void;
  claimAchievement: (achievementId: string) => void;
  loadLeaderboard: (period: Leaderboard['period'], gameType?: GameType, difficulty?: GameDifficulty) => Promise<void>;
  resetCurrentGame: () => void;
}

export interface StartGameParams {
  wordbookId: number;
  gameType: GameType;
  difficulty: GameDifficulty;
  questionCount: number;
  customSettings?: Partial<GameSettings>;
}

// 组件Props类型
export interface GameQuestionCardProps {
  question: GameQuestion;
  timeRemaining: number;
  onAnswer: (answerIndex: number) => void;
  onSkip?: () => void;
  onHint?: () => void;
  canUseHint: boolean;
  showFeedback?: boolean;
  feedback?: GameFeedback;
}

export interface CountdownTimerProps {
  duration: number; // 毫秒
  onComplete: () => void;
  onTick?: (remaining: number) => void;
  running: boolean;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
}

export interface AchievementNotificationProps {
  achievement: Achievement;
  onClose: () => void;
  duration?: number;
}

export interface GameResultModalProps {
  result: GameResult;
  achievements: Achievement[];
  statistics: GameStatistics;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
  onViewStatistics: () => void;
}

// 游戏API响应类型
export interface GameAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface GameWordQuestion {
  word: string;
  definition: string;
  translation: string;
  phonetic?: string;
  example?: string;
  difficulty: GameDifficulty;
}

export interface GenerateGameQuestionsParams {
  wordbookId: number;
  gameType: GameType;
  difficulty: GameDifficulty;
  count: number;
  excludeIds?: string[];
}

// 声音和触觉反馈
export interface FeedbackEffects {
  playSuccess: () => void;
  playError: () => void;
  playCountdown: () => void;
  playAchievement: () => void;
  vibrate: (pattern: number | number[]) => void;
}