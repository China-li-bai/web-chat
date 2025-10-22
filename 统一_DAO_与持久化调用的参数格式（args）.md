# 统一 DAO 与持久化调用的参数格式（args）

## Core Features

- 将 practice-dao.ts 全部 params 改为 args，统一与 db.exec 使用

- 确保刷新后 getLatestSession/getLatestTurn 可读取本地库

- appendMessage/insert/updates 与 saveGeneratedPractice 保持一致行为

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "null"
  },
  "DB": "SQLite (wa-sqlite adapter)"
}

## Design

统一参数传递层，避免 silent fail；保证 AI → saveGeneratedPractice → DAO 读取 的单一真源。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 定位问题

[X] 统一参数格式

[/] 验证与确认
