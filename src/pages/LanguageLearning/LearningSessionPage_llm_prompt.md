[LLM 实施 Prompt：LearningSessionPage 微会话 V1 增强]

目标
- 在 src/pages/LanguageLearning/LearningSessionPage.tsx 基于现有实现，增加“分段微会话 + 顶部状态条 + 底部操作条 + 多题型占位 + 快捷键/手势 + 统计口径统一（本段/本会话/今日）”，不改动服务层/接口签名。

约束
- 仅使用现有 Ant Design + 现有服务函数（createLearningSessionForWordbook/startSessionFromTodayPlan/processStudyResponse/schedulePlannedReviews）
- 不移除现有功能（生成 Next Review 词书、summary modal）
- 文件每处新增内容 <= 300 行；若超，拆分到 components/language-learning/session/ 下（占位组件也行）

实现步骤
1) 数据结构与状态
- 在 LearningSessionPage 中新增：
  - const [segmentSize, setSegmentSize] = useState(8)
  - const [segmentIndex, setSegmentIndex] = useState(0) // 第几段
  - const [segmentQueue, setSegmentQueue] = useState&lt;ScheduledItem[]&gt;([]) // 当前段切片
  - const [counters, setCounters] = useState({ daily: { new:0, review:0, done:0 }, byBook: {} as Record&lt;string, { new:number; review:number; done:number }&gt; })
  - const [mode, setMode] = useState(wordbookId === 'global' ? 'global' : 'wordbook')
  - const [ui, setUi] = useState({ showActionsBar: true, speakingEnabled: false, audioVolume: 1 })

- 当 session.items 可用时：
  - setActiveItems(session.items)
  - computeSegment(0)：从 activeItems 截取 [0, segmentSize) 赋给 segmentQueue；setCurrentItemIndex(0)

2) 顶部状态条（简化版）
- 在原顶部 Card 中补充：模式标签（Global/词书名）、段内进度（当前题/本段总题）、今日进度摘要（若 todayPlan 中有 dailyQuota/done 则显示）
- 将进度条的总长由 itemsSource.length 改为 segmentQueue.length（段内）

3) 底部操作条（移动拇指区）
- 将 Again/Hard/Good/Easy 按钮组移至页面底部固定区域（position: sticky/fixed），按钮高度≥44px，间距 8-12px，block 宽
- 桌面端保留当前显示位置作为冗余（或显示快捷键提示）

4) 题型占位（逐步替换）
- 在 Flashcard 上方或内部，根据 (currentItem.strategy?.type) 渲染占位组件：
  - Choice: 渲染 4/6 选项按钮组（格子布局，2x2 或 3x2）
  - Spelling: input[type="text"] 真输入框，关闭默认边框/阴影，按下 Enter 等于 “检查”
  - Listening: 大按钮播放音频（来自 details?.audioUrl 占位），输入框同 Spelling
  - Speaking: 先提供“开启口语（beta）”开关占位，不强制接入识别服务
- 现阶段仍以“显示答案 → 四档评分”为主；占位组件的“检查”按钮只需把判断归约到 good/hard/again

5) 快捷键与手势
- 快捷键：数字 1-4 对应 Again/Hard/Good/Easy；Enter 触发“Show Answer/Next”；R 重播音频（若 listening）
- 手势（移动端）：左滑 Again，右滑 Good；长按显示提示（占位即可）
- 用 useEffect 监听键盘事件；手势可用轻量 onTouchStart/onTouchEnd 计算位移

6) 分段逻辑与 Summary
- currentItemIndex 达到 segmentQueue.length - 1 后，进入 segment_end：
  - setShowSummary(true)
  - 在 Summary 中展示 segment 正确率/用时/掌握-生疏-遗忘统计（已有）
  - 新增“继续下一段”按钮：setSegmentIndex(seg+1)，computeSegment(seg+1) 从 activeItems 继续截取下一段
- 立即复习弱项：已有逻辑；保留

7) 统计口径统一
- 每次 handleResponse 成功后：
  - setCounters(prev =&gt; {
      const bookId = String(currentItem.item.wordbookId || wordbookId || 'unknown')
      const isNew = (currentItem as any).isNew === true // 若无则默认 false
      const inc = { new: isNew ? 1 : 0, review: isNew ? 0 : 1, done: 1 }
      return {
        daily: { new: prev.daily.new + inc.new, review: prev.daily.review + inc.review, done: prev.daily.done + 1 },
        byBook: { ...prev.byBook, [bookId]: {
          new: (prev.byBook[bookId]?.new || 0) + inc.new,
          review: (prev.byBook[bookId]?.review || 0) + inc.review,
          done: (prev.byBook[bookId]?.done || 0) + 1
        } }
      }
    })
- 在 Summary Modal 中，展示本段/本会话（sessionStats）/今日（counters.daily）三个口径的简表

8) 策略可见与微调（轻量）
- 在 Summary Modal 中根据本段正确率决定下一段 new:review 比例提示（UI 提示，不改变服务层）：
  - acc &lt; 80%：提示“下一段减少新词、优先复习”
  - acc &gt; 90%：提示“下一段适度增加新词（最多 +1）”
- 将提示的比例存在本地 state，以便顶部状态条展示

9) 可达性与国际化
- 所有按钮/输入添加 aria-label
- 键盘 Tab 顺序合理；Esc 关闭 Modal

