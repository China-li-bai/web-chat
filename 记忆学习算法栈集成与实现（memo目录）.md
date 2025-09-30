# 记忆学习算法栈集成与实现（memo目录）

## Core Features

- 间隔重复算法（SM-2、FSRS）可插拔

- 记忆强度计算（稳定性、可检索性、难度）

- 难度自适应（基于历史表现与认知负荷）

- 主动检索策略（提示生成、检索时机优化）

- 外部库适配层（fsrs-browser、@open-spaced-repetition/sm-2）与降级控制

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": null
  },
  "algorithms": [
    "SM-2（自研实现，保留为fallback）",
    "FSRS（自研简化实现已通过，计划接入fsrs-browser via adapter）"
  ],
  "types": "TypeScript 强类型接口统一（items、records、strength、profile）",
  "tests": "vitest 单测 + 集成测试（适配层与降级路径）"
}

## Design

策略模式统一接口 + 适配层屏蔽第三方API差异；保留自研实现为稳定回退，逐步切换默认到外部库。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 类型与工具函数

[X] SM-2算法实现与测试通过

[X] FSRS算法（SimpleFSRS→FSRSAlgorithm）实现与测试通过

[ ] 适配层（fsrs-browser / sm-2）设计与集成测试

[/] 难度自适应算法实现与测试

[ ] 主动检索策略实现与测试
