# Node.js 抓取与解析微信文章内容

## Core Features

- 从 Atom Feed entries 获取文章链接并抓取 HTML

- 使用 cheerio 解析标题、作者、正文、图片等要素

- 加入 UA/Referer、失败重试与速率限制

- 结果缓存（内存/文件/数据库）与简单去重

- 标准化文章数据结构并暴露模块化接口

## Tech Stack

{
  "Web": {
    "arch": "node",
    "component": "null"
  },
  "Crawler": "axios + cheerio + p-limit",
  "Cache": "内存 LRU 或文件级缓存"
}

## Design

以模块方式实现 fetchArticle(url) 与 parseArticle(html)，统一返回 Article DTO（title、author、content、images、link、updated）。在抓取层加入 headers、重试与限速；在解析层集中管理选择器。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 调研选择器与反爬对策

[/] 原型抓取与解析（单链接）

[ ] 封装模块与错误处理

[ ] 批量抓取与缓存

[ ] 接口/脚本演示与监控
