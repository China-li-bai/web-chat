import type { Achievement, GameSession, GameResult } from '@/types/game';

// 预定义成就配置
export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'unlockedAt'>[] = [
  // 准确性成就
  {
    id: 'first_win',
    name: '初次胜利',
    description: '完成第一次游戏',
    icon: '🎯',
    type: 'milestone',
    condition: { type: 'games_played', value: 1 },
    rewards: { experience: 50, points: 100, title: '新手' },
    rarity: 'common'
  },
  {
    id: 'perfect_accuracy',
    name: '完美表现',
    description: '单局游戏准确率达到100%',
    icon: '💯',
    type: 'accuracy',
    condition: { type: 'accuracy_rate', value: 1.0 },
    rewards: { experience: 200, points: 500, badge: '完美主义者' },
    rarity: 'rare'
  },
  {
    id: 'accuracy_master',
    name: '准确大师',
    description: '累计准确率达到90%以上',
    icon: '🏹',
    type: 'accuracy',
    condition: { type: 'cumulative_accuracy', value: 0.9, timeframe: 'allTime' },
    rewards: { experience: 300, points: 800, title: '准确大师' },
    rarity: 'epic'
  },

  // 速度成就
  {
    id: 'speed_demon',
    name: '闪电侠',
    description: '单题平均反应时间少于3秒',
    icon: '⚡',
    type: 'speed',
    condition: { type: 'avg_response_time', value: 3000 },
    rewards: { experience: 150, points: 300, badge: '速度之星' },
    rarity: 'rare'
  },
  {
    id: 'lightning_fast',
    name: '疾风骤雨',
    description: '10题连击，平均每题2秒内完成',
    icon: '🌩️',
    type: 'speed',
    condition: { type: 'streak_speed', value: 10, gameType: 'vocabulary-match' },
    rewards: { experience: 250, points: 600, badge: '极速传说' },
    rarity: 'epic'
  },

  // 连击成就
  {
    id: 'streak_newbie',
    name: '连击新手',
    description: '单局游戏连击5题',
    icon: '🔥',
    type: 'streak',
    condition: { type: 'max_streak', value: 5 },
    rewards: { experience: 100, points: 200 },
    rarity: 'common'
  },
  {
    id: 'streak_master',
    name: '连击大师',
    description: '单局游戏连击15题',
    icon: '🚀',
    type: 'streak',
    condition: { type: 'max_streak', value: 15 },
    rewards: { experience: 300, points: 700, badge: '连击王者' },
    rarity: 'epic'
  },
  {
    id: 'unstoppable',
    name: '势不可挡',
    description: '单局游戏连击20题',
    icon: '👑',
    type: 'streak',
    condition: { type: 'max_streak', value: 20 },
    rewards: { experience: 500, points: 1000, title: '连击传奇', badge: '传说级连击' },
    rarity: 'legendary'
  },

  // 数量成就
  {
    id: 'dedicated_learner',
    name: '勤奋学习者',
    description: '累计完成50题',
    icon: '📚',
    type: 'volume',
    condition: { type: 'total_questions', value: 50, timeframe: 'allTime' },
    rewards: { experience: 200, points: 400 },
    rarity: 'common'
  },
  {
    id: 'vocabulary_knight',
    name: '词汇骑士',
    description: '累计完成500题',
    icon: '🛡️',
    type: 'volume',
    condition: { type: 'total_questions', value: 500, timeframe: 'allTime' },
    rewards: { experience: 400, points: 800, title: '词汇骑士' },
    rarity: 'rare'
  },
  {
    id: 'word_master',
    name: '词汇大师',
    description: '累计完成1000题',
    icon: '🏆',
    type: 'volume',
    condition: { type: 'total_questions', value: 1000, timeframe: 'allTime' },
    rewards: { experience: 800, points: 1500, title: '词汇大师', badge: '学习之星' },
    rarity: 'epic'
  },

  // 持久性成就
  {
    id: 'daily_learner',
    name: '每日学习者',
    description: '连续7天游戏',
    icon: '📅',
    type: 'persistence',
    condition: { type: 'daily_streak', value: 7 },
    rewards: { experience: 300, points: 600, badge: '坚持不懈' },
    rarity: 'rare'
  },
  {
    id: 'weekly_warrior',
    name: '每周战士',
    description: '连续30天游戏',
    icon: '⚔️',
    type: 'persistence',
    condition: { type: 'daily_streak', value: 30 },
    rewards: { experience: 600, points: 1200, title: '每周战士' },
    rarity: 'epic'
  },

  // 里程碑成就
  {
    id: 'game_veteran',
    name: '游戏老兵',
    description: '完成100场游戏',
    icon: '🎖️',
    type: 'milestone',
    condition: { type: 'total_games', value: 100, timeframe: 'allTime' },
    rewards: { experience: 500, points: 1000, title: '游戏老兵' },
    rarity: 'epic'
  },
  {
    id: 'legendary_player',
    name: '传奇玩家',
    description: '完成500场游戏',
    icon: '👨‍🎓',
    type: 'milestone',
    condition: { type: 'total_games', value: 500, timeframe: 'allTime' },
    rewards: { experience: 1000, points: 2000, title: '传奇玩家', badge: '殿堂级玩家' },
    rarity: 'legendary'
  },

  // 特殊成就
  {
    id: 'night_owl',
    name: '夜猫子',
    description: '深夜时段（22:00-6:00）游戏10次',
    icon: '🦉',
    type: 'milestone',
    condition: { type: 'night_games', value: 10, timeframe: 'allTime' },
    rewards: { experience: 200, points: 400, badge: '夜猫子' },
    rarity: 'rare'
  },
  {
    id: 'early_bird',
    name: '早起鸟',
    description: '早晨时段（6:00-9:00）游戏10次',
    icon: '🐦',
    type: 'milestone',
    condition: { type: 'morning_games', value: 10, timeframe: 'allTime' },
    rewards: { experience: 200, points: 400, badge: '早起鸟' },
    rarity: 'rare'
  }
];

