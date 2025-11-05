// 统一学习游戏状态管理 - 解决数据流一致性问题
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  GameSession, 
  LearningProgress, 
  UserProfile, 
  StudySession,
  LearningAnalytics,
  KnowledgeAssessment
} from '@/types/learningGame';

interface LearningGameState {
  // 统一用户档案
  userProfile: UserProfile;
  
  // 学习进度（FSRS数据）
  learningProgress: LearningProgress;
  
  // 当前游戏会话
  currentSession: GameSession | null;
  
  // 学习分析数据
  analytics: LearningAnalytics;
  
  // 知识评估结果
  knowledgeAssessment: KnowledgeAssessment;
  
  // 学习会话历史
  studyHistory: StudySession[];
  
  // 系统设置
  settings: {
    gameMode: 'learning' | 'assessment' | 'review';
    difficulty: 'adaptive' | 'easy' | 'medium' | 'hard' | 'expert';
    focusMode: boolean;
    distractionBlocking: boolean;
  };
}

interface LearningGameActions {
  // 学习会话管理
  startLearningSession: (params: {
    wordbookId: number;
    mode: 'new' | 'review' | 'assessment';
    targetCount?: number;
  }) => Promise<void>;
  
  // 游戏答题处理
  processAnswer: (params: {
    wordId: number;
    response: string;
    responseTime: number;
    confidence: number;
  }) => Promise<{
    isCorrect: boolean;
    feedback: string;
    learningAdjustment: Partial<LearningProgress>;
    nextReviewDate: string;
  }>;
  
  // 学习效果评估
  assessLearningEffectiveness: (timeFrame: number) => Promise<{
    retentionRate: number;
    masteryLevel: number;
    forgettingCurvePoint: number;
    recommendations: string[];
  }>;
  
  // 个性化难度调整
  adjustDifficulty: (userPerformance: {
    accuracy: number;
    responseTime: number;
    confidence: number;
    struggleRate: number;
  }) => void;
  
  // 学习路径优化
  optimizeLearningPath: () => Promise<{
    nextWords: number[];
    estimatedTime: number;
    difficultyLevel: number;
    learningStrategy: string;
  }>;
  
  // 数据同步
  syncWithFSRS: () => Promise<void>;
  updateAnalytics: () => void;
  resetSession: () => void;
}

type LearningGameStore = LearningGameState & LearningGameActions;

// FSRS学习算法实现
class FSRSService {
  // 计算下次复习时间
  static calculateNextReview(
    stability: number,
    retrievability: number,
    difficulty: number,
    response: 'again' | 'hard' | 'good' | 'easy'
  ): { stability: number; retrievability: number; nextReview: Date } {
    // 简化的FSRS算法实现
    const responseWeight = { again: 0, hard: 0.2, good: 0.5, easy: 0.8 };
    const baseStability = 1;
    
    let newStability = stability;
    let newRetrievability = retrievability;
    
    switch (response) {
      case 'again':
        newStability = Math.max(0.1, stability * 0.5);
        newRetrievability = 0.2;
        break;
      case 'hard':
        newStability = stability * 1.2;
        newRetrievability = Math.min(1, retrievability * 0.9);
        break;
      case 'good':
        newStability = stability * 1.5;
        newRetrievability = Math.min(1, retrievability * 1.1);
        break;
      case 'easy':
        newStability = stability * 2.0;
        newRetrievability = 1;
        break;
    }
    
    // 计算下次复习时间
    const days = Math.max(1, Math.ceil(newStability * 7));
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + days);
    
    return {
      stability: newStability,
      retrievability: newRetrievability,
      nextReview
    };
  }
  
  // 计算记忆保持率
  static calculateRetrievability(stability: number, days: number): number {
    return Math.exp(-days / (stability * 7));
  }
}

// 知识图谱服务
class KnowledgeGraphService {
  // 分析词汇关联性
  static analyzeWordRelations(words: any[]): Map<string, string[]> {
    const relations = new Map<string, string[]>();
    
    // 基于词根、前缀、后缀分析
    words.forEach(word => {
      const relatedWords = words.filter(w => 
        w.id !== word.id && (
          this.shareEtymology(word.word, w.word) ||
          this.similarMeaning(word.definition, w.definition) ||
          this.similarContext(word.example, w.example)
        )
      );
      relations.set(word.id, relatedWords.map(w => w.id));
    });
    
    return relations;
  }
  
  private static shareEtymology(word1: string, word2: string): boolean {
    // 简化的词源分析
    return word1.length > 4 && word2.length > 4 && 
           word1.slice(0, 3) === word2.slice(0, 3);
  }
  
