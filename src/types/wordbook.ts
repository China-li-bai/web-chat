// 单词本数据模型
export interface Wordbook {
  id: string;
  name: string;
  category: WordbookCategory;
  description?: string;
  difficulty: DifficultyLevel;
  wordCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  source?: WordbookSource;
  isActive: boolean;
}

// 单词数据模型
export interface Vocabulary {
  id: string;
  wordbookId: string;
  word: string;
  pronunciation?: string;
  meaning: string;
  example?: string;
  difficulty: number; // 0-1 难度系数
  masteryLevel: number; // 0-1 掌握程度
  lastReviewed?: string;
  reviewCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// 学习记录数据模型
export interface LearningRecord {
  id: string;
  wordbookId: string;
  vocabularyId: string;
  userId: string;
  sessionId: string;
  result: 'correct' | 'incorrect' | 'skip';
  timeSpent: number; // 秒
  timestamp: string;
}

// 统计数据模型
export interface WordbookStats {
  wordbookId: string;
  totalWords: number;
  masteredWords: number;
  averageMastery: number;
  totalStudyTime: number;
  lastStudyDate?: string;
  studySessions: number;
  accuracyRate: number;
  dailyProgress?: DailyProgress[];
}

export interface DailyProgress {
  date: string;
  wordsStudied: number;
  accuracy: number;
  timeSpent: number;
}

// 枚举类型定义
export enum WordbookCategory {
  ACADEMIC = 'academic',      // 学术
  EXAM = 'exam',              // 考试
  BUSINESS = 'business',      // 商务
  DAILY = 'daily',            // 日常
  CUSTOM = 'custom'           // 自定义
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',      // 初级
  INTERMEDIATE = 'intermediate', // 中级
  ADVANCED = 'advanced',      // 高级
  EXPERT = 'expert'           // 专家
}

export enum WordbookSource {
  OXFORD_3000 = 'oxford_3000',    // 牛津3000
  CET4 = 'cet4',                  // 四级英语
  CET6 = 'cet6',                  // 六级英语
  POSTGRADUATE = 'postgraduate',  // 考研英语
  INTERVIEW = 'interview',        // 面试英语
  CUSTOM = 'custom'               // 自定义
}

// 单词本导入配置
export interface ImportConfig {
  source: WordbookSource;
  fileType?: 'csv' | 'json' | 'txt';
  delimiter?: string;
  encoding?: string;
  mapping?: {
    word: string;
    pronunciation?: string;
    meaning: string;
    example?: string;
  };
}

// 统计筛选条件
export interface StatsFilter {
  wordbookIds?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  category?: WordbookCategory;
  difficulty?: DifficultyLevel;
}