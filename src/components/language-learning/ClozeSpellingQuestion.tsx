import React, { useMemo, useState, useCallback } from 'react';
import { Button, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

export interface ClozeSpellingQuestionProps {
  word: string;
  sentence?: string; // 例句优先
  definition?: string; // 无例句时作为提示
  onResult: (ok: boolean) => void;
}

/**
 * 拼写填空题
 * - 将例句中的目标单词隐藏为下划线，用户输入单词作答
 * - 即时反馈：输入过程前缀匹配提示与边框颜色
 * - 提交：Enter 或按钮；大小写/首尾空格无关
 */
export const ClozeSpellingQuestion: React.FC<ClozeSpellingQuestionProps> = ({ word, sentence, definition, onResult }) => {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState<null | boolean>(null);

  const normalizedTarget = useMemo(() => (word || '').trim().toLowerCase(), [word]);

  // 例句中隐藏目标词为下划线（大小写不敏感），若例句未包含该词则在末尾附加空格
  const clozeText = useMemo(() => {
    const target = normalizedTarget;
    const src = (sentence || '').trim();
    if (!src || !target) return '';
    try {
      const esc = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${esc}\\b`, 'gi');
      const blanks = '_'.repeat(target.length);
      const replaced = src.replace(re, blanks);
      if (replaced === src) return `${src}  ——  ${blanks}`;
      return replaced;
    } catch {
      const blanks = '_'.repeat(target.length);
      return `${src}  ——  ${blanks}`;
    }
  }, [sentence, normalizedTarget]);

  // 简易相似度与逐字高亮（与 SpellingQuestion 保持一致风格）
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

  const trimmed = value.trim().toLowerCase();
  const liveOk = trimmed.length > 0 && normalizedTarget.startsWith(trimmed);
  const borderColor = submitted === null ? (liveOk ? '#91d5ff' : '#d9d9d9') : submitted ? '#52c41a' : '#ff4d4f';

  const check = useCallback(() => {
    const ok = trimmed === normalizedTarget;
    setSubmitted(ok);
    onResult(ok);
    try {
      if (navigator.vibrate) navigator.vibrate(ok ? 10 : 30);
    } catch {}
  }, [trimmed, normalizedTarget, onResult]);

  return (
    <div className="cloze-spelling-card">
      <Title level={3} style={{ textAlign: 'center' }}>拼写填空</Title>
      {clozeText ? (
        <Paragraph style={{ textAlign: 'center', fontSize: 16 }}>{clozeText}</Paragraph>
      ) : (
        <Paragraph type="secondary" style={{ textAlign: 'center' }}>
          {definition ? `提示：${definition}` : '请根据提示输入单词'}
        </Paragraph>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setSubmitted(null); }}
          placeholder="输入缺失的单词并回车"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          style={{ flex: 1, padding: '10px 12px', fontSize: 16, border: `1px solid ${borderColor}`, borderRadius: 6 }}
          onKeyDown={(e) => { if ((e as any).key === 'Enter') check(); }}
          aria-label="cloze-spelling-input"
        />
        <Button type="primary" onClick={check}>提交</Button>
      </div>

      <div style={{ marginTop: 8, textAlign: 'center' }}>
        {submitted === null ? (
          <>
            {trimmed.length === 0 ? (
              <Text type="secondary">继续输入…</Text>
            ) : liveOk ? (
              <Text type="secondary">部分匹配，继续</Text>
            ) : (
              <Text type="danger">拼写有误，检查字母顺序</Text>
            )}
            <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>
              相似度：{similarityInfo.score}%&nbsp;|&nbsp;目标：{similarityInfo.highlighted}
            </div>
          </>
        ) : submitted ? (
          <Text type="success">正确！</Text>
        ) : (
          <>
            <Text type="danger">不正确，答案：{word}</Text>
            <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>
              相似度：{similarityInfo.score}%&nbsp;|&nbsp;目标：{similarityInfo.highlighted}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClozeSpellingQuestion;