import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 应用主状态管理
 * 使用 Zustand 进行状态管理，支持本地持久化
 */
const useAppStore = create(
  persist(
    (set, get) => ({
      // 用户信息
      user: {
        id: null,
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

      // 当前练习状态
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

      // 练习记录
      practiceHistory: [],

      // 用户统计
      userStats: {
        totalSessions: 0,
        totalMinutes: 0,
        averageScore: 0,
        streak: 0,
        improvementRate: 0,
        favoriteTopics: [],
        weeklyProgress: []
      },

      // 应用设置
      settings: {
        apiKeys: {
          gemini: '',
          baidu: '',
          xunfei: '',
          tencent: ''
        },
        speechSettings: {
          provider: 'gemini',
          voice: 'Puck',
          style: 'conversational',
          speed: 1.0,
          pitch: 1.0
        },
        practiceSettings: {
          difficulty: 'intermediate',
          category: 'daily',
          autoNext: false,
          showHints: true,
          practiceTime: 10 // 分钟
        },
        uiSettings: {
          theme: 'light',
          language: 'zh-CN',
          showWaveform: true,
          enableNotifications: true
        }
      },

      // 可用练习主题
      practiceTopics: [
        {
          id: 'daily-greeting',
          title: '日常问候',
          description: '练习基本的日常问候用语',
          difficulty: 'beginner',
          category: 'daily',
          sentences: [
            'Hello, how are you today?',
            'Good morning, it\'s a beautiful day!',
            'Nice to meet you, my name is...',
            'How was your weekend?',
            'Thank you for your help!'
          ],
          estimatedTime: 5,
          tags: ['greeting', 'basic', 'conversation']
        },
        {
          id: 'business-meeting',
          title: '商务会议',
          description: '商务场景中的常用表达',
          difficulty: 'intermediate',
          category: 'business',
          sentences: [
            'Let\'s schedule a meeting for next week.',
            'I would like to present our quarterly results.',
            'Could you please send me the agenda?',
            'We need to discuss the budget allocation.',
            'Thank you for your time and attention.'
          ],
          estimatedTime: 8,
          tags: ['business', 'meeting', 'professional']
        }
      ],

      // Actions
      setUser: (userData) => set((state) => ({
        user: { ...state.user, ...userData }
      })),

      updateUserPreferences: (preferences) => set((state) => ({
        user: {
          ...state.user,
          preferences: { ...state.user.preferences, ...preferences }
        }
      })),

      // 当前练习相关 Actions
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

      setRecording: (isRecording) => set((state) => ({
        currentPractice: { ...state.currentPractice, isRecording }
      })),

      setPlaying: (isPlaying) => set((state) => ({
        currentPractice: { ...state.currentPractice, isPlaying }
      })),

      setAudioBlob: (audioBlob) => set((state) => ({
        currentPractice: { ...state.currentPractice, audioBlob }
      })),

      setTranscription: (transcription) => set((state) => ({
        currentPractice: { ...state.currentPractice, transcription }
      })),

      setScore: (score) => set((state) => ({
        currentPractice: { ...state.currentPractice, score }
      })),

      updateDuration: () => set((state) => ({
        currentPractice: {
          ...state.currentPractice,
          duration: state.currentPractice.startTime ? 
            Math.floor((Date.now() - state.currentPractice.startTime) / 1000) : 0
        }
      })),

      setReferenceText: (referenceText) => set((state) => ({
        currentPractice: { ...state.currentPractice, referenceText }
      })),

      clearCurrentPractice: () => set({
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
        }
      }),

      // 练习历史相关 Actions
      addPracticeRecord: (record) => set((state) => ({
        practiceHistory: [record, ...state.practiceHistory].slice(0, 100), // 最多保存100条记录
        userStats: {
          ...state.userStats,
          totalSessions: state.userStats.totalSessions + 1,
          totalMinutes: state.userStats.totalMinutes + Math.floor(record.duration / 60),
          averageScore: Math.round(
            (state.userStats.averageScore * state.userStats.totalSessions + record.score.overall) / 
            (state.userStats.totalSessions + 1)
          )
        }
      })),

      clearPracticeHistory: () => set({
        practiceHistory: []
      }),

      // 设置相关 Actions
      updateSettings: (newSettings) => set((state) => ({
        settings: {
          ...state.settings,
          ...newSettings
        }
      })),

      updateApiKeys: (apiKeys) => set((state) => ({
        settings: {
          ...state.settings,
          apiKeys: { ...state.settings.apiKeys, ...apiKeys }
        }
      })),

      updateSpeechSettings: (speechSettings) => set((state) => ({
        settings: {
          ...state.settings,
          speechSettings: { ...state.settings.speechSettings, ...speechSettings }
        }
      })),

      updatePracticeSettings: (practiceSettings) => set((state) => ({
        settings: {
          ...state.settings,
          practiceSettings: { ...state.settings.practiceSettings, ...practiceSettings }
        }
      })),

      updateUISettings: (uiSettings) => set((state) => ({
        settings: {
          ...state.settings,
          uiSettings: { ...state.settings.uiSettings, ...uiSettings }
        }
      })),

      // 主题相关 Actions
      addCustomTopic: (topic) => set((state) => ({
        practiceTopics: [...state.practiceTopics, { ...topic, id: Date.now().toString() }]
      })),

      removeTopic: (topicId) => set((state) => ({
        practiceTopics: state.practiceTopics.filter(topic => topic.id !== topicId)
      })),

      updateTopic: (topicId, updates) => set((state) => ({
        practiceTopics: state.practiceTopics.map(topic =>
          topic.id === topicId ? { ...topic, ...updates } : topic
        )
      })),

      // 统计数据更新
      updateUserStats: (stats) => set((state) => ({
        userStats: { ...state.userStats, ...stats }
      })),

      // 计算连续练习天数
      updateStreak: () => set((state) => {
        const today = new Date().toDateString();
        const recentRecords = state.practiceHistory.filter(record => {
          const recordDate = new Date(record.timestamp).toDateString();
          return recordDate === today;
        });
        
        if (recentRecords.length > 0) {
          // 如果今天有练习记录，更新连续天数
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toDateString();
          
          const hadPracticeYesterday = state.practiceHistory.some(record => {
            const recordDate = new Date(record.timestamp).toDateString();
            return recordDate === yesterdayStr;
          });
          
          const newStreak = hadPracticeYesterday ? state.userStats.streak + 1 : 1;
          
          return {
            userStats: { ...state.userStats, streak: newStreak }
          };
        }
        
        return state;
      }),

      // 获取过滤后的练习记录
      getFilteredRecords: (filter) => {
        const state = get();
        let filtered = [...state.practiceHistory];
        
        if (filter.category && filter.category !== 'all') {
          filtered = filtered.filter(record => record.category === filter.category);
        }
        
        if (filter.difficulty && filter.difficulty !== 'all') {
          filtered = filtered.filter(record => record.difficulty === filter.difficulty);
        }
        
        if (filter.dateRange) {
          const startDate = new Date(filter.dateRange.start);
          const endDate = new Date(filter.dateRange.end);
          filtered = filtered.filter(record => {
            const recordDate = new Date(record.timestamp);
            return recordDate >= startDate && recordDate <= endDate;
          });
        }
        
        return filtered;
      },

      // 获取学习进度统计
      getProgressStats: (days = 7) => {
        const state = get();
        const now = new Date();
        const stats = [];
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayRecords = state.practiceHistory.filter(record => {
            return record.timestamp.startsWith(dateStr);
          });
          
          stats.push({
            date: dateStr,
            sessions: dayRecords.length,
            averageScore: dayRecords.length > 0 
              ? Math.round(dayRecords.reduce((sum, r) => sum + r.score.overall, 0) / dayRecords.length)
              : 0,
            totalMinutes: Math.round(dayRecords.reduce((sum, r) => sum + r.duration, 0) / 60)
          });
        }
        
        return stats;
      },

      // 重置所有数据
      resetAll: () => set({
        practiceHistory: [],
        userStats: {
          totalSessions: 0,
          totalMinutes: 0,
          averageScore: 0,
          streak: 0,
          improvementRate: 0,
          favoriteTopics: [],
          weeklyProgress: []
        }
      })
    }),
    {
      name: 'ai-speech-practice-store', // 本地存储的 key
      partialize: (state) => ({
        // 只持久化需要的数据，排除临时状态
        user: state.user,
        practiceHistory: state.practiceHistory,
        userStats: state.userStats,
        settings: {
          ...state.settings,
          apiKeys: {
            // 出于安全考虑，API keys 不持久化到本地存储
            gemini: '',
            baidu: '',
            xunfei: '',
            tencent: ''
          }
        },
        practiceTopics: state.practiceTopics
      })
    }
  )
);

export default useAppStore;
