import { Wordbook, Vocabulary, WordbookCategory, DifficultyLevel, WordbookSource } from '../types/wordbook';
import { learningDataServiceSQLite } from './learningDataServiceSQLite';

// 单词本数据服务 - 使用SQLite作为后端存储
export class WordbookService {
  // 获取所有单词本
  static async getWordbooks(): Promise<Wordbook[]> {
    return await learningDataServiceSQLite.getWordbooks();
  }

  // 根据ID获取单词本
  static async getWordbookById(id: string): Promise<Wordbook | null> {
    return await learningDataServiceSQLite.getWordbookById(id);
  }

  // 根据分类获取单词本
  static async getWordbooksByCategory(category: WordbookCategory): Promise<Wordbook[]> {
    const allWordbooks = await learningDataServiceSQLite.getWordbooks();
    return allWordbooks.filter(wb => wb.category === category);
  }

  // 根据难度获取单词本
  static async getWordbooksByDifficulty(difficulty: DifficultyLevel): Promise<Wordbook[]> {
    const allWordbooks = await learningDataServiceSQLite.getWordbooks();
    return allWordbooks.filter(wb => wb.difficulty === difficulty);
  }

  // 添加单词本
  static async addWordbook(wordbook: Omit<Wordbook, 'id' | 'createdAt' | 'updatedAt'>): Promise<Wordbook> {
    return await learningDataServiceSQLite.createWordbook(wordbook);
  }

  // 更新单词本
  static async updateWordbook(id: string, updates: Partial<Wordbook>): Promise<boolean> {
    const result = await learningDataServiceSQLite.updateWordbook(id, updates);
    return result !== null;
  }

  // 删除单词本
  static async deleteWordbook(id: string): Promise<boolean> {
    return await learningDataServiceSQLite.deleteWordbook(id);
  }

  // 获取单词本中的词汇
  static async getVocabularyByWordbook(wordbookId: string): Promise<Vocabulary[]> {
    return await learningDataServiceSQLite.getVocabularies(wordbookId);
  }

  // 导入词汇到单词本
  static async importVocabulary(wordbookId: string, words: any[]): Promise<number> {
    let importedCount = 0;
    
    for (const word of words) {
      try {
        // 数据格式转换：将导入的数据格式转换为SQLite期望的格式
        const vocabularyData = {
          wordbookId,
          word: word.word,
          pronunciation: word.pronunciation || '',
          meaning: word.translation || word.meaning || '', // 将translation映射到meaning
          example: word.example || '',
          difficulty: word.difficulty || 0.5,
          tags: word.tags || [],
          lastReviewed: word.lastReviewed || null
        };
        
        console.log('🔄 转换词汇数据:', vocabularyData);
        
        await learningDataServiceSQLite.createVocabulary(vocabularyData);
        importedCount++;
        console.log(`✅ 成功导入词汇: ${word.word}`);
      } catch (error) {
        console.error('❌ 导入词汇失败:', word, error);
      }
    }
    
    return importedCount;
  }

  // 获取单词本统计信息
  static async getWordbookStats(wordbookId: string): Promise<any> {
    return await learningDataServiceSQLite.getWordbookStats(wordbookId);
  }

  // 创建单词本（别名方法，与addWordbook功能相同）
  static async createWordbook(wordbook: Omit<Wordbook, 'id' | 'createdAt' | 'updatedAt'>): Promise<Wordbook> {
    return await learningDataServiceSQLite.createWordbook(wordbook);
  }

  // 获取所有单词本统计信息
  static async getAllWordbookStats(): Promise<any[]> {
    return await learningDataServiceSQLite.getAllWordbookStats();
  }
}

export const wordbookService = WordbookService;