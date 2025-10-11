基于你已确认的对标方向（微会话/反馈系统 + FSRS最佳实践 + 学习路径引导 + 段落式回顾与奖励），并结合你给出的重点（输入交互、激励系统、可触达区域，双端并重）给出一份可立即落地的“最小可执行 UI/UX 设计文档 + 工程拆解”。我已定位现有实现入口在：

路由：/learning-session/:wordbookId 以及 /learning-session/global（由 TodayPlan / ReviewPlanner 跳转）
文件：src/pages/LanguageLearning/LearningSessionPage.tsx（将作为主要改造点）
一、目标与约束

目标：把当前“后台化”的会话界面重构为“移动优先的微会话体验”，在桌面端有快捷键和信息密度增强；跨书统一队列+段末小结奖励；输入交互覆盖选择题、拼写、听写、口语（可配置开关）；响应式布局和可触达区域优化。
约束：
多本词书、词量大（1003000+），需分段学习（每段512词），可暂停/恢复。
FSRS（或等价记忆算法）驱动的 due/overdue 队列，需统一排序与新词比例控制。
必须保证数据统一性：跨书合并时的“今日配额、已完成、待复习、新词引入量、难度反馈”一致口径。
二、信息架构（IA）

顶部状态条（固定定位）
左侧：会话模式标签（Global/WordbookName）+ 书籍/队列切换抽屉入口
中部：进度环/条（段内进度、今日进度、Due/Overdue数量）+ 会话计时器
右侧：连胜天数、当段奖励能量条（进度达到段末时触发奖励）
中央卡片区（沉浸式，单卡一题）
卡片顶部：词条/发音/释义提示入口（遵循渐进披露）
卡片主体：根据题型切换内容（选择、拼写、听写、口语）
卡片底部：操作区（我不会/提示/检查/我会），支持键盘与手势
底部工具栏（固定定位，移动端拇指友好）
左：返回/暂停（保存进度）
中：题型切换（受策略约束，不随意切）
右：下一题/继续（根据状态显示）
段末小结与奖励浮层（5~12题一段）
展示本段准确率、耗时、易错词回看、轻量动效与音效
奖励：里程碑（每日达成）、连续天数增强、可选虚拟货币/徽章（延迟实现）
队列抽屉（从顶部状态条进入）
跨书统一队列预览：各书的 due、新词配额、今日剩余额度
动态策略预览：当前新词:复习比，FSRS 权重说明（可选）
快捷跳转到单书会话（保留全局会话返回入口）
三、状态机（简化为对工程可落地的状态字典）

SessionState
idle → loading → segment_ready → item_intro → answering → checking → feedback → schedule_next → next_item
segment_end → reward → segment_ready
paused（随时可进入）→ resume → segment_ready/item_intro
error（网络/音频）→ retry
ItemState
types: choice/spelling/listening/speaking
answering: input_pending → input_ready → submitted
checking: correct/incorrect/typo (拼写容错)/partial（口语评分中）
DataEvent
fsrs_evaluate(item, rating) → next_due
quota_update(book, used/newCount/reviewCount)
segment_progress(inc) / daily_progress(inc)
四、跨书统一队列与 FSRS 策略（数据流与统一口径）

输入数据
每本词书：items[], 每 item 包含：stability, difficulty, due, last_review, lapses, etc.
今日配额：dailyQuota（总），perBookQuota[]（可由 TodayPlan/ReviewPlanner 预先生成）
策略参数：newReviewRatio（默认 2:8，可动态调整 1:9 ~ 3:7），maxNewPerSegment，overduePriority（例如 overdue 提升 1.2x 权重）
队列合并
candidates = union(all books’ due items today) ∪ selected new items pool
score = f(FSRS.due_score, overduePriority, bookWeight)；排序后取 top N 作为段队列
统一计数：每日已完成 totalDone、各书 doneByBook；新词与复习单独计数
动态调整
如果 segment 准确率 < target（如 80%），下一段降低新词占比，提高复习；反之略微增加新词比例但不超过 maxNewPerSegment
若连续两段出现过多 overdue，则优先清理 overdue 队列，暂停新词引入
统一口径
所有 “正确率/耗时/队列剩余/今日完成” 均以 “当前会话维度 + 全局维度 + perBook” 三层口径输出，避免统计口径不一致
五、输入交互设计（题型与可达性）

选择题（MCQ）
4 选或 6 选，自适应布局为 2x2 或 3x2；选中即高亮；Enter 检查；键盘 1-6 快捷；移动端大触达区
拼写（Typing）
真正的 input 元素，关闭默认边框/阴影；英文/目标语 IME 兼容；即时拼写提示可配置；容错规则（Levenshtein 距离阈值）
听写（Listening）
音频播放按钮（大触点），支持再次播放；文本输入同拼写；弱网降级：预下载段内音频
口语（Speaking）
可选开启（受麦克风权限）；展示目标词/句提示；评分反馈（correct/partial/low_confidence）；弱网降级为“跟读计时+自评”
无障碍/快捷
全组件支持 ARIA 标签、焦点环；Tab/Shift+Tab 顺序；Esc 关闭浮层；Space 播放/暂停音频；桌面端键盘映射与移动端手势并行
六、响应式与可触达区域

