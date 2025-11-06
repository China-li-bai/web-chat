/**
 * Database Module Entry Point
 * 导出统一的数据库服务接口
 */

// 核心数据库服务
export { 
  databaseService, 
  getDB, // 向后兼容
  DatabaseService 
} from './database';

// 数据库实体类型
export type { Database } from '@/packages/wa-sqlite-adapter/database';

// Learning Domain 
export type {
  WordbookEntity,
  WordEntity,
  LearningProgressEntity,
  StudyLogEntity,
  LearningStatisticsEntity,
  WordTypeStatisticsEntity
} from './schemas/learning.schema';

// Practice Domain
export type {
  PracticeSessionEntity,
  PracticeTurnEntity,
  PracticeMessageEntity
} from './schemas/practice.schema';

// Game Domain
export type {
  GameSessionEntity,
  GameQuestionEntity,
  GameAnswerEntity,
  GameResultEntity,
  GameStatisticsEntity,
  GameType,
  GameDifficulty,
  GameStatus
} from './schemas/game.schema';

// User Domain
export type {
  AchievementEntity,
  UserAchievementEntity,
  UserLevelEntity,
  LeaderboardEntity,
  AchievementType,
  AchievementRarity,
  LeaderboardPeriod
} from './schemas/user.schema';

// 迁移管理
export { MigrationManager } from './migrations/migration-manager';

// Schema 定义 (仅在需要时导出)
export {
  LEARNING_SCHEMA,
  LEARNING_INDICES
} from './schemas/learning.schema';

export {
  PRACTICE_SCHEMA,
  PRACTICE_INDICES
} from './schemas/practice.schema';

export {
  GAME_SCHEMA,
  GAME_INDICES
} from './schemas/game.schema';

export {
  USER_SCHEMA,
  USER_INDICES
} from './schemas/user.schema';