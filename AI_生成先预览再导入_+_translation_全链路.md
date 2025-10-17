# AI 生成先预览再导入 + translation 全链路

## Core Features

- ai.handleAiGenerate 仅生成 ImportFile，不直接导入

- 页面接入 ImportPreviewModal 复用：AI 生成后也先预览再导入

- wordbookService 插入 translation 字段并修正查询包含 userId

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

Preview-then-Import 流程统一：文件导入与 AI 生成均进入 ImportPreviewModal，确认后覆盖检查与入库；DB/类型/生成全包含 translation。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 定位具体实现文件

[X] 修改表单与预览组件以加入 translation

[X] 验证数据链路贯通（AI 生成/导入/保存）
