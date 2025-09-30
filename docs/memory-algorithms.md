# 单词记忆和对话功能核心算法设计

## 文档信息
- **创建日期**: 2025-08-09
- **功能范围**: 单词记忆和对话功能
- **版本**: 1.0.0
- **目标**: 设计基于脑科学记忆原理的核心算法

## 1. 算法概述

### 1.1 设计原则
基于脑科学记忆调研文档，我们的算法设计遵循以下原则：
- **主动检索原则**: 通过测试/问答形式让用户回忆知识，而非被动阅读
- **间隔重复原则**: 根据遗忘曲线安排复习时间，在即将忘记时进行复习
- **难度自适应原则**: 根据用户表现调整学习难度，保持适当的挑战性
- **记忆巩固原则**: 通过多种形式和场景强化记忆，促进短期记忆向长期记忆转化

### 1.2 核心算法组件
1. **间隔重复算法**: 基于艾宾浩斯遗忘曲线的复习时间安排
2. **记忆强度计算**: 评估用户对单词/对话的掌握程度
3. **难度自适应算法**: 根据用户表现动态调整学习难度
4. **主动检索策略**: 设计有效的问答形式和反馈机制

## 2. 间隔重复算法

### 2.1 算法基础
间隔重复算法基于艾宾浩斯遗忘曲线，该曲线描述了人类记忆随时间衰减的规律。算法的核心思想是在记忆即将衰减到临界点时进行复习，以最小的复习次数达到最佳的记忆效果。

### 2.2 算法实现

```javascript
/**
 * 间隔重复算法实现
 */
class SpacedRepetitionAlgorithm {
  constructor() {
    // 初始间隔序列（天）
    this.baseIntervals = [1, 3, 7, 16, 30, 60, 120, 240];
    
    // 难度系数
    this.difficultyFactors = {
      'again': 0.5,    // 回答错误，需要重新学习
      'hard': 0.8,     // 回答困难
      'good': 1.0,     // 回答正常
      'easy': 1.5      // 回答轻松
    };
    
    // 最小和最大间隔限制
    this.minInterval = 1;     // 最小间隔1天
    this.maxInterval = 365;   // 最大间隔1年
    
    // 记忆衰减参数
    this.memoryDecayRate = 0.9;
  }
  
  /**
   * 计算下一次复习间隔
   * @param {Object} item - 学习项
   * @param {string} difficulty - 难度评级 ('again', 'hard', 'good', 'easy')
   * @returns {number} 下一次复习间隔（天）
   */
  calculateNextInterval(item, difficulty) {
    // 获取当前间隔
    let currentInterval = item.interval || 0;
    
    // 如果是第一次学习或回答错误，使用初始间隔
    if (currentInterval === 0 || difficulty === 'again') {
      return this.baseIntervals[0];
    }
    
    // 根据难度调整间隔
    const factor = this.difficultyFactors[difficulty] || 1.0;
    let nextInterval = Math.round(currentInterval * factor);
    
    // 确保间隔在合理范围内
    nextInterval = Math.max(this.minInterval, Math.min(nextInterval, this.maxInterval));
    
    return nextInterval;
  }
  
  /**
   * 更新记忆强度
   * @param {Object} item - 学习项
   * @param {string} difficulty - 难度评级
   * @returns {number} 更新后的记忆强度
   */
  updateMemoryStrength(item, difficulty) {
    // 获取当前记忆强度
    let currentStrength = item.memoryStrength || 0;
    
    // 根据难度调整记忆强度
    const factor = this.difficultyFactors[difficulty] || 1.0;
    
    // 计算新的记忆强度
    let newStrength;
    if (difficulty === 'again') {
      // 回答错误，重置记忆强度
      newStrength = Math.max(0, currentStrength - 20);
    } else {
      // 回答正确，增加记忆强度
      const increment = 10 * factor;
      newStrength = Math.min(100, currentStrength + increment);
    }
    
    return newStrength;
  }
  
  /**
   * 计算复习优先级
   * @param {Object} item - 学习项
   * @returns {number} 优先级分数（越高越优先）
   */
  calculateReviewPriority(item) {
    if (!item.lastReviewed) return 100; // 从未复习的项目优先级最高
    
    const now = new Date();
    const lastReviewed = new Date(item.lastReviewed);
    const daysSinceLastReview = (now - lastReviewed) / (1000 * 60 * 60 * 24);
    
    // 计算逾期天数
    const overdueDays = Math.max(0, daysSinceLastReview - item.interval);
    
    // 记忆强度越低，逾期天数越多，优先级越高
    const priorityScore = (100 - item.memoryStrength) + overdueDays * 5;
    
    return Math.min(100, Math.max(0, priorityScore));
  }
  
  /**
   * 生成每日复习计划
   * @param {Array} items - 所有学习项
   * @param {number} dailyLimit - 每日复习数量限制
   * @returns {Object} 复习计划
   */
  generateDailyReviewPlan(items, dailyLimit = 20) {
    const today = new Date();
    const reviewPlan = {
      date: today.toISOString().split('T')[0],
      items: [],
      totalCount: 0
    };
    
    // 计算每个项目的复习优先级
    const itemsWithPriority = items.map(item => ({
      ...item,
      priority: this.calculateReviewPriority(item)
    }));
    
    // 按优先级排序
    itemsWithPriority.sort((a, b) => b.priority - a.priority);
    
    // 选择需要复习的项目
    for (const item of itemsWithPriority) {
      if (reviewPlan.items.length >= dailyLimit) break;
      
      if (!item.lastReviewed) {
        // 从未复习的项目
        reviewPlan.items.push(item);
      } else {
        const lastReviewed = new Date(item.lastReviewed);
        const daysSinceLastReview = (today - lastReviewed) / (1000 * 60 * 60 * 24);
        
        // 检查是否需要复习
        if (daysSinceLastReview >= item.interval) {
          reviewPlan.items.push(item);
        }
      }
    }
    
    reviewPlan.totalCount = reviewPlan.items.length;
    
    return reviewPlan;
  }
}
```

