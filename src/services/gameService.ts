import { getDB } from '@/services/db';
import type { 
  GameSession, 
  GameQuestion, 
  GameResult, 
  GameStatistics, 
  Achievement, 
  Leaderboard,
  StartGameParams,
  GenerateGameQuestionsParams
} from '@/types/game';

class GameService {
  private static instance: GameService;
  private db: any = null;

  static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  async initDB() {
    if (!this.db) {
      this.db = await getDB();
    }
    return this.db;
  }

  // 创建游戏会话
  async createGameSession(params: StartGameParams): Promise<GameSession> {
    const db = await this.initDB();
    const sessionId = this.generateId();
    const now = new Date().toISOString();
    
    try {
      console.log('=== GameService: 开始创建游戏会话 ===');
      console.log('接收到的参数:', params);
      console.log('参数类型检查:', {
        wordbookId: typeof params.wordbookId,
        gameType: typeof params.gameType,
        difficulty: typeof params.difficulty,
        questionCount: typeof params.questionCount,
        customSettings: typeof params.customSettings
      });
      
      // 生成问题
      const questions = await this.generateGameQuestions({
        wordbookId: params.wordbookId,
        gameType: params.gameType,
        difficulty: params.difficulty,
        count: params.questionCount
      });

      console.log('生成的问题数量:', questions.length);
      console.log('第一个问题示例:', questions[0]);

      const session: GameSession = {
        id: sessionId,
        userId: 'user-1', // TODO: 从用户状态获取
        wordbookId: params.wordbookId,
        gameType: params.gameType,
        difficulty: params.difficulty,
        status: 'playing',
        startTime: now,
        currentQuestionIndex: 0,
        questions,
        timeRemaining: params.questionCount * params.customSettings?.timePerQuestion || 75000, // 总时间
        totalScore: 0,
        correctAnswers: 0,
        totalQuestions: questions.length,
        streak: 0,
        maxStreak: 0,
        achievements: [],
        settings: params.customSettings || this.getDefaultSettings()
      };

      // 保存到数据库
      try {
        await db.exec({
          sql: `INSERT INTO game_sessions (
            id, userId, wordbookId, gameType, difficulty, status, startTime,
            currentQuestionIndex, timeRemaining, totalScore, correctAnswers,
            totalQuestions, streak, maxStreak, settings
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [
            session.id, session.userId, session.wordbookId, session.gameType,
            session.difficulty, session.status, session.startTime,
            session.currentQuestionIndex, session.timeRemaining, session.totalScore,
            session.correctAnswers, session.totalQuestions, session.streak,
            session.maxStreak, JSON.stringify(session.settings)
          ]
        });

        // 保存问题
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await db.exec({
            sql: `INSERT INTO game_questions (
              id, sessionId, word, definition, translation, phonetic, example,
              options, correctAnswer, difficulty, timeLimit, points, orderIndex
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            params: [
              q.id, sessionId, q.word, q.definition, q.translation,
              q.phonetic, q.example, JSON.stringify(q.options),
              q.correctAnswer, q.difficulty, q.timeLimit, q.points, i
            ]
          });
        }
        console.log('游戏会话创建成功:', session.id);
      } catch (dbError) {
        console.warn('数据库保存失败，但游戏可以继续:', dbError);
        // 即使数据库保存失败，也返回会话对象让游戏继续
      }

      return session;
    } catch (error) {
      console.error('创建游戏会话失败:', error);
      throw new Error(`创建游戏会话失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 生成游戏问题
  async generateGameQuestions(params: GenerateGameQuestionsParams): Promise<GameQuestion[]> {
    const db = await this.initDB();
    
    try {
      console.log('=== GameService: 开始生成游戏问题 ===');
      console.log('原始请求参数:', params);
      console.log('参数类型检查:', {
        wordbookId: typeof params.wordbookId,
        wordbookIdValue: params.wordbookId,
        count: typeof params.count,
        countValue: params.count
      });
      
      // 确保参数类型正确
      const wordbookId = Number(params.wordbookId);
      const count = Number(params.count);
      
      if (isNaN(wordbookId)) {
        throw new Error(`wordbookId 必须是数字，但收到了: ${params.wordbookId} (${typeof params.wordbookId})`);
      }
      
      if (isNaN(count) || count <= 0) {
        throw new Error(`count 必须是正数，但收到了: ${params.count} (${typeof params.count})`);
      }
      
      console.log('转换后的参数:', { wordbookId, count });
      
      // 检查数据库中是否有词书数据
      console.log('检查数据库状态...');
      const wordbookCount = await db.exec({
        sql: 'SELECT COUNT(*) as count FROM wordbooks',
        params: []
      });
      console.log('词书总数:', wordbookCount[0]?.count || 0);
      
      const wordsCount = await db.exec({
        sql: 'SELECT COUNT(*) as count FROM words',
        params: []
      });
      console.log('单词总数:', wordsCount[0]?.count || 0);
      
      if (wordbookCount[0]?.count === 0 || wordsCount[0]?.count === 0) {
        console.log('数据库为空，使用模拟数据');
        return this.generateMockQuestions(count);
      }
      
      // 从数据库获取单词
      console.log('执行SQL查询...');
      const words = await db.exec({
        sql: `SELECT w.*, lp.stability, lp.difficulty as learningDifficulty 
              FROM words w 
              LEFT JOIN learning_progress lp ON w.id = lp.wordId 
              WHERE w.wordbookId = ? AND w.userId = ?
              LIMIT ?`,
        params: [wordbookId, 'user-1', count]
      });

      console.log('查询成功，查询到的单词数量:', words.length);
      console.log('查询到的单词详情:', words.slice(0, 3)); // 只显示前3个

      // 如果没有足够的单词，尝试获取更多
      let availableWords = words;
      if (words.length < count) {
        console.log('单词数量不足，尝试获取更多单词');
        // 获取更多单词（即使不属于指定词书）
        const moreWords = await db.exec({
          sql: `SELECT w.*, lp.stability, lp.difficulty as learningDifficulty 
                FROM words w 
                LEFT JOIN learning_progress lp ON w.id = lp.wordId 
                WHERE w.userId = ?
                LIMIT ?`,
          params: ['user-1', count]
        });
        availableWords = moreWords;
        console.log('使用更多单词:', moreWords.length);
        
        // 如果还是没有足够的单词，使用所有可用的单词
        if (availableWords.length === 0) {
          console.log('仍然没有单词，使用模拟数据');
        }
      }

      if (availableWords.length === 0) {
        console.warn('=== GameService: 没有找到任何单词数据，使用模拟数据 ===');
        // 返回模拟数据以确保游戏能继续
        const mockQuestions = this.generateMockQuestions(count);
        console.log('生成模拟问题数量:', mockQuestions.length);
        return mockQuestions;
      }

      // 随机打乱单词顺序
      this.shuffleArray(availableWords);
      const selectedWords = availableWords.slice(0, count);

      const questions: GameQuestion[] = [];
      
      for (const word of selectedWords) {
        // 生成干扰项
        const options = await this.generateOptions(word.translation || word.definition, params.difficulty);
        const correctIndex = Math.floor(Math.random() * options.length);
        
        // 确保正确答案在选项中
        options[correctIndex] = word.translation || word.definition;

        const question: GameQuestion = {
          id: this.generateId(),
          word: word.word,
          definition: word.definition,
          translation: word.translation || word.definition,
          options,
          correctAnswer: correctIndex,
          difficulty: params.difficulty,
          timeLimit: this.getTimeLimit(params.difficulty),
          points: this.getBasePoints(params.difficulty)
        };

        questions.push(question);
      }

      return questions;
    } catch (error) {
      console.error('生成游戏问题失败:', error);
      // 返回模拟数据作为备选方案
      return this.generateMockQuestions(params.count);
    }
  }

  // 生成模拟问题（作为备选方案）
  private async generateMockQuestions(count: number): Promise<GameQuestion[]> {
    const mockWords = [
      { word: 'apple', translation: '苹果', definition: 'a round fruit' },
      { word: 'book', translation: '书', definition: 'a set of printed pages' },
      { word: 'computer', translation: '计算机', definition: 'an electronic device' },
      { word: 'water', translation: '水', definition: 'a clear liquid' },
      { word: 'house', translation: '房子', definition: 'a building for living' },
      { word: 'car', translation: '汽车', definition: 'a motor vehicle' },
      { word: 'phone', translation: '电话', definition: 'a communication device' },
      { word: 'music', translation: '音乐', definition: 'organized sound' },
      { word: 'food', translation: '食物', definition: 'something to eat' },
      { word: 'school', translation: '学校', definition: 'a place for learning' }
    ];

    const questions: GameQuestion[] = [];
    
    for (let i = 0; i < count; i++) {
      const wordData = mockWords[i % mockWords.length];
      const options = await this.generateMockOptions(wordData.translation);
      
      questions.push({
        id: this.generateId(),
        word: wordData.word,
        definition: wordData.definition,
        translation: wordData.translation,
        options,
        correctAnswer: 0, // 正确答案总是在第一个位置
        difficulty: 'medium',
        timeLimit: 15000,
        points: 15
      });
    }
    
    return questions;
  }

  // 生成模拟选项
  private async generateMockOptions(correctTranslation: string): Promise<string[]> {
    const commonTranslations = [
      '苹果', '书', '计算机', '水', '房子', '汽车', '电话', '音乐', '食物', '学校',
      '学习', '工作', '生活', '家庭', '朋友', '时间', '空间', '概念',
      '理解', '记忆', '思维', '情感', '行为', '目标', '结果', '过程'
    ];

    const options = [correctTranslation];
    
    // 随机选择3个干扰项
    const availableTranslations = commonTranslations.filter(t => t !== correctTranslation);
    for (let i = 0; i < 3; i++) {
      if (availableTranslations.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableTranslations.length);
        options.push(availableTranslations[randomIndex]);
        availableTranslations.splice(randomIndex, 1);
      }
    }
    
    return this.shuffleArray(options);
  }

  // 生成干扰选项
  private async generateOptions(correctDefinition: string, difficulty: string): Promise<string[]> {
    const db = await this.initDB();
    const options: string[] = [correctDefinition];
    
    // 从其他单词的翻译中随机选择作为干扰项
    const distractors = await db.exec({
      sql: `SELECT DISTINCT translation FROM words 
            WHERE translation IS NOT NULL AND translation != ?
            ORDER BY RANDOM() 
            LIMIT 3`,
      params: [correctDefinition]
    });

    for (const distractor of distractors.slice(0, 3)) {
      if (options.length < 4) {
        options.push(distractor.translation);
      }
    }

    // 如果干扰项不够，用通用词汇补全
    const commonTranslations = [
      '学习', '工作', '生活', '家庭', '朋友', '时间', '空间', '概念',
      '理解', '记忆', '思维', '情感', '行为', '目标', '结果', '过程'
    ];

    while (options.length < 4) {
      const randomTranslation = commonTranslations[Math.floor(Math.random() * commonTranslations.length)];
      if (!options.includes(randomTranslation)) {
        options.push(randomTranslation);
      }
    }

    // 打乱选项顺序
    return this.shuffleArray(options);
  }

  // 保存答案
  async saveAnswer(
    sessionId: string, 
    questionId: string, 
    answer: {
      userAnswer: number;
      isCorrect: boolean;
      responseTime: number;
      timeUsed: number;
      pointsEarned: number;
    }
  ): Promise<void> {
    const db = await this.initDB();
    
    await db.exec({
      sql: `INSERT INTO game_answers (
        questionId, sessionId, userAnswer, isCorrect, responseTime,
        timeUsed, pointsEarned, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        questionId, sessionId, answer.userAnswer, answer.isCorrect ? 1 : 0,
        answer.responseTime, answer.timeUsed, answer.pointsEarned,
        new Date().toISOString()
      ]
    });
  }

