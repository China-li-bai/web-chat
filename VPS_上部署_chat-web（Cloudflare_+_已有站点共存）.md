# VPS 上部署 chat-web（Cloudflare + 已有站点共存）

## Core Features

- Actions 部署与服务器脚本对齐

- WEBROOT 与 Nginx root 路径一致性

- 可选新增 HTTPS 切换或后端 PM2 CI job

- 推广文案（ENFP风格，强化语言学习/记忆科学）四套平台稿件

- 英语词汇学习流程示例文档 docs/learning-flow.md 已创建并追加透明说明

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  },
  "Server": "Ubuntu 22.04 + Nginx + GitHub Actions"
}

## Design

在学习流程文档结尾追加透明说明，明确已实现与迭代路线，降低读者期望并邀请参与共建。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 需求确认

[/] 资源与环境准备

[/] 前端构建与静态托管

[ ] 后端部署与常驻

[/] 反向代理与域名配置

[/] Cloudflare/SSL/安全配置

[/] CI/CD 自动部署

[X] 推广文案

[ ] 回归验证与监控
