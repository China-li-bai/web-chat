# AI 口语练习（Practice）统一数据模型与最小可执行接入

## Core Features

- 在 db.ts 中追加 practice_sessions / practice_turns / practice_messages 建表与索引

- 提供最小 DAO（exec 驱动），替换 Practice.jsx 的 mock

- 消息格式与 llmService 对齐（system/user/assistant，meta 可扩展）

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  },
  "ClientDB": "wa-sqlite (IndexedDB VFS) 通过 BasicDatabase",
  "AI": "llmService.ts（多 Provider 可插拔）"
}

## Design

坚持最小可执行与可维护性：SQL 直接追加、DAO 轻封装、前端逐步替换；确保数据一致性与回溯能力。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 需求确认

[/] 统一数据模型草案

[ ] 数据库选择与 Schema 定稿

[ ] 前端接入与响应式校验

[ ] AI provider 接入与评估

[ ] 回归与数据一致性检查