### 2.3 算法优化

#### 2.3.1 基于记忆强度的动态调整
```javascript
/**
 * 优化版间隔重复算法 - 基于记忆强度的动态调整
 */
class OptimizedSpacedRepetition extends SpacedRepetitionAlgorithm {
  constructor() {
    super();
    // 记忆强度阈值
    this.strengthThresholds = {
      weak: 30,      // 弱记忆
      medium: 60,    // 中等记忆
      strong: 90     // 强记忆
    };
  }
  
  /**
   * 基于记忆强度的动态间隔调整
   * @param {Object} item - 学习项
   * @param {string} difficulty - 难度评级
   * @returns {number} 下一次复习间隔（天）
   */
  calculateOptimizedInterval(item, difficulty) {
    // 获取当前记忆强度
    const strength = item.memoryStrength || 0;
    
    // 基础间隔计算
    let baseInterval = this.calculateNextInterval(item, difficulty);
    
    // 根据记忆强度调整间隔
    if (strength < this.strengthThresholds.weak) {
      // 弱记忆，缩短间隔
      baseInterval = Math.max(this.minInterval, Math.round(baseInterval * 0.7));
    } else if (strength > this.strengthThresholds.strong) {
      // 强记忆，延长间隔
      baseInterval = Math.min(this.maxInterval, Math.round(baseInterval * 1.3));
    }
    
    return baseInterval;
  }
  
  /**
   * 基于历史表现的难度调整
   * @param {Object} item - 学习项
   * @param {string} currentDifficulty - 当前难度评级
   * @returns {string} 调整后的难度评级
   */
  adjustDifficultyBasedOnHistory(item, currentDifficulty) {
    // 获取历史表现
    const history = item.reviewHistory || [];
    if (history.length < 3) return currentDifficulty;
    
    // 计算最近3次的平均表现
    const recentHistory = history.slice(-3);
    const averagePerformance = recentHistory.reduce((sum, record) => {
      const score = this.difficultyToScore(record.difficulty);
      return sum + score;
    }, 0) / recentHistory.length;
    
    // 根据平均表现调整难度
    if (averagePerformance > 3.5 && currentDifficulty !== 'easy') {
      // 表现良好，提升难度评级
      const difficultyLevels = ['again', 'hard', 'good', 'easy'];
      const currentIndex = difficultyLevels.indexOf(currentDifficulty);
      return difficultyLevels[Math.min(currentIndex + 1, difficultyLevels.length - 1)];
    } else if (averagePerformance < 2.0 && currentDifficulty !== 'again') {
      // 表现不佳，降低难度评级
      const difficultyLevels = ['again', 'hard', 'good', 'easy'];
      const currentIndex = difficultyLevels.indexOf(currentDifficulty);
      return difficultyLevels[Math.max(currentIndex - 1, 0)];
    }
    
    return currentDifficulty;
  }
  
  /**
   * 将难度评级转换为分数
   * @param {string} difficulty - 难度评级
   * @returns {number} 分数
   */
  difficultyToScore(difficulty) {
    const scores = {
      'again': 1,
      'hard': 2,
      'good': 3,
      'easy': 4
    };
    return scores[difficulty] || 0;
  }
}
```

## 3. 记忆强度计算算法

### 3.1 算法基础
记忆强度是衡量用户对单词/对话掌握程度的核心指标。它综合考虑了复习频率、回答质量、时间间隔等因素，通过动态计算得出一个0-100的分数。

