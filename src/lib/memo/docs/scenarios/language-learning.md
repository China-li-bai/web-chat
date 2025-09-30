# 语言学习应用场景

基于记忆学习算法栈的智能语言学习系统，支持词汇记忆、语法掌握和口语练习。

## 🎯 应用概述

### 核心功能
- **智能词汇学习** - 基于遗忘曲线的词汇复习
- **多维度测试** - 定义、例句、发音全方位练习
- **个性化难度** - 根据用户水平动态调整
- **进度跟踪** - 详细的学习统计和分析

### 适用场景
- 英语词汇扩展
- 多语言学习
- 考试准备（托福、雅思等）
- 专业术语掌握

## 💻 完整实现代码

### 1. 核心数据结构

```typescript
import { MemoryLearningManager } from '../MemoryLearningManager';
import type { LearningItem, StudyRecord, StudySession } from '../types';

interface VocabularyWord {
  word: string;
  pronunciation: string;
  definition: string;
  example: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  partOfSpeech: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface VocabularyProgressReport {
  userId: string;
  reportPeriod: number;
  totalWordsStudied: number;
  masteredWords: number;
  masteredWordsList: string[];
  averageAccuracy: number;
  studyStreak: number;
  categoryProgress: Record<string, { studied: number; mastered: number }>;
  recommendations: string[];
  nextReviewWords: string[];
  weakAreas: string[];
  strongAreas: string[];
}
```

### 2. 英语词汇学习系统

