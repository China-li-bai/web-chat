# AI 口语练习（Practice）统一数据模型与最小可执行接入

## Core Features

- Practice.jsx 数据源切换为本地 DB：useEffect 加载最近会话/回合

- changeTopic 改为创建会话/回合并以 DB 最新 turn.referenceText 展示

- 补充 DAO 导入（getLatestSession/getLatestTurn）

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  },
  "ClientDB": "wa-sqlite BasicDatabase",
  "AI": "llmService Prompts（system 指令）"
}

## Design

保持 UI 不重构，仅将数据流接到 DB，确保可回溯与一致性。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 需求确认

[X] 统一数据模型草案

[X] 数据库选择与 Schema 定稿

[/] 前端接入与响应式校验

[ ] AI provider 接入与评估

[ ] 回归与数据一致性检查
