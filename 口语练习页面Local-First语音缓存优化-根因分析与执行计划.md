# 口语练习页面 Local-First 语音缓存优化 - 根因分析与执行计划

## Core Features

- 本地语音缓存（wa-sqlite + 内存回退）

- 智能缓存键（SHA-256: text|voiceStyle|lang|provider:version）

- 按钮来源指示（本地缓存/网络生成）与一键清理

- 降级与错误处理（失败不崩溃，提示友好）

- 服务端直连策略优化（有API Key直连Google官方）

- 完整的LocalFirst架构（存储/缓存/同步/网络监控）

- 可观测性（命中率、延迟、并发、配额）与诊断开关

- 并发去重与请求合并（同键只发一次）

- 缓存一致性与版本迁移（key加入schemaVersion）

- 配额与清理策略（LRU/TTL/手动清理）

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
    "Practice.jsx 使用ttsCacheService缓存",
    "LocalFirst：StorageManager、CacheManager、SyncManager、NetworkMonitor、Repository"
  ],
  "test": "Vitest + fake-indexeddb/wa-sqlite stub + 集成测试",
  "observability": "轻量埋点与日志（命中率/延迟/错误码/并发）"
}

## Design

以诊断驱动优化：优先确认缓存键一致性与库初始化时机；为音频数据统一存储格式（ArrayBuffer+MIME）；以事务与索引保障一致性与性能；NetworkMonitor 辅助离线/在线判定；在CacheManager加并发去重与请求合并，避免重复生成；增加schemaVersion于key，支持平滑迁移；建立配额与清理策略；分级错误与重试策略。

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

[X] 设计完整的LocalFirst架构

[/] 修改Practice页面组件，完全使用wa-sqlite缓存

[/] 问题现象收集与根因假设清单（键一致性/初始化/并发/配额）

[ ] 可观测性接入（命中率/延迟/错误码/并发/配额日志）

[ ] 缓存Key策略校验与统一（加入schemaVersion与provider版本）

[ ] 并发去重与请求合并（同键同批次仅一次网络请求）

[ ] 异常分级与重试/降级（超时/429/5xx/配额）

[ ] 配额评估与清理策略（LRU/TTL/手动清理）

[ ] 端到端测试（离线/重连/高并发/大文本）

[ ] UI 指示与设置（来源标签/一键清理/统计展示）

[ ] 文档与运行脚本完善（docs/ 与 scripts/）
