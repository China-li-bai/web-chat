# 导入预览与 AI 生成流程完善（含 markdown prompt 与目标导向模板）

## Core Features

- ai 模块提供 generateWordbookFile/handleAiGenerate 并页面调用

- 支持以 Markdown 模板编写 prompt（Prompts.get）

- 新增系统提示词模板 anthropic_thinking_protocol.md

- 新增目标导向模板 goal-oriented-language-prompt.md（对话→词汇→题目→词书）

- 可与系统提示词组合，应用于语言学习目标

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

通过 Prompts.get('goal-oriented-language-prompt', vars) 生成目标导向提示词；可组合 anthropic_thinking_protocol + 目标模板作为最终 prompt。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 接入 markdown prompt 能力

[X] 新增系统提示词与目标导向模板

[ ] 是否默认接入到 free-priority 路径与 ViaAI 路径
