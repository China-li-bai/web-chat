# Review Planner（按FSRS nextReview安排复习）

## Core Features

- 独立页面 /review-planner，按词书分组的到期/即将到期概览

- 严格以 FSRS 计算的 nextReview 驱动复习筛选

- 一键开始到期复习（可勾选包含24h内即将到期）

- 支持上千词的分页与懒加载

- 首字母筛选（A-Z/#）在选择词书后过滤候选集合，不改变 FSRS 调度

- 补充词书名 wordbookName（联表失败时自动降级）

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

最小改动：分组统计后额外查询 wordbooks 获取名称并映射；无名称时返回空字符串。

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
