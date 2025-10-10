# 学习页接入算法栈可观测（FSRS/认知负荷/主动检索）

## Core Features

- 总结弹窗显示预计保持率（estimatedRetention）

- 总结弹窗显示实际认知负荷（cognitiveLoad）

- 进度旁显示当前检索策略标签（Strategy）

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

以最小改动在现有 Header 与总结弹窗插入指标展示，避免打断学习流程。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 指标采集与状态管理

[X] Header 策略标签展示

[X] 总结弹窗指标展示
