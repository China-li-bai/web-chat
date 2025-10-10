/**
 * 数据库相关类型定义
 * 与schema.sql保持一致，确保类型安全
 */

// 基础数据库记录接口
export interface BaseRecord {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// 用户表
export interface UserRecord extends BaseRecord {
  name?: string;
  email?: string;
  // 学习偏好设置
  preferred_session_duration: number; // 秒
  target_cognitive_load: number; // 0-1
  interleave_types: boolean;
  // FSRS个性化参数
  fsrs_request_retention: number;
  fsrs_maximum_interval: number;
  fsrs_easy_bonus: number;
  fsrs_hard_factor: number;
  // 难度自适应参数
  min_difficulty: number;
  max_difficulty: number;
  adaptation_rate: number;
  // 统计信息
  total_study_time: number; // 秒
  total_items_studied: number;
  average_success_rate: number;
}

// 学习项目表
export interface LearningItemRecord extends BaseRecord {
  user_id: string;
  // 内容信息
  content: string;
  content_type: 'text' | 'image' | 'audio' | 'video';
  category?: string;
  tags?: string; // JSON数组格式
  // 难度和优先级
  difficulty: number; // 0-1，动态调整
  initial_difficulty: number; // 初始难度，不变
  priority: number; // 1-5
  // FSRS相关字段
  due_date?: Date;
  stability: number;
  difficulty_fsrs: number; // FSRS内部难度
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: 0 | 1 | 2 | 3; // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review?: Date;
  // 元数据
  source?: string;
  metadata?: string; // JSON格式
  is_active: boolean;
}

// 学习记录表
export interface StudyRecordDB extends BaseRecord {
  item_id: string;
  user_id: string;
  session_id?: string;
  // 响应信息
  response: 'again' | 'hard' | 'good' | 'easy';
  response_time: number; // 毫秒
  confidence?: number; // 0-1
  // FSRS计算结果
  memory_strength?: number;
  retrievability?: number;
  stability_before?: number;
  stability_after?: number;
  difficulty_before?: number;
  difficulty_after?: number;
  // 主动检索相关
  retrieval_strategy?: 'recognition' | 'free_recall' | 'cued_recall' | 'elaborative_retrieval';
  strategy_difficulty?: 'easy' | 'medium' | 'hard';
  hints_used: number;
  time_limit?: number; // 秒
  // 上下文信息
  device_type?: 'web' | 'mobile';
  environment?: 'home' | 'commute' | 'office';
}

// 学习会话表
export interface StudySessionRecord extends BaseRecord {
  user_id: string;
  // 会话基本信息
  start_time: Date;
  end_time?: Date;
  planned_duration?: number; // 秒
  actual_duration?: number; // 秒
  // 会话统计
  total_items: number;
  completed_items: number;
  correct_items: number;
  // 性能指标
  average_response_time: number;
  cognitive_load_predicted: number;
  cognitive_load_actual: number;
  success_rate: number;
  // 算法调整统计
  difficulty_adaptations: number;
  strategy_changes: number;
  // 会话类型和配置
  session_type: 'regular' | 'intensive' | 'review';
  interleave_enabled: boolean;
  // 元数据
  notes?: string;
  device_type?: 'web' | 'mobile';
  is_completed: boolean;
}

// 学习档案表
export interface LearningProfileRecord extends BaseRecord {
  user_id: string;
  // 学习能力指标
  processing_speed: number; // 处理速度倍数
  working_memory_capacity: number; // 工作记忆容量
  attention_span: number; // 注意力持续时间（秒）
  // 学习偏好
  preferred_difficulty: number; // 偏好难度
  optimal_cognitive_load: number; // 最佳认知负荷
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  // 时间偏好
  best_time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  preferred_session_length: number; // 秒
  break_frequency: number; // 休息频率（秒）
  // 动态调整参数
  adaptation_sensitivity: number; // 适应敏感度
  forgetting_curve_steepness: number; // 遗忘曲线陡峭度
  // 统计数据
  total_study_sessions: number;
  average_session_success_rate: number;
  improvement_rate: number; // 学习改进率
  consistency_score: number; // 学习一致性评分
}

// 认知负荷记录表
export interface CognitiveLoadRecord extends BaseRecord {
  user_id: string;
  session_id?: string;
  item_id?: string;
  // 负荷类型
  load_type: 'intrinsic' | 'extraneous' | 'germane';
  // 负荷值
  predicted_load: number;
  actual_load?: number;
  // 影响因素
  item_complexity?: number;
  user_expertise?: number;
  context_factors?: string; // JSON格式
  // 调整建议
  adjustment_needed: boolean;
  adjustment_type?: 'difficulty' | 'strategy' | 'timing';
  adjustment_magnitude?: number;
}

// 难度调整记录表
export interface DifficultyAdjustmentRecord extends BaseRecord {
  item_id: string;
  user_id: string;
  session_id?: string;
  // 调整信息
  old_difficulty: number;
  new_difficulty: number;
  adjustment_reason: string;
  adjustment_magnitude: number;
  // 触发条件
  trigger_type: 'performance' | 'time' | 'cognitive_load';
  trigger_data?: string; // JSON格式
  // 效果评估
  effectiveness_score?: number;
  user_satisfaction?: number;
}

// 检索策略记录表
export interface RetrievalStrategyRecord extends BaseRecord {
  item_id: string;
  user_id: string;
  session_id?: string;
  // 策略信息
  strategy_type: 'recognition' | 'free_recall' | 'cued_recall' | 'elaborative_retrieval';
  strategy_difficulty: 'easy' | 'medium' | 'hard';
  time_limit: number; // 秒
  hints_provided?: string; // JSON数组格式
  // 选择原因
  selection_reason: string;
  selection_factors?: string; // JSON格式
  // 执行结果
  execution_time?: number; // 毫秒
  success?: boolean;
  user_feedback?: string;
  // 效果评估
  testing_effect_strength?: number;
  predicted_retention?: number;
  actual_retention?: number;
}

// 同步状态表
export interface SyncStatusRecord {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'insert' | 'update' | 'delete';
  created_at: Date;
  synced_at?: Date;
  sync_attempts: number;
  last_error?: string;
  is_synced: boolean;
  data_snapshot?: string; // JSON格式
}

// 数据库操作结果类型
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rowsAffected?: number;
}

// 查询选项
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  where?: Record<string, any>;
}

// 分页结果
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 统计查询结果
export interface StudyStatistics {
  totalItems: number;
  completedItems: number;
  successRate: number;
  averageResponseTime: number;
  totalStudyTime: number;
  streakDays: number;
  itemsByDifficulty: Record<string, number>;
  itemsByCategory: Record<string, number>;
  performanceTrend: Array<{
    date: string;
    successRate: number;
    itemsStudied: number;
  }>;
}

// 学习进度
export interface LearningProgress {
  userId: string;
  totalItems: number;
  newItems: number;
  learningItems: number;
  reviewItems: number;
  masteredItems: number;
  dueToday: number;
  overdue: number;
  estimatedStudyTime: number; // 秒
  nextReviewDate?: Date;
}

// 算法性能指标
export interface AlgorithmMetrics {
  fsrs: {
    averageRetention: number;
    intervalAccuracy: number;
    stabilityTrend: number;
  };
  difficultyAdaptive: {
    adaptationFrequency: number;
    adaptationAccuracy: number;
    userSatisfaction: number;
  };
  activeRetrieval: {
    testingEffectStrength: number;
    strategyEffectiveness: Record<string, number>;
    optimalCognitiveLoad: number;
  };
}

// 所有类型已通过interface声明自动导出