-- 智能记忆学习系统数据库Schema
-- 支持FSRS、难度自适应、主动检索三大算法
-- 设计原则：数据一致性、离线支持、算法协作

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- 用户基础信息
    name TEXT,
    email TEXT,
    -- 学习偏好设置
    preferred_session_duration INTEGER DEFAULT 1800, -- 秒
    target_cognitive_load REAL DEFAULT 0.7, -- 0-1
    interleave_types BOOLEAN DEFAULT TRUE,
    -- FSRS个性化参数
    fsrs_request_retention REAL DEFAULT 0.9,
    fsrs_maximum_interval INTEGER DEFAULT 36500,
    fsrs_easy_bonus REAL DEFAULT 1.3,
    fsrs_hard_factor REAL DEFAULT 1.2,
    -- 难度自适应参数
    min_difficulty REAL DEFAULT 0.1,
    max_difficulty REAL DEFAULT 0.9,
    adaptation_rate REAL DEFAULT 0.1,
    -- 统计信息
    total_study_time INTEGER DEFAULT 0, -- 秒
    total_items_studied INTEGER DEFAULT 0,
    average_success_rate REAL DEFAULT 0.0
);

-- 学习项目表
CREATE TABLE IF NOT EXISTS learning_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- 内容信息
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text', -- text, image, audio, video
    category TEXT,
    tags TEXT, -- JSON数组格式
    -- 难度和优先级
    difficulty REAL DEFAULT 0.5, -- 0-1，动态调整
    initial_difficulty REAL DEFAULT 0.5, -- 初始难度，不变
    priority INTEGER DEFAULT 1, -- 1-5
    -- FSRS相关字段
    due_date DATETIME,
    stability REAL DEFAULT 1.0,
    difficulty_fsrs REAL DEFAULT 5.0, -- FSRS内部难度
    elapsed_days INTEGER DEFAULT 0,
    scheduled_days INTEGER DEFAULT 0,
    reps INTEGER DEFAULT 0,
    lapses INTEGER DEFAULT 0,
    state INTEGER DEFAULT 0, -- 0=New, 1=Learning, 2=Review, 3=Relearning
    last_review DATETIME,
    -- 元数据
    source TEXT, -- 来源
    metadata TEXT, -- JSON格式的额外信息
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 学习记录表（每次学习响应）
CREATE TABLE IF NOT EXISTS study_records (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- 响应信息
    response TEXT NOT NULL, -- again, hard, good, easy
    response_time INTEGER NOT NULL, -- 毫秒
    confidence REAL, -- 0-1，用户自评信心度
    -- FSRS计算结果
    memory_strength REAL, -- 记忆强度
    retrievability REAL, -- 可检索性
    stability_before REAL, -- 复习前稳定性
    stability_after REAL, -- 复习后稳定性
    difficulty_before REAL, -- 复习前难度
    difficulty_after REAL, -- 复习后难度
    -- 主动检索相关
    retrieval_strategy TEXT, -- recognition, free_recall, cued_recall, elaborative_retrieval
    strategy_difficulty TEXT, -- easy, medium, hard
    hints_used INTEGER DEFAULT 0,
    time_limit INTEGER, -- 秒
    -- 上下文信息
    device_type TEXT, -- web, mobile
    environment TEXT, -- home, commute, office
    FOREIGN KEY (item_id) REFERENCES learning_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE SET NULL
);

-- 学习会话表
CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- 会话基本信息
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    planned_duration INTEGER, -- 计划时长（秒）
    actual_duration INTEGER, -- 实际时长（秒）
    -- 会话统计
    total_items INTEGER DEFAULT 0,
    completed_items INTEGER DEFAULT 0,
    correct_items INTEGER DEFAULT 0,
    -- 性能指标
    average_response_time REAL DEFAULT 0.0,
    cognitive_load_predicted REAL DEFAULT 0.0, -- 预测认知负荷
    cognitive_load_actual REAL DEFAULT 0.0, -- 实际认知负荷
    success_rate REAL DEFAULT 0.0,
    -- 算法调整统计
    difficulty_adaptations INTEGER DEFAULT 0,
    strategy_changes INTEGER DEFAULT 0,
    -- 会话类型和配置
    session_type TEXT DEFAULT 'regular', -- regular, intensive, review
    interleave_enabled BOOLEAN DEFAULT TRUE,
    -- 元数据
    notes TEXT,
    device_type TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 学习档案表（用户个性化学习特征）