### 3.2 算法实现

```javascript
/**
 * 记忆强度计算算法
 */
class MemoryStrengthCalculator {
  constructor() {
    // 基础权重
    this.weights = {
      accuracy: 0.4,        // 准确率权重
      recency: 0.3,         // 近期性权重
      frequency: 0.2,       // 频率权重
      consistency: 0.1      // 一致性权重
    };
    
    // 时间衰减参数
    this.timeDecayRate = 0.95;
  }
  
  /**
   * 计算记忆强度
   * @param {Object} item - 学习项
   * @returns {number} 记忆强度（0-100）
   */
  calculateMemoryStrength(item) {
    // 获取历史记录
    const history = item.reviewHistory || [];
    if (history.length === 0) return 0;
    
    // 计算各项指标
    const accuracy = this.calculateAccuracy(history);
    const recency = this.calculateRecency(history);
    const frequency = this.calculateFrequency(history);
    const consistency = this.calculateConsistency(history);
    
    // 综合计算记忆强度
    const strength = 
      accuracy * this.weights.accuracy +
      recency * this.weights.recency +
      frequency * this.weights.frequency +
      consistency * this.weights.consistency;
    
    return Math.min(100, Math.max(0, Math.round(strength)));
  }
  
  /**
   * 计算准确率
   * @param {Array} history - 历史记录
   * @returns {number} 准确率（0-100）
   */
  calculateAccuracy(history) {
    if (history.length === 0) return 0;
    
    const correctCount = history.filter(record => 
      record.difficulty !== 'again'
    ).length;
    
    return (correctCount / history.length) * 100;
  }
  
  /**
   * 计算近期性
   * @param {Array} history - 历史记录
   * @returns {number} 近期性分数（0-100）
   */
  calculateRecency(history) {
    if (history.length === 0) return 0;
    
    const now = new Date();
    const mostRecent = new Date(history[history.length - 1].date);
    const daysSinceLastReview = (now - mostRecent) / (1000 * 60 * 60 * 24);
    
    // 时间衰减函数
    const recencyScore = 100 * Math.pow(this.timeDecayRate, daysSinceLastReview);
    
    return Math.min(100, Math.max(0, recencyScore));
  }
  
  /**
   * 计算频率
   * @param {Array} history - 历史记录
   * @returns {number} 频率分数（0-100）
   */
  calculateFrequency(history) {
    if (history.length === 0) return 0;
    
    // 计算总时间跨度
    const now = new Date();
    const firstReview = new Date(history[0].date);
    const totalDays = Math.max(1, (now - firstReview) / (1000 * 60 * 60 * 24));
    
    // 计算平均复习频率
    const frequency = history.length / totalDays;
    
    // 将频率映射到0-100分
    // 假设理想的复习频率是每3天一次
    const idealFrequency = 1 / 3;
    const frequencyScore = Math.min(100, 100 * Math.min(1, frequency / idealFrequency));
    
    return frequencyScore;
  }
  
  /**
   * 计算一致性
   * @param {Array} history - 历史记录
   * @returns {number} 一致性分数（0-100）
   */
  calculateConsistency(history) {
    if (history.length < 3) return 50; // 数据不足，返回中等分数
    
    // 计算难度评级的一致性
    const difficulties = history.map(record => this.difficultyToScore(record.difficulty));
    const average = difficulties.reduce((sum, score) => sum + score, 0) / difficulties.length;
    
    // 计算标准差
    const variance = difficulties.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / difficulties.length;
    const standardDeviation = Math.sqrt(variance);
    
    // 标准差越小，一致性越高
    // 标准差为0时一致性为100，标准差为1.5时一致性为0
    const consistencyScore = Math.max(0, 100 - (standardDeviation / 1.5) * 100);
    
    return consistencyScore;
  }
  
  /**
   * 将难度评级转换为分数
   * @param {string} difficulty - 难度评级
   * @returns {number} 分数
   */
  difficultyToScore(difficulty) {
    const scores = {
      'again': 1,
      'hard': 2,
      'good': 3,
      'easy': 4
    };
    return scores[difficulty] || 0;
  }
}
```

## 4. 难度自适应算法

### 4.1 算法基础
难度自适应算法根据用户的学习表现动态调整学习内容的难度，确保学习内容既不会太简单（导致无聊），也不会太困难（导致挫败感），从而保持最佳的学习效果。

### 4.2 算法实现

