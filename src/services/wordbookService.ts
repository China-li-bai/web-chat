import { Wordbook, Vocabulary, WordbookCategory, DifficultyLevel, WordbookSource } from '../types/wordbook';
import learningDataService from './learningDataServiceSQLite';

// 单词本数据服务 - 使用SQLite作为后端存储
class WordbookService {
  // 获取所有词书
  async getWordbooks(): Promise<Wordbook[]> {
    return await learningDataService.getWordbooks();
  }

  // 根据ID获取词书
  async getWordbookById(id: string): Promise<Wordbook | null> {
    return await learningDataService.getWordbookById(id);
  }

  // 根据分类获取词书
  async getWordbooksByCategory(category: WordbookCategory): Promise<Wordbook[]> {
    const allWordbooks = await learningDataService.getWordbooks();
    return allWordbooks.filter(wordbook => wordbook.category === category);
  }

  // 根据难度获取词书
  async getWordbooksByDifficulty(difficulty: DifficultyLevel): Promise<Wordbook[]> {
    const allWordbooks = await learningDataService.getWordbooks();
    return allWordbooks.filter(wordbook => wordbook.difficulty === difficulty);
  }

  // 创建新词书
  async createWordbook(wordbook: Omit<Wordbook, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>): Promise<Wordbook> {
    return await learningDataService.createWordbook(wordbook);
  }

  // 更新词书
  async updateWordbook(id: string, updates: Partial<Wordbook>): Promise<Wordbook | null> {
    const result = await learningDataService.updateWordbook(id, updates);
    return result;
  }

  // 删除词书
  async deleteWordbook(id: string): Promise<boolean> {
    return await learningDataService.deleteWordbook(id);
  }

  // 获取词书的词汇
  async getWordbookVocabularies(wordbookId: string): Promise<Vocabulary[]> {
    return await learningDataService.getVocabularies(wordbookId);
  }

  // 导入词汇到词书
  async importVocabulary(wordbookId: string, vocabularyText: string): Promise<{ success: boolean; message: string; importedCount: number }> {
    try {
      // 解析词汇文本
      const lines = vocabularyText.split('\n').filter(line => line.trim());
      let importedCount = 0;

      for (const line of lines) {
        const parts = line.split('\t').map(part => part.trim());
        if (parts.length >= 2) {
          const [word, meaning, ...rest] = parts;
          const pronunciation = rest.length > 0 ? rest[0] : '';
          const example = rest.length > 1 ? rest[1] : '';

          const vocabularyData = {
            wordbookId,
            word,
            meaning,
            pronunciation,
            example,
            tags: []
          };

          await learningDataService.createVocabulary(vocabularyData);
          importedCount++;
        }
      }

      return {
        success: true,
        message: `成功导入 ${importedCount} 个词汇`,
        importedCount
      };
    } catch (error) {
      console.error('导入词汇失败:', error);
      return {
        success: false,
        message: `导入失败: ${error.message}`,
        importedCount: 0
      };
    }
  }

  // 获取词书统计信息
  async getWordbookStats(wordbookId: string) {
    return await learningDataService.getWordbookStats(wordbookId);
  }

  // 创建词书（兼容旧接口）
  async createWordbookFromData(wordbook: Omit<Wordbook, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>): Promise<Wordbook> {
    return await learningDataService.createWordbook(wordbook);
  }

  // 获取所有词书统计
  async getAllWordbookStats() {
    return await learningDataService.getAllWordbookStats();
  }
}

export const wordbookService = new WordbookService();
export default wordbookService;