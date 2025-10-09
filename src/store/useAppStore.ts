import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// #region --- Type Definitions ---

interface User {
  id: string | null;
  name: string;
  email: string | null;
  avatar: string | null;
  level: 'beginner' | 'intermediate' | 'advanced';
  joinDate: string;
  preferences: UserPreferences;
}

interface UserPreferences {
  voice: string;
  language: string;
  theme: 'light' | 'dark';
  autoPlay: boolean;
  showTranscription: boolean;
}

interface PracticeTopic {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  sentences: string[];
  estimatedTime: number;
  tags: string[];
}

interface CurrentPractice {
  topic: PracticeTopic | null;
  referenceText: string;
  isRecording: boolean;
  isPlaying: boolean;
  audioBlob: Blob | null;
  transcription: string;
  score: any | null; // Can be detailed further if score structure is known
  startTime: number | null;
  duration: number;
}

interface PracticeRecord {
  timestamp: string;
  duration: number;
  score: { overall: number };
  category: string;
  difficulty: string;
}

interface UserStats {
  totalSessions: number;
  totalMinutes: number;
  averageScore: number;
  streak: number;
  improvementRate: number;
  favoriteTopics: string[];
  weeklyProgress: any[]; // Can be detailed further
}

interface ApiKeys {
  gemini: string;
  baidu: string;
  xunfei: string;
  tencent: string;
}

interface SpeechSettings {
  provider: 'gemini' | 'baidu' | 'xunfei' | 'tencent';
  voice: string;
  style: string;
  speed: number;
  pitch: number;
}

interface PracticeSettings {
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
  category: string;
  autoNext: boolean;
  showHints: boolean;
  practiceTime: number;
}

interface UiSettings {
  theme: 'light' | 'dark';
  language: string;
  showWaveform: boolean;
  enableNotifications: boolean;
}

interface Settings {
  apiKeys: ApiKeys;
  speechSettings: SpeechSettings;
  practiceSettings: PracticeSettings;
  uiSettings: UiSettings;
}

interface AppState {
  userId: string;
  user: User;
  currentPractice: CurrentPractice;
  practiceHistory: PracticeRecord[];
  userStats: UserStats;
  settings: Settings;
  practiceTopics: PracticeTopic[];
}

interface AppActions {
  setUserId: (userId: string) => void;
  setUser: (userData: Partial<User>) => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  startPractice: (topic: PracticeTopic) => void;
  setRecording: (isRecording: boolean) => void;
  setPlaying: (isPlaying: boolean) => void;
  setAudioBlob: (audioBlob: Blob | null) => void;
  setTranscription: (transcription: string) => void;
  setScore: (score: any | null) => void;
  updateDuration: () => void;
  setReferenceText: (referenceText: string) => void;
  clearCurrentPractice: () => void;
  addPracticeRecord: (record: PracticeRecord) => void;
  clearPracticeHistory: () => void;
  updateSettings: (newSettings: Partial<Settings>) => void;
  updateApiKeys: (apiKeys: Partial<ApiKeys>) => void;
  updateSpeechSettings: (speechSettings: Partial<SpeechSettings>) => void;
  updatePracticeSettings: (practiceSettings: Partial<PracticeSettings>) => void;
  updateUISettings: (uiSettings: Partial<UiSettings>) => void;
  addCustomTopic: (topic: Omit<PracticeTopic, 'id'>) => void;
  removeTopic: (topicId: string) => void;
  updateTopic: (topicId: string, updates: Partial<PracticeTopic>) => void;
  updateUserStats: (stats: Partial<UserStats>) => void;
  updateStreak: () => void;
  getFilteredRecords: (filter: any) => PracticeRecord[];
  getProgressStats: (days?: number) => any[];
  resetAll: () => void;
}

type AppStore = AppState & AppActions;

