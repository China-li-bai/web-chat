-- 语言学习系统统一数据库表结构设计
-- 基于 src/types/wordbook.ts 类型定义

-- 词书表
CREATE TABLE wordbooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('academic', 'exam', 'business', 'daily', 'custom')),
    description TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
    word_count INTEGER NOT NULL DEFAULT 0,
    tags TEXT, -- JSON array as string
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    source TEXT CHECK (source IN ('oxford_3000', 'cet4', 'cet6', 'postgraduate', 'interview', 'custom')),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 词汇表
CREATE TABLE vocabularies (
    id TEXT PRIMARY KEY,
    wordbook_id TEXT NOT NULL,
    word TEXT NOT NULL,
    pronunciation TEXT,
    meaning TEXT NOT NULL,
    example TEXT,
    difficulty REAL NOT NULL DEFAULT 0.5 CHECK (difficulty >= 0 AND difficulty <= 1), -- 0-1 难度系数
    mastery_level REAL NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 1), -- 0-1 掌握程度
    last_reviewed TEXT,
    review_count INTEGER NOT NULL DEFAULT 0,
    tags TEXT, -- JSON array as string
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE
);

-- 学习记录表
CREATE TABLE learning_records (
    id TEXT PRIMARY KEY,
    wordbook_id TEXT NOT NULL,
    vocabulary_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'default_user', -- 支持多用户扩展
    session_id TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('correct', 'incorrect', 'skip')),
    time_spent INTEGER NOT NULL DEFAULT 0, -- 秒
    timestamp TEXT NOT NULL,
    FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE,
    FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE CASCADE
);

-- 学习会话表（扩展）
CREATE TABLE learning_sessions (
    id TEXT PRIMARY KEY,
    wordbook_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    start_time TEXT NOT NULL,
    end_time TEXT,
    total_words INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_time INTEGER NOT NULL DEFAULT 0, -- 秒
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TEXT NOT NULL,
    FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE
);

-- 每日进度表
CREATE TABLE daily_progress (
    id TEXT PRIMARY KEY,
    wordbook_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    date TEXT NOT NULL, -- YYYY-MM-DD format
    words_studied INTEGER NOT NULL DEFAULT 0,
    accuracy REAL NOT NULL DEFAULT 0 CHECK (accuracy >= 0 AND accuracy <= 1),
    time_spent INTEGER NOT NULL DEFAULT 0, -- 秒
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE,
    UNIQUE(wordbook_id, user_id, date)
);

-- 索引优化
CREATE INDEX idx_vocabularies_wordbook_id ON vocabularies(wordbook_id);
CREATE INDEX idx_learning_records_wordbook_id ON learning_records(wordbook_id);
CREATE INDEX idx_learning_records_vocabulary_id ON learning_records(vocabulary_id);
CREATE INDEX idx_learning_records_timestamp ON learning_records(timestamp);
CREATE INDEX idx_learning_sessions_wordbook_id ON learning_sessions(wordbook_id);
CREATE INDEX idx_learning_sessions_start_time ON learning_sessions(start_time);
CREATE INDEX idx_daily_progress_wordbook_id ON daily_progress(wordbook_id);
CREATE INDEX idx_daily_progress_date ON daily_progress(date);

-- 视图：词书统计（实时计算）
CREATE VIEW wordbook_stats AS
SELECT 
    w.id as wordbook_id,
    w.name as wordbook_name,
    COUNT(v.id) as total_words,
    COUNT(CASE WHEN v.mastery_level >= 0.8 THEN 1 END) as mastered_words,
    COALESCE(AVG(v.mastery_level), 0) as average_mastery,
    COALESCE(SUM(dp.time_spent), 0) as total_study_time,
    MAX(dp.date) as last_study_date,
    COUNT(DISTINCT ls.id) as study_sessions,
    CASE 
        WHEN COUNT(lr.id) > 0 THEN 
            CAST(COUNT(CASE WHEN lr.result = 'correct' THEN 1 END) AS REAL) / COUNT(lr.id)
        ELSE 0 
    END as accuracy_rate
FROM wordbooks w
LEFT JOIN vocabularies v ON w.id = v.wordbook_id
LEFT JOIN learning_records lr ON w.id = lr.wordbook_id
LEFT JOIN learning_sessions ls ON w.id = ls.wordbook_id AND ls.is_completed = true
LEFT JOIN daily_progress dp ON w.id = dp.wordbook_id
WHERE w.is_active = true
GROUP BY w.id, w.name;

-- 数据完整性触发器
-- 更新词书的word_count
CREATE TRIGGER update_wordbook_count 
AFTER INSERT ON vocabularies
BEGIN
    UPDATE wordbooks 
    SET word_count = (
        SELECT COUNT(*) FROM vocabularies WHERE wordbook_id = NEW.wordbook_id
    ),
    updated_at = datetime('now')
    WHERE id = NEW.wordbook_id;
END;

CREATE TRIGGER update_wordbook_count_delete
AFTER DELETE ON vocabularies
BEGIN
    UPDATE wordbooks 
    SET word_count = (
        SELECT COUNT(*) FROM vocabularies WHERE wordbook_id = OLD.wordbook_id
    ),
    updated_at = datetime('now')
    WHERE id = OLD.wordbook_id;
END;

-- 更新词汇的复习统计
CREATE TRIGGER update_vocabulary_stats
AFTER INSERT ON learning_records
BEGIN
    UPDATE vocabularies 
    SET 
        review_count = review_count + 1,
        last_reviewed = NEW.timestamp,
        mastery_level = CASE 
            WHEN NEW.result = 'correct' THEN 
                MIN(1.0, mastery_level + 0.1)
            WHEN NEW.result = 'incorrect' THEN 
                MAX(0.0, mastery_level - 0.05)
            ELSE mastery_level
        END,
        updated_at = datetime('now')
    WHERE id = NEW.vocabulary_id;
END;