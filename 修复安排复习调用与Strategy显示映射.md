# 修复安排复习调用与Strategy显示映射

## Core Features

- 新增 schedulePlannedReviews(userId, wordbookId, planned[]) 服务用于更新 nextReview

- LearningSessionPage 改为调用 schedulePlannedReviews，修复 6 参数编译错误

- Strategy 中文映射显示（识别/提示回忆/自由回忆/精细回忆 + 难度）

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "shadcn"
  }
}

## Design

最小改动：新增一个服务函数并替换页面一处调用，不改动现有逻辑流。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 新增安排复习服务

[X] 替换页面调用并清除编译错误

[X] Strategy 显示映射
