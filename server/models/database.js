const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * 数据库管理模块
 * 使用SQLite作为本地数据库，支持用户练习记录和统计数据
 */

class Database {
  constructor(dbPath = './data/speech_practice.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.init();
  }

  /**
   * 初始化数据库
   */
  async init() {
    try {
      // 确保数据目录存在
      const fs = require('fs');
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // 连接数据库
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('数据库连接失败:', err.message);
        } else {
          console.log('数据库连接成功');
          this.createTables();
        }
      });
    } catch (error) {
      console.error('数据库初始化失败:', error);
    }
  }

  /**
   * 创建数据表
   */
  createTables() {
    // 用户表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        avatar TEXT,
        settings TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 练习记录表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS practice_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        topic TEXT NOT NULL,
        reference_text TEXT NOT NULL,
        recognized_text TEXT,
        audio_path TEXT,
        duration INTEGER DEFAULT 0,
        overall_score INTEGER DEFAULT 0,
        pronunciation_score INTEGER DEFAULT 0,
        fluency_score INTEGER DEFAULT 0,
        completeness_score INTEGER DEFAULT 0,
        provider TEXT DEFAULT 'baidu',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // 学习统计表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS learning_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        date DATE NOT NULL,
        total_sessions INTEGER DEFAULT 0,
        total_duration INTEGER DEFAULT 0,
        average_score REAL DEFAULT 0,
        topics_practiced TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, date)
      )
    `);

    // 练习主题表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS practice_topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        difficulty TEXT DEFAULT 'beginner',
        content TEXT NOT NULL,
        description TEXT,
        tags TEXT DEFAULT '[]',
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 插入默认用户
    this.db.run(`
      INSERT OR IGNORE INTO users (id, username, email) 
      VALUES (1, 'default_user', 'user@example.com')
    `);

    // 插入默认练习主题
    this.insertDefaultTopics();

    console.log('数据表创建完成');
  }

  /**
   * 插入默认练习主题
   */
  insertDefaultTopics() {
    const defaultTopics = [
      {
        title: '日常问候',
        category: '基础对话',
        difficulty: 'beginner',
        content: 'Hello, how are you today? I am fine, thank you. Nice to meet you.',
        description: '学习基本的英语问候用语',
        tags: JSON.stringify(['greeting', 'basic', 'conversation'])
      },
      {
        title: '自我介绍',
        category: '基础对话',
        difficulty: 'beginner',
        content: 'My name is John. I am from China. I am a student. I like reading books and playing sports.',
        description: '练习英语自我介绍',
        tags: JSON.stringify(['introduction', 'personal', 'basic'])
      },
      {
        title: '购物对话',
        category: '生活场景',
        difficulty: 'intermediate',
        content: 'Excuse me, how much does this shirt cost? It costs fifty dollars. Can I try it on? Sure, the fitting room is over there.',
        description: '学习购物场景的英语对话',
        tags: JSON.stringify(['shopping', 'price', 'clothes'])
      },
      {
        title: '餐厅点餐',
        category: '生活场景',
        difficulty: 'intermediate',
        content: 'Good evening, do you have a table for two? Yes, please follow me. Can I see the menu? Here you are. I would like to order the chicken salad.',
        description: '练习餐厅点餐的英语表达',
        tags: JSON.stringify(['restaurant', 'food', 'ordering'])
      },
      {
        title: '工作面试',
        category: '商务英语',
        difficulty: 'advanced',
        content: 'Tell me about yourself. I have five years of experience in software development. What are your strengths? I am good at problem-solving and teamwork.',
        description: '练习工作面试的英语对话',
        tags: JSON.stringify(['interview', 'job', 'professional'])
      },
      {
        title: '旅行咨询',
        category: '旅游英语',
        difficulty: 'intermediate',
        content: 'I would like to book a flight to New York. When would you like to travel? Next Monday morning. Let me check the available flights for you.',
        description: '学习旅行相关的英语表达',
        tags: JSON.stringify(['travel', 'booking', 'flight'])
      }
    ];

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO practice_topics 
      (title, category, difficulty, content, description, tags) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    defaultTopics.forEach(topic => {
      stmt.run([
        topic.title,
        topic.category,
        topic.difficulty,
        topic.content,
        topic.description,
        topic.tags
      ]);
    });

    stmt.finalize();
  }

  /**
   * 保存练习记录
   */
  async savePracticeRecord(record) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO practice_records 
        (user_id, topic, reference_text, recognized_text, audio_path, duration, 
         overall_score, pronunciation_score, fluency_score, completeness_score, provider)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        record.userId || 1,
        record.topic,
        record.referenceText,
        record.recognizedText,
        record.audioPath,
        record.duration,
        record.scores.overall,
        record.scores.pronunciation,
        record.scores.fluency,
        record.scores.completeness,
        record.provider || 'baidu'
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          // 更新学习统计
          resolve({ id: this.lastID, ...record });
        }
      });
    });
  }

  /**
   * 获取练习记录
   */
  async getPracticeRecords(userId = 1, limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM practice_records 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      this.db.all(sql, [userId, limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * 获取学习统计
   */
  async getLearningStats(userId = 1, days = 30) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_sessions,
          SUM(duration) as total_duration,
          AVG(overall_score) as average_score,
          MAX(created_at) as last_practice,
          COUNT(DISTINCT DATE(created_at)) as practice_days
        FROM practice_records 
        WHERE user_id = ? AND created_at >= datetime('now', '-${days} days')
      `;
      
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            totalSessions: row.total_sessions || 0,
            totalDuration: row.total_duration || 0,
            averageScore: Math.round(row.average_score || 0),
            lastPractice: row.last_practice,
            practiceDays: row.practice_days || 0,
            streak: 0 // 需要额外计算连续天数
          });
        }
      });
    });
  }

  /**
   * 获取每日练习统计
   */
  async getDailyStats(userId = 1, days = 7) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as sessions,
          SUM(duration) as duration,
          AVG(overall_score) as average_score
        FROM practice_records 
        WHERE user_id = ? AND created_at >= datetime('now', '-${days} days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
      
      this.db.all(sql, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            date: row.date,
            sessions: row.sessions,
            duration: row.duration || 0,
            averageScore: Math.round(row.average_score || 0)
          })));
        }
      });
    });
  }

  /**
   * 获取主题分布统计
   */
  async getTopicStats(userId = 1, days = 30) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          topic,
          COUNT(*) as count,
          AVG(overall_score) as average_score
        FROM practice_records 
        WHERE user_id = ? AND created_at >= datetime('now', '-${days} days')
        GROUP BY topic
        ORDER BY count DESC
        LIMIT 10
      `;
      
      this.db.all(sql, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            topic: row.topic,
            count: row.count,
            averageScore: Math.round(row.average_score || 0)
          })));
        }
      });
    });
  }

  /**
   * 获取练习主题列表
   */
  async getPracticeTopics(category = null, difficulty = null) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM practice_topics WHERE 1=1';
      const params = [];
      
      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }
      
      if (difficulty) {
        sql += ' AND difficulty = ?';
        params.push(difficulty);
      }
      
      sql += ' ORDER BY usage_count DESC, created_at DESC';
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            ...row,
            tags: JSON.parse(row.tags || '[]')
          })));
        }
      });
    });
  }

  /**
   * 更新主题使用次数
   */
  async updateTopicUsage(topicId) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE practice_topics SET usage_count = usage_count + 1 WHERE id = ?';
      
      this.db.run(sql, [topicId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  /**
   * 获取用户设置
   */
  async getUserSettings(userId = 1) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT settings FROM users WHERE id = ?';
      
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          const settings = row ? JSON.parse(row.settings || '{}') : {};
          resolve({
            language: 'zh-CN',
            theme: 'light',
            speechProvider: 'baidu',
            ttsVoice: 'female',
            speechSpeed: 1.0,
            autoSave: true,
            notifications: true,
            ...settings
          });
        }
      });
    });
  }

  /**
   * 更新用户设置
   */
  async updateUserSettings(userId = 1, settings) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      
      this.db.run(sql, [JSON.stringify(settings), userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  /**
   * 清理旧数据
   */
  async cleanupOldData(days = 90) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM practice_records WHERE created_at < datetime('now', '-${days} days')`;
      
      this.db.run(sql, function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`清理了 ${this.changes} 条旧记录`);
          resolve({ deleted: this.changes });
        }
      });
    });
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('关闭数据库失败:', err.message);
        } else {
          console.log('数据库连接已关闭');
        }
      });
    }
  }
}

module.exports = Database;