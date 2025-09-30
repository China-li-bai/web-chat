# 口语练习页面Local-First语音缓存优化 + 智能语言学习集成

## Core Features

- 本地语音缓存（wa-sqlite + 内存回退）

- 智能缓存键（SHA-256: text|voiceStyle|lang|provider:version）

- 按钮来源指示（本地缓存/网络生成）与一键清理

- 降级与错误处理（失败不崩溃，提示友好）

- 服务端直连策略优化（有API Key直连Google官方）

- 智能语言学习系统（FSRS + 难度自适应 + 主动检索）

- 个性化学习会话管理

- 实时学习档案分析与统计

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  },
  "database": "wa-sqlite（IDB VFS）",
  "hash": "SubtleCrypto (SHA-256) + Node fallback",
  "algorithms": "FSRS + DifficultyAdaptive + ActiveRetrieval",
  "modules": [
    "APIManager 纯API调用（已清理localStorage）",
    "ttsCacheService 统一wa-sqlite缓存管理",
    "Practice.jsx 使用ttsCacheService缓存",
    "LanguageLearning.jsx 智能学习页面",
    "MemoryLearningManager 算法协调器"
  ]
}

## Design

架构重构：APIManager只负责API调用，所有缓存通过wa-sqlite系统进行，避免localStorage与wa-sqlite混用。集成完整记忆学习算法栈到React应用中。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 需求确认（移除第三方哈希库）

[X] 生成todos任务文档

[X] 安装和配置wa-sqlite依赖包

[X] 创建SQLite数据库初始化脚本和表结构

[X] 实现语音缓存数据库操作类（增删改查）

[X] 实现文本+语音参数的SHA-256哈希键

[X] 清理APIManager中的localStorage缓存逻辑

[X] 修改Practice页面组件，完全使用wa-sqlite缓存

[X] 测试wa-sqlite缓存在不同场景下的表现

[X] 添加缓存统计信息显示功能

[X] 优化错误处理和降级机制

[X] 集成智能语言学习功能到chat-web项目
