# 记忆学习算法栈（直接集成第三方API）

## Core Features

- 直接使用 fsrs-browser 与 @open-spaced-repetition/sm-2 原生API

- 统一类型接口（不增加适配层），最小胶水代码

- 保留自研SM-2/FSRS为稳定回退

- 记忆强度/保持率/难度指标计算与展示

- 后续难度自适应与主动检索策略实现

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": null
  },
  "algorithms": [
    "fsrs-browser（默认）",
    "@open-spaced-repetition/sm-2（默认SM-2）",
    "自研算法仅作为fallback"
  ],
  "types": "TypeScript 强类型（items、records、strength、profile）",
  "tests": "vitest 单测 + 集成测试（直接API调用与降级路径）"
}

## Design

策略模式保留；在策略实现内直接调用第三方库API；删除适配层；确保错误时降级到自研实现。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 类型与工具函数

[X] SM-2算法实现与测试通过

[/] FSRS算法以 fsrs-browser 直接集成并通过集成测试

[ ] 难度自适应算法实现与测试

[ ] 主动检索策略实现与测试
