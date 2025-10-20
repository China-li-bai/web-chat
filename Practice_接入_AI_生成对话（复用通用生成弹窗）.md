# Practice 接入 AI 生成对话（复用通用生成弹窗）

## Core Features

- 新增通用组件 src/components/AiGenerateModal.tsx

- Practice.jsx 接入弹窗：按钮打开，生成后落库并刷新展示

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  },
  "ClientDB": "wa-sqlite BasicDatabase",
  "AI": "llmService（Provider 可插拔）"
}

## Design

保持最小改动：只新增组件与按钮事件替换，数据仍通过 DAO 流转，展示以 DB 最新回合为准。

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

[/] AI provider 接入与评估

[ ] 回归与数据一致性检查
