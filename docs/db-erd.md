# 数据库 ER 图与域归类

下图展示“单词学习域”与“对话练习域”的主要表与关系。

```mermaid
erDiagram
  wordbooks ||--o{ words : contains
  words ||--|| learning_progress : progresses
  words ||--o{ study_logs : logged

  learning_statistics {
    INTEGER id PK
    TEXT userId
    TEXT date
    INTEGER totalReviews
    INTEGER correctReviews
    INTEGER totalResponseTime
    REAL avgResponseTime
    REAL avgStability
    REAL avgRetrievability
    INTEGER streakDays
    TEXT lastUpdated
    UNIQUE (userId, date)
  }

  word_type_statistics {
    INTEGER id PK
    TEXT userId
    TEXT date
    TEXT wordType
    INTEGER totalReviews
    INTEGER correctReviews
    REAL avgStability
    REAL avgRetrievability
    TEXT lastUpdated
    UNIQUE (userId, date, wordType)
  }

  wordbooks {
    INTEGER id PK
    TEXT name UNIQUE
    TEXT description
    TEXT createdAt
  }

  words {
    INTEGER id PK
    INTEGER wordbookId FK
    TEXT userId
    TEXT word
    TEXT type
    TEXT phonetic
    TEXT definition
    TEXT translation
    TEXT example
    TEXT createdAt
    UNIQUE (wordbookId, userId, word)
  }

  learning_progress {
    INTEGER id PK
    INTEGER wordId UNIQUE FK
    TEXT userId
    REAL stability
    REAL retrievability
    REAL difficulty
    TEXT nextReview
    TEXT lastReview
    INTEGER reviewCount
    INTEGER lapseCount
    TEXT state
  }

  study_logs {
    INTEGER id PK
    INTEGER itemId FK
    TEXT userId
    TEXT timestamp
    TEXT response
    INTEGER responseTime
    REAL confidence
    REAL previousStability
    REAL previousRetrievability
    REAL newStability
    REAL newRetrievability
  }

  practice_sessions ||--o{ practice_turns : has
  practice_sessions ||--o{ practice_messages : has

  practice_sessions {
    INTEGER id PK
    TEXT userId
    TEXT topic
    TEXT difficulty
    TEXT createdAt
    TEXT lastUpdated
  }

  practice_turns {
    INTEGER id PK
    INTEGER sessionId FK
    TEXT referenceText
    TEXT transcription
    INTEGER scoresOverall
    INTEGER scoresPronunciation
    INTEGER scoresFluency
    INTEGER scoresCompleteness
    TEXT recordingKey
    TEXT ttsCacheKey
    TEXT createdAt
  }

  practice_messages {
    INTEGER id PK
    INTEGER sessionId FK
    TEXT role
    TEXT content
    TEXT lang
    TEXT meta
    TEXT createdAt
  }
```

## 域划分

- 单词相关（学习域）
  - wordbooks：单词本集合
  - words：词条（关联 wordbooks 与 userId）
  - learning_progress：词条学习进度（唯一关联到一个 wordId）
  - study_logs：复习/学习记录（指向 words.id）
  - learning_statistics：用户每日学习统计（UNIQUE(userId,date)）
  - word_type_statistics：用户每日按词类型统计（UNIQUE(userId,date,wordType)）

- 对话相关（练习域）
  - practice_sessions：练习会话（用户、主题、难度）
  - practice_turns：会话轮次（评分、录音等）
  - practice_messages：会话消息（system/user/assistant）

## 索引与约束说明

- 新增索引（在代码中以 IF NOT EXISTS 创建，幂等）：
  - learning_progress：wordId、userId、nextReview
  - study_logs：itemId+userId+timestamp 组合，timestamp 单列
  - practice：sessions(userId, createdAt)、turns(createdAt)、messages(createdAt)
  - statistics：对 userId 增加便捷查询索引（UNIQUE 约束已存在复合索引）

- 约束一致性
  - words(wordbookId) 外键指向 wordbooks(id)
  - learning_progress(wordId) 外键指向 words(id) 且 wordId 唯一
  - practice_* 表通过 sessionId 关联 practice_sessions(id)

如需更严格的用户一致性（例如学习域所有表 userId 与 words.userId 保持一致），可在未来引入用户表并通过触发器保证一致性。