# Practice 顶层残留生成逻辑清理

## Core Features

- 删除顶层 await 残留代码块（const topicKey...至 Modal.success）

- 确保仅通过 AiGenerateModal 触发生成与入库

- 修复构建期 Babel 报错（Unexpected reserved word 'await'）

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  },
  "ClientDB": "wa-sqlite BasicDatabase"
}

## Design

剔除不在函数作用域内的异步逻辑，避免顶层 await 引发编译错误，保持单一入口（弹窗）的一致性。

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

[/] 回归与数据一致性检查