```javascript
/**
 * 难度自适应算法
 */
class DifficultyAdaptationAlgorithm {
  constructor() {
    // 难度级别
    this.difficultyLevels = {
      beginner: 1,
      elementary: 2,
      intermediate: 3,
      advanced: 4,
      expert: 5
    };
    
    // 表现阈值
    this.performanceThresholds = {
      tooEasy: 0.9,      // 90%以上正确率，认为太简单
      tooHard: 0.6       // 60%以下正确率，认为太难
    };
    
    // 调整参数
    this.adjustmentFactors = {
      increase: 1.2,     // 难度提升系数
      decrease: 0.8      // 难度降低系数
    };
  }
  
  /**
   * 计算用户表现
   * @param {Array} recentHistory - 最近的学习记录
   * @returns {Object} 表现数据
   */
  calculatePerformance(recentHistory) {
    if (!recentHistory || recentHistory.length === 0) {
      return {
        accuracy: 0,
        averageTime: 0,
        difficulty: 'intermediate'
      };
    }
    
    // 计算准确率
    const correctCount = recentHistory.filter(record => 
      record.difficulty !== 'again'
    ).length;
    const accuracy = correctCount / recentHistory.length;
    
    // 计算平均回答时间
    const totalTime = recentHistory.reduce((sum, record) => sum + (record.responseTime || 0), 0);
    const averageTime = totalTime / recentHistory.length;
    
    // 计算平均难度评级
    const difficultyScores = recentHistory.map(record => this.difficultyToScore(record.difficulty));
    const averageDifficultyScore = difficultyScores.reduce((sum, score) => sum + score, 0) / difficultyScores.length;
    const averageDifficulty = this.scoreToDifficulty(averageDifficultyScore);
    
    return {
      accuracy,
      averageTime,
      difficulty: averageDifficulty
    };
  }
  
  /**
   * 调整学习难度
   * @param {Object} currentPerformance - 当前表现
   * @param {string} currentLevel - 当前难度级别
   * @returns {string} 调整后的难度级别
   */
  adjustDifficulty(currentPerformance, currentLevel) {
    const { accuracy } = currentPerformance;
    const currentLevelValue = this.difficultyLevels[currentLevel] || 3;
    
    let newLevelValue = currentLevelValue;
    
    // 根据准确率调整难度
    if (accuracy >= this.performanceThresholds.tooEasy) {
      // 表现太好，增加难度
      newLevelValue = Math.min(5, Math.ceil(currentLevelValue * this.adjustmentFactors.increase));
    } else if (accuracy <= this.performanceThresholds.tooHard) {
      // 表现太差，降低难度
      newLevelValue = Math.max(1, Math.floor(currentLevelValue * this.adjustmentFactors.decrease));
    }
    
    // 将数值转换回难度级别
    return this.valueToDifficulty(newLevelValue);
  }
  
  /**
   * 选择合适的学习内容
   * @param {Array} availableItems - 可用的学习项
   * @param {string} targetDifficulty - 目标难度
   * @param {number} count - 需要选择的项目数量
   * @returns {Array} 选择的学习项
   */
  selectLearningItems(availableItems, targetDifficulty, count = 10) {
    const targetLevel = this.difficultyLevels[targetDifficulty] || 3;
    
    // 根据难度对项目进行分组
    const itemsByDifficulty = {
      1: [],  // beginner
      2: [],  // elementary
      3: [],  // intermediate
      4: [],  // advanced
      5: []   // expert
    };
    
    availableItems.forEach(item => {
      const level = this.difficultyLevels[item.difficulty] || 3;
      itemsByDifficulty[level].push(item);
    });
    
    // 选择策略：70%目标难度，20%相邻难度，10%随机难度
    const selectedItems = [];
    
    // 70%目标难度
    const targetCount = Math.ceil(count * 0.7);
    const targetItems = this.shuffleArray(itemsByDifficulty[targetLevel]).slice(0, targetCount);
    selectedItems.push(...targetItems);
    
    // 20%相邻难度
    if (selectedItems.length < count) {
      const adjacentCount = Math.ceil((count - selectedItems.length) * 0.8);
      const adjacentLevels = this.getAdjacentLevels(targetLevel);
      const adjacentItems = [];
      
      for (const level of adjacentLevels) {
        const items = this.shuffleArray(itemsByDifficulty[level]).slice(0, adjacentCount);
        adjacentItems.push(...items);
      }
      
      selectedItems.push(...adjacentItems.slice(0, adjacentCount));
    }
    
    // 10%随机难度
    if (selectedItems.length < count) {
      const remainingCount = count - selectedItems.length;
      const allItems = this.shuffleArray(availableItems.filter(item => 
        !selectedItems.includes(item)
      ));
      selectedItems.push(...allItems.slice(0, remainingCount));
    }
    
    return selectedItems.slice(0, count);
  }
  
  /**
   * 获取相邻难度级别
   * @param {number} level - 当前难度级别
   * @returns {Array} 相邻难度级别数组
   */
  getAdjacentLevels(level) {
    const levels = [];
    if (level > 1) levels.push(level - 1);
    if (level < 5) levels.push(level + 1);
    return levels;
  }
  
  /**
   * 将难度评级转换为分数
   * @param {string} difficulty - 难度评级
   * @returns {number} 分数
   */
  difficultyToScore(difficulty) {
    const scores = {
      'again': 1,
      'hard': 2,
      'good': 3,
      'easy': 4
    };
    return scores[difficulty] || 0;
  }
  
  /**
   * 将分数转换为难度评级
   * @param {number} score - 分数
   * @returns {string} 难度评级
   */
  scoreToDifficulty(score) {
    if (score <= 1.5) return 'again';
    if (score <= 2.5) return 'hard';
    if (score <= 3.5) return 'good';
    return 'easy';
  }
  
  /**
   * 将数值转换为难度级别
   * @param {number} value - 数值
   * @returns {string} 难度级别
   */
  valueToDifficulty(value) {
    const difficultyMap = {
      1: 'beginner',
      2: 'elementary',
      3: 'intermediate',
      4: 'advanced',
      5: 'expert'
    };
    return difficultyMap[value] || 'intermediate';
  }
  
  /**
   * 随机打乱数组
   * @param {Array} array - 原数组
   * @returns {Array} 打乱后的数组
   */
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
}
```

