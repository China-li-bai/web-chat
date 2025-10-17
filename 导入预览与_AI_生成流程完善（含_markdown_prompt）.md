# 导入预览与 AI 生成流程完善（含 markdown prompt）

## Core Features

- ai 模块提供 generateWordbookFile/handleAiGenerate 并页面调用

- 支持以 Markdown 模板编写 prompt（Prompts.get）

- 新增系统提示词模板 anthropic_thinking_protocol.md

- 默认启用：系统提示词 + 词书模板（wordbookAIService.generateWordbookViaAI）

- 失败回退至内置 buildPrompt

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

wordbookAIService 在 ViaAI 路径下默认组合 anthropic_thinking_protocol.md 与 wordbook-generate.md 为最终提示词；保留回退逻辑。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 接入 markdown prompt 能力并消除 TS 报错

[X] 新增系统提示词文件 anthropic_thinking_protocol.md

[X] 默认组合 system+wordbook 于 ViaAI 路径

[/] 回归验证预览与导入流程
