# AI生成词书结构化输出（GLM JSON-only）

## Core Features

- llmService Zhipu 分支支持 response_format

- wordbook.ts 统一调用传入 responseFormat: { type: 'json_object' }

- 确保生成词书为纯 JSON，无额外文本

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

遵循 OpenAI v4 兼容参数 response_format，优先启用 JSON-only 结构化输出以稳定解析。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 确认参数方案

[X] 修改 llmService Zhipu 分支

[X] 修改 wordbook.ts 生成调用

[/] 回归验证（Full/Words-only 两模式）
