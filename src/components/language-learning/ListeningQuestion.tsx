import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Button, Space, Typography, Select, Slider } from 'antd';

const { Title } = Typography;

export interface ListeningQuestionProps {
  word: string;
  isFlipped: boolean;
  onFlip: () => void;
  onResult: (ok: boolean) => void;
}

/**
 * 听力题（占位加强版）
 * - 语音/语速选择
 * - 播放节流，防止连续触发
 */
export const ListeningQuestion: React.FC<ListeningQuestionProps> = ({ word, isFlipped, onFlip, onResult }) => {
  const [voiceName, setVoiceName] = useState<string>('default');
  const [rate, setRate] = useState<number>(0.9);
  const playingRef = useRef(false);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // 动态加载可用语音（部分浏览器需 onvoiceschanged 事件）
  const loadVoices = useCallback(() => {
    try {
      const list = (window.speechSynthesis?.getVoices?.() || []).filter(v => v.lang.toLowerCase().startsWith('en'));
      setVoices(list);
    } catch {
      setVoices([]);
    }
  }, []);

  React.useEffect(() => {
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if ('speechSynthesis' in window) {
        // @ts-ignore
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices]);

  const speak = useCallback(() => {
    try {
      if (!('speechSynthesis' in window) || !word || playingRef.current) return;
      playingRef.current = true;
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-US';
      u.rate = rate;
      const v = voices.find(v => v.name === voiceName);
      if (v) u.voice = v;
      u.onend = () => { playingRef.current = false; };
      u.onerror = () => { playingRef.current = false; };
      window.speechSynthesis.speak(u);
    } catch (e) {
      playingRef.current = false;
      console.error('speak failed', e);
    }
  }, [word, voiceName, voices, rate]);

  return (
    <div className="listening-card">
      <Title level={3} style={{ textAlign: 'center' }}>听写该单词</Title>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Select
          size="small"
          value={voiceName}
          style={{ minWidth: 160 }}
          onChange={setVoiceName}
          options={[{ label: 'Default', value: 'default' }, ...voices.map(v => ({ label: v.name, value: v.name }))]}
        />
        <div style={{ width: 180 }}>
          <div style={{ fontSize: 12, marginBottom: 4 }}>语速</div>
          <Slider min={0.6} max={1.2} step={0.05} value={rate} onChange={setRate as any} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
        <Button onClick={speak} disabled={!word}>播放发音</Button>
        <Button onClick={speak} disabled={!word}>重复播放</Button>
        <Button onClick={onFlip}>显示答案</Button>
      </div>
      {isFlipped && (
        <div style={{ textAlign: 'center' }}>
          <Title level={4}>{word}</Title>
          <Space>
            <Button danger onClick={() => onResult(false)}>没听出</Button>
            <Button type="primary" onClick={() => onResult(true)}>听出来了</Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default ListeningQuestion;