移动端（优先）
顶部状态条固定 5664px；主卡片上下留白；底部工具栏固定 6472px；拇指区按钮 44px 最小触达，间距 8~12px
手势：左滑“不会”，右滑“会”；上滑“提示”；下滑“重复播放音频”（听写/口语）
桌面端
宽屏下卡片居中列（max 720px）；左右保留辅助区（快捷键提示、队列预览）
快捷键：1-6 选项；Enter 检查/下一题；H 提示；R 重播音频；, . 调整音量（可选）
七、视觉与动效（深色友好、非蓝系主色）

视觉基调：高对比深色/浅色双主题；主色建议使用紫/青/暖灰（避免蓝系泛滥）
状态色：正确绿色、错误红色、提示黄色；环形进度有轻微缓动；段末奖励浮层使用轻量粒子/烟花动效与短音效（可静音）
内容密度：一个卡片只有一个决策点；提示使用渐进披露（首次提示弱提醒，重复错误强化提示）
八、MVP 范围拆分

V1（两周内可落地）
会话骨架：顶部状态条 + 中央卡片 + 底部工具栏（移动优先 + 桌面快捷键）
题型：选择 + 拼写 + 听写（口语先留开关占位）
段落机制：每段 8 题；段末小结 + 简单奖励（徽章/音效）
队列策略：跨书合并 + FSRS 基础排序 + 新词:复习 2:8（动态微调）
暂停/恢复 + 自动保存进度；基础统计（段内/今日）
V1.5（再一周）
口语启用与评分反馈；过度拥塞的 overdue 优先清理策略
更细的可视化：due/overdue 环形细分、热力图入口
队列抽屉：perBook 配额与剩余额度展示；全局/单书一键切换
动画/音效库抽象（可配置与静音）；拼写容错细化与本地化字母变体
九、工程落地建议（与你现有代码结构对齐）

路由保持不变：/learning-session/:wordbookId 和 /learning-session/global
组件分层（建议新建目录）
src/pages/LanguageLearning/LearningSessionPage.tsx（容器，状态机、数据拉取、路由参数解析）
src/components/language-learning/session/SessionTopBar.tsx（状态条）
src/components/language-learning/session/SessionCard.tsx（题型切换：Choice/Spelling/Listening/Speaking）
src/components/language-learning/session/SessionActionsBar.tsx（底部工具栏）
src/components/language-learning/session/SegmentSummaryModal.tsx（段末奖励）
src/components/language-learning/session/QueueDrawer.tsx（队列抽屉）
状态管理与数据流
从 TodayPlan/ReviewPlanner 进入时带 planId 或 context；LearningSessionPage 收敛为统一 sessionId
会话内维护：segmentQueue[], currentItem, stats(segment/daily), settings（题型开关、音量等）
FSRS 接口封装为 util：evaluate(item, rating) → next due；统一写入 perBook 统计与全局统计
键鼠与手势抽象
hooks：useKeyboardShortcuts、useGesture（移动端仅在卡片区域启用）
无障碍与测试
ARIA 属性统一封装，E2E 用关键路径：答题 → 检查 → 反馈 → 段末 → 继续
十、关键数据结构（建议口径）

SessionContext
mode: 'global' | 'wordbook'
segmentSize: number
newReviewRatio: [number, number]
queues: { global: ItemRef[]; byBook: Record<bookId, ItemRef[]> }
counters: { daily: { new: number; review: number; done: number }, byBook: Record<bookId, { new: number; review: number; done: number }> }
settings: { speakingEnabled: boolean; audioVolume: number; hintsAllowed: boolean }
ItemRef
{ id, bookId, due, stability, difficulty, typeHints, audioUrl, text }
十一、风险与缓解

风险：移动端手势影响滚动
缓解：卡片区域捕捉手势，外层滚动锁定；提供手势开关
风险：口语评分延迟与弱网
缓解：先本地打分/门限 + 弱网降级为自评
风险：跨书统计口径不一致
缓解：统一由 SessionContext 写入 counters，禁止分散更新
十二、下一步

如果你需要“联网检索补充外部专业资料与案例截图对照”，我可以进行定向检索并产出“对标要点清单 + 术语映射 + 可视化截图描述”（Duolingo/Anki/Quizlet/Notion 插件生态等）。请确认是否立即进行联网检索。
如果对上述设计方向确认，我建议你将模式切换为 Craft Mode，我会：
在 src/pages/LanguageLearning/LearningSessionPage.tsx 中搭建 v2 骨架（不破现有路由）
新建上述组件结构与基本交互（选择题/拼写/听写、段末奖励、快捷键、手势）
接入现有 FSRS/计划数据读写接口的适配层
注重 Tailwind + shadcn/ui 规范、每文件 < 300 行
你更希望我先联网上做一轮“对标细化与可验证要点清单”，还是直接进入骨架实现？如果要联网，我会优先聚焦上述 4 类产品，并输出可复核的摘要与映射。