## 5. 主动检索策略算法

### 5.1 算法基础
主动检索是记忆学习的核心策略，通过让用户主动回忆知识而非被动阅读，可以显著提高记忆效果。本算法设计多种主动检索形式，并根据学习内容类型和用户表现选择最合适的检索方式。

### 5.2 算法实现

```javascript
/**
 * 主动检索策略算法
 */
class ActiveRetrievalStrategy {
  constructor() {
    // 检索类型
    this.retrievalTypes = {
      recall: 'recall',           // 回忆型：给出问题，回忆答案
      recognition: 'recognition',  // 识别型：从选项中选择正确答案
      completion: 'completion',    // 填空型：完成句子或短语
      production: 'production'     // 生成型：自主生成完整答案
    };
    
    // 难度权重
    this.difficultyWeights = {
      recall: 1.0,        // 回忆型难度最高
      production: 0.9,    // 生成型难度较高
      completion: 0.7,    // 填空型难度中等
      recognition: 0.5    // 识别型难度最低
    };
    
    // 内容类型映射
    this.contentTypeMapping = {
      vocabulary: ['recall', 'recognition', 'completion'],
      dialogue: ['recall', 'production', 'completion'],
      grammar: ['completion', 'recognition', 'production'],
      phrase: ['recall', 'completion', 'production']
    };
  }
  
  /**
   * 选择检索策略
   * @param {Object} item - 学习项
   * @param {Object} userPerformance - 用户表现
   * @returns {Object} 检索策略配置
   */
  selectRetrievalStrategy(item, userPerformance) {
    const contentType = item.type || 'vocabulary';
    const memoryStrength = item.memoryStrength || 0;
    const difficulty = item.difficulty || 'intermediate';
    
    // 获取适合该内容类型的检索方式
    const availableTypes = this.contentTypeMapping[contentType] || ['recall', 'recognition'];
    
    // 根据记忆强度选择检索方式
    let selectedType;
    if (memoryStrength < 30) {
      // 弱记忆，使用较简单的检索方式
      selectedType = this.selectEasierRetrievalType(availableTypes);
    } else if (memoryStrength > 70) {
      // 强记忆，使用较难的检索方式
      selectedType = this.selectHarderRetrievalType(availableTypes);
    } else {
      // 中等记忆，随机选择
      selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }
    
    // 生成检索问题
    const retrievalQuestion = this.generateRetrievalQuestion(item, selectedType);
    
    return {
      type: selectedType,
      question: retrievalQuestion.question,
      options: retrievalQuestion.options,
      expectedAnswer: retrievalQuestion.expectedAnswer,
      hints: retrievalQuestion.hints
    };
  }
  
  /**
   * 选择较简单的检索方式
   * @param {Array} availableTypes - 可用的检索方式
   * @returns {string} 选择的检索方式
   */
  selectEasierRetrievalType(availableTypes) {
    // 按难度权重排序，选择权重最小的（最简单）
    const sortedTypes = availableTypes.sort((a, b) => 
      this.difficultyWeights[a] - this.difficultyWeights[b]
    );
    return sortedTypes[0];
  }
  
  /**
   * 选择较难的检索方式
   * @param {Array} availableTypes - 可用的检索方式
   * @returns {string} 选择的检索方式
   */
  selectHarderRetrievalType(availableTypes) {
    // 按难度权重排序，选择权重最大的（最难）
    const sortedTypes = availableTypes.sort((a, b) => 
      this.difficultyWeights[b] - this.difficultyWeights[a]
    );
    return sortedTypes[0];
  }
  
  /**
   * 生成检索问题
   * @param {Object} item - 学习项
   * @param {string} retrievalType - 检索类型
   * @returns {Object} 检索问题配置
   */
  generateRetrievalQuestion(item, retrievalType) {
    switch (retrievalType) {
      case 'recall':
        return this.generateRecallQuestion(item);
      case 'recognition':
        return this.generateRecognitionQuestion(item);
      case 'completion':
        return this.generateCompletionQuestion(item);
      case 'production':
        return this.generateProductionQuestion(item);
      default:
        return this.generateRecallQuestion(item);
    }
  }
  
  /**
   * 生成回忆型问题
   * @param {Object} item - 学习项
   * @returns {Object} 回忆型问题配置
   */
  generateRecallQuestion(item) {
    const question = `请回忆并写出"${item.question}"的${this.getAnswerLabel(item.type)}`;
    
    return {
      question,
      expectedAnswer: item.answer,
      hints: [
        `提示：这个词有${item.answer.length}个字母`,
        `提示：这个词以"${item.answer[0]}"开头`
      ]
    };
  }
  
  /**
   * 生成识别型问题
   * @param {Object} item - 学习项
   * @returns {Object} 识别型问题配置
   */
  generateRecognitionQuestion(item) {
    const question = `请选择"${item.question}"的正确${this.getAnswerLabel(item.type)}：`;
    
    // 生成干扰项
    const distractors = this.generateDistractors(item);
    
    // 组合选项
    const options = this.shuffleArray([item.answer, ...distractors]);
    
    return {
      question,
      options,
      expectedAnswer: item.answer,
      hints: [
        '提示：仔细阅读每个选项'
      ]
    };
  }
  
  /**
   * 生成填空型问题
   * @param {Object} item - 学习项
   * @returns {Object} 填空型问题配置
   */
  generateCompletionQuestion(item) {
    // 对于单词，可以提供部分字母
    if (item.type === 'vocabulary') {
      const maskedAnswer = this.maskWord(item.answer);
      const question = `请完成单词："${item.question}" - ${maskedAnswer}`;
      
      return {
        question,
        expectedAnswer: item.answer,
        hints: [
          `提示：这个词有${item.answer.length}个字母`
        ]
      };
    }
    
    // 对于对话，可以隐藏部分内容
    if (item.type === 'dialogue') {
      const maskedDialogue = this.maskDialogue(item.answer);
      const question = `请完成对话：\n${maskedDialogue}`;
      
      return {
        question,
        expectedAnswer: item.answer,
        hints: [
          '提示：注意上下文的连贯性'
        ]
      };
    }
    
    // 默认情况
    const question = `请完成：${item.question} - ${this.maskWord(item.answer)}`;
    
    return {
      question,
      expectedAnswer: item.answer,
      hints: []
    };
  }
  
  /**
   * 生成生成型问题
   * @param {Object} item - 学习项
   * @returns {Object} 生成型问题配置
   */
  generateProductionQuestion(item) {
    let question;
    
    if (item.type === 'vocabulary') {
      question = `请用"${item.answer}"造一个句子：`;
    } else if (item.type === 'dialogue') {
      question = `请根据以下情境，用英语进行对话：\n${item.question}`;
    } else {
      question = `请详细解释或描述：${item.question}`;
    }
    
    return {
      question,
      expectedAnswer: item.answer,
      hints: [
        '提示：尽量使用完整的句子'
      ]
    };
  }
  
  /**
   * 生成干扰项
   * @param {Object} item - 学习项
   * @returns {Array} 干扰项数组
   */
  generateDistractors(item) {
    const distractors = [];
    
    if (item.type === 'vocabulary') {
      // 对于单词，生成相似长度的单词
      const similarLengthWords = this.getSimilarLengthWords(item.answer);
      distractors.push(...similarLengthWords.slice(0, 3));
    } else if (item.type === 'dialogue') {
      // 对于对话，生成相似但错误的回答
      const similarAnswers = this.getSimilarAnswers(item.answer);
      distractors.push(...similarAnswers.slice(0, 3));
    }
    
    // 确保有足够的干扰项
    while (distractors.length < 3) {
      distractors.push(`干扰项${distractors.length + 1}`);
    }
    
    return distractors;
  }
  
  /**
   * 获取答案标签
   * @param {string} type - 内容类型
   * @returns {string} 答案标签
   */
  getAnswerLabel(type) {
    const labels = {
      vocabulary: '英文单词',
      dialogue: '对话内容',
      grammar: '语法形式',
      phrase: '短语表达'
    };
    return labels[type] || '答案';
  }
  
  /**
   * 遮蔽单词（显示部分字母）
   * @param {string} word - 单词
   * @returns {string} 遮蔽后的单词
   */
  maskWord(word) {
    if (word.length <= 2) return word;
    
    const visibleChars = Math.ceil(word.length * 0.3);
    const masked = word.split('').map((char, index) => {
      if (index < visibleChars || index === word.length - 1) {
        return char;
      }
      return '_';
    }).join('');
    
    return masked;
  }
  
  /**
   * 遮蔽对话内容
   * @param {string} dialogue - 对话内容
   * @returns {string} 遮蔽后的对话
   */
  maskDialogue(dialogue) {
    // 简单实现：遮蔽部分关键词
    const words = dialogue.split(' ');
    const maskedWords = words.map((word, index) => {
      if (index % 3 === 0) {
        return this.maskWord(word);
      }
      return word;
    });
    
    return maskedWords.join(' ');
  }
  
  /**
   * 获取相似长度的单词（示例实现）
   * @param {string} word - 单词
   * @returns {Array} 相似长度的单词数组
   */
  getSimilarLengthWords(word) {
    // 这里应该有一个词库，现在返回一些示例单词
    const sampleWords = ['example', 'sample', 'word', 'test', 'practice'];
    return sampleWords.filter(w => Math.abs(w.length - word.length) <= 2);
  }
  
  /**
   * 获取相似的回答（示例实现）
   * @param {string} answer - 回答
   * @returns {Array} 相似的回答数组
   */
  getSimilarAnswers(answer) {
    // 这里应该有一个对话库，现在返回一些示例回答
    return [
      '相似的回答1',
      '相似的回答2',
      '相似的回答3'
    ];
  }
  
  /**
   * 随机打乱数组
   * @param {Array} array - 原数组
   * @returns {Array} 打乱后的数组
   */
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
}
```

