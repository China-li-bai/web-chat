import React from 'react';
import { Modal, Space, Button, Select, Slider, Typography } from 'antd';

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
    resetDefaults, clearSaved,
  } = tts;

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
            placeholder={voices?.length ? '选择系统语音' : '未加载或不支持'}
            allowClear
          >
            {voices && voices.length ? voices.map((v) => (
              <Option key={v.name} value={v.name}>{v.name} ({v.lang})</Option>
            )) : null}
          </Select>
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
      </div>
    </Modal>
  );
}