CREATE TABLE IF NOT EXISTS learning_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- 学习能力指标
    processing_speed REAL DEFAULT 1.0, -- 处理速度倍数
    working_memory_capacity REAL DEFAULT 1.0, -- 工作记忆容量
    attention_span INTEGER DEFAULT 1800, -- 注意力持续时间（秒）
    -- 学习偏好
    preferred_difficulty REAL DEFAULT 0.5, -- 偏好难度
    optimal_cognitive_load REAL DEFAULT 0.7, -- 最佳认知负荷
    learning_style TEXT DEFAULT 'mixed', -- visual, auditory, kinesthetic, mixed
    -- 时间偏好
    best_time_of_day TEXT, -- morning, afternoon, evening, night
    preferred_session_length INTEGER DEFAULT 1800, -- 秒
    break_frequency INTEGER DEFAULT 1800, -- 休息频率（秒）
    -- 动态调整参数
    adaptation_sensitivity REAL DEFAULT 0.1, -- 适应敏感度
    forgetting_curve_steepness REAL DEFAULT 1.0, -- 遗忘曲线陡峭度
    -- 统计数据（用于算法优化）
    total_study_sessions INTEGER DEFAULT 0,
    average_session_success_rate REAL DEFAULT 0.0,
    improvement_rate REAL DEFAULT 0.0, -- 学习改进率
    consistency_score REAL DEFAULT 0.0, -- 学习一致性评分
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 认知负荷记录表
CREATE TABLE IF NOT EXISTS cognitive_load_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT,
    item_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- 负荷类型
    load_type TEXT NOT NULL, -- intrinsic, extraneous, germane
    -- 负荷值
    predicted_load REAL NOT NULL, -- 预测负荷
    actual_load REAL, -- 实际负荷（基于表现推算）
    -- 影响因素
    item_complexity REAL, -- 项目复杂度
    user_expertise REAL, -- 用户专业度
    context_factors TEXT, -- JSON格式的上下文因素
    -- 调整建议
    adjustment_needed BOOLEAN DEFAULT FALSE,
    adjustment_type TEXT, -- difficulty, strategy, timing
    adjustment_magnitude REAL, -- 调整幅度
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES learning_items(id) ON DELETE CASCADE
);

-- 难度调整记录表
CREATE TABLE IF NOT EXISTS difficulty_adjustments (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- 调整信息
    old_difficulty REAL NOT NULL,
    new_difficulty REAL NOT NULL,
    adjustment_reason TEXT NOT NULL,
    adjustment_magnitude REAL NOT NULL,
    -- 触发条件
    trigger_type TEXT NOT NULL, -- performance, time, cognitive_load
    trigger_data TEXT, -- JSON格式的触发数据
    -- 效果评估
    effectiveness_score REAL, -- 调整效果评分（后续计算）
    user_satisfaction REAL, -- 用户满意度（可选）
    FOREIGN KEY (item_id) REFERENCES learning_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE
);

-- 检索策略记录表
CREATE TABLE IF NOT EXISTS retrieval_strategies (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- 策略信息
    strategy_type TEXT NOT NULL, -- recognition, free_recall, cued_recall, elaborative_retrieval
    strategy_difficulty TEXT NOT NULL, -- easy, medium, hard
    time_limit INTEGER NOT NULL, -- 秒
    hints_provided TEXT, -- JSON数组格式
    -- 选择原因
    selection_reason TEXT NOT NULL,
    selection_factors TEXT, -- JSON格式的选择因素
    -- 执行结果
    execution_time INTEGER, -- 实际执行时间（毫秒）
    success BOOLEAN,
    user_feedback TEXT, -- 用户反馈
    -- 效果评估
    testing_effect_strength REAL, -- 测试效应强度
    predicted_retention REAL, -- 预测保持率
    actual_retention REAL, -- 实际保持率（后续更新）
    FOREIGN KEY (item_id) REFERENCES learning_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE
);