export class AchievementService {
  private static instance: AchievementService;

  static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  // 检查新成就
  checkAchievements(
    userId: string, 
    gameResult: GameResult, 
    userStats: any, 
    existingAchievements: string[]
  ): Achievement[] {
    const newAchievements: Achievement[] = [];
    const unlockedIds = new Set(existingAchievements);

    for (const achievementDef of ACHIEVEMENT_DEFINITIONS) {
      // 跳过已解锁的成就
      if (unlockedIds.has(achievementDef.id)) continue;

      if (this.checkAchievementCondition(achievementDef, gameResult, userStats)) {
        const achievement: Achievement = {
          ...achievementDef,
          unlockedAt: new Date().toISOString()
        };
        newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  // 检查单个成就条件
  private checkAchievementCondition(
    achievement: Omit<Achievement, 'unlockedAt'>, 
    gameResult: GameResult, 
    userStats: any
  ): boolean {
    const condition = achievement.condition;
    const { type, value, timeframe = 'allTime' } = condition;

    switch (type) {
      case 'games_played':
        return userStats.totalGames >= value;

      case 'accuracy_rate':
        return gameResult.finalAccuracy >= value;

      case 'cumulative_accuracy':
        if (timeframe === 'allTime') {
          return userStats.averageAccuracy >= value;
        }
        // TODO: 实现时间框架过滤
        return userStats.averageAccuracy >= value;

      case 'avg_response_time':
        return gameResult.averageResponseTime <= value;

      case 'streak_speed':
        return gameResult.maxStreak >= value && gameResult.averageResponseTime <= 2000;

      case 'max_streak':
        return gameResult.maxStreak >= value;

      case 'total_questions':
        if (timeframe === 'allTime') {
          return userStats.totalQuestions >= value;
        }
        // TODO: 实现时间框架过滤
        return userStats.totalQuestions >= value;

      case 'daily_streak':
        // TODO: 需要实现连续天数计算
        return userStats.dailyStreak >= value;

      case 'total_games':
        return userStats.totalGames >= value;

      case 'night_games':
        return this.countGamesInTimeRange(gameResult, 22, 6) >= value;

      case 'morning_games':
        return this.countGamesInTimeRange(gameResult, 6, 9) >= value;

      default:
        return false;
    }
  }

  // 计算指定时间范围内的游戏数量
  private countGamesInTimeRange(gameResult: GameResult, startHour: number, endHour: number): number {
    // TODO: 实现时间范围统计
    return 0;
  }

  // 获取成就进度
  getAchievementProgress(
    achievement: Omit<Achievement, 'unlockedAt'>, 
    userStats: any, 
    gameResult?: GameResult
  ): { current: number; target: number; percentage: number } {
    const { type, value } = achievement.condition;
    let current = 0;

    switch (type) {
      case 'games_played':
        current = userStats.totalGames;
        break;
      case 'total_questions':
        current = userStats.totalQuestions;
        break;
      case 'max_streak':
        current = gameResult ? gameResult.maxStreak : userStats.bestStreak;
        break;
      case 'accuracy_rate':
        current = gameResult ? gameResult.finalAccuracy : userStats.averageAccuracy;
        break;
      case 'avg_response_time':
        current = gameResult ? gameResult.averageResponseTime : userStats.averageResponseTime;
        break;
      case 'total_games':
        current = userStats.totalGames;
        break;
      default:
        current = 0;
    }

    const percentage = Math.min(100, (current / value) * 100);
    return { current, target: value, percentage };
  }

  // 获取用户等级信息
  getUserLevel(experience: number): { 
    level: number; 
    title: string; 
    nextLevelExperience: number; 
    progress: number;
    benefits: string[];
  } {
    let level = Math.floor(experience / 1000) + 1;
    const currentLevelExp = (level - 1) * 1000;
    const nextLevelExp = level * 1000;
    const progress = (experience - currentLevelExp) / 1000;

    const titles = [
      '初学者', '学习者', '练习者', '学者', '专家', 
      '大师', '导师', '传奇', '神话', '至尊'
    ];

    const benefits = [
      '基础游戏模式',
      '中等难度解锁',
      '成就系统',
      '统计功能',
      '困难模式',
      '专家模式',
      '自定义设置',
      '高级统计',
      '所有模式',
      '传奇称号'
    ];

    const titleIndex = Math.min(level - 1, titles.length - 1);
    const benefitIndex = Math.min(level - 1, benefits.length - 1);

    return {
      level,
      title: titles[titleIndex],
      nextLevelExperience: nextLevelExp,
      progress,
      benefits: benefits.slice(0, benefitIndex + 1)
    };
  }

  // 计算最终得分
  calculateFinalScore(
    baseScore: number,
    gameResult: GameResult,
    difficulty: string,
    timeBonus: number,
    difficultyBonus: number,
    speedBonus: number
  ): { totalScore: number; breakdown: any } {
    // 基础分数
    let totalScore = baseScore;

    // 准确率奖励
    const accuracyBonus = Math.floor(totalScore * gameResult.finalAccuracy * 0.2);

    // 连击奖励
    const streakBonus = gameResult.maxStreak > 5 ? 
      Math.floor(gameResult.maxStreak * 10) : 0;

    // 完美完成奖励
    const perfectBonus = gameResult.perfectScore ? 200 : 0;

    totalScore += accuracyBonus + streakBonus + perfectBonus + timeBonus + difficultyBonus + speedBonus;

    return {
      totalScore,
      breakdown: {
        baseScore,
        accuracyBonus,
        streakBonus,
        perfectBonus,
        timeBonus,
        difficultyBonus,
        speedBonus
      }
    };
  }
}

export const achievementService = AchievementService.getInstance();