  // 保存跳过记录
  async saveSkip(sessionId: string, questionId: string): Promise<void> {
    const db = await this.initDB();
    
    await db.exec({
      sql: `INSERT INTO game_answers (
        questionId, sessionId, userAnswer, isCorrect, responseTime,
        timeUsed, pointsEarned, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        questionId, sessionId, -1, 0, 0, 3000, 0, new Date().toISOString()
      ]
    });
  }

  // 保存提示使用
  async saveHintUse(sessionId: string, questionId: string): Promise<void> {
    // 提示功能可以记录到专门的表中或追加到game_answers的feedback字段
    const db = await this.initDB();
    
    await db.exec({
      sql: `UPDATE game_answers SET feedback = ? 
            WHERE questionId = ? AND sessionId = ?`,
      params: [JSON.stringify({ hintUsed: true }), questionId, sessionId]
    });
  }

  // 结束游戏会话
  async finishGameSession(sessionId: string): Promise<{ result: GameResult; updatedStatistics: GameStatistics }> {
    const db = await this.initDB();
    
    // 获取会话信息
    const sessionResult = await db.exec({
      sql: 'SELECT * FROM game_sessions WHERE id = ?',
      params: [sessionId]
    });
    
    if (sessionResult.length === 0) {
      throw new Error('游戏会话不存在');
    }
    
    const session = sessionResult[0];
    const endTime = new Date().toISOString();
    
    // 获取答案统计
    const answers = await db.exec({
      sql: 'SELECT * FROM game_answers WHERE sessionId = ?',
      params: [sessionId]
    });

    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const totalQuestions = answers.length;
    const averageResponseTime = answers.reduce((sum, a) => sum + a.responseTime, 0) / totalQuestions;
    const maxStreak = session.maxStreak;
    
    // 计算奖励
    const finalAccuracy = correctAnswers / totalQuestions;
    const timeBonus = this.calculateTimeBonus(session);
    const difficultyBonus = this.calculateDifficultyBonus(session);
    const speedBonus = this.calculateSpeedBonus(averageResponseTime);
    const totalScore = session.totalScore + timeBonus + difficultyBonus + speedBonus;
    
    // 创建结果记录
    const result: GameResult = {
      id: this.generateId(),
      sessionId,
      userId: session.userId,
      wordbookId: session.wordbookId,
      gameType: session.gameType,
      difficulty: session.difficulty,
      startTime: session.startTime,
      endTime,
      totalScore,
      finalAccuracy,
      totalQuestions,
      correctAnswers,
      averageResponseTime,
      maxStreak,
      achievements: [], // TODO: 实际实现时填充
      timeBonus,
      difficultyBonus,
      speedBonus,
      perfectScore: correctAnswers === totalQuestions
    };

    // 保存结果
    await db.exec({
      sql: `INSERT INTO game_results (
        id, sessionId, userId, wordbookId, gameType, difficulty,
        startTime, endTime, totalScore, finalAccuracy, totalQuestions,
        correctAnswers, averageResponseTime, maxStreak, achievements,
        timeBonus, difficultyBonus, perfectScore, speedBonus
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        result.id, result.sessionId, result.userId, result.wordbookId,
        result.gameType, result.difficulty, result.startTime, result.endTime,
        result.totalScore, result.finalAccuracy, result.totalQuestions,
        result.correctAnswers, result.averageResponseTime, result.maxStreak,
        JSON.stringify(result.achievements), result.timeBonus, result.difficultyBonus,
        result.perfectScore ? 1 : 0, result.speedBonus
      ]
    });

    // 更新游戏统计
    const updatedStatistics = await this.updateUserStatistics(session.userId, session.wordbookId, result);

    // 更新会话状态
    await db.exec({
      sql: 'UPDATE game_sessions SET status = ?, endTime = ? WHERE id = ?',
      params: ['finished', endTime, sessionId]
    });

    return { result, updatedStatistics };
  }