-- 同步状态表（离线支持）
CREATE TABLE IF NOT EXISTS sync_status (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- insert, update, delete
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME,
    sync_attempts INTEGER DEFAULT 0,
    last_error TEXT,
    is_synced BOOLEAN DEFAULT FALSE,
    data_snapshot TEXT -- JSON格式的数据快照
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_learning_items_user_id ON learning_items(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_items_due_date ON learning_items(due_date);
CREATE INDEX IF NOT EXISTS idx_learning_items_difficulty ON learning_items(difficulty);
CREATE INDEX IF NOT EXISTS idx_learning_items_category ON learning_items(category);

CREATE INDEX IF NOT EXISTS idx_study_records_item_id ON study_records(item_id);
CREATE INDEX IF NOT EXISTS idx_study_records_user_id ON study_records(user_id);
CREATE INDEX IF NOT EXISTS idx_study_records_session_id ON study_records(session_id);
CREATE INDEX IF NOT EXISTS idx_study_records_created_at ON study_records(created_at);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_study_sessions_is_completed ON study_sessions(is_completed);

CREATE INDEX IF NOT EXISTS idx_cognitive_load_records_user_id ON cognitive_load_records(user_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_load_records_session_id ON cognitive_load_records(session_id);

CREATE INDEX IF NOT EXISTS idx_difficulty_adjustments_item_id ON difficulty_adjustments(item_id);
CREATE INDEX IF NOT EXISTS idx_difficulty_adjustments_user_id ON difficulty_adjustments(user_id);

CREATE INDEX IF NOT EXISTS idx_retrieval_strategies_item_id ON retrieval_strategies(item_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_strategies_user_id ON retrieval_strategies(user_id);

CREATE INDEX IF NOT EXISTS idx_sync_status_table_record ON sync_status(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_is_synced ON sync_status(is_synced);

-- 创建触发器以维护数据一致性
-- 更新learning_items的updated_at字段
CREATE TRIGGER IF NOT EXISTS update_learning_items_timestamp 
    AFTER UPDATE ON learning_items
    BEGIN
        UPDATE learning_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 更新users的updated_at字段
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 更新study_sessions的updated_at字段
CREATE TRIGGER IF NOT EXISTS update_study_sessions_timestamp 
    AFTER UPDATE ON study_sessions
    BEGIN
        UPDATE study_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 更新learning_profiles的updated_at字段
CREATE TRIGGER IF NOT EXISTS update_learning_profiles_timestamp 
    AFTER UPDATE ON learning_profiles
    BEGIN
        UPDATE learning_profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 自动记录同步状态
CREATE TRIGGER IF NOT EXISTS track_learning_items_changes 
    AFTER INSERT ON learning_items
    BEGIN
        INSERT INTO sync_status (id, table_name, record_id, operation, data_snapshot)
        VALUES (
            'sync_' || NEW.id || '_' || strftime('%s', 'now') || '_' || (abs(random()) % 1000),
            'learning_items',
            NEW.id,
            'insert',
            json_object(
                'id', NEW.id,
                'user_id', NEW.user_id,
                'content', NEW.content,
                'difficulty', NEW.difficulty,
                'created_at', NEW.created_at
            )
        );
    END;

CREATE TRIGGER IF NOT EXISTS track_study_records_changes 
    AFTER INSERT ON study_records
    BEGIN
        INSERT INTO sync_status (id, table_name, record_id, operation, data_snapshot)
        VALUES (
            'sync_' || NEW.id || '_' || strftime('%s', 'now') || '_' || (abs(random()) % 1000),
            'study_records',
            NEW.id,
            'insert',
            json_object(
                'id', NEW.id,
                'item_id', NEW.item_id,
                'user_id', NEW.user_id,
                'response', NEW.response,
                'response_time', NEW.response_time,
                'created_at', NEW.created_at
            )
        );
    END;