import React from 'react';
import { Modal, Space, Button, Select, Slider, Typography, Switch } from 'antd';
import { detectBrowser } from '@/lib/speech/webSpeech.js';

const { Text } = Typography;
const { Option } = Select;

/**
 * Reusable Voice Settings Modal
 * Props:
 * - open: boolean
 * - onCancel: () => void
 * - onSave?: () => void (default: close)
 * - tts: {
 *     voiceLang, setVoiceLang,
 *     voiceRate, setVoiceRate,
 *     voicePitch, setVoicePitch,
 *     voiceVolume, setVoiceVolume,
 *     selectedVoiceName, setSelectedVoiceName,
 *     voices,
 *     voiceStyle, setVoiceStyle,
 *     expressiveEnabled, setExpressiveEnabled,
 *     segmentPauseMs, setSegmentPauseMs,
 *     expressiveJitter, setExpressiveJitter,
 *     resetDefaults, clearSaved,
 *   }
 */
export default function VoiceSettingsModal({ open, onCancel, onSave, tts }) {
  if (!tts) return null;
  const {
    voiceLang, setVoiceLang,
    voiceRate, setVoiceRate,
    voicePitch, setVoicePitch,
    voiceVolume, setVoiceVolume,
    selectedVoiceName, setSelectedVoiceName,
    voices,
    voiceStyle, setVoiceStyle,
    expressiveEnabled, setExpressiveEnabled,
    segmentPauseMs, setSegmentPauseMs,
    expressiveJitter, setExpressiveJitter,
    resetDefaults, clearSaved,
  } = tts;

  // 根据浏览器做推荐排序（Chrome: Google；Edge: Microsoft；Safari: 苹果系统常见声线；Firefox/其他：Google/Microsoft 优先）
  const browser = React.useMemo(() => detectBrowser(), []);
  const isRecommended = React.useCallback((v) => {
    const name = v?.name || '';
    switch (browser) {
      case 'chrome':
      case 'ios_chrome':
        return /google/i.test(name);
      case 'edge':
        return /microsoft/i.test(name);
      case 'safari':
      case 'ios_safari':
        return /(Samantha|Alex|Victoria|Ting-?Ting|Mei-?Jia|Sin-?ji|Kyoko|Otoya|Yoko)/i.test(name);
      default:
        return /google|microsoft/i.test(name);
    }
  }, [browser]);

  const voicesSorted = React.useMemo(() => {
    const arr = voices || [];
    const recommended = arr.filter(isRecommended);
    const others = arr.filter((v) => !isRecommended(v));
    return [...recommended, ...others];
  }, [voices, isRecommended]);

  const handleSave = () => {
    if (typeof onSave === 'function') onSave();
    else if (typeof onCancel === 'function') onCancel();
  };

  return (
    <Modal
      title="语音设置"
      open={open}
      onCancel={onCancel}
      footer={
        <Space>
          <Button onClick={resetDefaults}>恢复默认</Button>
          <Button onClick={clearSaved}>清除已保存</Button>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </Space>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Text strong>语言：</Text>
          <Select value={voiceLang} onChange={setVoiceLang} style={{ width: 160, marginLeft: 8 }} size="small">
            <Option value="en-US">English (US)</Option>
            <Option value="en-GB">English (UK)</Option>
            <Option value="zh-CN">中文（大陆）</Option>
            <Option value="zh-TW">中文（台湾）</Option>
            <Option value="ja-JP">日本語</Option>
          </Select>
        </div>
        <div>
          <Text strong>系统语音：</Text>
          <Select
            value={selectedVoiceName}
            onChange={setSelectedVoiceName}
            style={{ width: 220, marginLeft: 8 }}
            size="small"
            placeholder={voicesSorted?.length ? '默认系统语音（已根据浏览器自动推荐）' : '未加载或不支持'}
            allowClear
          >
            {voicesSorted && voicesSorted.length ? voicesSorted.map((v) => (
              <Option key={v.name} value={v.name}>
                {v.name} ({v.lang}) {(isRecommended(v) ? '· 推荐' : '')}
              </Option>
            )) : null}
          </Select>
          <div style={{ marginTop: 6 }}>
            <Text type="secondary">默认使用系统语音；已根据浏览器自动推荐（Chrome: Google；Edge: Microsoft；Safari: 苹果系统常见声线）。在 Chrome/Edge 下更容易体现音高/语速与风格的变化。</Text>
          </div>
        </div>
        <div>
          <Text strong>语速：</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Slider min={0.5} max={2.0} step={0.1} value={voiceRate} onChange={setVoiceRate} style={{ flex: 1 }} />
            <Text>{voiceRate.toFixed(1)}</Text>
          </div>
        </div>
        <div>
          <Text strong>音调：</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Slider min={0.0} max={2.0} step={0.1} value={voicePitch} onChange={setVoicePitch} style={{ flex: 1 }} />
            <Text>{voicePitch.toFixed(1)}</Text>
          </div>
        </div>
        <div>
          <Text strong>音量：</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Slider min={0.0} max={1.0} step={0.1} value={voiceVolume} onChange={setVoiceVolume} style={{ flex: 1 }} />
            <Text>{voiceVolume.toFixed(1)}</Text>
          </div>
        </div>
        <div>
          <Text strong>语音风格：</Text>
          <Select
            value={voiceStyle}
            onChange={setVoiceStyle}
            style={{ width: 160, marginLeft: 8 }}
            size="small"
          >
            <Option value="professional">专业</Option>
            <Option value="cheerful">愉快</Option>
            <Option value="calm">平静</Option>
            <Option value="energetic">活力</Option>
            <Option value="friendly">友好</Option>
            <Option value="serious">严肃</Option>
          </Select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Text strong>表达增强：</Text>
          <Switch
            checked={expressiveEnabled}
            onChange={setExpressiveEnabled}
            style={{ marginLeft: 12 }}
            size="small"
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
        </div>
      </div>

      {/* 高级：表达增强参数 */}
      <div style={{ marginTop: 12 }}>
        <Text type="secondary">高级参数（表达增强）：</Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
          <div>
            <Text>段落停顿（ms）：</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Slider min={60} max={800} step={10} value={segmentPauseMs} onChange={setSegmentPauseMs} style={{ flex: 1 }} />
              <Text>{segmentPauseMs}ms</Text>
            </div>
          </div>
          <div>
            <Text>自然随机扰动（jitter）：</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Slider min={0.0} max={0.3} step={0.01} value={expressiveJitter} onChange={setExpressiveJitter} style={{ flex: 1 }} />
              <Text>{expressiveJitter.toFixed(2)}</Text>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}