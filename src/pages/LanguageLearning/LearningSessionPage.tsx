import React, { useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message } from "antd";
import ErrorBoundary from "@/components/LanguageLearning/ErrorBoundary";
import { SessionHeader } from "@/components/language-learning/session/SessionHeader";
import { QuestionArea } from "@/components/language-learning/session/QuestionArea";
import { ResponseControls } from "@/components/language-learning/session/ResponseControls";
import { SessionSummaryModal } from "@/components/language-learning/SessionSummaryModal";
import ImmediateFeedback, {
  useImmediateFeedback,
} from "@/components/language-learning/ImmediateFeedback";
import { useLearningSessionStore } from "@/store/useLearningSessionStore";
import { useAppStore } from "@/store/useAppStore";
import { processStudyResponse } from "@/services/learningService";
import { useSessionState } from "@/hooks/useSessionState";
import { useSessionHandlers } from "@/hooks/useSessionHandlers";
import { useSessionKeyboardShortcuts } from "@/hooks/useSessionKeyboardShortcuts";
import "./LearningSessionPage.css";

// 类型定义
type SetLastWordbookId = (id: string) => void;

const LearningSessionPage: React.FC = () => {
  // 路由和用户状态
  const { wordbookId } = useParams<{ wordbookId: string }>();
  const navigate = useNavigate();
  const userId = useAppStore((state) => state.userId);
  const setLastWordbookId = useAppStore(
    (state) => state.setLastWordbookId as SetLastWordbookId
  );

  // 会话状态
  const {
    session,
    segmentQueue,
    currentItemIndex,
    isFlipped,
    sessionStats,
    questionMode,
    responseTimesRef,
    setIsFlipped,
    setShowSummary,
    updateSessionStats,
    calculateAndSetSummaryStats,
    addResponseTime,
    advanceToNext,
    showSummary,
    summaryCounts,
    summaryStats,
    isLoading,
    error,
  } = useLearningSessionStore();

  // 初始化会话
  useSessionState({ wordbookId });

  // 沉浸式体验hooks
  const { feedbackTrigger, triggerFeedback, clearFeedback } =
    useImmediateFeedback();

  // 响应开始时间追踪
  const responseStartTime = useRef<number>(0);

  // 当前项目
  const currentItem = useMemo(
    () => segmentQueue[currentItemIndex],
    [segmentQueue, currentItemIndex]
  );

  // 问题类型逻辑
  const questionType = useMemo(() => {
    if (questionMode === "flashcard-only") return "flashcard";

    const baseCycle: string[] = [
      "flashcard",
      "choice",
      "spelling",
      "listening",
    ];
    if (questionMode === "mixed") {
      return baseCycle[currentItemIndex % baseCycle.length] as any;
    }

    return "flashcard"; // 简化自适应逻辑
  }, [questionMode, currentItemIndex]);

  // 业务逻辑处理器
  const sessionHandlers = useSessionHandlers({
    currentItem,
    responseStartTime,
    responseTimesRef,
    setIsFlipped: (flipped: boolean) => {
      setIsFlipped(flipped);
      if (flipped) {
        // 翻转时触发反馈
        triggerFeedback({
          type: "reveal",
          duration: 400,
          haptic: true,
        });
      }
    },
    onResponse: async (response: "again" | "hard" | "easy") => {
      if (!session || !currentItem) {
        message.error("无法处理响应：会话或当前项目未加载");
        return;
      }

      const responseTime = Date.now() - responseStartTime.current;
      const isCorrect = response === "easy";

      // 立即触发反馈
      triggerFeedback({
        type: isCorrect ? "success" : "retry",
        duration: isCorrect ? 800 : 600,
        haptic: true,
        sound: true,
        intensity: isCorrect ? "light" : "medium",
      });

      // 添加响应时间
      addResponseTime(responseTime);

      // 验证响应时间
      if (responseTime < 100) {
        console.warn("Unusually fast response time detected:", responseTime);
      }

      try {
        // 更新会话统计
        updateSessionStats(response);

        // 处理学习响应

        // 更新最后学习词书ID
        if (wordbookId) {
          setLastWordbookId(wordbookId);
        }
      } catch (e: any) {
        console.error(`Failed to process response: ${e.message}`);
        message.error("Failed to save your progress. Please try again.");
      }

      // 检查是否完成当前段落
      if (currentItemIndex < segmentQueue.length - 1) {
        advanceToNext();
      } else {
        // 会话完成 - 触发庆祝动画
        triggerFeedback({
          type: "session-complete",
          duration: 2000,
          haptic: true,
          sound: true,
          intensity: "strong",
        });

        // 段落到下一段或结束会话
        const localTotal = sessionStats.total + 1;
        const localCorrect = sessionStats.correct + (isCorrect ? 1 : 0);
        const accuracy =
          localTotal > 0 ? Math.round((localCorrect / localTotal) * 100) : 0;

        message.success(
          `段落完成! ${localCorrect}/${localTotal} 正确 (${accuracy}%)`
        );

        // 计算并设置会话统计
        calculateAndSetSummaryStats();

        // 延迟显示总结，让庆祝动画播放完
        setTimeout(() => {
          setShowSummary(true);
        }, 1500);
      }
    },
  });

  // 键盘快捷键
  useSessionKeyboardShortcuts({
    onFlip: sessionHandlers.handleFlip,
    onResponse: sessionHandlers.handleResponse,
  });

  // 早期返回状态
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>正在加载学习会话...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>加载失败</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/language-learning")}>
          返回词书列表
        </button>
      </div>
    );
  }

  if (!session || session.items.length === 0) {
    return (
      <div className="empty-container">
        <h2>学习完成！</h2>
        <p>本次没有需要学习的单词，稍后再来吧！</p>
        <button onClick={() => navigate("/language-learning")}>
          返回词书列表
        </button>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="warning-container">
        <h2>加载异常</h2>
        <p>无法加载当前学习项目</p>
        <button onClick={() => window.location.reload()}>重新加载</button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* 即时反馈层 */}
      <ImmediateFeedback trigger={feedbackTrigger} onComplete={clearFeedback} />

      {/* 主要内容区域 */}
      <main className="session-main">
        {/* 乔布斯式极简Header */}
        <SessionHeader
          wordbookId={wordbookId || ""}
          onBack={() => navigate("/language-learning")}
          currentItemIndex={currentItemIndex}
          segmentQueueLength={segmentQueue.length}
        />
        {/* 问题显示区域 */}
        <QuestionArea
          currentItem={currentItem}
          questionType={questionType}
          isFlipped={isFlipped}
          onFlip={sessionHandlers.handleFlip}
          onSwipeLeft={() =>
            isFlipped && sessionHandlers.handleResponse("hard")
          }
          onSwipeRight={() =>
            isFlipped && sessionHandlers.handleResponse("easy")
          }
          currentItemIndex={currentItemIndex}
          segmentQueueLength={segmentQueue.length}
        />

        {/* 响应控制区域 */}
        <ResponseControls
          isFlipped={isFlipped}
          onResponse={sessionHandlers.handleResponse}
        />
      </main>

      {/* 会话总结模态框 */}
      {showSummary && (
        <SessionSummaryModal
          visible={showSummary}
          onClose={() => setShowSummary(false)}
          accuracy={
            sessionStats.total > 0
              ? Math.round((sessionStats.correct / sessionStats.total) * 100)
              : 0
          }
          sessionDuration={Math.round(
            (Date.now() - sessionStats.startTime) / 1000 / 60
          )}
          totalItems={sessionStats.total}
          summaryCounts={summaryCounts}
          summaryStats={summaryStats}
          onReviewWeakItems={() => {
            console.log("Review weak items");
            // TODO: 实现弱项复习功能
          }}
          onScheduleNextReview={() => {
            console.log("Schedule next review");
            // TODO: 实现复习安排功能
          }}
          onContinueLearning={() => {
            setShowSummary(false);
            navigate("/language-learning");
          }}
          onViewStatistics={() => {
            setShowSummary(false);
            navigate("/statistics");
          }}
        />
      )}
    </ErrorBoundary>
  );
};

export default LearningSessionPage;
