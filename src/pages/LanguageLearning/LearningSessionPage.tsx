import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LearningFlashcard } from '@/components/language-learning/LearningFlashcard';
import { SessionSummaryModal } from '@/components/language-learning/SessionSummaryModal';
import ErrorBoundary from '@/components/LanguageLearning/ErrorBoundary';
import { ChoiceQuestion } from '@/components/language-learning/ChoiceQuestion';
import { SpellingQuestion } from '@/components/language-learning/SpellingQuestion';
import { ListeningQuestion } from '@/components/language-learning/ListeningQuestion';
import { ClozeSpellingQuestion } from '@/components/language-learning/ClozeSpellingQuestion';
import { LetterFillSpellingQuestion } from '@/components/language-learning/LetterFillSpellingQuestion';

// 懒加载组件
const SessionEndFeedback = lazy(() => import('../../components/LanguageLearning/SessionEndFeedback'));
import { Button, Space, Spin, Result, Typography, message, Progress, Select, Tag, Tooltip } from 'antd';
import { ArrowLeftOutlined, TrophyOutlined, ClockCircleOutlined, BookOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { createLearningSessionForWordbook, processStudyResponse, schedulePlannedReviews, startSessionFromTodayPlan, aggregateDailyStudyAndUpdateProgress } from '@/services/learningService';
import { evaluateRewardsOnEvent, addDailyFocusProgress } from '@/services/rewardService';
import { finalizeSessionStatistics } from '@/services/statsService';
import { importWordbook } from '@/services/wordbookService';
import { useAppStore } from '@/store/useAppStore';
import './LearningSessionPage.css';
import { selectNextQuestionType, type QuestionType } from '@/modules/qts';
import { selectNextFromFsrs } from '@/modules/fsrs/select-next';

type SetLastWordbookId = (id: string) => void;
import type { ScheduledItem } from '@/lib/memo/types';
import type { LearningSession } from '@/lib/memo/MemoryLearningManager';

const { Title, Text, Paragraph } = Typography;

const LearningSessionPage: React.FC = () => {
  const { wordbookId } = useParams<{ wordbookId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<LearningSession | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0, startTime: Date.now() });
  const [showSummary, setShowSummary] = useState(false);
  const [showEndFeedback, setShowEndFeedback] = useState(false);
  const [summaryCounts, setSummaryCounts] = useState({ mastered: 0, shaky: 0, forgotten: 0 });
  // 最近回答滚动窗口（最多50条），用于自适应难度
  const [rolling, setRolling] = useState<boolean[]>([]);
  const rollingAccuracy = useMemo(() => {
    if (!rolling.length) return undefined as number | undefined;
    const n = Math.min(20, rolling.length);
    const slice = rolling.slice(-n);
    return slice.reduce((a, b) => a + (b ? 1 : 0), 0) / n;
  }, [rolling]);

  // 段级策略闭环（先实现下一段题目难度/配比自动调整）
  const SEGMENT_SIZE = 10;
  const [segmentStats, setSegmentStats] = useState({ answered: 0, correct: 0 });
  const [segmentPolicy, setSegmentPolicy] = useState<{
    // 题型权重（仅在 adaptive 模式使用）
    weights: { flashcard: number; choice: number; spelling: number; listening: number };
    // 选择题是否允许提示
    choiceHintAllowed: boolean;
  }>({
    weights: { flashcard: 0.35, choice: 0.35, spelling: 0.2, listening: 0.1 },
    choiceHintAllowed: true
  });
  const [summaryItems, setSummaryItems] = useState<Array<{ id: string; content: string; response: 'again'|'hard'|'good'|'easy'; retrievability: number; nextReview?: Date }>>([]);
  const [summaryStats, setSummaryStats] = useState<{ estimatedRetention: number; cognitiveLoad: number } | null>(null);
  const [activeItems, setActiveItems] = useState<ScheduledItem[]>([]);
  const responseStartTime = useRef<number>(0);
  // 记录近期反应时（毫秒），用于认知负荷回退计算
  const responseTimesRef = useRef<number[]>([]);
  const userId = useAppStore((state) => state.userId);
  const setLastWordbookId = useAppStore((state) => state.setLastWordbookId as SetLastWordbookId);
  
  // 推进到下一题的防抖与统一函数
  const advancingRef = useRef<boolean>(false);
  const advanceToNext = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      if (currentItemIndex < itemsSource.length - 1) {
        // 优先使用 FSRS 选择器，失败或同索引则回退顺序 +1
        try {
          const candidates = itemsSource.map((it, idx) => {
            const ms: any = (it as any)?.memoryStrength || {};
            const kind: 'review' | 'learning' | 'new' = ms && Object.keys(ms).length > 0 ? 'review' : 'new';
            const dueAt = (ms?.nextReview || ms?.dueDate || ms?.newDueDate || (it as any)?.dueAt) as Date | string | undefined;
            const stability = typeof ms?.stability === 'number' ? ms.stability : undefined;
            const difficulty = typeof ms?.difficulty === 'number' ? ms.difficulty : undefined;
            const lapses = typeof ms?.lapses === 'number' ? ms.lapses : undefined;
            const lastRating = (ms?.lastRating || undefined) as any;
            return {
              id: String((it as any)?.item?.id ?? idx),
              kind,
              fsrs: { dueAt, stability, difficulty, lapses, lastRating }
            };
          });
          const res = selectNextFromFsrs({
            items: candidates,
            currentIndex: currentItemIndex,
            session: {
              now: new Date(),
              newCount: summaryCounts.mastered + summaryCounts.shaky + summaryCounts.forgotten - (sessionStats.total || 0) > 0 ? 0 : 0,
              reviewCount: sessionStats.total,
              learningCount: 0,
              seenToday: sessionStats.total
            }
          });
          if (res && typeof res.index === 'number' && res.index >= 0 && res.index < itemsSource.length) {
            console.debug('[FSRS] next index', { from: currentItemIndex, to: res.index, reason: res.reason, parts: res.debug });
            // 单调前进约束：FSRS 返回的索引若不大于当前，则顺序 +1
            setCurrentItemIndex(prev => (res.index > prev ? res.index : (prev < itemsSource.length - 1 ? prev + 1 : prev)));
          } else {
            setCurrentItemIndex(prev => (prev < itemsSource.length - 1 ? prev + 1 : prev));
          }
        } catch (e) {
          console.error('FSRS selection error, fallback +1', e);
          setCurrentItemIndex(prev => (prev < itemsSource.length - 1 ? prev + 1 : prev));
        }
        setIsFlipped(false);
      }
    } finally {
      setTimeout(() => { advancingRef.current = false; }, 0);
    }
  }, [ currentItemIndex, summaryCounts.mastered, summaryCounts.shaky, summaryCounts.forgotten, sessionStats.total, setCurrentItemIndex, setIsFlipped]);
  
  // 触摸交互相关ref
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchStartTime = useRef<number>(0);

  useEffect(() => {
    if (!wordbookId) {
      setError('Wordbook ID is missing.');
      setIsLoading(false);
      return;
    }

    async function setupSession() {
      try {
        if (wordbookId === 'global') {
          const raw = sessionStorage.getItem('todayPlan');
          if (!raw) {
            setError('未找到今日计划，请先在复习计划页生成。');
          } else {
            const plan = JSON.parse(raw);
            const s = await startSessionFromTodayPlan({
              userId,
              plan,
              targetDurationSeconds: 1800
            });
            setSession(s);
          }
        } else {
          const newSession = await createLearningSessionForWordbook(Number(wordbookId), userId);
          setSession(newSession);
        }
      } catch (e: any) {
        setError(`Failed to create learning session: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    setupSession();
  }, [wordbookId]);

  useEffect(() => {
    if (session && Array.isArray(session.items)) {
      setActiveItems(session.items);
    }
  }, [session]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showSummary) return; // 总结模态框打开时不处理键盘事件
      
      if (!isFlipped) {
        if (e.code === 'Space') {
          e.preventDefault();
          handleFlip();
        }
      } else {
        switch (e.code) {
          case 'Digit1':
            e.preventDefault();
            handleResponse('again');
            break;
          case 'Digit2':
            e.preventDefault();
            handleResponse('hard');
            break;
          case 'Digit3':
            e.preventDefault();
            handleResponse('good');
            break;
          case 'Digit4':
            e.preventDefault();
            handleResponse('easy');
            break;
          case 'Space':
            e.preventDefault();
            handleFlip();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, showSummary]);

  const handleFlip = useCallback(() => {
    if (!isFlipped) {
      responseStartTime.current = Date.now(); // Start timer when answer is shown
    }
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  const itemsSource: ScheduledItem[] = useMemo(() => 
    (activeItems && activeItems.length > 0) ? activeItems : (session?.items || []),
    [activeItems, session]
  );
  
  const currentItem = useMemo(() => itemsSource[currentItemIndex], [itemsSource, currentItemIndex]);

  const handleResponse = useCallback(async (response: 'again' | 'hard' | 'good' | 'easy') => {
    
    if (!session || !currentItem) {
      message.error('无法处理响应：会话或当前项目未加载');
      return;
    }

    // 本次答题的条目占位，放在函数顶部以确保各分支均可访问
    let lastEntry: { id: string; content: string; response: 'again'|'hard'|'good'|'easy'; retrievability: number; nextReview?: Date } | null = null;

    const responseTime = Date.now() - responseStartTime.current;
    // 累积反应时（最多200条）
    try {
      const arr = responseTimesRef.current;
      arr.push(responseTime);
      if (arr.length > 200) arr.splice(0, arr.length - 200);
    } catch {}
    const isCorrect = response === 'good' || response === 'easy';

    // 验证响应时间是否合理
    if (responseTime < 100) {
      console.warn('Unusually fast response time detected:', responseTime);
    }

    try {
      // Update session statistics
      setSessionStats(prev => ({
        ...prev,
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1
      }));
      // 更新滚动准确率窗口（最多保留50条）
      setRolling(prev => {
        const next = [...prev, isCorrect];
        return next.length > 50 ? next.slice(-50) : next;
      });
      // 段级统计与策略更新（每 SEGMENT_SIZE 题或达段尾时触发一次）
      setSegmentStats(prev => {
        const nextAnswered = prev.answered + 1;
        const nextCorrect = prev.correct + (isCorrect ? 1 : 0);
        // 判断是否到达段末（不阻塞 UI，策略用于“下一段”）
        const reachSegmentEnd = (nextAnswered % SEGMENT_SIZE === 0) || (currentItemIndex === (itemsSource.length - 1));
        if (reachSegmentEnd) {
          const acc = nextAnswered > 0 ? nextCorrect / nextAnswered : 0;
          // 计算下一段策略
          // 高命中：提高难度（更多 spelling/listening），禁用提示
          // 低命中：降低难度（更多 flashcard/choice），允许提示
          // 中间：均衡
          let weights = segmentPolicy.weights;
          let choiceHintAllowed = segmentPolicy.choiceHintAllowed;
          if (acc >= 0.85) {
            weights = { flashcard: 0.15, choice: 0.25, spelling: 0.4, listening: 0.2 };
            choiceHintAllowed = false;
          } else if (acc < 0.7) {
            weights = { flashcard: 0.45, choice: 0.35, spelling: 0.15, listening: 0.05 };
            choiceHintAllowed = true;
          } else {
            weights = { flashcard: 0.3, choice: 0.4, spelling: 0.2, listening: 0.1 };
            choiceHintAllowed = true;
          }
          setSegmentPolicy({ weights, choiceHintAllowed });
          // 重置下一段统计
          return { answered: 0, correct: 0 };
        }
        return { answered: nextAnswered, correct: nextCorrect };
      });
      
      // Update local summary counts by response category
      setSummaryCounts(prev => ({
        mastered: prev.mastered + (response === 'good' || response === 'easy' ? 1 : 0),
        shaky: prev.shaky + (response === 'hard' ? 1 : 0),
        forgotten: prev.forgotten + (response === 'again' ? 1 : 0),
      }));
    } catch (error) {
      console.error('Failed to update session statistics:', error);
      message.error('更新统计信息失败');
    }

    try {
      const result = await processStudyResponse(session, currentItem.item.id, response, responseTime, userId);
      const ms: any = result?.updatedMemoryStrength || {};
      const retrievability = typeof ms.newRetrievability === 'number' ? ms.newRetrievability : (typeof ms.retrievability === 'number' ? ms.retrievability : 0);
      const nextReview: Date | undefined = ms.newDueDate || ms.nextReview;
      lastEntry = { id: String(currentItem.item.id), content: String(currentItem.item.content), response, retrievability, nextReview };
      if (lastEntry) {
        setSummaryItems(prev => [...prev, lastEntry]);
      }
    } catch (e: any) {
      console.error(`Failed to process response: ${e.message}`);
      message.error('Failed to save your progress. Please try again.');
      // 即使处理响应失败，也允许继续学习
    }

    try {
      if (currentItemIndex < itemsSource.length - 1) {
        advanceToNext();
      } else {
        // 使用本地最终值，避免因状态异步导致提示显示上一拍的数据
        const localTotal = sessionStats.total + 1;
        const localCorrect = sessionStats.correct + (isCorrect ? 1 : 0);
        const elapsedMs = Date.now() - sessionStats.startTime;
        const minutes = Math.floor(elapsedMs / 60000);
        const sessionDurationText = minutes >= 1 ? `${minutes} minutes` : `${Math.ceil(elapsedMs / 1000)} seconds`;
        const localAccuracy = localTotal > 0 ? Math.round((localCorrect / localTotal) * 100) : 0;
        message.success(`Session completed! ${localCorrect}/${localTotal} correct (${localAccuracy}%) in ${sessionDurationText}`);
        
        // 记录当日完成计数并评估奖励
        try {
          await addDailyFocusProgress(userId, new Date().toISOString(), localTotal);
        } catch (err) {
          console.error('record daily focus count failed', err);
          // 不阻止流程继续
        }
        
        try {
          const evalRes = evaluateRewardsOnEvent({ userId, eventType: 'sessionCompleted', dailyQuota: 60 });
          if (Array.isArray(evalRes.granted) && evalRes.granted.length > 0) {
            message.success(`🎖 获得新的奖励 ${evalRes.granted.length} 项`);
          }
        } catch (err) {
          console.error('evaluate rewards failed', err);
          // 不阻止流程继续
        }
        
        // FSRS + 评分分类（阈值：mastered ≥0.85；shaky [0.6,0.85)；forgotten <0.6）
        const localSummary = lastEntry ? [...summaryItems, lastEntry] : summaryItems;
        const mastered = localSummary.filter(si => (si.response === 'good' || si.response === 'easy') && si.retrievability >= 0.85).length;
        const shaky = localSummary.filter(si => si.response === 'hard' || (si.retrievability >= 0.6 && si.retrievability < 0.85)).length;
        const forgotten = localSummary.filter(si => si.response === 'again' || si.retrievability < 0.6).length;
        setSummaryCounts({ mastered, shaky, forgotten });
        
        // 收集会话统计（预计保持率/实际认知负荷）
        try {
          const manager = (session as any)?.manager;
          if (manager && typeof (manager as any).getSessionStatistics === 'function') {
            (manager as any).completeSession(session as any);
            const stats = (manager as any).getSessionStatistics(session as any);
            if (stats && typeof (stats as any).estimatedRetention === 'number') {
              // 读取上游的认知负荷，若缺省或接近 0.49，则采用回退计算
              const rawLoad = (stats as any).cognitiveLoadActual ?? (stats as any).cognitiveLoad;
              const localTotal = sessionStats.total + 1; // 此处与上文 localTotal 一致节拍
              const localCorrect = sessionStats.correct; // 此处无需 +1，上一段已计算展示
              const acc = localTotal > 0 ? localCorrect / localTotal : 0;
              // 最近最多50条反应时
              const rts = responseTimesRef.current;
              const N = Math.min(50, rts.length);
              const avgRT = N > 0 ? rts.slice(-N).reduce((a, b) => a + b, 0) / N : 0;
              // 以 900ms 为适中基准，>2400ms 接近高负荷
              const normRT = Math.max(0, Math.min(1, (avgRT - 900) / 1500));
              // 混合指标：错误率权重 0.65，反应时权重 0.35
              const fallbackLoad = Math.max(0, Math.min(1, 0.65 * (1 - acc) + 0.35 * normRT));
              const useFallback = !(typeof rawLoad === 'number' && isFinite(rawLoad)) || (rawLoad >= 0.48 && rawLoad <= 0.50);
              setSummaryStats({
                estimatedRetention: (stats as any).estimatedRetention,
                cognitiveLoad: useFallback ? fallbackLoad : rawLoad
              });
            }
          }
        } catch (err) {
          console.error('collect session stats failed', err);
          // 不阻止流程继续
        }
        
        // 后台自动生成“下次复习词书”逻辑已禁用，改由复习计划页统一安排
        // 说明：避免在学习会话中新增词书，复习与计划由 ReviewPlannerPage 负责
        const autoCreateReviewWordbook = false;
        if (autoCreateReviewWordbook) {
          try {
            const weakIds = new Set(
              (lastEntry ? [...summaryItems, lastEntry] : summaryItems)
                .filter(si => si.response === 'hard' || si.response === 'again' || si.retrievability < 0.85)
                .map(si => String(si.id))
            );
            const allItems = session?.items || [];
            const weakItems = allItems.filter(si => weakIds.has(String(si.item.id)));
            if (weakItems.length > 0) {
              const name = `Next Review - ${new Date().toLocaleDateString()}`;
              const description = `Auto-generated review list from session ${wordbookId}`;
              const words = weakItems.map((si) => ({
                word: String(si.item.content),
                type: (si.item as any).type || 'word',
                phonetic: (si.item as any).details?.phonetic || null,
                definition: (si.item as any).details?.definition || '',
                example: (si.item as any).details?.example || null
              }));
              const payload = JSON.stringify({ name, description, words });
              const result = await importWordbook(payload, userId);
              const newWordbookId = result.wordbookId;
              setLastWordbookId(String(newWordbookId));
            }
          } catch (e: any) {
            console.error('Auto-create next review wordbook failed:', e?.message || e);
            // 不阻止流程继续
          }
        }
        
        // Show end feedback first, then summary modal
        setShowEndFeedback(true);
      }
    } catch (error) {
      console.error('Error during session progression:', error);
      message.error('处理学习进度时出错，请重试');
    }
  }, [session, sessionStats, summaryItems, activeItems, currentItemIndex, userId, wordbookId, setLastWordbookId]);

  // 添加滑动处理函数
  const handleSwipeLeft = useCallback(() => {
    // 左滑处理：标记为"困难"
    if (isFlipped) {
      handleResponse('hard');
    }
  }, [isFlipped, handleResponse]);

  const handleSwipeRight = useCallback(() => {
    // 右滑处理：标记为"简单"
    if (isFlipped) {
      handleResponse('easy');
    }
  }, [isFlipped, handleResponse]);

  // 触摸事件处理函数
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent, action: () => void) => {
    if (!touchStartPos.current || !touchStartTime.current) return;
    
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime.current;
    
    // 获取触摸结束位置
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartPos.current.x;
    const dy = endY - touchStartPos.current.y;
    const moveDistance = Math.sqrt(dx * dx + dy * dy);
    
    const isSwipe = touchDuration < 500 && moveDistance > 50;
    const isTap = touchDuration < 300 && moveDistance < 10;
    
    if (isSwipe) {
      if (Math.abs(dx) > Math.abs(dy)) {
        // 水平滑动：左/右
        if (dx > 0) handleSwipeRight();
        else handleSwipeLeft();
      } else {
        // 垂直滑动：上滑=good，下滑=again；未翻面时先翻面
        if (dy < 0) {
          if (isFlipped) handleResponse('good');
          else handleFlip();
        } else {
          if (isFlipped) handleResponse('again');
          else handleFlip();
        }
      }
    } else if (isTap) {
      if (action) {
        action();
      }
    }
    
    // 重置触摸状态
    touchStartPos.current = null;
    touchStartTime.current = 0;
  }, [isFlipped, handleFlip, handleSwipeLeft, handleSwipeRight, handleResponse]);

  // Derived memos must be declared before any early returns to keep hook order stable
  const currentStrategyDisplay = useMemo(() => {
    const rawType = (currentItem as any)?.strategy?.type as string | undefined;
    const rawDiff = (currentItem as any)?.strategy?.difficulty as string | undefined;
    const currentStrategyLabel = rawType === 'recognition' ? '识别'
      : rawType === 'cued_recall' ? '提示回忆'
      : rawType === 'free_recall' ? '自由回忆'
      : rawType === 'elaborative_retrieval' ? '精细回忆'
      : '检索';
    return rawDiff ? `${currentStrategyLabel} · ${rawDiff}` : currentStrategyLabel;
  }, [currentItem]);

  const baseTotal = useMemo(() => {
    try {
      const total = (session && Array.isArray(session.items)) ? session.items.length : (itemsSource ? itemsSource.length : 0);
      return total;
    } catch {
      return (itemsSource ? itemsSource.length : 0);
    }
  }, [session, itemsSource.length]);

  const progressPercent = useMemo(() =>
    (baseTotal && baseTotal > 0) ? (currentItemIndex / baseTotal) * 100 : 0,
    [baseTotal, currentItemIndex]
  );

  const sessionDuration = useMemo(() =>
    Math.round((Date.now() - sessionStats.startTime) / 1000 / 60),
    [sessionStats.startTime]
  );

  const accuracy = useMemo(() =>
    sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0,
    [sessionStats.correct, sessionStats.total]
  );

  // 题型模式：仅闪卡/混合/自适应（默认混合）
  type QuestionMode = 'flashcard-only' | 'mixed' | 'adaptive';
  const [questionMode, setQuestionMode] = useState<QuestionMode>('mixed');

  // 题型决定：按模式/难度自适应
  // QTS 最小配置与选择器（本地版）；异常时回退原顺序逻辑
  const qtsConfig = {
    weights: { due: 0.4, newBudget: 0.2, diff: 0.2, fatigue: 0.1, streak: 0.1 },
    dailyNewTarget: 30,
  };















  const qtsDecision = useMemo(() => {
    try {
      if (questionMode === 'flashcard-only') {
        return { type: 'flashcard' as QuestionType, difficultyTarget: 'medium' as const, reason: 'fixed: flashcard-only', debug: null };
      }
      const baseCycle: QuestionType[] = ['flashcard', 'choice', 'spelling', 'listening'];
      if (questionMode === 'mixed') {
        const t = baseCycle[currentItemIndex % baseCycle.length];
        return { type: t, difficultyTarget: 'medium' as const, reason: 'fixed: mixed cycle', debug: null };
      }
      // 自适应：调用模块 QTS
      const decision = selectNextQuestionType({
        currentItem,
        currentItemIndex,
        segmentWeights: segmentPolicy.weights,
        rollingAcc: rollingAccuracy,
        recentRTs: responseTimesRef.current
      });
      console.debug('[QTS] decision', {
        index: currentItemIndex,
        word: String(((currentItem as any)?.item?.content) || ''),
        type: decision.type,
        target: decision.difficultyTarget,
        reason: decision.reason,
        debug: decision.debug
      });
      return decision;
    } catch (err) {
      console.error('QTS select failed, fallback to baseline:', err);
      // 回退：近似原基线
      const ms: any = (currentItem as any)?.memoryStrength || {};
      const r = typeof ms.retrievability === 'number' ? ms.retrievability : undefined;
      const stType = (currentItem as any)?.strategy?.type as string | undefined;
      let t: QuestionType;
      if (typeof r === 'number') {
        if (r < 0.6) t = 'spelling';
        else if (r < 0.85) t = 'choice';
        else t = (currentItemIndex % 4 === 3) ? 'listening' : 'flashcard';
      } else if (stType === 'free_recall') t = 'spelling';
      else if (stType === 'recognition') t = 'choice';
      else t = (currentItemIndex % 5 === 4) ? 'listening' : 'flashcard';
      return { type: t, difficultyTarget: 'medium' as const, reason: 'fallback baseline', debug: null };
    }
  }, [questionMode, currentItem, currentItemIndex, segmentPolicy.weights, rollingAccuracy]);

  const questionType: QuestionType = qtsDecision.type;
  const qtsDifficultyTarget = qtsDecision.difficultyTarget;
  const qtsReason = qtsDecision.reason;







  const segmentDots = useMemo(() => {
    try {
      if (!itemsSource || itemsSource.length === 0) {
        return [];
      }
      return Array.from({ length: Math.min(itemsSource.length, 10) }, (_, i) => {
        let dotClass = 'segment-dot';
        if (i < currentItemIndex) {
          dotClass += ' completed';
        } else if (i === currentItemIndex) {
          dotClass += ' active';
        }
        return <div key={i} className={dotClass} />;
      });
    } catch (error) {
      console.error('Error creating segment dots:', error);
      return [];
    }
  }, [itemsSource.length, currentItemIndex]);

  if (isLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><Spin size="large" tip="Loading session..." /></div>;
  }

  if (error) {
    return <Result status="error" title="Error" subTitle={error} />;
  }

  if (!session || session.items.length === 0) {
    return <Result
      status="success"
      title="All Caught Up!"
      subTitle="You have no words to study in this session. Come back later!"
      extra={
        <Button type="primary" onClick={() => navigate('/language-learning')}>
          Back to Wordbooks
        </Button>
      }
    />;
  }

  const details = (currentItem.item as any).details || {};

  const frontContent = <Title level={2}>{currentItem.item.content}</Title>;
  const backContent = (
    <div>
      <Title level={4}>{currentItem.item.content}</Title>
      <Text type="secondary">{details?.phonetic || ''}</Text>
      <hr style={{ margin: '12px 0' }} />
      <Paragraph>{details?.definition || 'No definition provided.'}</Paragraph>
      {details?.example && <Paragraph type="secondary">e.g., {details.example}</Paragraph>}
    </div>
  );
  







  
  // 创建分段进度指示器


  return (
    <ErrorBoundary>
      <div className="learning-session-container">
        {/* 顶部状态栏 */}
        <div className="session-header">
          <div className="session-header-content">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/language-learning')}
              type="text"
            >
              返回
            </Button>
            
            <div className="session-progress">
              <div className="session-progress-bar">
                <Progress 
                  percent={progressPercent} 
                  showInfo={false} 
                  strokeColor="#1890ff"
                  size="small"
                />
              </div>
              <div className="session-progress-text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{currentItemIndex + 1} / {baseTotal} · {currentStrategyDisplay}</span>
                {(activeItems && session?.items && activeItems.length > 0 && activeItems.length !== session.items.length) && (
                  <Tag color="volcano" style={{ marginLeft: 8 }}>
                    弱项子集 {activeItems.length}/{session.items.length}
                  </Tag>
                )}
                {questionMode === 'adaptive' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Tag color="geekblue">{qtsDifficultyTarget}</Tag>
                    <Tag>{questionType}</Tag>
                    <Tooltip title={qtsReason}>
                      <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                  </span>
                )}
              </div>
            </div>
            
            <div className="session-stats">
              <div className="session-stat">
                <div className="session-stat-value" style={{ color: accuracy >= 80 ? '#52c41a' : accuracy >= 60 ? '#fa8c16' : '#ff4d4f' }}>
                  {accuracy}%
                </div>
                <div className="session-stat-label">准确率</div>
              </div>
              <div className="session-stat">
                <div className="session-stat-value">{sessionDuration}</div>
                <div className="session-stat-label">分钟</div>
              </div>
              <div className="session-stat">
                <div className="session-stat-value">{sessionStats.total}/{baseTotal}</div>
                <div className="session-stat-label">进度</div>
              </div>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="session-main">
          {/* 题型模式切换 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '8px 0' }}>
            <Select
              size="small"
              value={questionMode}
              style={{ width: 180 }}
              onChange={(v) => setQuestionMode(v as any)}
              options={[
                { label: '题型：仅闪卡', value: 'flashcard-only' },
                { label: '题型：混合', value: 'mixed' },
                { label: '题型：自适应', value: 'adaptive' },
              ]}
            />
          </div>
          {/* 分段进度指示器 */}
          <div className="segment-indicator">
            {segmentDots}
          </div>
          
          {/* 卡片区域：按题型渲染 */}
          <div
            className="session-card-area"
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(e, () => { if (!isFlipped) handleFlip(); })}
          >
            <ErrorBoundary fallback={<div className="card-error">卡片加载失败</div>}>
              {questionType === 'flashcard' && (
                <LearningFlashcard
                  frontContent={frontContent}
                  backContent={backContent}
                  isFlipped={isFlipped}
                  onFlip={handleFlip}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                />
              )}

              {questionType === 'choice' && (
                <ChoiceQuestion
                  word={String(((currentItem as any)?.item?.content) || '')}
                  definition={String((((currentItem as any)?.item?.details)?.definition) || '')}
                  retrievability={(currentItem as any)?.memoryStrength?.retrievability}
                  rollingAccuracy={rollingAccuracy}
                  allowHint={segmentPolicy.choiceHintAllowed}
                  onAnswer={(ok) => handleResponse(ok ? 'good' : 'again')}
                />
              )}

              {questionType === 'spelling' && (
                String(((currentItem as any)?.item?.content) || '').length >= 4 ? (
                  <LetterFillSpellingQuestion
                    word={String(((currentItem as any)?.item?.content) || '')}
                    definition={String((((currentItem as any)?.item?.details)?.definition) || '')}
                    isFlipped={isFlipped}
                    onResult={(ok) => handleResponse(ok ? 'good' : 'again')}
                  />
                ) : (
                  ((currentItem as any)?.item?.details?.example) ? (
                    <ClozeSpellingQuestion
                      word={String(((currentItem as any)?.item?.content) || '')}
                      sentence={String((((currentItem as any)?.item?.details)?.example) || '')}
                      definition={String((((currentItem as any)?.item?.details)?.definition) || '')}
                      onResult={(ok) => handleResponse(ok ? 'good' : 'again')}
                    />
                  ) : (
                    <SpellingQuestion
                      targetWord={String(((currentItem as any)?.item?.content) || '')}
                      definition={String((((currentItem as any)?.item?.details)?.definition) || '')}
                      onResult={(ok) => handleResponse(ok ? 'good' : 'again')}
                    />
                  )
                )
              )}

              {questionType === 'listening' && (
                <ListeningQuestion
                  word={String(((currentItem as any)?.item?.content) || '')}
                  isFlipped={isFlipped}
                  onFlip={handleFlip}
                  onResult={(ok) => handleResponse(ok ? 'good' : 'again')}
                />
              )}
            </ErrorBoundary>
          </div>

          {/* 操作按钮区域 */}
          <div className="session-actions">
            {!isFlipped ? (
              <Button 
                type="primary" 
                onClick={handleFlip} 
                onTouchStart={handleTouchStart}
                onTouchEnd={(e) => handleTouchEnd(e, handleFlip)}
                block 
                size="large"
                className="session-action-button"
              >
                显示答案 (空格键)
              </Button>
            ) : (
              <div className="session-response-buttons">
                <Button 
                  danger 
                  onClick={() => handleResponse('again')} 
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, () => handleResponse('again'))}
                  className="session-response-button again"
                >
                  再学<br/>1
                </Button>
                <Button 
                  onClick={() => handleResponse('hard')} 
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, () => handleResponse('hard'))}
                  className="session-response-button hard"
                >
                  困难<br/>2
                </Button>
                <Button 
                  type="primary" 
                  onClick={() => handleResponse('good')} 
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, () => handleResponse('good'))}
                  className="session-response-button good"
                >
                  掌握<br/>3
                </Button>
                <Button 
                  type="primary" 
                  ghost 
                  onClick={() => handleResponse('easy')} 
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, () => handleResponse('easy'))}
                  className="session-response-button easy"
                >
                  简单<br/>4
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 学习结束反馈组件 */}
        <Suspense fallback={<Spin size="large" tip="Loading..." />}>
          <SessionEndFeedback
            visible={showEndFeedback}
            onClose={() => setShowEndFeedback(false)}
            onComplete={async () => {
              setShowEndFeedback(false);
              try {
                const day = new Date().toISOString().split('T')[0];
                const resStats = await finalizeSessionStatistics(userId, day);
                await aggregateDailyStudyAndUpdateProgress({ userId, date: day } as any);
                if (resStats && resStats.ok) {
                  message.success('批量统计已更新');
                } else {
                  message.error('批量统计更新失败');
                }
              } catch (e: any) {
                console.error('Finalize session stats failed:', e?.message || e);
                message.error('批量统计更新失败，请稍后重试');
              }
              setShowSummary(true);
            }}
            sessionStats={{
              totalItems: sessionStats.total,
              correct: sessionStats.correct,
              accuracy: accuracy,
              duration: sessionDuration
            }}
          />
        </Suspense>

        {/* 学习总结模态框 */}
        <Suspense fallback={<Spin size="large" tip="Loading..." />}>
          <SessionSummaryModal
            visible={showSummary}
            onClose={() => setShowSummary(false)}
            accuracy={accuracy}
            sessionDuration={sessionDuration}
            totalItems={sessionStats.total}
            summaryCounts={summaryCounts}
            summaryStats={summaryStats}
            onReviewWeakItems={() => {
              try {
                const weakIds = new Set(
                  summaryItems
                    .filter(si => si.response === 'hard' || si.response === 'again' || si.retrievability < 0.85)
                    .map(si => String(si.id))
                );
                const allItems = session?.items || [];
                const weakItems = allItems.filter(si => weakIds.has(String(si.item.id)));
                if (weakItems.length === 0) {
                  message.info('本次没有可复习的弱项，建议查看统计或返回词书。');
                } else {
                  setActiveItems(weakItems);
                  setCurrentItemIndex(0);
                  setIsFlipped(false);
                  setSessionStats({ correct: 0, total: 0, startTime: Date.now() });
                  setShowSummary(false);
                  message.success(`已进入弱项微复习，共 ${weakItems.length} 个词`);
                }
              } catch (error) {
                console.error('Error during weak items review:', error);
                message.error('开始弱项复习时出错，请重试');
              }
            }}
            onScheduleNextReview={async () => {
              try {
                type Category = 'mastered' | 'shaky' | 'forgotten';
                const classify = (si: { response: 'again'|'hard'|'good'|'easy'; retrievability: number }): Category => {
                  if (si.response === 'again' || si.retrievability < 0.6) return 'forgotten';
                  if (si.response === 'hard' || (si.retrievability >= 0.6 && si.retrievability < 0.85)) return 'shaky';
                  return 'mastered';
                };
                
                if (!summaryItems || summaryItems.length === 0) {
                  message.warning('没有可安排复习的项目');
                  return;
                }
                
                const planned: { itemId: string; category: Category; nextReview: Date }[] = summaryItems.map(si => ({
                  itemId: String(si.id),
                  category: classify(si as any),
                  nextReview: si.nextReview ? si.nextReview : new Date(Date.now() + 24 * 60 * 60 * 1000)
                }));
                
                if (!wordbookId) {
                  message.error('词书ID缺失，无法安排复习');
                  return;
                }
                
                const res = await schedulePlannedReviews({
                  userId,
                  wordbookId: Number(wordbookId),
                  planned
                });
                
                if (res && typeof res.updated === 'number') {
                  message.success(`已安排下次复习（${res.updated} 项）`);
                } else {
                  message.success('已安排下次复习');
                }
              } catch (e: any) {
                console.error('Schedule next review error:', e);
                message.error(`安排复习失败: ${e?.message || '未知错误'}`);
              }
            }}
            onContinueLearning={() => { 
              setShowSummary(false); 
              navigate('/language-learning'); 
            }}
            onViewStatistics={() => { 
              setShowSummary(false); 
              navigate('/statistics'); 
            }}
          />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default LearningSessionPage;