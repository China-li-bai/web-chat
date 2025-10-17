# AI 生成词书模块化重构

## Core Features

- 将 handleAiGenerate 抽离到 ai 模块

- 统一 Provider 选择与 BaseURL 默认策略（provider.ts）

- 标准化返回结构与类型定义（types.ts）

- 页面层与模块层职责分离（UI 与逻辑解耦）

- 修复类型导入错误（WordbookWithStats 从 types 导入）

- 封装通用模型调用到 src/modules/ai/llm.ts 统一入口

- 新增 src/modules/ai/index.ts 统一导出入口

- AI 生成接口结构化输出并校验为 ImportFile（ensureImportFileSchema）

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

handleAiGenerate 返回 { ok, name, file?: ImportFile, importResult?: any }，保证生成与导入数据结构与项目一致。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 代码审查：定位 handleAiGenerate 全实现与依赖

[X] 创建 ai 模块骨架（wordbook.ts/types.ts/provider.ts）

[X] 迁移逻辑与封装返回类型

[X] 页面改造为调用模块函数

[X] 类型完善与快速测试

[X] 梳理并迁移其他 AI 能力（如 llmService）到 ai 模块

[X] 新增统一导出入口 index.ts

[X] 结构化输出与 ImportFile 校验
