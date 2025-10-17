# 导入/编辑表单增加中文释义 translation 字段

## Core Features

- 定位导入预览与编辑表单位置

- 在表单与预览中新增 translation 字段展示与编辑

- 保证与 ImportWord.translation/DB.words.translation 数据打通

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

新增 ImportPreviewModal 使用 antd Table + Input 实现逐行编辑 translation；文件导入先预览后导入。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 定位具体实现文件

[X] 修改表单与预览组件以加入 translation

[/] 验证数据链路贯通（AI 生成/导入/保存）
