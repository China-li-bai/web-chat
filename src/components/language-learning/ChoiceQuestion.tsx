import React, { useMemo, useState, useCallback } from 'react';
import { Button, Typography, Space } from 'antd';
import { generateDistractors, stableSeedFromWord, buildMCQ } from '@/utils/distractor';

const { Title, Paragraph } = Typography;

export interface ChoiceQuestionProps {
  word: string;
  definition: string;
  onAnswer: (ok: boolean) => void;
  retrievability?: number;          // 当前条目检索性（0~1）
  rollingAccuracy?: number;         // 最近窗口滚动准确率（0~1）
  allowHint?: boolean;              // 是否允许使用提示（默认：高难度 L3 禁用）
}

/**
 * 选择题（占位加强版）
 * - 稳定随机：基于 word 的哈希作为种子，避免重渲染导致选项顺序抖动
 * - 按钮点击后禁用，提供轻微振动反馈
 */
export const ChoiceQuestion: React.FC<ChoiceQuestionProps> = ({ word, definition, onAnswer, retrievability, rollingAccuracy, allowHint }) => {
  const [answered, setAnswered] = useState(false);

  const { opts, correctIndex, level } = useMemo(() => {
    const seed = stableSeedFromWord(word);
    const mcq = buildMCQ(definition, seed, retrievability, rollingAccuracy);
    return { opts: mcq.options, correctIndex: mcq.correctIndex, level: mcq.level };
  }, [word, definition, retrievability, rollingAccuracy]);

  const [eliminated, setEliminated] = useState<number | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const canUseHint = (allowHint ?? level !== 'L3');

  const useHint = useCallback(() => {
    if (hintUsed || !canUseHint) return;
    const candidates = opts
      .map((_, i) => i)
      .filter(i => i !== correctIndex && i !== eliminated);
    if (candidates.length > 0) {
      const seed = stableSeedFromWord(word);
      const idx = candidates[(seed % candidates.length)];
      setEliminated(idx);
      setHintUsed(true);
      try { if (navigator.vibrate) navigator.vibrate(15); } catch {}
    }
  }, [opts, correctIndex, eliminated, hintUsed, word, canUseHint]);

  const handleClick = useCallback(
    (idx: number) => {
      if (answered) return;
      const ok = idx === correctIndex;
      try {
        if (navigator.vibrate) navigator.vibrate(ok ? 10 : 30);
      } catch {}
      setAnswered(true);
      onAnswer(ok);
    },
    [answered, correctIndex, onAnswer]
  );

  return (
    <div className="choice-card">
      <Title level={3} style={{ textAlign: 'center' }}>选择正确释义</Title>
      <Paragraph style={{ textAlign: 'center', marginBottom: 16 }}>{word}</Paragraph>
      <Space style={{ marginBottom: 8 }}>
        <Button size="small" onClick={useHint} disabled={!canUseHint || hintUsed || opts.length - (eliminated !== null ? 1 : 0) <= 2}>
          提示（消除一个错误项）
        </Button>
      </Space>
      <div className="choice-options" style={{ display: 'grid', gap: 12 }}>
        {opts.map((opt, idx) => {
          const hidden = eliminated === idx;
          return (
            <Button
              key={idx}
              block
              disabled={answered || hidden}
              onClick={() => handleClick(idx)}
              style={hidden ? { display: 'none' } : undefined}
            >
              {opt}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default ChoiceQuestion;