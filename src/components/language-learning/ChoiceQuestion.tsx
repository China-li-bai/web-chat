import React, { useMemo, useState, useCallback } from 'react';
import { Button, Typography } from 'antd';

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
    const base = [
      'A commonly confused term.',
      'An unrelated concept.',
      'A close but not exact meaning.',
    ];
    const arr = [correct, ...base].slice(0, 4);

    // 稳定随机：根据 word 计算哈希并进行 Fisher-Yates 洗牌
    const hash = [...(word || '')].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = hash % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const correctIdx = shuffled.findIndex((v) => v === correct);
    return { opts: shuffled, correctIndex: correctIdx };
  }, [word, definition]);

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
      <div className="choice-options" style={{ display: 'grid', gap: 12 }}>
        {opts.map((opt, idx) => (
          <Button
            key={idx}
            block
            disabled={answered}
            onClick={() => handleClick(idx)}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ChoiceQuestion;