## 6. 算法集成与使用示例

### 6.1 算法集成

```javascript
/**
 * 记忆学习算法管理器
 */
class MemoryLearningAlgorithmManager {
  constructor() {
    this.spacedRepetition = new OptimizedSpacedRepetition();
    this.memoryStrengthCalculator = new MemoryStrengthCalculator();
    this.difficultyAdaptation = new DifficultyAdaptationAlgorithm();
    this.activeRetrieval = new ActiveRetrievalStrategy();
  }
  
  /**
   * 处理用户回答
   * @param {Object} item - 学习项
   * @param {string} userAnswer - 用户答案
   * @param {number} responseTime - 响应时间（毫秒）
   * @returns {Object} 处理结果
   */
  processUserAnswer(item, userAnswer, responseTime) {
    // 评估答案
    const evaluation = this.evaluateAnswer(item, userAnswer);
    
    // 更新学习项
    const updatedItem = this.updateLearningItem(item, evaluation, responseTime);
    
    // 生成下一次学习计划
    const nextReview = this.planNextReview(updatedItem);
    
    return {
      item: updatedItem,
      evaluation,
      nextReview
    };
  }
  
  /**
   * 评估答案
   * @param {Object} item - 学习项
   * @param {string} userAnswer - 用户答案
   * @returns {Object} 评估结果
   */
  evaluateAnswer(item, userAnswer) {
    // 简单实现：检查答案是否匹配
    const isCorrect = userAnswer.toLowerCase().trim() === item.answer.toLowerCase().trim();
    
    // 根据正确率确定难度评级
    let difficulty;
    if (!isCorrect) {
      difficulty = 'again';
    } else {
      // 可以根据响应时间等因素进一步细化
      difficulty = 'good';
    }
    
    return {
      isCorrect,
      difficulty,
      confidence: isCorrect ? 1.0 : 0.0
    };
  }
  
  /**
   * 更新学习项
   * @param {Object} item - 学习项
   * @param {Object} evaluation - 评估结果
   * @param {number} responseTime - 响应时间
   * @returns {Object} 更新后的学习项
   */
  updateLearningItem(item, evaluation, responseTime) {
    // 创建更新后的学习项
    const updatedItem = { ...item };
    
    // 更新历史记录
    if (!updatedItem.reviewHistory) {
      updatedItem.reviewHistory = [];
    }
    
    updatedItem.reviewHistory.push({
      date: new Date().toISOString(),
      difficulty: evaluation.difficulty,
      responseTime,
      userAnswer: evaluation.userAnswer
    });
    
    // 更新间隔
    updatedItem.interval = this.spacedRepetition.calculateOptimizedInterval(
      updatedItem, 
      evaluation.difficulty
    );
    
    // 更新记忆强度
    updatedItem.memoryStrength = this.memoryStrengthCalculator.calculateMemoryStrength(updatedItem);
    
    // 更新最后复习时间
    updatedItem.lastReviewed = new Date().toISOString();
    
    return updatedItem;
  }
  
  /**
   * 规划下一次复习
   * @param {Object} item - 学习项
   * @returns {Object} 复习计划
   */
  planNextReview(item) {
    const nextInterval = item.interval || 1;
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
    
    return {
      nextReviewDate: nextReviewDate.toISOString(),
      interval: nextInterval,
      priority: this.spacedRepetition.calculateReviewPriority(item)
    };
  }
  
  /**
   * 生成每日学习计划
   * @param {Array} items - 所有学习项
   * @param {Object} userPreferences - 用户偏好
   * @returns {Object} 学习计划
   */
  generateDailyLearningPlan(items, userPreferences) {
    // 生成复习计划
    const reviewPlan = this.spacedRepetition.generateDailyReviewPlan(
      items, 
      userPreferences.dailyReviewLimit || 20
    );
    
    // 选择新学习内容
    const newItems = this.selectNewLearningItems(
      items.filter(item => !item.lastReviewed),
      userPreferences.currentDifficulty || 'intermediate',
      userPreferences.dailyNewLimit || 10
    );
    
    return {
      date: new Date().toISOString().split('T')[0],
      reviewItems: reviewPlan.items,
      newItems,
      totalCount: reviewPlan.items.length + newItems.length
    };
  }
  
  /**
   * 选择新学习内容
   * @param {Array} availableItems - 可用的学习项
   * @param {string} difficulty - 难度级别
   * @param {number} count - 需要选择的项目数量
   * @returns {Array} 选择的学习项
   */
  selectNewLearningItems(availableItems, difficulty, count) {
    return this.difficultyAdaptation.selectLearningItems(
      availableItems, 
      difficulty, 
      count
    );
  }
  
  /**
   * 为学习项生成检索问题
   * @param {Object} item - 学习项
   * @param {Object} userPerformance - 用户表现
   * @returns {Object} 检索问题
   */
  generateRetrievalQuestion(item, userPerformance) {
    return this.activeRetrieval.selectRetrievalStrategy(item, userPerformance);
  }
}
```

