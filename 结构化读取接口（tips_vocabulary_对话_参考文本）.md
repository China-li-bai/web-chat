# 结构化读取接口（tips/vocabulary/对话/参考文本）

## Core Features

- getTips(sessionId): string[]

- getVocabulary(sessionId): {word,gloss}[]，支持 meta.items 与文本解析回退

- getReferenceText(sessionId): string | null

- getDialogue(sessionId): 标准化消息数组

## Tech Stack

{
  "Web": {
    "arch": "node",
    "component": "null"
  },
  "DB": "SQLite (wa-sqlite adapter)"
}

## Design

统一在 practice-query.ts 内提供读取接口，解析 meta JSON 并对文本格式做容错，保证前端/业务层可直接消费结构化数据。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 读取接口设计

[X] 实现代码

[ ] 示例与测试用法
