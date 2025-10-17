# 数据库与类型：增加中文释义字段 translation

## Core Features

- words 表新增 translation 字段

- 迁移流程支持 translation（ALTER TABLE 与重建迁移）

- ImportWord 类型增加 translation

- ensureImportFileSchema 支持解析 translation

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

统一使用 translation 作为中文释义字段名，DB/类型/导入校验一致，AI 生成链路可携带 translation。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 定位 DB 与类型文件

[X] 修改 DB schema 与迁移脚本

[X] 修改类型与校验

[ ] 确认页面是否展示 translation 字段