  private static similarMeaning(def1: string, def2: string): boolean {
    // 简化语义相似度计算
    const words1 = def1.toLowerCase().split(' ');
    const words2 = def2.toLowerCase().split(' ');
    const common = words1.filter(w => words2.includes(w));
    return common.length >= 2;
  }
  
  private static similarContext(ex1: string, ex2: string): boolean {
    // 简化上下文分析
    return ex1 && ex2 && ex1.length > 10 && ex2.length > 10 &&
           ex1.slice(0, 20) === ex2.slice(0, 20);
  }
}

// 个性化推荐算法
class PersonalizationService {
  // 基于用户行为模式推荐内容
  static generatePersonalizedPath(
    userHistory: StudySession[],
    knowledgeGraph: Map<string, string[]>,
    currentLevel: number
  ): number[] {
    const recommendations: number[] = [];
    const reviewedWords = new Set(
      userHistory.flatMap(session => 
        session.answers.map(answer => answer.wordId)
      )
    );
    
    // 基于遗忘曲线和掌握度推荐
    const candidateWords = Array.from(knowledgeGraph.keys())
      .filter(wordId => !reviewedWords.has(wordId));
    
    // 简化的推荐算法
    for (const wordId of candidateWords) {
      if (recommendations.length >= 20) break;
      recommendations.push(Number(wordId));
    }
    
    return recommendations.sort((a, b) => {
      // 智能排序：优先推荐与已掌握词汇相关的词汇
      const aRelated = this.getRelatedWordCount(a, knowledgeGraph, reviewedWords);
      const bRelated = this.getRelatedWordCount(b, knowledgeGraph, reviewedWords);
      return bRelated - aRelated;
    });
  }
  
  private static getRelatedWordCount(
    wordId: number, 
    knowledgeGraph: Map<string, string[]>, 
    reviewedWords: Set<number>
  ): number {
    const related = knowledgeGraph.get(wordId.toString()) || [];
    return related.filter(id => reviewedWords.has(Number(id))).length;
  }
}

