import { Wordbook, Vocabulary, WordbookSource, WordbookCategory, DifficultyLevel } from '../types/wordbook';

// 模拟数据服务 - 用于开发和测试
export class MockDataService {
  private static wordbooks: Wordbook[] = [
    {
      id: '1',
      name: '牛津3000核心词汇',
      category: WordbookCategory.ACADEMIC,
      description: '牛津大学出版社精选的3000个核心英语词汇',
      difficulty: DifficultyLevel.INTERMEDIATE,
      wordCount: 3000,
      tags: ['牛津', '核心词汇', '学术英语'],
      source: WordbookSource.OXFORD_3000,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      isActive: true
    },
    {
      id: '2',
      name: '大学英语四级词汇',
      category: WordbookCategory.EXAM,
      description: '大学英语四级考试必备词汇',
      difficulty: DifficultyLevel.INTERMEDIATE,
      wordCount: 4500,
      tags: ['四级', '考试', '大学英语'],
      source: WordbookSource.CET4,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      isActive: true
    },
    {
      id: '3',
      name: '考研英语核心词汇',
      category: WordbookCategory.EXAM,
      description: '全国硕士研究生入学考试英语词汇',
      difficulty: DifficultyLevel.ADVANCED,
      wordCount: 5500,
      tags: ['考研', '研究生', '考试英语'],
      source: WordbookSource.POSTGRADUATE,
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
      isActive: true
    },
    {
      id: '4',
      name: '商务英语面试词汇',
      category: WordbookCategory.BUSINESS,
      description: '商务场景和面试常用的英语词汇',
      difficulty: DifficultyLevel.ADVANCED,
      wordCount: 2000,
      tags: ['商务', '面试', '职场英语'],
      source: WordbookSource.INTERVIEW,
      createdAt: '2024-01-04T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
      isActive: true
    }
  ];

  private static vocabulary: Vocabulary[] = [
    // 牛津3000词汇示例
    { id: '1', wordbookId: '1', word: 'abandon', pronunciation: '/əˈbændən/', meaning: '放弃，抛弃', difficulty: 0.3, masteryLevel: 0.8, reviewCount: 5, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-10T00:00:00Z' },
    { id: '2', wordbookId: '1', word: 'ability', pronunciation: '/əˈbɪləti/', meaning: '能力，才能', difficulty: 0.2, masteryLevel: 0.9, reviewCount: 3, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-09T00:00:00Z' },
    { id: '3', wordbookId: '1', word: 'abroad', pronunciation: '/əˈbrɔːd/', meaning: '在国外，到国外', difficulty: 0.4, masteryLevel: 0.7, reviewCount: 2, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-08T00:00:00Z' },
    
    // 四级词汇示例
    { id: '4', wordbookId: '2', word: 'academic', pronunciation: '/ˌækəˈdemɪk/', meaning: '学术的，学院的', difficulty: 0.5, masteryLevel: 0.6, reviewCount: 4, createdAt: '2024-01-02T00:00:00Z', updatedAt: '2024-01-11T00:00:00Z' },
    { id: '5', wordbookId: '2', word: 'accommodate', pronunciation: '/əˈkɒmədeɪt/', meaning: '容纳，提供住宿', difficulty: 0.7, masteryLevel: 0.4, reviewCount: 1, createdAt: '2024-01-02T00:00:00Z', updatedAt: '2024-01-07T00:00:00Z' },
    
    // 考研词汇示例
    { id: '6', wordbookId: '3', word: 'abundant', pronunciation: '/əˈbʌndənt/', meaning: '丰富的，充裕的', difficulty: 0.6, masteryLevel: 0.5, reviewCount: 3, createdAt: '2024-01-03T00:00:00Z', updatedAt: '2024-01-12T00:00:00Z' },
    { id: '7', wordbookId: '3', word: 'accomplish', pronunciation: '/əˈkʌmplɪʃ/', meaning: '完成，实现', difficulty: 0.8, masteryLevel: 0.3, reviewCount: 2, createdAt: '2024-01-03T00:00:00Z', updatedAt: '2024-01-06T00:00:00Z' },
    
    // 商务面试词汇示例
    { id: '8', wordbookId: '4', word: 'negotiate', pronunciation: '/nɪˈɡəʊʃieɪt/', meaning: '谈判，协商', difficulty: 0.7, masteryLevel: 0.6, reviewCount: 5, createdAt: '2024-01-04T00:00:00Z', updatedAt: '2024-01-13T00:00:00Z' },
    { id: '9', wordbookId: '4', word: 'corporate', pronunciation: '/ˈkɔːpərət/', meaning: '公司的，法人的', difficulty: 0.5, masteryLevel: 0.7, reviewCount: 4, createdAt: '2024-01-04T00:00:00Z', updatedAt: '2024-01-14T00:00:00Z' }
  ];

  // 获取所有单词本
  static async getWordbooks(): Promise<Wordbook[]> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...this.wordbooks];
  }

  // 根据ID获取单词本
  static async getWordbookById(id: string): Promise<Wordbook | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.wordbooks.find(wb => wb.id === id) || null;
  }

