# Practice 目标驱动对话 Prompt 对接（统一使用 Prompts.get）

## Core Features

- AiGenerateModal 与 modules/ai/practice 统一通过 Prompts.get 生成模板 Prompt

- 移除自定义模板替换与 ?raw 导入，保持一致性

- 继续保证 JSON-only 输出与 DB 映射一致

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  },
  "AI": "llmService + Prompts.get",
  "ClientDB": "wa-sqlite（practice_sessions/turns/messages）"
}

## Design

集中管理 Prompt，复用 Prompts 类，提高可维护性与一致性。

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
