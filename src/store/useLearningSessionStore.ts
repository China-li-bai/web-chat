import { create } from 'zustand';
import type { ScheduledItem, LearningSession } from '@/lib/memo/types';

export interface SessionStats {
  correct: number;
  total: number;
  startTime: number;
}

export interface SegmentPolicy {
  weights: { flashcard: number; choice: number; spelling: number; listening: number };
  choiceHintAllowed: boolean;
}

export interface SummaryCounts {
  mastered: number;
  shaky: number;
  forgotten: number;
}

export interface SummaryItem {
  id: string;
  content: string;
  response: 'again' | 'hard' | 'good' | 'easy';
  retrievability: number;
  nextReview?: Date;
}

export interface SummaryStats {
  estimatedRetention: number;
  cognitiveLoad: number;
}

export type QuestionMode = 'flashcard-only' | 'mixed' | 'adaptive';

interface LearningSessionState {
  // 核心会话状态
  session: LearningSession | null;
  activeItems: ScheduledItem[];
  currentItemIndex: number;
  
  // 分段学习状态
  segmentSize: number;
  segmentIndex: number;
  segmentQueue: ScheduledItem[];
  segmentStats: { answered: number; correct: number };
  segmentPolicy: SegmentPolicy;
  
  // 统计状态
  sessionStats: SessionStats;
  summaryCounts: SummaryCounts;
  summaryItems: SummaryItem[];
  summaryStats: SummaryStats | null;
  rolling: boolean[];
  
  // UI状态
  questionMode: QuestionMode;
  isFlipped: boolean;
  showSummary: boolean;
  showEndFeedback: boolean;
  
  // 错误状态
  error: string | null;
  isLoading: boolean;
  
  // 响应时间统计
  responseTimesRef: number[];
}

interface LearningSessionActions {
  // 会话管理
  setSession: (session: LearningSession | null) => void;
  setActiveItems: (items: ScheduledItem[]) => void;
  setCurrentItemIndex: (index: number) => void;
  advanceToNext: () => void;
  
  // 分段管理
  computeSegment: (segIndex: number) => void;
  nextSegment: () => void;
  updateSegmentStats: (isCorrect: boolean) => void;
  updateSegmentPolicy: (accuracy: number) => void;
  
  // 统计更新
  updateSessionStats: (response: 'again' | 'hard' | 'easy') => void;
  updateRolling: (isCorrect: boolean) => void;
  addSummaryItem: (item: SummaryItem) => void;
  setSummaryStats: (stats: SummaryStats | null) => void;
  addResponseTime: (time: number) => void;
  
  // UI控制
  setQuestionMode: (mode: QuestionMode) => void;
  setIsFlipped: (flipped: boolean) => void;
  setShowSummary: (show: boolean) => void;
  setShowEndFeedback: (show: boolean) => void;
  
  // 错误处理
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  
  // 重置和清理
  resetSession: () => void;
  resetSegment: () => void;
  clearSummary: () => void;
}

type LearningSessionStore = LearningSessionState & LearningSessionActions;

const SEGMENT_SIZE = 10;

const initialState: LearningSessionState = {
  // 核心会话状态
  session: null,
  activeItems: [],
  currentItemIndex: 0,
  
  // 分段学习状态
  segmentSize: SEGMENT_SIZE,
  segmentIndex: 0,
  segmentQueue: [],
  segmentStats: { answered: 0, correct: 0 },
  segmentPolicy: {
    weights: { flashcard: 0.35, choice: 0.35, spelling: 0.2, listening: 0.1 },
    choiceHintAllowed: true
  },
  
  // 统计状态
  sessionStats: { correct: 0, total: 0, startTime: Date.now() },
  summaryCounts: { mastered: 0, shaky: 0, forgotten: 0 },
  summaryItems: [],
  summaryStats: null,
  rolling: [],
  
  // UI状态
  questionMode: 'mixed',
  isFlipped: false,
  showSummary: false,
  showEndFeedback: false,
  
  // 错误状态
  error: null,
  isLoading: true,
  
  // 响应时间统计
  responseTimesRef: []
};

