# 修复导入预览与 AI 生成流程中的字符串模板兼容性

## Core Features

- 将 Modal.confirm 的模板字符串改为普通字符串拼接以避免 Babel 解析问题

- 保持导入预览与 AI 生成先预览再导入流程不变

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

仅对存在问题的 content 字段改为字符串拼接，其他逻辑与提示不变。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 定位报错位置并修复

[/] 回归验证预览与导入流程
