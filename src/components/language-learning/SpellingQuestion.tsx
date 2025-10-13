import React, { useState, useCallback, useMemo } from 'react';
import { Button, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

export interface SpellingQuestionProps {
  targetWord: string;
  definition: string;
  onResult: (ok: boolean) => void;
}

/**
 * 拼写题（占位加强版）
 * - 即时反馈：输入框边框与提示文案
 * - 提交方式：Enter 或按钮
 * - 容错：大小写/首尾空格无关
 */
export const SpellingQuestion: React.FC<SpellingQuestionProps> = ({ targetWord, definition, onResult }) => {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState<null | boolean>(null);

  const normalizedTarget = useMemo(
    () => (targetWord || '').trim().toLowerCase(),
    [targetWord]
  );

  const check = useCallback(() => {
    const ok = value.trim().toLowerCase() === normalizedTarget;
    setSubmitted(ok);
    onResult(ok);
    try {
      if (navigator.vibrate) navigator.vibrate(ok ? 10 : 30);
    } catch {}
  }, [value, normalizedTarget, onResult]);

  const borderColor = submitted === null ? '#d9d9d9' : submitted ? '#52c41a' : '#ff4d4f';

  return (
    <div className="spelling-card">
      <Title level={3} style={{ textAlign: 'center' }}>拼写该单词</Title>
      <Paragraph type="secondary" style={{ textAlign: 'center' }}>
        {definition || 'Definition hidden'}
      </Paragraph>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="输入拼写并回车"
          style={{ flex: 1, padding: '10px 12px', fontSize: 16, border: `1px solid ${borderColor}`, borderRadius: 6 }}
          onKeyDown={(e) => { if ((e as any).key === 'Enter') check(); }}
          aria-label="spelling-input"
        />
        <Button type="primary" onClick={check}>提交</Button>
      </div>
      {submitted !== null && (
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          {submitted ? (
            <Text type="success">正确！</Text>
          ) : (
            <Text type="danger">不正确，答案：{targetWord}</Text>
          )}
        </div>
      )}
    </div>
  );
};

export default SpellingQuestion;