// #endregion

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      userId: 'user-1', // Default user, can be updated on login
      user: {
        id: 'user-1',
        name: '用户',
        email: null,
        avatar: null,
        level: 'beginner',
        joinDate: new Date().toISOString(),
        preferences: {
          voice: 'Puck',
          language: 'zh-CN',
          theme: 'light',
          autoPlay: true,
          showTranscription: true
        }
      },
      currentPractice: {
        topic: null,
        referenceText: '',
        isRecording: false,
        isPlaying: false,
        audioBlob: null,
        transcription: '',
        score: null,
        startTime: null,
        duration: 0
      },
      practiceHistory: [],
      userStats: {
        totalSessions: 0,
        totalMinutes: 0,
        averageScore: 0,
        streak: 0,
        improvementRate: 0,
        favoriteTopics: [],
        weeklyProgress: []
      },
      settings: {
        apiKeys: { gemini: '', baidu: '', xunfei: '', tencent: '' },
        speechSettings: { provider: 'gemini', voice: 'Puck', style: 'conversational', speed: 1.0, pitch: 1.0 },
        practiceSettings: { difficulty: 'intermediate', category: 'daily', autoNext: false, showHints: true, practiceTime: 10 },
        uiSettings: { theme: 'light', language: 'zh-CN', showWaveform: true, enableNotifications: true }
      },
      practiceTopics: [
        // Sample topics...
      ],

      // --- Actions ---
      setUserId: (userId) => set({ userId }),
      setUser: (userData) => set((state) => ({ user: { ...state.user, ...userData } })),
      updateUserPreferences: (preferences) => set((state) => ({
        user: { ...state.user, preferences: { ...state.user.preferences, ...preferences } }
      })),
      startPractice: (topic) => set({
        currentPractice: {
          topic,
          referenceText: topic.sentences[0] || '',
          isRecording: false,
          isPlaying: false,
          audioBlob: null,
          transcription: '',
          score: null,
          startTime: Date.now(),
          duration: 0
        }
      }),
      setRecording: (isRecording) => set((state) => ({ currentPractice: { ...state.currentPractice, isRecording } })),
      setPlaying: (isPlaying) => set((state) => ({ currentPractice: { ...state.currentPractice, isPlaying } })),
      setAudioBlob: (audioBlob) => set((state) => ({ currentPractice: { ...state.currentPractice, audioBlob } })),
      setTranscription: (transcription) => set((state) => ({ currentPractice: { ...state.currentPractice, transcription } })),
      setScore: (score) => set((state) => ({ currentPractice: { ...state.currentPractice, score } })),
      updateDuration: () => set((state) => ({
        currentPractice: {
          ...state.currentPractice,
          duration: state.currentPractice.startTime ? Math.floor((Date.now() - state.currentPractice.startTime) / 1000) : 0
        }
      })),
      setReferenceText: (referenceText) => set((state) => ({ currentPractice: { ...state.currentPractice, referenceText } })),
      clearCurrentPractice: () => set({
        currentPractice: {
          topic: null, referenceText: '', isRecording: false, isPlaying: false, audioBlob: null,
          transcription: '', score: null, startTime: null, duration: 0
        }
      }),
      addPracticeRecord: (record) => set((state) => ({
        practiceHistory: [record, ...state.practiceHistory].slice(0, 100),
        userStats: {
          ...state.userStats,
          totalSessions: state.userStats.totalSessions + 1,
          totalMinutes: state.userStats.totalMinutes + Math.floor(record.duration / 60),
          averageScore: Math.round(
            (state.userStats.averageScore * state.userStats.totalSessions + record.score.overall) / (state.userStats.totalSessions + 1)
          )
        }
      })),
      clearPracticeHistory: () => set({ practiceHistory: [] }),
      updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
      updateApiKeys: (apiKeys) => set((state) => ({ settings: { ...state.settings, apiKeys: { ...state.settings.apiKeys, ...apiKeys } } })),
      updateSpeechSettings: (speechSettings) => set((state) => ({ settings: { ...state.settings, speechSettings: { ...state.settings.speechSettings, ...speechSettings } } })),
      updatePracticeSettings: (practiceSettings) => set((state) => ({ settings: { ...state.settings, practiceSettings: { ...state.settings.practiceSettings, ...practiceSettings } } })),
      updateUISettings: (uiSettings) => set((state) => ({ settings: { ...state.settings, uiSettings: { ...state.settings.uiSettings, ...uiSettings } } })),
      addCustomTopic: (topic) => set((state) => ({ practiceTopics: [...state.practiceTopics, { ...topic, id: Date.now().toString() }] })),
      removeTopic: (topicId) => set((state) => ({ practiceTopics: state.practiceTopics.filter(topic => topic.id !== topicId) })),
      updateTopic: (topicId, updates) => set((state) => ({
        practiceTopics: state.practiceTopics.map(topic => topic.id === topicId ? { ...topic, ...updates } : topic)
      })),
      updateUserStats: (stats) => set((state) => ({ userStats: { ...state.userStats, ...stats } })),
      updateStreak: () => set((state) => { /* ...logic... */ return state; }),
      getFilteredRecords: (filter) => { /* ...logic... */ return []; },
      getProgressStats: (days = 7) => { /* ...logic... */ return []; },
      resetAll: () => set({
        practiceHistory: [],
        userStats: {
          totalSessions: 0, totalMinutes: 0, averageScore: 0, streak: 0,
          improvementRate: 0, favoriteTopics: [], weeklyProgress: []
        }
      })
    }),
    {
      name: 'ai-speech-practice-store',
      partialize: (state) => ({
        userId: state.userId,
        user: state.user,
        practiceHistory: state.practiceHistory,
        userStats: state.userStats,
        settings: {
          ...state.settings,
          apiKeys: { gemini: '', baidu: '', xunfei: '', tencent: '' }
        },
        practiceTopics: state.practiceTopics
      })
    }
  )
);