export const useLearningGameStore = create<LearningGameStore>()(
  persist(
    immer((set, get) => ({
      // 初始状态
      userProfile: {
        id: 'user-1',
        level: 1,
        experience: 0,
        learningStyle: 'visual', // visual, auditory, kinesthetic
        cognitiveLoad: 'medium', // low, medium, high
        preferredDifficulty: 'medium',
        studyTimePreference: 'morning' // morning, afternoon, evening
      },
      
      learningProgress: {
        userId: 'user-1',
        words: new Map(), // wordId -> {stability, retrievability, difficulty, state}
        lastReview: new Date(),
        totalStudyTime: 0,
        averageAccuracy: 0,
        bestStreak: 0
      },
      
      currentSession: null,
      
      analytics: {
        userId: 'user-1',
        totalStudyDays: 0,
        averageSessionTime: 0,
        learningVelocity: 0, // 词汇学习速度
        retentionCurve: [], // 保持率曲线
        struggleWords: [], // 用户困难的词汇
        masteredWords: [], // 掌握的词汇
        recommendations: []
      },
      
      knowledgeAssessment: {
        userId: 'user-1',
        lastAssessmentDate: new Date(),
        overallMastery: 0, // 0-1
        wordMastery: new Map(), // wordId -> mastery level
        skillGaps: [], // 技能缺口
        learningEfficiency: 0 // 学习效率
      },
      
      studyHistory: [],
      
      settings: {
        gameMode: 'learning',
        difficulty: 'adaptive',
        focusMode: false,
        distractionBlocking: true
      },
      
      // 实现动作
      startLearningSession: async (params) => {
        const state = get();
        const session: GameSession = {
          id: `session_${Date.now()}`,
          userId: state.userProfile.id,
          wordbookId: params.wordbookId,
          gameType: 'vocabulary-match', // 实际应该从参数获取
          difficulty: 'medium',
          status: 'preparing',
          startTime: new Date().toISOString(),
          currentQuestionIndex: 0,
          questions: [], // 实际会从服务获取
          timeRemaining: 0,
          totalScore: 0,
          correctAnswers: 0,
          totalQuestions: 0,
          streak: 0,
          maxStreak: 0,
          achievements: [],
          settings: {
            timePerQuestion: 15000,
            showCountdown: true,
            showProgress: true,
            enableSound: true,
            enableVibration: true,
            autoNext: true,
            maxStreakBonus: 3.0,
            timeBonusMultiplier: 1.5,
            difficultyMultiplier: {
              easy: 1.0,
              medium: 1.5,
              hard: 2.0,
              expert: 3.0
            }
          }
        };
        
        set((draft) => {
          draft.currentSession = session;
        });
      },
      
      processAnswer: async (params) => {
        const state = get();
        const currentWord = state.learningProgress.words.get(params.wordId);
        
        if (!currentWord) {
          throw new Error('Word not found in learning progress');
        }
        
        // FSRS算法计算
        const fsrsResult = FSRSService.calculateNextReview(
          currentWord.stability,
          currentWord.retrievability,
          currentWord.difficulty,
          params.responseTime < 3000 ? 'easy' : 'good'
        );
        
        // 更新学习进度
        set((draft) => {
          draft.learningProgress.words.set(params.wordId, {
            ...currentWord,
            stability: fsrsResult.stability,
            retrievability: fsrsResult.retrievability,
            lastReview: new Date(),
            reviewCount: (currentWord.reviewCount || 0) + 1
          });
          
          // 更新统计
          draft.learningProgress.totalStudyTime += params.responseTime;
          draft.learningProgress.averageAccuracy = 
            (draft.learningProgress.averageAccuracy + (params.isCorrect ? 1 : 0)) / 2;
        });
        
        // 返回反馈
        return {
          isCorrect: params.isCorrect,
          feedback: params.isCorrect ? '正确！' : '错误，需要加强练习',
          learningAdjustment: {
            stability: fsrsResult.stability,
            retrievability: fsrsResult.retrievability
          },
          nextReviewDate: fsrsResult.nextReview.toISOString()
        };
      },
      
      assessLearningEffectiveness: async (timeFrame) => {
        const state = get();
        const recentHistory = state.studyHistory
          .filter(session => 
            new Date(session.startTime) > new Date(Date.now() - timeFrame * 24 * 60 * 60 * 1000)
          );
        
        const totalSessions = recentHistory.length;
        const totalQuestions = recentHistory.reduce((sum, session) => sum + session.totalQuestions, 0);
        const correctAnswers = recentHistory.reduce((sum, session) => sum + session.correctAnswers, 0);
        
        const retentionRate = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
        const masteryLevel = state.knowledgeAssessment.overallMastery;
        
        return {
          retentionRate,
          masteryLevel,
          forgettingCurvePoint: Math.max(0, 1 - (retentionRate * 0.1)),
          recommendations: [
            retentionRate < 0.7 ? '建议增加复习频率' : '保持当前学习节奏',
            masteryLevel < 0.6 ? '重点关注基础词汇' : '可以挑战更高难度'
          ]
        };
      },
      
      adjustDifficulty: (performance) => {
        const state = get();
        const newDifficulty = performance.accuracy < 0.6 ? 'easy' :
                             performance.accuracy > 0.9 ? 'hard' : 'medium';
        
        set((draft) => {
          draft.userProfile.preferredDifficulty = newDifficulty;
          if (draft.currentSession) {
            draft.currentSession.difficulty = newDifficulty;
          }
        });
      },
      
      optimizeLearningPath: async () => {
        const state = get();
        const knowledgeGraph = KnowledgeGraphService.analyzeWordRelations(
          Array.from(state.learningProgress.words.entries()).map(([id, data]) => ({
            id,
            ...data
          }))
        );
        
        const personalizedPath = PersonalizationService.generatePersonalizedPath(
          state.studyHistory,
          knowledgeGraph,
          state.userProfile.level
        );
        
        return {
          nextWords: personalizedPath.slice(0, 10),
          estimatedTime: personalizedPath.length * 2, // 估算2分钟每词
          difficultyLevel: state.userProfile.preferredDifficulty,
          learningStrategy: 'spaced_repetition_with_knowledge_graph'
        };
      },
      
      syncWithFSRS: async () => {
        // 同步FSRS数据到后端
        const state = get();
        // 实际实现中需要调用API同步数据
        console.log('Syncing FSRS data:', state.learningProgress);
      },
      
      updateAnalytics: () => {
        set((draft) => {
          // 更新学习分析数据
          const totalWords = draft.learningProgress.words.size;
          const masteredWords = Array.from(draft.learningProgress.words.values())
            .filter(word => word.stability > 5).length;
          
          draft.analytics.masteredWords = Array.from(
            draft.learningProgress.words.entries()
          ).filter(([_, data]) => data.stability > 5).map(([id, _]) => id);
          
          draft.knowledgeAssessment.overallMastery = 
            totalWords > 0 ? masteredWords / totalWords : 0;
        });
      },
      
      resetSession: () => {
        set((draft) => {
          draft.currentSession = null;
        });
      }
    })),
    {
      name: 'learning-game-store',
      partialize: (state) => ({
        userProfile: state.userProfile,
        learningProgress: state.learningProgress,
        analytics: state.analytics,
        knowledgeAssessment: state.knowledgeAssessment,
        studyHistory: state.studyHistory,
        settings: state.settings
      })
    }
  )
);