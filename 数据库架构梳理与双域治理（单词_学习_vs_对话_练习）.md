# 数据库架构梳理与双域治理（单词/学习 vs 对话/练习）

## Core Features

- 梳理并归类表：wordbooks/words/learning_* 与 practice_*

- 对话域中文字段统一：写入时双写 translationZh/contentZh；读取端 contentZh 优先、translationZh 兜底

- UI 轻量 API：getDialogue/getTips/getVocabulary/getReferenceText + 会话 JSON 重组

- 无迁移：暂不批量补历史数据

## Tech Stack

{
  "Web": {
    "arch": "node",
    "component": "null"
  },
  "DB": "SQLite (wa-sqlite adapter)"
}

## Design

practice-query 读取端已按 contentZh ?? translationZh 返回；保持与 practice-persist 的双写一致；不做历史迁移。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 架构归类与风险扫描

[/] DAO 接口对齐与文档化

[/] 练习域双语写入/读取

[/] 查询与性能封装

[ ] 统计口径与迁移策略