### 6.2 使用示例

```javascript
// 创建算法管理器
const algorithmManager = new MemoryLearningAlgorithmManager();

// 示例学习项
const vocabularyItem = {
  id: 'vocab_001',
  type: 'vocabulary',
  question: '苹果',
  answer: 'apple',
  difficulty: 'intermediate',
  interval: 0,
  memoryStrength: 0,
  lastReviewed: null,
  reviewHistory: []
};

// 生成检索问题
const retrievalQuestion = algorithmManager.generateRetrievalQuestion(vocabularyItem, {});
console.log('检索问题:', retrievalQuestion);

// 模拟用户回答
const userAnswer = 'apple';
const responseTime = 3000; // 3秒

// 处理用户回答
const result = algorithmManager.processUserAnswer(vocabularyItem, userAnswer, responseTime);
console.log('处理结果:', result);

// 生成每日学习计划
const allItems = [vocabularyItem]; // 实际使用中应该包含更多学习项
const userPreferences = {
  dailyReviewLimit: 20,
  dailyNewLimit: 10,
  currentDifficulty: 'intermediate'
};

const dailyPlan = algorithmManager.generateDailyLearningPlan(allItems, userPreferences);
console.log('每日学习计划:', dailyPlan);
```

## 7. 算法优化与扩展

