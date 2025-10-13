import React, { useState, useCallback } from 'react';
import { Button, Typography } from 'antd';

const { Title, Paragraph } = Typography;

export interface SpellingQuestionProps {
  targetWord: string;
  definition: string;
  onResult: (ok: boolean) => void;
}

/**
 * 拼写题（占位版）
 * - 本地管理输入状态，回车/按钮提交
 */
export const SpellingQuestion: React.FC<SpellingQuestionProps> = ({ targetWord, definition, onResult }) => {
  const [value, setValue] = useState('');

  const check = useCallback(() => {
    const ok = value.trim().toLowerCase() === (targetWord || '').trim().toLowerCase();
    onResult(ok);
  }, [value, targetWord, onResult]);

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
          style={{ flex: 1, padding: '10px 12px', fontSize: 16 }}
          onKeyDown={(e) => { if ((e as any).key === 'Enter') check(); }}
        />
        <Button type="primary" onClick={check}>提交</Button>
      </div>
    </div>
  );
};

export default SpellingQuestion;