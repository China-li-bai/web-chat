# 口语练习页面Local-First语音缓存优化

## Core Features

- 本地语音缓存（wa-sqlite + 内存回退）

- 智能缓存键（SHA-256: text|voiceStyle|lang|provider:version）

- 按钮来源指示（本地缓存/网络生成）与一键清理

- 降级与错误处理（失败不崩溃，提示友好）

- 服务端直连策略优化（有API Key直连Google官方）

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": null
  },
  "database": "wa-sqlite（IDB VFS）",
  "hash": "SubtleCrypto (SHA-256) + Node fallback",
  "modules": [
    "APIManager 纯API调用（已清理localStorage）",
    "ttsCacheService 统一wa-sqlite缓存管理",
    "Practice.jsx 使用ttsCacheService缓存"
  ]
}

## Design

架构重构：APIManager只负责API调用，所有缓存通过wa-sqlite系统进行，避免localStorage与wa-sqlite混用。

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

[/] 修改Practice页面组件，完全使用wa-sqlite缓存

[ ] 测试wa-sqlite缓存在不同场景下的表现

[ ] 添加缓存统计信息显示功能

[ ] 优化错误处理和降级机制
