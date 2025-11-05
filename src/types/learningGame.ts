// 优化后的学习游戏类型定义 - 解决数据流一致性问题
export interface UserProfile {
  id: string;
  level: number;
  experience: number;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  cognitiveLoad: 'low' | 'medium' | 'high';
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'expert';
  studyTimePreference: 'morning' | 'afternoon' | 'evening' | 'night';
  
  // 新增：学习元数据
  metadata: {
    studyStreak: number; // 连续学习天数
    lastStudyDate: string; // 最后学习日期
    totalStudyTime: number; // 总学习时间(分钟)
    preferredSessionLength: number; // 偏好单次学习时长
    motivationFactors: string[]; // 动机因素
    learningGoals: string[]; // 学习目标
  };
}

export interface WordProgress {
  wordId: number;
  stability: number; // FSRS: 记忆稳定性
  retrievability: number; // FSRS: 可提取性
  difficulty: number; // FSRS: 难度系数 (0-1)
  state: 'new' | 'learning' | 'review' | 'relearning' | 'mastered';
  reviewCount: number; // 复习次数
  lapseCount: number; // 遗忘次数
  lastReview: Date; // 最后复习时间
  nextReview: Date; // 下次复习时间
  masteryLevel: number; // 掌握度 (0-1)
  
  // 新增：学习分析数据
  learningMetrics: {
    averageResponseTime: number; // 平均反应时间
    confidenceTrend: number[]; // 信心趋势
    difficultyAdjustment: number; // 难度调整因子
    contextAssociation: string[]; // 上下文联想
    semanticRelations: number[]; // 语义关联词ID
  };
}

export interface LearningProgress {
  userId: string;
  words: Map<number, WordProgress>; // wordId -> WordProgress
  lastReview: Date;
  totalStudyTime: number; // 毫秒
  averageAccuracy: number; // 0-1
  bestStreak: number;
  
  // 新增：学习模式数据
  learningPatterns: {
    preferredReviewInterval: number; // 偏好复习间隔
    cognitiveLoadThreshold: number; // 认知负荷阈值
    focusSessionLength: number; // 专注时长
    fatigueThreshold: number; // 疲劳阈值
  };
}

export interface LearningSession {
  id: string;
  userId: string;
  wordbookId: number;
  sessionType: 'new' | 'review' | 'assessment' | 'mixed';
  startTime: string;
  endTime?: string;
  duration: number; // 毫秒
  totalQuestions: number;
  correctAnswers: number;
  averageResponseTime: number;
  cognitiveLoad: number; // 认知负荷评分
  engagementScore: number; // 参与度评分
  
  // 新增：学习效果数据
  learningOutcomes: {
    knowledgeRetention: number; // 知识保持率
    skillAcquisition: number; // 技能获得度
    transferAbility: number; // 迁移能力
    metacognitionLevel: number; // 元认知水平
  };
  
  answers: AnswerRecord[];
}

export interface AnswerRecord {
  wordId: number;
  questionId: string;
  response: string;
  isCorrect: boolean;
  responseTime: number; // 毫秒
  confidence: number; // 0-1
  cognitiveState: {
    focus: number; // 专注度
    stress: number; // 压力水平
    motivation: number; // 动机水平
  };
  hint: {
    used: boolean;
    type?: 'definition' | 'example' | 'phonetic' | 'visual';
  };
  learningAdjustment: {
    stabilityChange: number;
    difficultyChange: number;
    nextReviewInterval: number;
  };
}

export interface LearningAnalytics {
  userId: string;
  totalStudyDays: number;
  averageSessionTime: number;
  learningVelocity: number; // 词汇学习速度 (词汇/天)
  retentionCurve: RetentionPoint[]; // 保持率曲线
  
  // 新增：学习模式分析
  learningPatterns: {
    peakPerformanceTimes: string[]; // 最佳表现时间段
    optimalSessionLength: number; // 最优单次学习时长
    preferredReviewFrequency: number; // 偏好复习频率
    cognitiveLoadOptimization: number; // 认知负荷优化程度
  };
  
  struggleWords: number[]; // 用户困难的词汇ID
  masteredWords: number[]; // 掌握的词汇ID
  recommendations: LearningRecommendation[];
  
  // 新增：高级分析
  advancedMetrics: {
    knowledgeNetworkDensity: number; // 知识网络密度
    learningEfficiency: number; // 学习效率
    retentionPredictability: number; // 保持率可预测性
    skillTransferability: number; // 技能可迁移性
  };
}

export interface RetentionPoint {
  date: string;
  retention: number; // 保持率 0-1
  sampleSize: number; // 样本大小
  confidence: number; // 置信度
}

