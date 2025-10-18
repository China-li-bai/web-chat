# AI生成词书改为目标驱动（简化表单+模板自动切换）

## Core Features

- 表单加入 goal 开关：Full vs Words only

- goal=true 时显示并强制填写 User Goal

- AI模块基于 options.goal 切换模板（goal-oriented vs wordbook-generate）

- 确保 goal/userGoal 传递到 generateWordbookViaAI

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

默认开启完整资料（goal:true），用户可切换仅生成词表；服务层据此选择合适模板。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 确认方案

[X] 修改WordbookSelectionPage表单

[X] 更新AI模块模板切换逻辑

[X] 修复参数传递（goal/userGoal）

[/] 回归验证生成→预览→导入链路
