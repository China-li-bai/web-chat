# Strategy 文案修复与类型宽松兼容

## Core Features

- 将底层策略标识映射为人类可读文案，修复一直显示 cued_recall 的问题

- 对 MemoryLearningManager 内部 config 使用宽松类型合并，消除 fsrsParams 类型冲突编译错误

## Tech Stack

{
  "Web": {
    "arch": "react",
   
  }
}

## Design

最小改动：仅在展示层添加策略映射，不更改算法逻辑；在管理器内部放宽类型避免外部类型别名冲突。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 策略文案映射

[X] 类型冲突修复