```typescript
class EnglishVocabularyApp {
  private memoryManager: MemoryLearningManager;
  private wordDatabase: VocabularyWord[];
  
  constructor() {
    // 针对语言学习优化的配置
    this.memoryManager = new MemoryLearningManager({
      fsrsConfig: {
        requestRetention: 0.88, // 语言学习需要较高保留率
        maximumInterval: 90,    // 最大3个月复习间隔
      },
      adaptiveConfig: {
        adaptationRate: 0.2,    // 较快的难度适应
        cognitiveLoadThreshold: 0.7 // 语言学习认知负荷阈值
      },
      retrievalConfig: {
        testingEffectWeight: 0.4,    // 重视测试效应
        spacingEffectWeight: 0.35,   // 间隔效应
        generationEffectWeight: 0.25 // 生成效应
      }
    });
    
    this.wordDatabase = this.initializeWordDatabase();
  }
  
  private initializeWordDatabase(): VocabularyWord[] {
    return [
      {
        word: "serendipity",
        pronunciation: "/ˌserənˈdɪpɪti/",
        definition: "the occurrence and development of events by chance in a happy or beneficial way",
        example: "A fortunate stroke of serendipity brought the two old friends together.",
        difficulty: "advanced",
        category: "abstract_concepts",
        partOfSpeech: "noun",
        synonyms: ["chance", "fortune", "luck"],
        antonyms: ["misfortune", "bad luck"]
      },
      {
        word: "ubiquitous", 
        pronunciation: "/juːˈbɪkwɪtəs/",
        definition: "present, appearing, or found everywhere",
        example: "Smartphones have become ubiquitous in modern society.",
        difficulty: "intermediate",
        category: "descriptive",
        partOfSpeech: "adjective",
        synonyms: ["omnipresent", "pervasive", "widespread"],
        antonyms: ["rare", "scarce", "absent"]
      },
      {
        word: "ephemeral",
        pronunciation: "/ɪˈfem(ə)rəl/", 
        definition: "lasting for a very short time",
        example: "The beauty of cherry blossoms is ephemeral but unforgettable.",
        difficulty: "advanced",
        category: "descriptive",
        partOfSpeech: "adjective",
        synonyms: ["temporary", "fleeting", "transient"],
        antonyms: ["permanent", "lasting", "enduring"]
      },
      {
        word: "resilient",
        pronunciation: "/rɪˈzɪljənt/",
        definition: "able to withstand or recover quickly from difficult conditions",
        example: "Children are remarkably resilient and adapt quickly to change.",
        difficulty: "intermediate", 
        category: "personality_traits",
        partOfSpeech: "adjective",
        synonyms: ["tough", "strong", "flexible"],
        antonyms: ["fragile", "weak", "brittle"]
      },
      {
        word: "procrastinate",
        pronunciation: "/prəˈkrastɪˌneɪt/",
        definition: "delay or postpone action; put off doing something",
        example: "I tend to procrastinate when faced with difficult tasks.",
        difficulty: "intermediate",
        category: "actions",
        partOfSpeech: "verb",
        synonyms: ["delay", "postpone", "defer"],
        antonyms: ["expedite", "hasten", "advance"]
      }
    ];
  }
  
  private convertToLearningItems(words: VocabularyWord[]): LearningItem[] {
    return words.map(word => ({
      id: `vocab_${word.word}`,
      content: `${word.word} - ${word.definition}`,
      type: 'vocabulary',
      difficulty: this.mapDifficultyToNumber(word.difficulty),
      createdAt: new Date(),
      metadata: {
        word: word.word,
        pronunciation: word.pronunciation,
        example: word.example,
        category: word.category,
        partOfSpeech: word.partOfSpeech,
        synonyms: word.synonyms,
        antonyms: word.antonyms,
        language: 'english'
      }
    }));
  }
  
  private mapDifficultyToNumber(difficulty: string): number {
    const mapping = {
      'beginner': 0.3,
      'intermediate': 0.6,
      'advanced': 0.8
    };
    return mapping[difficulty as keyof typeof mapping] || 0.5;
  }
  
  async createPersonalizedVocabularySession(
    userId: string, 
    targetLevel: 'beginner' | 'intermediate' | 'advanced',
    sessionDuration: number = 1200 // 20分钟
  ) {
    console.log(`🎯 为用户 ${userId} 创建 ${targetLevel} 级别词汇学习会话`);
    
    // 根据目标级别筛选词汇
    const filteredWords = this.wordDatabase.filter(word => {
      if (targetLevel === 'beginner') return word.difficulty === 'beginner';
      if (targetLevel === 'intermediate') return ['beginner', 'intermediate'].includes(word.difficulty);
      return true; // advanced 包含所有级别
    });
    
    const learningItems = this.convertToLearningItems(filteredWords);
    
    // 加载用户历史数据
    const userRecords = await this.loadUserVocabularyRecords(userId);
    const userSessions = await this.loadUserSessions(userId);
    
    // 创建个性化会话
    const session = await this.memoryManager.createLearningSession(
      userId,
      learningItems,
      userRecords,
      userSessions,
      {
        maxItems: Math.min(15, learningItems.length),
        targetDuration: sessionDuration,
        difficultyRange: this.getDifficultyRange(targetLevel)
      }
    );
    
    console.log(`📚 词汇学习会话创建成功:`);
    console.log(`   - 学习词汇: ${session.items.length} 个`);
    console.log(`   - 预计时长: ${session.targetDuration / 60} 分钟`);
    console.log(`   - 目标级别: ${targetLevel}`);
    
    return session;
  }
  
  private getDifficultyRange(level: string) {
    const ranges = {
      'beginner': { min: 0.1, max: 0.4 },
      'intermediate': { min: 0.3, max: 0.7 },
      'advanced': { min: 0.6, max: 0.9 }
    };
    return ranges[level as keyof typeof ranges];
  }
  
  async conductVocabularyTest(
    sessionId: string,
    wordId: string,
    testType: 'definition' | 'example' | 'pronunciation' | 'synonym' | 'antonym',
    userAnswer: string,
    startTime: number
  ) {
    const responseTime = Date.now() - startTime;
    
    // 获取正确答案
    const word = this.wordDatabase.find(w => `vocab_${w.word}` === wordId);
    if (!word) throw new Error('Word not found');
    
    // 评估用户答案
    const evaluation = this.evaluateVocabularyAnswer(word, testType, userAnswer);
    
    // 处理学习响应
    const result = await this.memoryManager.processStudyResponse(
      sessionId,
      wordId,
      evaluation.response,
      responseTime,
      evaluation.confidence
    );
    
    // 提供详细反馈
    const feedback = this.generateDetailedFeedback(word, testType, userAnswer, evaluation);
    
    return {
      ...result,
      feedback,
      correctAnswer: this.getCorrectAnswer(word, testType),
      explanation: this.generateExplanation(word, testType),
      studyTips: this.generateStudyTips(word, testType, evaluation)
    };
  }
  
  private evaluateVocabularyAnswer(
    word: VocabularyWord,
    testType: string,
    userAnswer: string
  ): { response: 'again' | 'hard' | 'good' | 'easy'; confidence: number } {
    const answer = userAnswer.toLowerCase().trim();
    
    switch (testType) {
      case 'definition':
        return this.evaluateDefinition(word.definition, answer);
      case 'example':
        return this.evaluateExample(word.example, answer);
      case 'pronunciation':
        return this.evaluatePronunciation(word.pronunciation, answer);
      case 'synonym':
        return this.evaluateSynonym(word.synonyms || [], answer);
      case 'antonym':
        return this.evaluateAntonym(word.antonyms || [], answer);
      default:
        return { response: 'again', confidence: 0 };
    }
  }
  
  private evaluateDefinition(correctDef: string, userAnswer: string): { response: any; confidence: number } {
    const correctWords = correctDef.toLowerCase().split(/\s+/);
    const userWords = userAnswer.split(/\s+/);
    
    // 计算关键词匹配度
    const keyWords = correctWords.filter(word => word.length > 3);
    const matchedKeys = keyWords.filter(key => 
      userWords.some(userWord => userWord.includes(key) || key.includes(userWord))
    );
    
    const matchRatio = matchedKeys.length / keyWords.length;
    
    if (matchRatio >= 0.8) return { response: 'easy', confidence: 0.9 };
    if (matchRatio >= 0.6) return { response: 'good', confidence: 0.75 };
    if (matchRatio >= 0.3) return { response: 'hard', confidence: 0.5 };
    return { response: 'again', confidence: 0.2 };
  }
  
  private evaluateSynonym(synonyms: string[], userAnswer: string): { response: any; confidence: number } {
    const isCorrect = synonyms.some(synonym => 
      synonym.toLowerCase().includes(userAnswer) || 
      userAnswer.includes(synonym.toLowerCase())
    );
    
    if (isCorrect) return { response: 'easy', confidence: 0.9 };
    
    // 检查是否是相关词汇
    const isRelated = synonyms.some(synonym => 
      this.calculateWordSimilarity(synonym.toLowerCase(), userAnswer) > 0.6
    );
    
    if (isRelated) return { response: 'good', confidence: 0.6 };
    return { response: 'again', confidence: 0.3 };
  }
  
  private evaluateAntonym(antonyms: string[], userAnswer: string): { response: any; confidence: number } {
    const isCorrect = antonyms.some(antonym => 
      antonym.toLowerCase().includes(userAnswer) || 
      userAnswer.includes(antonym.toLowerCase())
    );
    
    if (isCorrect) return { response: 'easy', confidence: 0.9 };
    return { response: 'again', confidence: 0.3 };
  }
  
  private calculateWordSimilarity(word1: string, word2: string): number {
    // 简化的词汇相似度计算
    const longer = word1.length > word2.length ? word1 : word2;
    const shorter = word1.length > word2.length ? word2 : word1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  private generateDetailedFeedback(
    word: VocabularyWord,
    testType: string,
    userAnswer: string,
    evaluation: any
  ): string {
    const feedbacks = {
      'easy': '🎉 优秀！你完全掌握了这个词汇。',
      'good': '👍 很好！你基本掌握了，继续保持。',
      'hard': '💪 不错的尝试，还需要多练习。',
      'again': '📚 需要重新学习，不要气馁！'
    };
    
    let feedback = feedbacks[evaluation.response];
    
    // 根据测试类型添加具体建议
    switch (testType) {
      case 'definition':
        if (evaluation.response !== 'easy') {
          feedback += `\n💡 提示：关注关键词 "${this.extractKeyWords(word.definition).join(', ')}"`;
        }
        break;
      case 'example':
        if (evaluation.response !== 'easy') {
          feedback += `\n💡 建议：试着在日常对话中使用这个词汇`;
        }
        break;
      case 'pronunciation':
        if (evaluation.response !== 'easy') {
          feedback += `\n🔊 建议：多听标准发音，注意重音位置`;
        }
        break;
      case 'synonym':
        if (evaluation.response !== 'easy') {
          feedback += `\n📝 提示：同义词有 ${word.synonyms?.join(', ')}`;
        }
        break;
      case 'antonym':
        if (evaluation.response !== 'easy') {
          feedback += `\n🔄 提示：反义词有 ${word.antonyms?.join(', ')}`;
        }
        break;
    }
    
    return feedback;
  }
  
  private generateStudyTips(word: VocabularyWord, testType: string, evaluation: any): string[] {
    const tips: string[] = [];
    
    if (evaluation.response === 'again' || evaluation.response === 'hard') {
      tips.push(`🎯 重点记忆：${word.word} [${word.partOfSpeech}]`);
      tips.push(`📖 词根分析：尝试分解词汇结构`);
      tips.push(`🔗 联想记忆：与已知词汇建立联系`);
      
      if (word.synonyms && word.synonyms.length > 0) {
        tips.push(`📝 同义词组：${word.synonyms.join(', ')}`);
      }
      
      if (word.category) {
        tips.push(`📂 主题分类：${word.category} 相关词汇`);
      }
    }
    
    return tips;
  }
  
  // 其他辅助方法...
  private extractKeyWords(definition: string): string[] {
    return definition.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'put', 'say', 'she', 'too', 'use'].includes(word))
      .slice(0, 3);
  }
  
  private getCorrectAnswer(word: VocabularyWord, testType: string): string {
    switch (testType) {
      case 'definition': return word.definition;
      case 'example': return word.example;
      case 'pronunciation': return word.pronunciation;
      case 'synonym': return word.synonyms?.join(', ') || '';
      case 'antonym': return word.antonyms?.join(', ') || '';
      default: return '';
    }
  }
  
  private generateExplanation(word: VocabularyWord, testType: string): string {
    const explanations = {
      'definition': `"${word.word}" 的含义是：${word.definition}`,
      'example': `"${word.word}" 的使用例句：${word.example}`,
      'pronunciation': `"${word.word}" 的发音是：${word.pronunciation}`,
      'synonym': `"${word.word}" 的同义词包括：${word.synonyms?.join(', ')}`,
      'antonym': `"${word.word}" 的反义词包括：${word.antonyms?.join(', ')}`
    };
    
    return explanations[testType as keyof typeof explanations] || '';
  }
  
  // 模拟数据加载方法
  private async loadUserVocabularyRecords(userId: string): Promise<StudyRecord[]> {
    // 实际应用中从数据库加载
    return [];
  }
  
  private async loadUserSessions(userId: string): Promise<StudySession[]> {
    // 实际应用中从数据库加载
    return [];
  }
}
```

