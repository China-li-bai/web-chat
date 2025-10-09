# 学习总结自动生成复习词书 + 全局最近词书ID

## Core Features

- 弹窗出现自动筛选弱项并创建复习词书

- 全局 store 写入 lastWordbookId

- 统计页跳转使用 /learning-session/:id

## Tech Stack

{
  "Web": {
    "arch": "react",
    "component": "antd"
  }
}

## Design

后台自动执行，不阻塞弹窗 UI；失败仅提示 message.error，不影响用户操作。

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 弹窗自动生成复习词书并写入 lastWordbookId

[X] 统计页使用 lastWordbookId 跳转 /learning-session/:id

[X] 保留手动“安排下次复习”入口
