import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  GameStore, 
  GameSession, 
  GameSettings, 
  GameStatistics, 
  Achievement, 
  UserLevel, 
  Leaderboard,
  StartGameParams,
  GameFeedback
} from '@/types/game';
import { gameService } from '@/services/gameService';

const DEFAULT_SETTINGS: GameSettings = {
  timePerQuestion: 15000, // 15秒
  showCountdown: true,
  showProgress: true,
  enableSound: true,
  enableVibration: true,
  autoNext: true,
  maxStreakBonus: 3.0, // 最大连击奖励3倍
  timeBonusMultiplier: 1.5, // 时间奖励1.5倍
  difficultyMultiplier: {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0,
    expert: 3.0
  }
};

interface GameStoreState {
  // 状态
  currentSession: GameSession | null;
  settings: GameSettings;
  statistics: GameStatistics | null;
  achievements: Achievement[];
  userLevel: UserLevel;
  leaderboards: Record<string, Leaderboard>;
  isLoading: boolean;
  error: string | null;
}

interface GameStoreActions {
  // 游戏会话管理
  startGame: (params: StartGameParams) => Promise<void>;
  pauseGame: () => void;
  resumeGame: () => void;
  finishGame: () => Promise<void>;
  resetCurrentGame: () => void;
  
  // 游戏操作
  answerQuestion: (questionId: string, answerIndex: number, responseTime: number) => GameFeedback;
  skipQuestion: () => void;
  useHint: () => void;
  
  // 数据管理
  updateSettings: (settings: Partial<GameSettings>) => void;
  loadStatistics: (wordbookId: number) => Promise<void>;
  checkAchievements: () => Promise<void>;
  claimAchievement: (achievementId: string) => void;
  loadLeaderboard: (period: Leaderboard['period'], gameType?: string, difficulty?: string) => Promise<void>;
  
  // 辅助
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

type GameStoreFull = GameStoreState & GameStoreActions;

export const useGameStore = create<GameStoreFull>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentSession: null,
      settings: DEFAULT_SETTINGS,
      statistics: null,
      achievements: [],
      userLevel: {
        level: 1,
        title: '初学者',
        experience: 0,
        nextLevelExperience: 100,
        progress: 0,
        benefits: ['基础游戏模式', '简单难度']
      },
      leaderboards: {},
      isLoading: false,
      error: null,

      // 游戏会话管理
      startGame: async (params: StartGameParams) => {
        const { settings } = get();
        const customSettings = params.customSettings ? 
          { ...settings, ...params.customSettings } : settings;

        set({ isLoading: true, error: null });

        try {
          const session = await gameService.createGameSession({
            ...params,
            settings: customSettings
          });
          set({ currentSession: session, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '创建游戏失败',
            isLoading: false 
          });
        }
      },

      pauseGame: () => {
        const { currentSession } = get();
        if (currentSession && currentSession.status === 'playing') {
          set({
            currentSession: {
              ...currentSession,
              status: 'paused'
            }
          });
        }
      },

      resumeGame: () => {
        const { currentSession } = get();
        if (currentSession && currentSession.status === 'paused') {
          set({
            currentSession: {
              ...currentSession,
              status: 'playing'
            }
          });
        }
      },

