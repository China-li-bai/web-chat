# 修复 AI 生成内容的数据流并持久化

## Core Features

- saveGeneratedPractice 返回 turnId，页面可追踪轮次

- Practice.jsx 在 onSuccess 中对未持久化的 JSON 进行立即落库

- 角色统一与 meta 保留确保与 DB 设计一致

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "null"
  },
  "DB": "SQLite (wa-sqlite adapter)"
}

## Design

保证 AI → 持久化 → 读取 展示的单一数据源流转；页面不直接依赖临时内存数据，避免 sessionId 为空导致读取失败。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 问题定位与策略

[X] 持久化返回 turnId

[X] 页面 onSuccess 持久化与状态更新