## 🚀 使用示例

### 基础使用

```typescript
// 创建词汇学习应用
const vocabApp = new EnglishVocabularyApp();

// 创建学习会话
const session = await vocabApp.createPersonalizedVocabularySession(
  'user-123',
  'intermediate',
  1200 // 20分钟
);

// 进行词汇测试
const result = await vocabApp.conductVocabularyTest(
  session.sessionId,
  'vocab_serendipity',
  'definition',
  'unexpected good fortune',
  Date.now() - 3000
);

console.log('测试结果:', result.feedback);
console.log('学习建议:', result.studyTips);
```

### 高级功能

```typescript
// 生成学习报告
const report = await vocabApp.generateProgressReport('user-123', 30);
console.log(`掌握词汇: ${report.masteredWords}/${report.totalWordsStudied}`);
console.log('学习建议:', report.recommendations);

// 多类型测试
const testTypes = ['definition', 'example', 'synonym', 'antonym'];
for (const testType of testTypes) {
  const result = await vocabApp.conductVocabularyTest(
    session.sessionId,
    wordId,
    testType as any,
    userAnswer,
    startTime
  );
  console.log(`${testType} 测试:`, result.feedback);
}
```

## 📊 特色功能

### 1. 智能难度调整
- 基于用户表现动态调整词汇难度
- 个性化学习路径规划
- 认知负荷管理

### 2. 多维度评估
- 词义理解测试
- 用法掌握检查
- 发音准确性评估
- 同义词反义词测试

### 3. 详细进度跟踪
- 学习统计分析
- 掌握程度评估
- 薄弱环节识别
- 个性化建议生成

### 4. 科学复习策略
- FSRS 算法优化复习时间
- 遗忘曲线预测
- 间隔重复调度

## 🎯 最佳实践

1. **循序渐进** - 从简单词汇开始，逐步提高难度
2. **多样化练习** - 结合不同类型的测试方法
3. **定期复习** - 遵循算法建议的复习时间
4. **实际应用** - 在真实语境中使用学过的词汇

---

*通过科学的记忆算法，让语言学习更高效、更持久！*