# Practice 页面集成对话列表与提示词场景优化

## Core Features

- 在 Practice.jsx 展示完整对话列表、提示与词汇

- 会话变更时自动加载结构化数据（dialogue/tips/vocabulary/referenceText）

- 提示词模板增加场景化与叙事推进约束

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "null"
  },
  "DB": "SQLite (wa-sqlite adapter)"
}

## Design

最小改动插入导入与 useEffect，新增下方展示区；提示词在质量约束中明确‘场景性’要求以生成更连贯的对话。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 读取接口设计

[X] 实现代码

[X] 页面集成示例

[X] 提示词优化