export const useLearningSessionStore = create<LearningSessionStore>((set, get) => ({
  ...initialState,
  
  // 会话管理
  setSession: (session) => {
    set({ session, isLoading: false });
    if (session && Array.isArray(session.items)) {
      get().setActiveItems(session.items);
    }
  },
  
  setActiveItems: (items) => {
    set({ activeItems: items });
    get().computeSegment(0);
  },
  
  setCurrentItemIndex: (index) => set({ currentItemIndex: index }),
  
  advanceToNext: () => {
    const { currentItemIndex, segmentQueue } = get();
    if (currentItemIndex < segmentQueue.length - 1) {
      set({ 
        currentItemIndex: currentItemIndex + 1,
        isFlipped: false 
      });
    }
  },
  
  // 分段管理
  computeSegment: (segIndex) => {
    const { activeItems, segmentSize } = get();
    const start = segIndex * segmentSize;
    const end = Math.min(start + segmentSize, activeItems.length);
    const segmentQueue = activeItems.slice(start, end);
    
    set({
      segmentIndex: segIndex,
      segmentQueue,
      currentItemIndex: 0,
      isFlipped: false
    });
  },
  
  nextSegment: () => {
    const { segmentIndex } = get();
    get().computeSegment(segmentIndex + 1);
    get().resetSegment();
  },
  
  updateSegmentStats: (isCorrect) => {
    set((state) => ({
      segmentStats: {
        answered: state.segmentStats.answered + 1,
        correct: state.segmentStats.correct + (isCorrect ? 1 : 0)
      }
    }));
  },
  
  updateSegmentPolicy: (accuracy) => {
    let weights = get().segmentPolicy.weights;
    let choiceHintAllowed = get().segmentPolicy.choiceHintAllowed;
    
    if (accuracy >= 0.85) {
      weights = { flashcard: 0.15, choice: 0.25, spelling: 0.4, listening: 0.2 };
      choiceHintAllowed = false;
    } else if (accuracy < 0.7) {
      weights = { flashcard: 0.45, choice: 0.35, spelling: 0.15, listening: 0.05 };
      choiceHintAllowed = true;
    } else {
      weights = { flashcard: 0.3, choice: 0.4, spelling: 0.2, listening: 0.1 };
      choiceHintAllowed = true;
    }
    
    set({ segmentPolicy: { weights, choiceHintAllowed } });
  },
  
  // 统计更新
  updateSessionStats: (response) => {
    const isCorrect = response === 'easy';
    set((state) => ({
      sessionStats: {
        ...state.sessionStats,
        correct: state.sessionStats.correct + (isCorrect ? 1 : 0),
        total: state.sessionStats.total + 1
      }
    }));
    
    get().updateSegmentStats(isCorrect);
    get().updateRolling(isCorrect);
    
    // 更新 summary counts
    set((state) => ({
      summaryCounts: {
        mastered: state.summaryCounts.mastered + (response === 'easy' ? 1 : 0),
        shaky: state.summaryCounts.shaky + (response === 'hard' ? 1 : 0),
        forgotten: state.summaryCounts.forgotten + (response === 'again' ? 1 : 0)
      }
    }));
  },
  
  updateRolling: (isCorrect) => {
    set((state) => {
      const newRolling = [...state.rolling, isCorrect];
      return {
        rolling: newRolling.length > 50 ? newRolling.slice(-50) : newRolling
      };
    });
  },
  
  addSummaryItem: (item) => {
    set((state) => ({
      summaryItems: [...state.summaryItems, item]
    }));
  },
  
  setSummaryStats: (stats) => set({ summaryStats: stats }),
  
  addResponseTime: (time) => {
    set((state) => {
      const newTimes = [...state.responseTimesRef, time];
      return {
        responseTimesRef: newTimes.length > 200 ? newTimes.slice(-200) : newTimes
      };
    });
  },
  
  // UI控制
  setQuestionMode: (mode) => set({ questionMode: mode }),
  setIsFlipped: (flipped) => set({ isFlipped: flipped }),
  setShowSummary: (show) => set({ showSummary: show }),
  setShowEndFeedback: (show) => set({ showEndFeedback: show }),
  
  // 错误处理
  setError: (error) => set({ error, isLoading: false }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // 重置和清理
  resetSession: () => set(initialState),
  
  resetSegment: () => set({
    segmentStats: { answered: 0, correct: 0 },
    currentItemIndex: 0,
    isFlipped: false
  }),
  
  clearSummary: () => set({
    summaryItems: [],
    summaryStats: null,
    showSummary: false,
    showEndFeedback: false
  })
}));