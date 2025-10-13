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

  // 计算相似度（简易 Levenshtein 距离转相似度）
  const similarityInfo = useMemo(() => {
    const a = value.trim().toLowerCase();
    const b = normalizedTarget;
    if (!a || !b) return { score: 0, highlighted: null as any };
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    const dist = dp[a.length][b.length];
    const maxLen = Math.max(a.length, b.length) || 1;
    const score = Math.max(0, Math.round((1 - dist / maxLen) * 100));
    // 简易逐字高亮：正确字符绿色，错误字符红色
    const highlighted = (
      <span>
        {Array.from(b).map((ch, idx) => {
          const ok = a[idx] === ch;
          return <span key={idx} style={{ color: ok ? '#52c41a' : '#ff4d4f' }}>{ch}</span>;
        })}
      </span>
    );
    return { score, highlighted };
  }, [value, normalizedTarget]);

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
            <>
              <Text type="danger">不正确，答案：{targetWord}</Text>
              <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>
                相似度：{similarityInfo.score}%&nbsp;|&nbsp;目标：{similarityInfo.highlighted}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SpellingQuestion;