import { create } from 'zustand';

interface SimplifiedSessionState {
  // 基本状态
  isFlipped: boolean;
  showSummary: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 统计状态
  correct: number;
  total: number;
  startTime: number;
}

interface SimplifiedSessionActions {
  setIsFlipped: (flipped: boolean) => void;
  setShowSummary: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateStats: (response: 'again' | 'hard' | 'good' | 'easy') => void;
  reset: () => void;
}

type SimplifiedSessionStore = SimplifiedSessionState & SimplifiedSessionActions;

const initialState: SimplifiedSessionState = {
  isFlipped: false,
  showSummary: false,
  isLoading: false,
  error: null,
  correct: 0,
  total: 0,
  startTime: Date.now()
};

export const useSimplifiedSessionStore = create<SimplifiedSessionStore>((set, get) => ({
  ...initialState,
  
  setIsFlipped: (flipped) => set({ isFlipped: flipped }),
  
  setShowSummary: (show) => set({ showSummary: show }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error, isLoading: false }),
  
  updateStats: (response) => {
    const isCorrect = response === 'good' || response === 'easy';
    set((state) => ({
      correct: state.correct + (isCorrect ? 1 : 0),
      total: state.total + 1
    }));
  },
  
  reset: () => set(initialState)
}));