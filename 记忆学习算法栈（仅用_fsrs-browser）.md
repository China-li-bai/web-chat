# 记忆学习算法栈（仅用 fsrs-browser）

## Core Features

- FSRS 单栈，直接调用 fsrs-browser 原生API（已接入，失败自动回退）

- 难度自适应算法（基于认知负荷、个性化档案、历史表现）

- 统一类型接口，最小胶水代码

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": null
  },
  "algorithms": [
    "fsrs（唯一，直接API）",
    "难度自适应（认知负荷计算、个性化档案分析）"
  ],
  "types": "TypeScript 强类型",
  "tests": "vitest 单测（FSRS + 难度自适应）"
}

## Design

策略模式保留，FSRS + 难度自适应双算法栈；基于脑科学研究的认知负荷理论实现个性化学习。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 类型与工具函数

[X] FSRS算法以 fsrs-browser 直接集成并通过集成测试

[X] 难度自适应算法实现与测试

[/] 主动检索策略实现与测试
