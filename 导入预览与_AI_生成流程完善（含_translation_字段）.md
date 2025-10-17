# 导入预览与 AI 生成流程完善（含 translation 字段）

## Core Features

- src/data 三个 JSON 所有词条补全准确中文释义 translation

- ai 模块新增 generateWordbookFile（仅生成 ImportFile，不落库）

- 新增导入预览 Modal（可编辑中文释义 translation）

- 页面改造：AI 生成与本地导入均先预览再导入

- 卡片组件支持展示中文释义 translation（可选）

- 学习会话页面为卡片传入 translation 字段

- 学习会话装配透传 translation（DB→session.details）

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

DB words 表含 translation；learningService 在 SELECT 中取出 w.translation，并在 details 映射中透传 translation；LearningSessionPage 将 details.translation 传给卡片组件展示。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 更新数据文件 translation 字段

[X] 新增 ai 生成文件方法（不落库）

[X] 新增导入预览 Modal 组件

[X] 改造页面串联预览流程

[X] 卡片组件支持 translation 展示

[X] 学习会话卡片传入 translation

[X] 学习会话装配透传 translation

[/] 回归验证预览与导入流程

[X] 修正 translation 传值空串导致不显示