### 7.1 性能优化
1. **批量处理**: 对于大量学习项，实现批量处理算法，减少计算时间
2. **缓存机制**: 缓存计算结果，避免重复计算
3. **异步处理**: 对于耗时计算，使用异步处理，避免阻塞UI

### 7.2 算法扩展
1. **多语言支持**: 扩展算法以支持不同语言的学习内容
2. **个性化参数**: 根据用户学习习惯和表现，个性化算法参数
3. **机器学习优化**: 使用机器学习技术优化算法参数和决策

### 7.3 数据分析
1. **学习效果分析**: 分析算法对学习效果的影响
2. **用户行为分析**: 分析用户学习行为，优化算法
3. **A/B测试**: 对不同算法版本进行A/B测试，选择最优方案

## 8. 结论

本文档详细设计了单词记忆和对话功能的核心算法，包括间隔重复算法、记忆强度计算算法、难度自适应算法和主动检索策略算法。这些算法基于脑科学记忆原理，通过科学的计算和决策，帮助用户高效学习和记忆单词和对话内容。

算法设计遵循了最小可执行原则，每个算法都可以独立实现和测试，同时也可以集成使用，形成完整的记忆学习系统。通过算法的组合和优化，我们可以为用户提供个性化、高效的学习体验。

在后续的开发中，我们将根据实际使用情况和用户反馈，不断优化和扩展这些算法，以提高学习效果和用户体验。