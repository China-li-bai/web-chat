# Practice 目标驱动对话 Prompt 对接

## Core Features

- 重构：AiGenerateModal 调用 modules/ai/practice.generatePracticeFromGoal

- 生成/解析/入库逻辑下沉至模块层，Modal 仅负责表单与回调

- 保持与 db.ts 结构一致：referenceText/dialogue/tips/vocabulary

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  },
  "AI": "llmService + 模板化 Prompt",
  "ClientDB": "wa-sqlite（practice_sessions/turns/messages）"
}

## Design

统一在模块层处理 AI 与数据库映射，组件层保持瘦身，便于复用与测试。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 需求确认

[X] 主题移除与代码清理

[X] 目标输入与 Prompt 对接设计

[X] 实现与页面接入（goal 输入与 AiGenerateModal 扩展）

[/] 回归与数据一致性检查
