# 导入预览与 AI 生成流程完善（含 translation 字段）

## Core Features

- src/data 三个 JSON 词条包含 translation

- ai 模块提供 generateWordbookFile/handleAiGenerate 并页面调用

- free-priority 链路与显式 Provider 统一入口

- 导入前预览 Modal 支持编辑并二次确认

- learningService 透传 translation（DB→session.details）

- 卡片组件可显示中文释义 translation（可选）

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

页面在 AI 生成时仅调用 modules/ai 暴露的函数；ai/wordbook.ts 负责 Provider 选择与 ImportFile 生成；入库统一走 wordbookService。

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

[X] 修复 ai/wordbook.ts 函数结构错误

[/] 回归验证预览与导入流程
