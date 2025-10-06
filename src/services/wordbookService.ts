import { Wordbook, Vocabulary, WordbookCategory, DifficultyLevel, WordbookSource } from '../types/wordbook';
import { MockDataService } from './mockDataService';

// 单词本数据服务 - 集成真实数据模型
export class WordbookService {
  // 获取所有单词本
  static async getWordbooks(): Promise<Wordbook[]> {
    return await MockDataService.getWordbooks();
  }

  // 根据ID获取单词本
  static async getWordbookById(id: string): Promise<Wordbook | null> {
    return await MockDataService.getWordbookById(id);
  }

  // 根据分类获取单词本
  static async getWordbooksByCategory(category: WordbookCategory): Promise<Wordbook[]> {
    return await MockDataService.getWordbooksByCategory(category);
  }

  // 根据难度获取单词本
  static async getWordbooksByDifficulty(difficulty: DifficultyLevel): Promise<Wordbook[]> {
    return await MockDataService.getWordbooksByDifficulty(difficulty);
  }

  // 添加单词本
  static async addWordbook(wordbook: Omit<Wordbook, 'id' | 'createdAt' | 'updatedAt'>): Promise<Wordbook> {
    return await MockDataService.addWordbook(wordbook);
  }

  // 更新单词本
  static async updateWordbook(id: string, updates: Partial<Wordbook>): Promise<boolean> {
    return await MockDataService.updateWordbook(id, updates);
  }

  // 删除单词本
  static async deleteWordbook(id: string): Promise<boolean> {
    return await MockDataService.deleteWordbook(id);
  }

  // 获取单词本中的词汇
  static async getVocabularyByWordbook(wordbookId: string): Promise<Vocabulary[]> {
    return await MockDataService.getVocabularyByWordbook(wordbookId);
  }

  // 导入词汇到单词本
  static async importVocabulary(wordbookId: string, words: Omit<Vocabulary, 'id' | 'wordbookId' | 'createdAt' | 'updatedAt' | 'reviewCount'>[]): Promise<number> {
    return await MockDataService.importVocabulary(wordbookId, words);
  }

  // 获取单词本统计信息
  static async getWordbookStats(wordbookId: string): Promise<any> {
    return await MockDataService.getWordbookStats(wordbookId);
  }

  // 获取所有单词本的统计信息（用于长期统计页面）
  static async getAllWordbookStats(): Promise<any[]> {
    const wordbooks = await this.getWordbooks();
    const statsPromises = wordbooks.map(async (wordbook) => {
      const stats = await this.getWordbookStats(wordbook.id);
      return {
        ...wordbook,
        ...stats
      };
    });
    
    return await Promise.all(statsPromises);
  }
}

// 导出实例以保持向后兼容性
export const wordbookService = WordbookService;