  // 更新用户统计
  private async updateUserStatistics(userId: string, wordbookId: number, result: GameResult): Promise<GameStatistics> {
    const db = await this.initDB();
    
    // 获取现有统计
    const existingStats = await db.exec({
      sql: 'SELECT * FROM game_statistics WHERE userId = ? AND wordbookId = ?',
      params: [userId, wordbookId]
    });

    const gameDuration = new Date(result.endTime).getTime() - new Date(result.startTime).getTime();

    if (existingStats.length > 0) {
      const stats = existingStats[0];
      const updatedStats = {
        totalGames: stats.totalGames + 1,
        totalQuestions: stats.totalQuestions + result.totalQuestions,
        totalCorrect: stats.totalCorrect + result.correctAnswers,
        averageAccuracy: (stats.totalCorrect + result.correctAnswers) / (stats.totalQuestions + result.totalQuestions),
        averageResponseTime: (stats.averageResponseTime * stats.totalQuestions + result.averageResponseTime * result.totalQuestions) / (stats.totalQuestions + result.totalQuestions),
        bestStreak: Math.max(stats.bestStreak, result.maxStreak),
        favoriteGameType: result.gameType,
        favoriteDifficulty: result.difficulty,
        totalPlayTime: stats.totalPlayTime + gameDuration,
        lastPlayed: result.endTime,
        level: Math.floor((stats.experience + result.totalScore) / 1000) + 1,
        experience: stats.experience + result.totalScore
      };

      await db.exec({
        sql: `UPDATE game_statistics SET 
              totalGames = ?, totalQuestions = ?, totalCorrect = ?,
              averageAccuracy = ?, averageResponseTime = ?, bestStreak = ?,
              favoriteGameType = ?, favoriteDifficulty = ?, totalPlayTime = ?,
              lastPlayed = ?, level = ?, experience = ?, updatedAt = ?
              WHERE userId = ? AND wordbookId = ?`,
        params: [
          updatedStats.totalGames, updatedStats.totalQuestions, updatedStats.totalCorrect,
          updatedStats.averageAccuracy, updatedStats.averageResponseTime, updatedStats.bestStreak,
          updatedStats.favoriteGameType, updatedStats.favoriteDifficulty, updatedStats.totalPlayTime,
          updatedStats.lastPlayed, updatedStats.level, updatedStats.experience,
          new Date().toISOString(), userId, wordbookId
        ]
      });

      return {
        userId,
        wordbookId,
        ...updatedStats,
        achievements: JSON.parse(stats.achievements || '[]'),
        createdAt: stats.createdAt,
        updatedAt: new Date().toISOString()
      };
    } else {
      const newStats = {
        totalGames: 1,
        totalQuestions: result.totalQuestions,
        totalCorrect: result.correctAnswers,
        averageAccuracy: result.finalAccuracy,
        averageResponseTime: result.averageResponseTime,
        bestStreak: result.maxStreak,
        favoriteGameType: result.gameType,
        favoriteDifficulty: result.difficulty,
        totalPlayTime: gameDuration,
        lastPlayed: result.endTime,
        level: Math.floor(result.totalScore / 1000) + 1,
        experience: result.totalScore
      };

      await db.exec({
        sql: `INSERT INTO game_statistics (
          userId, wordbookId, totalGames, totalQuestions, totalCorrect,
          averageAccuracy, averageResponseTime, bestStreak, favoriteGameType,
          favoriteDifficulty, totalPlayTime, lastPlayed, level, experience
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          userId, wordbookId, newStats.totalGames, newStats.totalQuestions,
          newStats.totalCorrect, newStats.averageAccuracy, newStats.averageResponseTime,
          newStats.bestStreak, newStats.favoriteGameType, newStats.favoriteDifficulty,
          newStats.totalPlayTime, newStats.lastPlayed, newStats.level, newStats.experience
        ]
      });

      return {
        userId,
        wordbookId,
        ...newStats,
        achievements: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  // 检查和解锁成就
  async checkAndUnlockAchievements(userId: string, session: GameSession): Promise<Achievement[]> {
    // TODO: 实现成就检查逻辑
    return [];
  }

  // 领取成就奖励
  async claimAchievementReward(achievementId: string): Promise<void> {
    // TODO: 实现奖励领取逻辑
  }

  // 获取用户统计
  async getUserStatistics(userId: string, wordbookId: number): Promise<GameStatistics> {
    const db = await this.initDB();
    
    const result = await db.exec({
      sql: 'SELECT * FROM game_statistics WHERE userId = ? AND wordbookId = ?',
      params: [userId, wordbookId]
    });

    if (result.length === 0) {
      // 返回默认统计
      return {
        userId,
        wordbookId,
        totalGames: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        averageAccuracy: 0,
        averageResponseTime: 0,
        bestStreak: 0,
        favoriteGameType: 'vocabulary-match',
        favoriteDifficulty: 'medium',
        totalPlayTime: 0,
        lastPlayed: '',
        achievements: [],
        level: 1,
        experience: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const stats = result[0];
    return {
      ...stats,
      achievements: JSON.parse(stats.achievements || '[]')
    };
  }

  // 获取排行榜
  async getLeaderboard(period: string, gameType?: string, difficulty?: string): Promise<Leaderboard> {
    const db = await this.initDB();
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    let query = 'SELECT * FROM game_results WHERE startTime >= ?';
    const params: any[] = [startDate.toISOString()];

    if (gameType) {
      query += ' AND gameType = ?';
      params.push(gameType);
    }

    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }

    query += ' ORDER BY totalScore DESC LIMIT 50';

    const results = await db.exec({ sql: query, params });

    const entries = results.map((result, index) => ({
      rank: index + 1,
      userId: result.userId,
      username: `用户${result.userId.slice(-4)}`, // 简化用户名
      score: result.totalScore,
      accuracy: result.finalAccuracy,
      gamesPlayed: 1,
      lastPlayed: result.endTime
    }));

    return {
      period: period as any,
      gameType,
      difficulty,
      entries,
      userRank: undefined,
      userEntry: undefined
    };
  }

  // 辅助方法
  private generateId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultSettings() {
    return {
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
    };
  }

  private getTimeLimit(difficulty: string): number {
    const limits = {
      easy: 20000,
      medium: 15000,
      hard: 10000,
      expert: 8000
    };
    return limits[difficulty as keyof typeof limits] || 15000;
  }

  private getBasePoints(difficulty: string): number {
    const points = {
      easy: 10,
      medium: 15,
      hard: 25,
      expert: 40
    };
    return points[difficulty as keyof typeof points] || 15;
  }

  private calculateTimeBonus(session: any): number {
    // 基于剩余时间计算奖励
    return Math.floor(session.totalScore * 0.1);
  }

  private calculateDifficultyBonus(session: any): number {
    const multipliers = { easy: 1.0, medium: 1.5, hard: 2.0, expert: 3.0 };
    return Math.floor(session.totalScore * (multipliers[session.difficulty] - 1));
  }

  private calculateSpeedBonus(averageResponseTime: number): number {
    if (averageResponseTime < 3000) return 50;
    if (averageResponseTime < 5000) return 25;
    return 0;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const gameService = GameService.getInstance();