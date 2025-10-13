import React, { useMemo } from 'react';
import { Button, Typography } from 'antd';

const { Title, Paragraph } = Typography;

export interface ChoiceQuestionProps {
  word: string;
  definition: string;
  onAnswer: (ok: boolean) => void;
}

/**
 * 选择题（占位版）
 * - 根据正确释义 + 固定干扰项生成 4 选项
 * - 点击选项后回调 onAnswer(true/false)
 */
export const ChoiceQuestion: React.FC<ChoiceQuestionProps> = ({ word, definition, onAnswer }) => {
  const options = useMemo(() => {
    const correct = definition || 'No definition provided.';
    const pool = [
      'A commonly confused term.',
      'An unrelated concept.',
      'A close but not exact meaning.',
    ];
    const opts = [correct, ...pool].slice(0, 4);
    // 简易洗牌
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return { opts, correct };
  }, [definition]);

  return (
    <div className="choice-card">
      <Title level={3} style={{ textAlign: 'center' }}>选择正确释义</Title>
      <Paragraph style={{ textAlign: 'center', marginBottom: 16 }}>{word}</Paragraph>
      <div className="choice-options" style={{ display: 'grid', gap: 12 }}>
        {options.opts.map((opt, idx) => (
          <Button
            key={idx}
            block
            onClick={() => onAnswer(opt === options.correct)}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ChoiceQuestion;