import { useEffect } from 'react';
import { createLearningSessionForWordbook, startSessionFromTodayPlan } from '@/services/learningService';
import { useLearningSessionStore } from '@/store/useLearningSessionStore';
import { useAppStore } from '@/store/useAppStore';

interface UseSessionStateOptions {
  wordbookId: string | undefined;
}

export const useSessionState = ({ wordbookId }: UseSessionStateOptions) => {
  const userId = useAppStore((state) => state.userId);
  const {
    session,
    isLoading,
    error,
    setSession,
    setError,
    setIsLoading,
    resetSession
  } = useLearningSessionStore();

  useEffect(() => {
    if (!wordbookId) {
      setError('Wordbook ID is missing.');
      setIsLoading(false);
      return;
    }

    async function setupSession() {
      try {
        setIsLoading(true);
        setError(null);

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

    // Cleanup function
    return () => {
      // Optional: cleanup session state when component unmounts
      // resetSession();
    };
  }, [wordbookId, userId, setSession, setError, setIsLoading]);

  return {
    session,
    isLoading,
    error,
    resetSession
  };
};