      finishGame: async () => {
        const { currentSession, settings } = get();
        if (!currentSession) return;

        set({ isLoading: true });

        try {
          const result = await gameService.finishGameSession(currentSession.id);
          set({ 
            currentSession: null, 
            isLoading: false,
            statistics: result.updatedStatistics
          });
          
          // 检查新成就
          get().checkAchievements();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '结束游戏失败',
            isLoading: false 
          });
        }
      },

      resetCurrentGame: () => {
        set({ currentSession: null });
      },

      // 游戏操作
      answerQuestion: (questionId: string, answerIndex: number, responseTime: number) => {
        const { currentSession, settings } = get();
        if (!currentSession || currentSession.status !== 'playing') {
          return {
            type: 'error',
            message: '游戏未开始',
            points: 0,
            isCorrect: false
          };
        }

        const question = currentSession.questions.find(q => q.id === questionId);
        if (!question) {
          return {
            type: 'error',
            message: '题目不存在',
            points: 0,
            isCorrect: false
          };
        }

        const isCorrect = answerIndex === question.correctAnswer;
        const timeUsed = responseTime;
        const timeRatio = Math.max(0, (question.timeLimit - timeUsed) / question.timeLimit);

        // 计算得分
        let points = question.points;
        let timeBonus = 0;
        let streakBonus = 0;

        if (isCorrect) {
          // 基础分数
          points = question.points;
          
          // 时间奖励
          if (timeRatio > 0.8) {
            timeBonus = Math.round(points * 0.5);
            points += timeBonus;
          } else if (timeRatio > 0.6) {
            timeBonus = Math.round(points * 0.25);
            points += timeBonus;
          }
          
          // 连击奖励
          const currentStreak = currentSession.streak + 1;
          if (currentStreak > 1) {
            streakBonus = Math.round(points * 0.1 * Math.min(currentStreak - 1, settings.maxStreakBonus));
            points += streakBonus;
          }
        }

        // 更新会话状态
        const newStreak = isCorrect ? currentSession.streak + 1 : 0;
        const newMaxStreak = Math.max(currentSession.maxStreak, newStreak);
        const newCorrectAnswers = currentSession.correctAnswers + (isCorrect ? 1 : 0);
        
        const updatedSession: GameSession = {
          ...currentSession,
          currentQuestionIndex: currentSession.currentQuestionIndex + 1,
          totalScore: currentSession.totalScore + points,
          streak: newStreak,
          maxStreak: newMaxStreak,
          correctAnswers: newCorrectAnswers,
          timeRemaining: currentSession.timeRemaining - timeUsed
        };

        set({ currentSession: updatedSession });

        // 保存答案到数据库
        gameService.saveAnswer(currentSession.id, questionId, {
          userAnswer: answerIndex,
          isCorrect,
          responseTime: timeUsed,
          timeUsed,
          pointsEarned: points
        }).catch(console.error);

        // 生成反馈
        const feedback: GameFeedback = {
          type: isCorrect ? 'success' : 'error',
          message: isCorrect ? 
            (newStreak > 1 ? `正确！连击数：${newStreak}` : '回答正确！') :
            `回答错误！正确答案是：${question.options[question.correctAnswer]}`,
          points: points,
          timeBonus: timeBonus > 0 ? timeBonus : undefined,
          streakBonus: streakBonus > 0 ? streakBonus : undefined,
          isCorrect,
          correctAnswer: isCorrect ? undefined : question.options[question.correctAnswer],
          nextAction: currentSession.currentQuestionIndex >= currentSession.questions.length - 1 ? 'finish' : 'next-question'
        };

        return feedback;
      },

      skipQuestion: () => {
        const { currentSession } = get();
        if (!currentSession || currentSession.status !== 'playing') return;

        const updatedSession: GameSession = {
          ...currentSession,
          currentQuestionIndex: currentSession.currentQuestionIndex + 1,
          streak: 0, // 跳过重置连击
          timeRemaining: Math.max(0, currentSession.timeRemaining - 3000) // 跳过扣3秒
        };

        set({ currentSession: updatedSession });

        // 保存跳过记录
        gameService.saveSkip(currentSession.id, currentSession.questions[currentSession.currentQuestionIndex].id)
          .catch(console.error);
      },

      useHint: () => {
        // 提示功能：排除一个错误选项
        const { currentSession } = get();
        if (!currentSession) return;

        const currentQuestion = currentSession.questions[currentSession.currentQuestionIndex];
        if (!currentQuestion) return;

        // 逻辑：提示功能由UI组件处理，这里只是记录使用
        gameService.saveHintUse(currentSession.id, currentQuestion.id)
          .catch(console.error);
      },

      // 数据管理
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }));
      },

      loadStatistics: async (wordbookId: number) => {
        set({ isLoading: true });
        try {
          const statistics = await gameService.getUserStatistics(get().currentSession?.userId || 'user-1', wordbookId);
          set({ statistics, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '加载统计失败',
            isLoading: false 
          });
        }
      },

      checkAchievements: async () => {
        const { currentSession } = get();
        if (!currentSession) return;

        try {
          const newAchievements = await gameService.checkAndUnlockAchievements(
            currentSession.userId,
            currentSession
          );
          
          if (newAchievements.length > 0) {
            set((state) => ({
              achievements: [...state.achievements, ...newAchievements]
            }));
          }
        } catch (error) {
          console.error('检查成就失败:', error);
        }
      },

      claimAchievement: (achievementId: string) => {
        // 领取成就奖励的逻辑
        gameService.claimAchievementReward(achievementId)
          .catch(console.error);
      },

      loadLeaderboard: async (period, gameType, difficulty) => {
        set({ isLoading: true });
        try {
          const key = `${period}-${gameType || 'all'}-${difficulty || 'all'}`;
          const leaderboard = await gameService.getLeaderboard(period, gameType, difficulty);
          set((state) => ({
            leaderboards: { ...state.leaderboards, [key]: leaderboard },
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '加载排行榜失败',
            isLoading: false 
          });
        }
      },

      // 辅助方法
      setError: (error) => set({ error }),
      setLoading: (isLoading) => set({ isLoading })
    }),
    {
      name: 'game-store',
      partialize: (state) => ({
        settings: state.settings,
        achievements: state.achievements,
        userLevel: state.userLevel
      })
    }
  )
);