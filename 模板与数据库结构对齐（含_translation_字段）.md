# 模板与数据库结构对齐（含 translation 字段）

## Core Features

- 对齐 Wordbook JSON 模板与 DB words 表字段

- 模板已包含 translation（中文释义）

- 维持 type/phonetic/example 等可选字段

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

wordbook-generate.md 与 goal-oriented-language-prompt.md 的 words 项目包含 translation 字段，满足 DB 插入与前端展示需要。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 接入 markdown prompt 能力

[X] 新增系统提示词与目标导向模板

[X] 模板结构与 DB 对齐
