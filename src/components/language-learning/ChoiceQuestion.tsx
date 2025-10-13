import React, { useMemo, useState, useCallback } from 'react';
import { Button, Typography, Space } from 'antd';
import { generateDistractors, stableSeedFromWord } from '@/utils/distractor';

const { Title, Paragraph } = Typography;

export interface ChoiceQuestionProps {
  word: string;
  definition: string;
  onAnswer: (ok: boolean) => void;
}

/**
 * 选择题（占位加强版）
 * - 稳定随机：基于 word 的哈希作为种子，避免重渲染导致选项顺序抖动
 * - 按钮点击后禁用，提供轻微振动反馈
 */
export const ChoiceQuestion: React.FC<ChoiceQuestionProps> = ({ word, definition, onAnswer }) => {
  const [answered, setAnswered] = useState(false);

  const { opts, correctIndex } = useMemo(() => {
    const correct = definition || 'No definition provided.';
    const seed = stableSeedFromWord(word);
    const distractors = generateDistractors(definition, seed, 3);
    const combined = [correct, ...distractors].slice(0, 4);

    // 稳定随机：再基于 seed 做一次洗牌
    const shuffled = combined
      .map((v, i) => ({ v, i }))
      .sort((a, b) => ((seed >> (a.i % 16)) & 0xffff) - ((seed >> (b.i % 16)) & 0xffff))
      .map(x => x.v);

    const correctIdx = shuffled.findIndex((v) => v === correct);
    return { opts: shuffled, correctIndex: correctIdx };
  }, [word, definition]);

  const [eliminated, setEliminated] = useState<number | null>(null);
  const [hintUsed, setHintUsed] = useState(false);

  const useHint = useCallback(() => {
    if (hintUsed) return;
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
  }, [opts, correctIndex, eliminated, hintUsed, word]);

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
        <Button size="small" onClick={useHint} disabled={hintUsed || opts.length - (eliminated !== null ? 1 : 0) <= 2}>
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