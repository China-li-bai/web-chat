# ReviewPlannerPage 復習頁面的數據來源是從哪裏來的，具體邏輯是怎麽用的？
数据来源与用法简述（最小且直接）：

数据表与字段

words：词条基础信息（id、word、type、wordbookId、userId…）
learning_progress：FSRS 写回的记忆强度（stability、retrievability、difficulty、nextReview、lastReview、state…）
study_logs：学习日志（用于创建会话时给算法上下文）
wordbooks：词书名称（可选联表，缺失时返回空名）
服务函数与筛选逻辑

getReviewQueueGroupedByWordbook(userId, timeWindowHours, page, pageSize)
分组聚合：按 wordbookId 统计
到期：lp.nextReview ≤ now
即将到期：now < lp.nextReview ≤ now + timeWindowHours（例如 24h）
补充词书名：若存在 wordbooks 表则额外查询映射；否则返回空字符串
getDueItems(userId, wordbookId, includeUpcoming, startsWith, page, pageSize)
时间边界：includeUpcoming=false 用 now；true 用 now+24h
首字母筛选：A-Z 使用 SQL LIKE；“#”在内存中过滤非字母开头
返回候选词条列表（id、word、nextReview、retrievability），分页
createLearningSessionForWordbookExtended(userId, wordbookId, includeUpcoming, startsWith)
与 getDueItems 同样的筛选，构建 LearningItem + 读取 study_logs
初始化 MemoryLearningManager 并 createLearningSession
会话中继续使用 FSRS（processStudyResponse 后把 updatedMemoryStrength.nextReview 写回 DB）
页面状态与交互（src/pages/ReviewPlanner/review-planner-page.tsx）

includeUpcoming 开关 → 触发分组与候选列表重新拉取
A-Z/# Segmented → 设置 startsWith 并刷新候选列表
分组表选择“查看” → 设 activeWordbookId、分页重置
“开始复习” → 调用 createLearningSessionForWordbookExtended 后 navigate(/learning-session/${activeWordbookId})
这些逻辑确保复习严格由 FSRS 计算出的 nextReview 驱动；Planner 只是“组织入口”和候选集合筛选，不改变算法或写回规则。