  // 获取单词本中的词汇
  static async getVocabularyByWordbook(wordbookId: string): Promise<Vocabulary[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.vocabulary.filter(v => v.wordbookId === wordbookId);
  }

  // 根据分类获取单词本
  static async getWordbooksByCategory(category: WordbookCategory): Promise<Wordbook[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.wordbooks.filter(wb => wb.category === category);
  }

  // 根据难度获取单词本
  static async getWordbooksByDifficulty(difficulty: DifficultyLevel): Promise<Wordbook[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.wordbooks.filter(wb => wb.difficulty === difficulty);
  }

  // 添加新单词本
  static async addWordbook(wordbook: Omit<Wordbook, 'id' | 'createdAt' | 'updatedAt'>): Promise<Wordbook> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newWordbook: Wordbook = {
      ...wordbook,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.wordbooks.push(newWordbook);
    return newWordbook;
  }

  // 更新单词本
  static async updateWordbook(id: string, updates: Partial<Wordbook>): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = this.wordbooks.findIndex(wb => wb.id === id);
    if (index !== -1) {
      this.wordbooks[index] = {
        ...this.wordbooks[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return true;
    }
    return false;
  }

  // 删除单词本
  static async deleteWordbook(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = this.wordbooks.findIndex(wb => wb.id === id);
    if (index !== -1) {
      this.wordbooks.splice(index, 1);
      // 同时删除关联的词汇
      this.vocabulary = this.vocabulary.filter(v => v.wordbookId !== id);
      return true;
    }
    return false;
  }

  // 导入词汇到单词本
  static async importVocabulary(wordbookId: string, words: Omit<Vocabulary, 'id' | 'wordbookId' | 'createdAt' | 'updatedAt' | 'reviewCount'>[]): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newWords: Vocabulary[] = words.map((word, index) => ({
      ...word,
      id: `${wordbookId}_${Date.now()}_${index}`,
      wordbookId,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    this.vocabulary.push(...newWords);
    return newWords.length;
  }

  // 获取统计信息
  static async getWordbookStats(wordbookId: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const words = this.vocabulary.filter(v => v.wordbookId === wordbookId);
    const totalWords = words.length;
    const masteredWords = words.filter(v => v.masteryLevel >= 0.8).length;
    const averageMastery = words.reduce((sum, v) => sum + v.masteryLevel, 0) / totalWords;
    
    return {
      wordbookId,
      totalWords,
      masteredWords,
      averageMastery,
      studySessions: Math.floor(Math.random() * 50) + 10,
      accuracyRate: Math.random() * 0.3 + 0.7 // 70%-100%准确率
    };
  }
}