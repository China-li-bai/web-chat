# Practice 接入 AI 生成对话（统一弹窗方案）

## Core Features

- 彻底删除旧的 generateAIPracticeContent 残留代码块

- 页面仅依赖 AiGenerateModal 进行生成与入库

- 保持文件结构与功能稳定

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

移除已废弃代码，避免误调用；统一通过弹窗驱动生成流程，减少耦合，增强可维护性。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 需求确认

[X] 统一数据模型草案

[X] 数据库选择与 Schema 定稿

[X] 前端接入与响应式校验

[/] AI provider 接入与评估

[ ] 回归与数据一致性检查