10) 不修改：
- processStudyResponse/evaluateRewardsOnEvent/importWordbook/schedulePlannedReviews 的调用与参数
- existing summary 统计与弱项微复习流程保留

交付物
- 更新 LearningSessionPage.tsx，新增状态与 UI 区块；若超 300 行，将新增：
  - src/components/language-learning/session/SessionTopBar.tsx（可选）
  - src/components/language-learning/session/SessionActionsBar.tsx（可选）
  - src/components/language-learning/session/SessionChoice.tsx / SessionSpelling.tsx / SessionListening.tsx（占位）


path: src/pages/LanguageLearning/LearningSessionPage.tsx
task: 在不改变现有服务层函数签名的前提下，实现“微会话 V1 增强”：分段学习、顶部状态条增强、底部拇指区操作条、题型占位（选择/拼写/听写）、键盘与手势、统计口径统一（本段/本会话/今日）。保留现有 Summary Modal 与“弱项微复习/安排下次复习/自动生成 Next Review 词书”逻辑。

constraints:
- 使用 Ant Design，保留现有 UI 风格与服务调用（createLearningSessionForWordbook/startSessionFromTodayPlan/processStudyResponse/schedulePlannedReviews/importWordbook/evaluateRewardsOnEvent）。
- 文件若超过 300 行，请仅将“题型占位组件”抽到 src/components/language-learning/session/ 目录，其他逻辑留在当前文件。
- 不引入新的全局状态库；counters 维护在本组件内。
- 不使用 try-catch（统一使用 console.error，沿用现状约定）。

steps:
1) 新增状态（在现有 useState 之后）
- segmentSize: number = 8
- segmentIndex: number = 0
- segmentQueue: ScheduledItem[] = []
- counters: { daily: { new: number; review: number; done: number }, byBook: Record&lt;string, { new: number; review: number; done: number }&gt; }（初始 0）
- nextSegmentPolicy: { newReviewRatioHint: string; overdueHint?: string } | null
- ui: { speakingEnabled: boolean; audioVolume: number; showActionsBar: boolean } 初始 { false, 1, true }

2) 段切片计算函数
- computeSegment(segIndex): 从 activeItems 取 [segIndex * segmentSize, (segIndex+1)*segmentSize) 赋值给 segmentQueue；如果为空且还有剩余，进入“全部完成”既有流程。
- 在 session/items 更新后，初始化 computeSegment(0)，并 setCurrentItemIndex(0)；渲染时 currentItem 与 itemsSource 改为 segmentQueue。

3) 顶部状态条增强
- 在现有 Card 中，增加“模式标签”（global / wordbookId）、“段内进度”（currentItemIndex + 1 / segmentQueue.length）。
- 原 Progress 的总量改用 segmentQueue.length；在统计区追加“今日 Done”（来自 counters.daily.done）。
- 保留 Accuracy/Time/Progress；注意 Accuracy 计算口径取“本段与本会话分开显示”中的“本会话”口径（保持现状），段内准确率用于段末策略提示。

4) 底部操作条（拇指区）
- 将 Again/Hard/Good/Easy 四按钮移动到页面底部固定容器（position: sticky / fixed），在移动端保持全宽 block 和≥44px 触达。
- 桌面端保留原区域的按钮显示为冗余或替换为快捷键提示（具体看空间）；若重复显示，确保事件绑定不重复触发（通过统一回调）。

5) 题型占位（Choice/Spelling/Listening）
- 依据 (currentItem as any)?.strategy?.type 渲染占位：
  - choice: 渲染 4/6 选按钮（传入候选词，若无真实候选，用同书近义/随机占位；选择后进入“检查”，内部映射为 good/hard/again）
  - spelling: 使用 input[type=text]，Enter 提交；轻量 Levenshtein 容错（允许 1 个字符差距即 hard，否则 again；全对为 good）
  - listening: 显示大播放按钮（details?.audioUrl 若无则禁用），R 重播；输入框同 spelling
- 口语 speaking 仅在 ui.speakingEnabled==true 时显示入口，否则隐藏（保留地位但不实现评分）

6) 快捷键与手势
- useEffect 绑定 keydown：
  - 1/2/3/4 → again/hard/good/easy
  - Enter → 若未翻转则 handleFlip，否则进入“下一题/检查”
  - R → 若 listening 题型则重播
- 手势：在卡片区域绑定 onTouchStart/onTouchEnd，左右滑阈值 48px；左滑 → again，右滑 → good；长按 350ms → 显示提示（仅 UI 提醒，可不改业务）

7) 统计口径统一与更新
- 在 handleResponse 成功分支中，统一 setCounters：
  - bookId = String(currentItem.item.wordbookId || wordbookId)
  - isNew = Boolean((currentItem as any).isNew)（无则默认 false）
  - daily 与 byBook 计数各自 +1；new/review 分别加总
- 段末（即 currentItemIndex 到达 segmentQueue.length - 1）：
  - 计算本段准确率 segAcc = segCorrect/segmentQueue.length
  - 依据 segAcc 生成 nextSegmentPolicy.newReviewRatioHint：
    - segAcc &lt; 80% → “下一段减少新词，优先复习”
    - segAcc &gt; 90% → “下一段适度增加新词”