export interface LearningRecommendation {
  type: 'review' | 'new' | 'practice' | 'assessment' | 'break';
  priority: 'high' | 'medium' | 'low';
  content: {
    wordIds?: number[];
    estimatedTime: number; // 分钟
    difficulty: 'easy' | 'medium' | 'hard';
    reason: string; // 推荐原因
  };
  metadata: {
    generatedAt: string;
    confidence: number;
    basedOnData: string[]; // 基于哪些数据
  };
}

export interface KnowledgeAssessment {
  userId: string;
  lastAssessmentDate: Date;
  overallMastery: number; // 0-1
  wordMastery: Map<number, number>; // wordId -> mastery level
  skillGaps: SkillGap[];
  learningEfficiency: number; // 学习效率
  
  // 新增：认知能力评估
  cognitiveAssessment: {
    workingMemoryCapacity: number; // 工作记忆容量
    processingSpeed: number; // 处理速度
    attentionControl: number; // 注意力控制
    patternRecognition: number; // 模式识别能力
    semanticNetworkSize: number; // 语义网络规模
  };
  
  // 新增：元认知监控
  metacognition: {
    selfAwareness: number; // 自我意识
    strategyKnowledge: number; // 策略知识
    monitoringAccuracy: number; // 监控准确性
    adaptiveControl: number; // 适应性控制
  };
}

export interface SkillGap {
  skill: string; // 技能名称
  currentLevel: number; // 当前水平 0-1
  targetLevel: number; // 目标水平 0-1
  importance: 'critical' | 'important' | 'beneficial';
  recommendedActions: string[]; // 推荐行动
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
  timeRemaining: number;
  totalScore: number;
  correctAnswers: number;
  totalQuestions: number;
  streak: number;
  maxStreak: number;
  achievements: string[];
  settings: GameSettings;
  
  // 新增：学习导向的游戏元数据
  learningMetadata: {
    educationalObjective: string; // 教育目标
    cognitiveProcess: string; // 认知过程
    assessmentType: string; // 评估类型
    difficultyCalculation: number; // 难度计算
  };
}

export type GameType = 'vocabulary-match' | 'definition-match' | 'listening-match' | 'spelling-bee' | 'contextual-usage' | 'semantic-relation';

export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'adaptive';

export type GameStatus = 'waiting' | 'countdown' | 'playing' | 'paused' | 'finished';

export interface GameQuestion {
  id: string;
  word: string;
  definition: string;
  translation: string;
  phonetic?: string;
  example?: string;
  options: string[];
  correctAnswer: number;
  difficulty: GameDifficulty;
  timeLimit: number;
  points: number;
  
  // 新增：教育学元数据
  educationalMetadata: {
    learningObjective: string; // 学习目标
    cognitiveLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
    prerequisiteConcepts: string[]; // 先决概念
    misconceptionPatterns: string[]; // 常见误解模式
    scaffoldingStrategy: string; // 支架策略
  };
}

export interface GameSettings {
  timePerQuestion: number;
  showCountdown: boolean;
  showProgress: boolean;
  enableSound: boolean;
  enableVibration: boolean;
  autoNext: boolean;
  maxStreakBonus: number;
  timeBonusMultiplier: number;
  difficultyMultiplier: Record<GameDifficulty, number>;
  
  // 新增：个性化设置
  personalization: {
    adaptiveDifficulty: boolean;
    cognitiveLoadOptimization: boolean;
    focusMode: boolean;
    distractionBlocking: boolean;
    motivationOptimization: boolean;
  };
}

export interface StudySession extends LearningSession {}

// 工具类型：支持深度学习的关键类型
export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface KnowledgeNode {
  id: string;
  type: 'word' | 'concept' | 'skill';
  content: any;
  properties: {
    difficulty: number;
    importance: number;
    connections: string[];
    masteryLevel: number;
  };
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relationship: 'synonym' | 'antonym' | 'etymology' | 'semantic' | 'prerequisite';
  strength: number; // 关联强度 0-1
  confidence: number; // 置信度 0-1
}

// 个性化学习路径类型
export interface PersonalizedPath {
  userId: string;
  currentLevel: number;
  targetLevel: number;
  estimatedCompletionTime: number; // 天数
  recommendedSequence: LearningStep[];
  adaptiveAdjustments: AdaptiveAdjustment[];
}

export interface LearningStep {
  stepId: string;
  wordIds: number[];
  learningObjective: string;
  difficulty: number;
  estimatedTime: number; // 分钟
  learningStrategy: string;
  assessmentCriteria: string[];
}

export interface AdaptiveAdjustment {
  trigger: string; // 调整触发条件
  adjustment: string; // 调整内容
  confidence: number; // 置信度
  reason: string; // 调整原因
}