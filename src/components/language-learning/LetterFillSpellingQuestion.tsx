import React, { useMemo, useState, useCallback } from 'react';
import { Button, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

export interface LetterFillSpellingQuestionProps {
  word: string;
  definition?: string;
  onResult: (ok: boolean) => void;
  blanksCount?: number;      // 可选：空位数量（默认按单词长度自适应）
  distractorCount?: number;  // 每个空位的干扰项数量（默认 3）
  seed?: number;             // 稳定随机种子（可选）
}

/**
 * 字母选择填空拼写题
 * - 将单词中若干字母隐藏为下划线
 * - 每个空位下方提供若干候选字母按钮，用户点击填入
 * - 填满后可提交；即时反馈：正确/错误提示
 * - 移动端友好：较大的触控区与简单布局
 */
export const LetterFillSpellingQuestion: React.FC<LetterFillSpellingQuestionProps> = ({
  word,
  definition,
  onResult,
  blanksCount,
  distractorCount = 3,
  seed
}) => {
  const normalized = useMemo(() => (word || '').trim(), [word]);
  const letters = useMemo(() => Array.from(normalized), [normalized]);

  // 简单可重复随机
  const rng = useMemo(() => {
    let s = typeof seed === 'number' ? seed : (normalized.length * 9973) % 2147483647;
    return () => {
      s = (s * 48271) % 2147483647;
      return s / 2147483647;
    };
  }, [normalized, seed]);

  // 选择需要隐藏的位置：倾向中间，首尾尽量保留
  const blankPositions = useMemo(() => {
    const n = letters.length;
    const targetBlanks = Math.max(2, Math.min(Math.floor(n * 0.4), n - 2));
    const count = typeof blanksCount === 'number' ? Math.max(1, Math.min(blanksCount, n - 1)) : targetBlanks;
    const idxs = new Set<number>();
    while (idxs.size < count) {
      const r = rng();
      const candidate = Math.min(n - 2, Math.max(1, Math.floor(1 + r * (n - 2)))); // 1..n-2
      idxs.add(candidate);
    }
    return Array.from(idxs).sort((a, b) => a - b);
  }, [letters, blanksCount, rng]);

  // 当前填入状态
  const [fills, setFills] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<null | boolean>(null);

  // 为每个空位生成候选字母：正确字母 + 干扰项
  const optionsForBlank = useCallback((pos: number): string[] => {
    const correct = letters[pos];
    const pool = new Set<string>();
    pool.add(correct.toLowerCase());
    // 先从单词内取不同字母
    for (const ch of letters) {
      if (pool.size > distractorCount) break;
      const low = ch.toLowerCase();
      if (low !== correct.toLowerCase()) pool.add(low);
    }
    // 再补全英文字母
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    let tries = 0;
    while (pool.size < distractorCount + 1 && tries < alphabet.length * 2) {
      const pick = alphabet[Math.floor(rng() * alphabet.length)];
      if (pick.toLowerCase() !== correct.toLowerCase()) pool.add(pick.toLowerCase());
      tries++;
    }
    // 打乱顺序
    const arr = Array.from(pool);
    for (let j = arr.length - 1; j > 0; j--) {
      const k = Math.floor(rng() * (j + 1));
      [arr[j], arr[k]] = [arr[k], arr[j]];
    }
    return arr.slice(0, distractorCount + 1);
  }, [letters, distractorCount, rng]);

  const isComplete = useMemo(() => blankPositions.every((p) => typeof fills[p] === 'string' && fills[p].length > 0), [blankPositions, fills]);

  const composed = useMemo(() => {
    const arr = letters.slice();
    blankPositions.forEach((p) => {
      const v = (fills[p] ?? '').slice(0, 1);
      arr[p] = v ? v : '_';
    });
    return arr.join('');
  }, [letters, blankPositions, fills]);

  const check = useCallback(() => {
    const ok = composed.toLowerCase() === normalized.toLowerCase();
    setSubmitted(ok);
    onResult(ok);
    try { if (navigator.vibrate) navigator.vibrate(ok ? 10 : 30); } catch {}
  }, [composed, normalized, onResult]);

  const handlePick = useCallback((pos: number, ch: string) => {
    setSubmitted(null);
    setFills((prev) => ({ ...prev, [pos]: ch }));
  }, []);

  return (
    <div className="letter-fill-spelling-card">
      <Title level={3} style={{ textAlign: 'center' }}>字母选择填空</Title>
      {definition && (
        <Paragraph type="secondary" style={{ textAlign: 'center' }}>{definition}</Paragraph>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }} aria-label="letter-fill-word">
        {letters.map((ch, idx) => {
          const isBlank = blankPositions.includes(idx);
          const filled = fills[idx];
          return (
            <span
              key={idx}
              style={{
                minWidth: 28,
                minHeight: 36,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '2px solid #d9d9d9',
                fontSize: 20,
                margin: '0 4px'
              }}
            >
              {isBlank ? (filled || '') : ch}
            </span>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        {blankPositions.map((pos) => {
          const opts = optionsForBlank(pos);
          const picked = fills[pos] ?? '';
          return (
            <div key={pos} style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              {opts.map((o, i) => (
                <Button
                  key={i}
                  size="small"
                  type={picked === o ? 'primary' : 'default'}
                  onClick={() => handlePick(pos, o)}
                  style={{ minWidth: 36 }}
                >
                  {o.toUpperCase()}
                </Button>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, textAlign: 'center' }}>
        {submitted === null ? (
          <>
            {!isComplete ? (
              <Text type="secondary">请选择所有空位的字母</Text>
            ) : (
              <Text type="secondary">已填完，点击提交</Text>
            )}
          </>
        ) : submitted ? (
          <Text type="success">正确！</Text>
        ) : (
          <>
            <Text type="danger">不正确，答案：{word}</Text>
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
        <Button type="primary" onClick={check} disabled={!isComplete}>提交</Button>
      </div>
    </div>
  );
};

export default LetterFillSpellingQuestion;