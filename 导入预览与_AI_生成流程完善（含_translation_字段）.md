# 导入预览与 AI 生成流程完善（含 translation 字段）

## Core Features

- src/data 三个 JSON 所有词条补全准确中文释义 translation

- ai 模块新增 generateWordbookFile（仅生成 ImportFile，不落库）

- 新增导入预览 Modal（可编辑中文释义 translation）

- 页面改造：AI 生成与本地导入均先预览再导入

- 卡片组件支持展示中文释义 translation（可选）

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

在 Flashcard 与 LearningFlashcard 背面区域追加可选的中文释义展示，向后兼容不破坏现有调用。

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

[/] 回归验证预览与导入流程
