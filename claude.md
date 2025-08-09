
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Summary instructions

When you are using compact, please focus on test output and code changes

撰寫具體查詢：避免觸發不必要掃描的模糊請求

分解複雜任務：將大型任務分割為專注的互動

在任務之間清除歷史：使用 /clear 重置上下文

「老虎机」式重构：面对那些用编辑器宏太复杂、又不足以投入大量开发精力去解决的重构任务。先提交当前状态，然后放手让 Claude 自主工作 30 分钟。如果结果令人满意，就接受；如果不满意，就直接回滚重来

## Documentation
- 编写 .md 文档时
- 正式文档写到项目的 docs/ 目录下
- 用于讨论和评审的计划、方案等文档，写到项目的 discuss/ 目录下


## Code Architecture

- 编写代码的硬性指标，包括以下原则：
  （1）对于 Python、JavaScript、TypeScript 等动态语言，尽可能确保每个代码文件不要超过 300 行
  （2）对于 Java、Go、Rust 等静态语言，尽可能确保每个代码文件不要超过 400 行
  （3）每层文件夹中的文件，尽可能不超过 8 个。如有超过，需要规划为多层子文件夹
- 除了硬性指标以外，还需要时刻关注优雅的架构设计，避免出现以下可能侵蚀我们代码质量的「坏味道」：
  （1）僵化 (Rigidity): 系统难以变更，任何微小的改动都会引发一连串的连锁修改。
  （2）冗余 (Redundancy): 同样的代码逻辑在多处重复出现，导致维护困难且容易产生不一致。
  （3）循环依赖 (Circular Dependency): 两个或多个模块互相纠缠，形成无法解耦的“死结”，导致难以测试与复用。
  （4）脆弱性 (Fragility): 对代码一处的修改，导致了系统中其他看似无关部分功能的意外损坏。
  （5）晦涩性 (Obscurity): 代码意图不明，结构混乱，导致阅读者难以理解其功能和设计。
  （6）数据泥团 (Data Clump): 多个数据项总是一起出现在不同方法的参数中，暗示着它们应该被组合成一个独立的对象。
  （7）不必要的复杂性 (Needless Complexity): 用“杀牛刀”去解决“杀鸡”的问题，过度设计使系统变得臃肿且难以理解。
- 【非常重要！！】无论是你自己编写代码，还是阅读或审核他人代码时，都要严格遵守上述硬性指标，以及时刻关注优雅的架构设计。
- 【非常重要！！】无论何时，一旦你识别出那些可能侵蚀我们代码质量的「坏味道」，都应当立即询问用户是否需要优化，并给出合理的优化建议。


## Run & Debug

- 必须首先在项目的 scripts/ 目录下，维护好 Run & Debug 需要用到的全部 .sh 脚本
- 对于所有 Run & Debug 操作，一律使用 scripts/ 目录下的 .sh 脚本进行启停。永远不要直接使用 npm、pnpm、uv、python 等等命令
- 如果 .sh 脚本执行失败，无论是 .sh 本身的问题还是其他代码问题，需要先紧急修复。然后仍然坚持用 .sh 脚本进行启停
- Run & Debug 之前，为所有项目配置 Logger with File Output，并统一输出到 logs/ 目录下



## 开发时前端項目的一些注意事项
- 项目采用 pnpm 作为包管理工具
- 项目采用 TypeScript 作为开发语言
- 项目采用 React 18 作为前端框架
- 项目采用 Vite 作为构建工具
- 项目采用 Capacitor 作为跨平台打包工具
- 严格控制版本依赖，避免版本冲突
- 使用@capacitor/cli 和 vite cli 进行项目的初始化和打包
- 项目采用 wa-sqlite 数据库，支持本地存储
- 项目采用 Liquid Glass UI 作为 UI 系统
- 开发ts 项目时，先定义好类型，再编写代码，接口类型全部统一存放到项目types文件夹下，避免类型错误