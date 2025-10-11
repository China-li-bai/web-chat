# Review Planner（按FSRS nextReview安排复习）

## Core Features

- 分组与候选区统一由 FSRS 队列驱动

- 排序开关：按到期时间 / 可提取性

- 批量大小选择器：控制每次会话的词数

- 移动端字母筛选可横滑或降级为下拉

- 按钮文案动态显示预计批量

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

极简、清晰、可控：先定策略（词书/字母/排序/批量），后无摩擦开始；桌面表格、移动卡片一致数据源。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 服务层API：getReviewQueueGroupedByWordbook / getDueItems

[X] 扩展 createLearningSessionForWordbook 支持 includeUpcoming 与 startsWith

[X] 页面骨架与路由 /review-planner

[X] 联动开始复习（跳转 /learning-session/:id）

[X] 分页/懒加载/空态/错误提示

[X] 新增首字母筛选条与服务参数 startsWith

[/] 接入真实数据源（填充分组与候选）

[X] 补充词书名 wordbookName（联表或缓存）

[X] 数据来源与逻辑说明

[/] 排序开关与移动端响应式优化

[ ] 批量大小选择器（sessionSize）

[ ] 主按钮文案动态显示预计批量

[ ] 移动端字母筛选降级为 Select（可选）
