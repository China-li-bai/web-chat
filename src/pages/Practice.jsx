import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Progress,
  Alert,
  Divider,
  Row,
  Col,

  Modal,
  Spin,
  Select,
  Switch,
  Tooltip,
  message,
  Input,
  Slider
} from 'antd';
import {
  AudioOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  SettingOutlined,
  BulbOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import AITutorFeedback from '../components/AITutorFeedback';
import GeminiSettings from '../components/GeminiSettings';
import AiGenerateModal from '@/components/AiGenerateModal';
import { generateTTS, playAudio } from '../utils/apiManager.js';
import { getOrGenerateTTS, clearAllCache, preInitCache, getCacheInitStatus } from '../services/ttsCacheService.js';
import { beginPracticeSession, completeTurn, appendMessage, getLatestSession, getLatestTurn } from '@/services/practice-dao';
import { useAppStore } from '@/store/useAppStore';
import { saveGeneratedPractice, normalizeDialogueRoles } from '@/services/practice-persist';
import { getDialogue, getTips, getVocabulary, getReferenceText } from '@/services/practice-query';
import useMicrophone from '@/hooks/useMicrophone';
import useTTSSettings from '@/hooks/useTTSSettings';
import VoiceSettingsModal from '@/components/VoiceSettingsModal';
import { speakText, cancelSpeech, pickVoice as pickVoiceLib, isWebSpeechSupported } from '@/lib/speech';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const WaveformCanvas = ({ blob }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!blob) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    blob.arrayBuffer().then((buf) => {
      audioCtx.decodeAudioData(buf).then((audioBuf) => {
        const data = audioBuf.getChannelData(0);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const width = canvas.width;
        const height = canvas.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = '#1890ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const step = Math.max(1, Math.floor(data.length / width));
        for (let i = 0; i < width; i++) {
          const start = i * step;
          let min = 1.0, max = -1.0;
          for (let j = 0; j < step; j++) {
            const v = data[start + j];
            if (v < min) min = v;
            if (v > max) max = v;
          }
          const y1 = (1 - (max + 1) / 2) * height;
          const y2 = (1 - (min + 1) / 2) * height;
          ctx.moveTo(i, y1);
          ctx.lineTo(i, y2);
        }
        ctx.stroke();
      }).catch(() => {});
    }).catch(() => {});
    return () => {
      try { audioCtx.close(); } catch {}
    };
  }, [blob]);
  return (
    <canvas ref={canvasRef} width={500} height={80} style={{ width: '100%', height: 80, background: '#f5f5f5', borderRadius: 6 }} />
  );
};

const Practice = () => {
  // 麥克風控制（抽象為 Hook）
  const {
    micPermission,
    requestMicrophonePermission: requestMicPermission,
    isRecording,
    startRecording: micStartRecording,
    stopRecording: micStopRecording,
    recordedAudioUrl,
    isPlaying,
    togglePlayback: micTogglePlayback,
    resetRecording: micResetRecording,
    audioRef,
    audioBlob,
  } = useMicrophone();

  const [transcription, setTranscription] = useState('');
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [practiceText, setPracticeText] = useState('Hello, how are you today? I hope you are having a wonderful day.');
  const [sessionId, setSessionId] = useState(null);
  const [turnId, setTurnId] = useState(null);
  const [dialogueList, setDialogueList] = useState([]);
  const [tipsList, setTipsList] = useState([]);
  const [vocabList, setVocabList] = useState([]);
  const [showChinese, setShowChinese] = useState(false);

  // AI導師相關狀態
  const [aiTutorEnabled, setAiTutorEnabled] = useState(true);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [aiSettings, setAiSettings] = useState(null);
  const [userGoal, setUserGoal] = useState('');


  const [showAiModal, setShowAiModal] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState('intermediate');

  // 語音風格選擇
  const [voiceStyle, setVoiceStyle] = useState('professional');
  const [ttsSource, setTtsSource] = useState(null);

  // 語音參數控制狀態（抽离为通用Hook）
  const tts = useTTSSettings('tts_settings');
  const {
    voiceLang, setVoiceLang,
    voiceRate, setVoiceRate,
    voicePitch, setVoicePitch,
    voiceVolume, setVoiceVolume,
    voices, setVoices,
    selectedVoiceName, setSelectedVoiceName,
  } = tts;

  // 播放控制
  const [selectedPlaybackText, setSelectedPlaybackText] = useState('');
  const [loopPlayback, setLoopPlayback] = useState(false);
  const [autoPlayConversation, setAutoPlayConversation] = useState(false);
  const [autoPlayIndex, setAutoPlayIndex] = useState(0);

 const userId = useAppStore((state) => state.userId)
  const practiceHistory = useAppStore((state) => state.practiceHistory)
  const addPracticeRecord = useAppStore((state) => state.addPracticeRecord)
  // 请求麦克风权限函数
  // 使用 Hook 封裝的權限請求，保持原方法名兼容
  const requestMicrophonePermission = async () => {
    return await requestMicPermission();
  };

  // 组件加载时请求麦克风权限 + 尝试加载最近一次会话
  useEffect(() => {
    requestMicrophonePermission();

    (async () => {
     
      const latestSession = await getLatestSession(userId);
      if (latestSession) {
        setSessionId(latestSession.id);
        const latestTurn = await getLatestTurn(latestSession.id);
        if (latestTurn?.referenceText) {
          const rt = latestTurn.referenceText;
          let textOut = rt;
          if (typeof rt === 'string') {
            const s = rt.trim();
            if (s.startsWith('{') && s.endsWith('}')) {
              try {
                const obj = JSON.parse(s);
                if (obj && typeof obj.referenceText === 'string') {
                  textOut = obj.referenceText;
                }
              } catch (err) {
                console.warn('Failed to parse latestTurn.referenceText JSON, fallback to raw string:', err);
              }
            }
          }
          setPracticeText(textOut);
        }
      }
    })();
  }, []);
  
  // 当已有 sessionId 时，加载结构化对话、tips、词汇与参考文本
  useEffect(() => {
    (async () => {
      console.log({sessionId});
      
      if (!sessionId) return;
      try {
        const [dialogue, tips, vocab, refText] = await Promise.all([
          getDialogue(sessionId),
          getTips(sessionId),
          getVocabulary(sessionId),
          getReferenceText(sessionId)
        ]);
        console.log({dialogue});
        
        setDialogueList(dialogue || []);
        setTipsList(tips || []);
        setVocabList(vocab || []);
        console.log({refText,dialogue});
        
        if (refText && !practiceText) setPracticeText(refText);
      } catch (err) {
        console.warn('加载会话内容失败:', err);
      }
    })();
  }, [sessionId]);





  // 检查是否在Tauri环境中
  const isTauriApp = () => {
    return typeof window !== 'undefined' && window.__TAURI__;
  };

  // 加載系統語音列表（由 useTTSSettings Hook 管理）
  // 本地加载逻辑已移除，以避免重复绑定 onvoiceschanged

  // 加載AI設置和初始化缓存系统
  useEffect(() => {
    loadAISettings();

    // 预初始化缓存系统
    preInitCache().then(success => {
      if (success) {
        console.log('缓存系统初始化成功');
      } else {
        console.warn('缓存系统初始化可能不完整，将使用降级策略');
      }
    });
  }, []);

  const loadAISettings = () => {
    try {
      const savedSettings = localStorage.getItem('gemini_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setAiSettings(settings);
        setAiTutorEnabled(settings.enableAIFeedback !== false);
        setDifficultyLevel(settings.difficultyLevel || 'intermediate');
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    }
  };




  // 處理AI設置變更
  const handleSettingsChange = (settings) => {
    setAiSettings(settings);
    setAiTutorEnabled(settings.enableAIFeedback !== false);
    setDifficultyLevel(settings.difficultyLevel || 'intermediate');
  };

  // 开始录音
  // 開始錄音：委派給 useMicrophone
  const startRecording = async () => {
    try {
      await micStartRecording();
      console.log('录音开始');
    } catch (error) {
      console.error('录音失败:', error);
      let errorMessage = '无法访问麦克风，请检查权限设置。';
      if (error && error.name === 'NotAllowedError') {
        errorMessage = '麦克风权限被拒绝。请在浏览器地址栏左侧点击锁图标，允许麦克风权限后重试。';
      } else if (error && error.name === 'NotFoundError') {
        errorMessage = '未找到麦克风设备，请检查设备连接。';
      } else if (error && error.name === 'NotSupportedError') {
        errorMessage = '当前浏览器不支持录音功能，建议使用Chrome或Firefox浏览器。';
      }
      Modal.error({ title: '录音失败', content: errorMessage });
    }
  };

  // 停止录音
  // 停止錄音：委派給 useMicrophone，並在拿到音頻後觸發處理
  const stopRecording = async () => {
    try {
      const blob = await micStopRecording();
      if (blob) {
        await processAudio(blob);
      }
    } catch (e) {
      console.error('停止錄音或處理音頻時發生錯誤:', e);
      Modal.error({ title: '停止錄音失敗', content: e?.message || '未知錯誤' });
    }
  };

  // 处理音频
  const processAudio = async (audioBlob) => {
    setLoading(true);
    try {
      if (isTauriApp()) {
        // Tauri环境：使用后端API
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result.split(',')[1];

          const text = await invoke('speech_to_text', { audioData: base64Audio });
          setTranscription(text);

          const scoreResult = await invoke('pronunciation_score', {
            audioData: base64Audio,
            referenceText: practiceText
          });
          setScores(scoreResult);

          // 写入练习记录
          try {
            const el = audioRef.current;
            const durationSec = (el && !isNaN(el.duration) && el.duration) ? Math.round(el.duration) : 0;
            addPracticeRecord({
              timestamp: new Date().toISOString(),
              duration: durationSec,
              score: { overall: scoreResult?.overall ?? 0 },
              category: 'practice',
              difficulty: difficultyLevel,
            });
          } catch (e) {
            console.warn('添加练习记录失败（Tauri）:', e);
          }

          // 回写 Turn（本地存储）
          if (turnId) {
            await completeTurn({
              turnId,
              transcription: text,
              scoresOverall: scoreResult?.overall,
              scoresPronunciation: scoreResult?.pronunciation,
              scoresFluency: scoreResult?.fluency,
              scoresCompleteness: scoreResult?.completeness,
            });
          }

          if (aiTutorEnabled && aiSettings?.apiKey) {
            setShowAIFeedback(true);
          }
        };
        reader.readAsDataURL(audioBlob);
      } else {
        // H5环境：模拟处理结果
        setTimeout(async () => {
          const mockText = '这是模拟的语音识别结果：' + practiceText.substring(0, 20) + '...';
          setTranscription(mockText);
          const mockScores = {
            overall: Math.floor(Math.random() * 30) + 70,
            pronunciation: Math.floor(Math.random() * 30) + 70,
            fluency: Math.floor(Math.random() * 30) + 70,
            completeness: Math.floor(Math.random() * 30) + 70
          };
          setScores(mockScores);

          // 写入练习记录
          try {
            const el = audioRef.current;
            const durationSec = (el && !isNaN(el.duration) && el.duration) ? Math.round(el.duration) : 0;
            addPracticeRecord({
              timestamp: new Date().toISOString(),
              duration: durationSec,
              score: { overall: mockScores?.overall ?? 0 },
              category: 'practice',
              difficulty: difficultyLevel,
            });
          } catch (e) {
            console.warn('添加练习记录失败（H5）:', e);
          }

          if (turnId) {
            await completeTurn({
              turnId,
              transcription: mockText,
              scoresOverall: mockScores.overall,
              scoresPronunciation: mockScores.pronunciation,
              scoresFluency: mockScores.fluency,
              scoresCompleteness: mockScores.completeness,
            });
          }

          if (aiTutorEnabled && aiSettings?.apiKey) {
            setShowAIFeedback(true);
          }

          setLoading(false);
        }, 2000);
        return;
      }
    } catch (error) {
      console.error('处理音频失败:', error);
      Modal.error({
        title: '处理失败',
        content: '音频处理失败，请重试。',
      });
    } finally {
      if (isTauriApp()) {
        setLoading(false);
      }
    }
  };

  // 播放录音
  // 播放/暫停錄音：委派給 useMicrophone 的切換邏輯
  const playRecording = () => {
    if (recordedAudioUrl && audioRef.current) {
      micTogglePlayback();
    } else {
      message.warning('暂无录音，请先录制。');
    }
  };

  // 播放示例音频（支持動態參數 + 循環）
  const playExample = async () => {
    try {
      const text = (selectedPlaybackText && selectedPlaybackText.trim()) ? selectedPlaybackText : practiceText;
      if (!text) {
        message.warning('請先選擇或輸入播放文本');
        return;
      }
      if (isTauriApp()) {
        try {
          const audioData = await invoke('text_to_speech', { text, lang: voiceLang, rate: voiceRate, pitch: voicePitch, volume: voiceVolume });
          console.log('播放示例音频(Tauri):', audioData);
          message.success('已調用 TTS（Tauri）');
        } catch (e) {
          console.warn('Tauri 調用失敗或不支持參數:', e);
          message.error('Tauri 調用失敗');
        }
      } else {
        try {
          const result = await speakText(text, {
            lang: voiceLang,
            rate: voiceRate,
            pitch: voicePitch,
            volume: voiceVolume,
            voiceName: selectedVoiceName,
            loop: loopPlayback,
          });
          message.success(loopPlayback ? '正在循環播放示例...' : '正在播放示例音频...');
        } catch (e) {
          Modal.info({
            title: '示例音频',
            content: '当前环境无法播放语音（Tauri/Web Speech不可用），请使用支持的浏览器或启用Tauri。',
          });
        }
      }
    } catch (error) {
      console.error('播放示例失败:', error);
      message.error('播放示例音频失败，请重试。');
    }
  };

  // 單條文本播放（對話列表）
  const pickVoiceGender = (lang, genderHint, namePref) => {
    const list = Array.isArray(window.speechSynthesis?.getVoices?.()) ? window.speechSynthesis.getVoices() : [];
    if (namePref) {
      const v = list.find((v) => v.name === namePref);
      if (v) return v;
    }
    const langPrefix = (lang || '').toLowerCase().slice(0, 2);
    const byLang = list.filter((v) => (v.lang || '').toLowerCase().startsWith(langPrefix));
    if (genderHint === 'female') {
      const vf = byLang.find((v) => /female|woman|girl/i.test(v.name)) || byLang.find((v) => /female|woman|girl/i.test(v.voiceURI));
      if (vf) return vf;
    } else if (genderHint === 'male') {
      const vm = byLang.find((v) => /male|man|boy/i.test(v.name)) || byLang.find((v) => /male|man|boy/i.test(v.voiceURI));
      if (vm) return vm;
    }
    return byLang[0] || list[0] || null;
  };

  const playTextOnce = (text, roleHint) => {
    if (!text) return message.warning('文本為空');
    if (isTauriApp()) {
      invoke('text_to_speech', { text, lang: voiceLang, rate: voiceRate, pitch: voicePitch, volume: voiceVolume }).catch(() => {
        message.info('已調用 TTS（Tauri），語音參數可能不支持');
      });
      return;
    }
    if (!('speechSynthesis' in window)) {
      return Modal.info({ title: '示例音频', content: '您的浏览器不支持语音合成，请使用 Chrome / Firefox / Edge。' });
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voiceLang;
    utter.rate = voiceRate;
    utter.pitch = voicePitch;
    utter.volume = voiceVolume;
    const v = pickVoiceGender(voiceLang, roleHint === 'assistant' ? 'male' : 'female', selectedVoiceName);
    if (v) utter.voice = v;
    window.speechSynthesis.speak(utter);
  };

  const startAutoPlay = () => {
    if (!dialogueList || dialogueList.length === 0) {
      return message.warning('對話列表為空');
    }
    if (isTauriApp()) {
      message.warning('Tauri 環境暫不支持自動播放對話');
      return;
    }
    setAutoPlayConversation(true);
    setAutoPlayIndex(0);
    window.speechSynthesis.cancel();
    const playIdx = (i) => {
      const m = dialogueList[i];
      if (!m) {
        setAutoPlayConversation(false);
        return;
      }
      const utter = new SpeechSynthesisUtterance(m.content || '');
      utter.lang = voiceLang;
      utter.rate = voiceRate;
      utter.pitch = voicePitch;
      utter.volume = voiceVolume;
      const v = pickVoiceGender(voiceLang, m.role === 'assistant' ? 'male' : 'female', selectedVoiceName);
      if (v) utter.voice = v;
      utter.onend = () => {
        const next = i + 1;
        setAutoPlayIndex(next);
        if (autoPlayConversation) playIdx(next);
      };
      window.speechSynthesis.speak(utter);
    };
    playIdx(0);
  };

  const stopAutoPlay = () => {
    setAutoPlayConversation(false);
    try { window.speechSynthesis.cancel(); } catch {}
  };

  // 播放Gemini示例 - Local-first（优先本地缓存）
  const playGeminiExample = async () => {
    if (!practiceText) {
      message.warning('请先选择练习内容');
      return;
    }

    const messageKey = 'gemini-tts';

    try {
      message.loading({ content: '🤖 正在查找本地缓存/生成语音...', key: messageKey, duration: 0 });

      // 检查缓存系统状态
      const cacheStatus = getCacheInitStatus();
      console.log('[playGeminiExample] 缓存系统状态:', cacheStatus);

      // 如果缓存系统未初始化，尝试初始化
      if (!cacheStatus.initialized) {
        console.log('[playGeminiExample] 缓存系统未初始化，尝试初始化...');
        await preInitCache();
      }

      const lang = 'en-US';
      const params = { text: practiceText, voiceStyle, lang, provider: 'gemini', version: 'v2.5-flash-preview-tts' };
      console.log('[playGeminiExample] 缓存参数:', params);

      const result = await getOrGenerateTTS(params, async () => {
        console.log('[playGeminiExample] 缓存未命中，调用生成器...');
        const r = await generateTTS(practiceText, voiceStyle);
        return { audioBlob: r.audioBlob, mimeType: r.mimeType, voiceName: r.voiceName, style: r.style };
      });

      console.log('[playGeminiExample] TTS 结果来源:', result.source);
      setTtsSource(result.source);
      message.destroy(messageKey);

      await playAudio(
        result.audioBlob,
        () => {
          if (result.source === 'cache') {
            message.info('使用本地缓存语音播放中...');
          } else {
            message.info(`🤖 Gemini AI 語音播放中... (${voiceStyle})`);
          }
        },
        () => {
          if (result.source === 'cache') {
            message.success('本地缓存语音播放完成');
          } else {
            message.success('🤖 Gemini AI 語音播放完成');
          }
        },
        (error) => {
          console.error('語音播放錯誤:', error);
          message.error('語音播放失敗');
        }
      );

    } catch (error) {
      message.destroy(messageKey);
      console.error('Gemini TTS 错误:', error);

      if (error.message.includes('API密鑰') || error.message.includes('401')) {
        message.error('Gemini API 密鑰無效或未配置，請檢查設置中的API密鑰配置');
      } else if (error.message.includes('配額') || error.message.includes('429')) {
        message.error('API 配額已用完，請稍後再試');
      } else if (error.message.includes('超时') || error.message.includes('timeout')) {
        message.error('網絡連接超時，請檢查網絡或代理設置');
      } else {
        message.error(`Gemini TTS 生成失敗: ${error.message}`);
      }
    }
  };

  const handleClearCache = async () => {
    try {
      console.log('[handleClearCache] 开始清理缓存...');
      await clearAllCache();
      setTtsSource(null);
      message.success('已清理本地AI语音缓存');
    } catch (e) {
      console.error('[handleClearCache] 清理缓存失败:', e);
      message.error('清理缓存失败: ' + e.message);
    }
  };

  // 重新开始
  const restart = () => {
    micResetRecording();
    setTranscription('');
    setScores(null);
    setShowAIFeedback(false);
  };



  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Title level={2} style={{ margin: 0 }}>
            <AudioOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
            AI口语练习
          </Title>
          <Space>
            <Tooltip title="AI导师功能">
              <Switch
                checked={aiTutorEnabled}
                onChange={setAiTutorEnabled}
                checkedChildren={<RobotOutlined />}
                unCheckedChildren={<RobotOutlined />}
              />
            </Tooltip>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setShowSettings(true)}
            >
              AI设置
            </Button>
            <Button
              icon={<SoundOutlined />}
              onClick={() => setShowVoiceSettings(true)}
            >
              语音设置
            </Button>
          </Space>
        </div>

        {/* 主题选择和AI控制 */}
        <div style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]}>

            <Col xs={24} md={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <Text strong>难度：</Text>
                  <Select
                    value={difficultyLevel}
                    onChange={setDifficultyLevel}
                    style={{ width: 120, marginLeft: '8px' }}
                    size="small"
                  >
                    <Option value="beginner">初級</Option>
                    <Option value="intermediate">中級</Option>
                    <Option value="advanced">高級</Option>
                  </Select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Text strong>目标：</Text>
                  <Input
                    value={userGoal}
                    onChange={(e) => setUserGoal(e.target.value)}
                    placeholder="请描述你的练习目标（如：电话面试自我介绍）"
                    style={{ width: 280, marginLeft: '8px' }}
                    allowClear
                    size="small"
                  />
                </div>
                <Button
                  type="primary"
                  ghost
                  icon={<BulbOutlined />}
                  onClick={() => setShowAiModal(true)}
                  loading={false}
                >
                  AI生成内容
                </Button>
              </div>
            </Col>
          </Row>
        
        {/* 对话列表与提示/词汇展示 */}
        <Divider />
        <Row gutter={[24, 24]}>
                  {/* 练习区域 */}
          <Col xs={24} lg={12}>
            <Card title="练习内容" size="small">
              <Alert
                message="请跟读以下内容"
                description={
                  <div style={{ marginTop: '12px' }}>
                    <Paragraph style={{ fontSize: '16px', lineHeight: '1.6' }}>
                      {practiceText}
                    </Paragraph>
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <Text strong>语音风格：</Text>
                        <Select
                          value={voiceStyle}
                          onChange={setVoiceStyle}
                          style={{ width: 120, marginLeft: '8px' }}
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
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
                            <Text type="secondary">{voiceRate.toFixed(1)}</Text>
                          </div>
                        </div>
                        <div>
                          <Text strong>音调：</Text>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Slider min={0.0} max={2.0} step={0.1} value={voicePitch} onChange={setVoicePitch} style={{ flex: 1 }} />
                            <Text type="secondary">{voicePitch.toFixed(1)}</Text>
                          </div>
                        </div>
                        <div>
                          <Text strong>音量：</Text>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Slider min={0.0} max={1.0} step={0.1} value={voiceVolume} onChange={setVoiceVolume} style={{ flex: 1 }} />
                            <Text type="secondary">{voiceVolume.toFixed(1)}</Text>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text strong>循环播放：</Text>
                          <Switch checked={loopPlayback} onChange={setLoopPlayback} />
                        </div>
                      </div>
                      
                      {/* 播放文本选择 */}
                      <div style={{ marginTop: 12 }}>
                        <Text strong>播放文本：</Text>
                        <Input.TextArea
                          value={selectedPlaybackText}
                          onChange={(e) => setSelectedPlaybackText(e.target.value)}
                          placeholder="从对话列表中选择文本，或手动粘贴。留空时默认使用练习内容。"
                          autoSize={{ minRows: 2, maxRows: 4 }}
                          style={{ marginTop: 6 }}
                        />
                        <Button size="small" style={{ marginTop: 6 }} onClick={() => setSelectedPlaybackText('')}>清空选择文本</Button>
                      </div>
                      
                      <Space>
                        <Button
                          icon={<SoundOutlined />}
                          onClick={playExample}
                        >
                          播放示例
                        </Button>
                        <Tooltip title={ttsSource ? (ttsSource === 'cache' ? '来源：本地缓存' : '来源：网络生成') : '点击生成/播放AI语音'}>
                          <Button
                            type="primary"
                            ghost
                            icon={<ThunderboltOutlined />}
                            onClick={playGeminiExample}
                          >
                            🤖 AI語音
                          </Button>
                        </Tooltip>
                        <Tooltip title="清理本地AI语音缓存">
                          <Button onClick={handleClearCache}>
                            清理缓存
                          </Button>
                        </Tooltip>
                      </Space>
                    </div>
                  </div>
                }
                type="info"
                showIcon
              />

              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Space direction="vertical" size="large">
                  <Button
                    type={isRecording ? 'danger' : 'primary'}
                    size="large"
                    shape="circle"
                    icon={<AudioOutlined />}
                    onClick={isRecording ? stopRecording : startRecording}
                    style={{ width: '80px', height: '80px', fontSize: '24px' }}
                    loading={loading}
                    disabled={!micPermission && !isRecording}
                    title={!micPermission ? '请先获取麦克风权限' : ''}
                  />
                  <Text>
                    {isRecording ? '点击停止录音' : (micPermission ? '点击开始录音' : '麦克风权限未获取')}
                  </Text>

                  {!micPermission && (
                    <Button
                      type="dashed"
                      onClick={() => requestMicrophonePermission()}
                      icon={<AudioOutlined />}
                    >
                      请求麦克风权限
                    </Button>
                  )}
                </Space>
              </div>

              {recordedAudioUrl && (
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <audio ref={audioRef} src={recordedAudioUrl} />
                  <Space>
                    <Button
                      icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                      onClick={playRecording}
                    >
                      {isPlaying ? '暂停' : '播放录音'}
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={restart}>
                      重新录音
                    </Button>
                  </Space>
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card title={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>对话列表</span><span><Space><Switch checked={showChinese} onChange={setShowChinese} size="small" /><Text type="secondary" style={{ marginLeft: 8 }}>显示中文</Text><Button size="small" onClick={startAutoPlay} disabled={autoPlayConversation}>自动播放</Button><Button size="small" danger onClick={stopAutoPlay} disabled={!autoPlayConversation}>停止</Button></Space></span></div>} size="small">
              {dialogueList && dialogueList.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dialogueList.map((m, idx) => {
                    console.log({m});
                    
                    return (
                    <div key={idx} style={{ padding: '12px', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>
                        {m.role === 'user' ? 'Learner' : 'Partner'}{m.originalRole ? ` (${m.originalRole})` : ''}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                      {showChinese && m.contentZh ? (
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: 6, color: '#595959' }}>{m.contentZh}</div>
                      ) : null}
                      <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                      </div>
                      {/* 快速播放與設為播放文本 */}
                      <Space style={{ marginTop: 8 }}>
                        <Button size="small" icon={<SoundOutlined />} onClick={() => playTextOnce(m.content, m.role)}>播放</Button>
                        <Button size="small" onClick={() => setSelectedPlaybackText(m.content)}>设为播放文本</Button>
                      </Space>
                    </div>
                  )
                  })}
                </div>
              ) : (
                <Alert type="info" message="暂无对话消息" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="练习提示" size="small" style={{ marginBottom: 16 }}>
              {tipsList && tipsList.length ? (
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {tipsList.map((t, i) => (<li key={i}>{t}</li>))}
                </ul>
              ) : (
                <Alert type="info" message="暂无提示" />
              )}
            </Card>
            <Card title="词汇表" size="small">
              {vocabList && vocabList.length ? (
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {vocabList.map((v, i) => (<li key={i}><strong>{v.word}</strong> — {v.gloss}</li>))}
                </ul>
              ) : (
                <Alert type="info" message="暂无词汇" />
              )}
            </Card>
          </Col>
        </Row>
        </div>

        <Divider />

        <Row gutter={[24, 24]}>


          {/* 结果区域 */}
          <Col xs={24} lg={12}>
            <Card title="练习结果" size="small">
              {loading && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: '16px' }}>正在分析您的发音...</div>
                </div>
              )}

              {transcription && (
                <div style={{ marginBottom: '24px' }}>
                  <Text strong>识别文本：</Text>
                  <div style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '6px',
                    marginTop: '8px'
                  }}>
                    {transcription}
                  </div>
                </div>
              )}

              {scores && (
                <div>
                  <Text strong>发音评分：</Text>
                  <div style={{ marginTop: '16px' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text>总体得分</Text>
                        <Progress
                          percent={scores.overall}
                          strokeColor={scores.overall >= 80 ? '#52c41a' : scores.overall >= 60 ? '#faad14' : '#f5222d'}
                        />
                      </div>
                      <div>
                        <Text>发音准确度</Text>
                        <Progress
                          percent={scores.pronunciation}
                          strokeColor={scores.pronunciation >= 80 ? '#52c41a' : scores.pronunciation >= 60 ? '#faad14' : '#f5222d'}
                        />
                      </div>
                      <div>
                        <Text>流利度</Text>
                        <Progress
                          percent={scores.fluency}
                          strokeColor={scores.fluency >= 80 ? '#52c41a' : scores.fluency >= 60 ? '#faad14' : '#f5222d'}
                        />
                      </div>
                      <div>
                        <Text>完整度</Text>
                        <Progress
                          percent={scores.completeness}
                          strokeColor={scores.completeness >= 80 ? '#52c41a' : scores.completeness >= 60 ? '#faad14' : '#f5222d'}
                        />
                      </div>
                    </Space>

                    {scores.overall >= 80 && (
                      <Alert
                        message="太棒了！"
                        description="您的发音非常标准，继续保持！"
                        type="success"
                        icon={<CheckCircleOutlined />}
                        style={{ marginTop: '16px' }}
                      />
                    )}
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* AI导师反饋 */}
        {showAIFeedback && scores && (
          <div style={{ marginTop: '24px' }}>
            <AITutorFeedback
              userPerformance={scores}
              practiceContext={practiceText}
              visible={showAIFeedback}
              onFeedbackReceived={async (feedback) => {
                console.log('AI Feedback received:', feedback);
                if (sessionId) {
                  await appendMessage({
                    sessionId,
                    role: 'assistant',
                    content: typeof feedback === 'string' ? feedback : (feedback?.text || JSON.stringify(feedback)),
                    lang: 'en-US',
                    meta: { source: 'AITutorFeedback' }
                  });
                }
              }}
            />
          </div>
        )}
        {/* 录音管理 */}
        <Divider />
        <Card title="录音管理" size="small">
          {audioBlob ? (
            <div>
              <WaveformCanvas blob={audioBlob} />
              <div style={{ marginTop: 8 }}>
                <Space>
                  <Button icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={playRecording}>
                    {isPlaying ? '暂停' : '播放'}
                  </Button>
                  <Button onClick={() => setSelectedPlaybackText(transcription || practiceText)}>将识别文本设为播放文本</Button>
                </Space>
              </div>
            </div>
          ) : (
            <Alert type="info" message="暂无录音数据" />
          )}

          {/* 历史记录 */}
          <div style={{ marginTop: 16 }}>
            <Text strong>历史记录：</Text>
            {practiceHistory && practiceHistory.length ? (
              <ul style={{ paddingLeft: 18 }}>
                {practiceHistory.slice(0, 10).map((r, i) => (
                  <li key={i}>
                    {r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}
                    ，得分：{r.score?.overall ?? '-'}，时长：{r.duration ?? 0}s，难度：{r.difficulty ?? '-'}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: '#999' }}>暂无历史记录</div>
            )}
          </div>
        </Card>
      </Card>

      {/* AI生成练习弹窗 */}
      <AiGenerateModal
        open={showAiModal}
        mode="practice"
        goal={userGoal}
        onCancel={() => setShowAiModal(false)}
        onSuccess={async (payload) => {
          try {
            // 如果返回的是未持久化的 JSON（没有 sessionId 字段），则立即落库
            if (payload && !payload.sessionId) {
              // 角色规范：若仍为 Learner/Partner 等，转换为 user/assistant 并保留 originalRole
              if (Array.isArray(payload.dialogue)) {
                payload.dialogue = normalizeDialogueRoles(payload.dialogue);
              }
              const { sessionId: sid, turnId: tid } = await saveGeneratedPractice(payload, userId);
              setSessionId(sid);
              setTurnId(tid);
              const refText = typeof payload.referenceText === 'string' ? payload.referenceText : '';
              setPracticeText(refText || practiceText);
            } else {
              // 若已持久化且返回包含 sessionId/turnId
              const sid = payload?.sessionId || null;
              const tid = payload?.turnId || null;
              setSessionId(sid);
              setTurnId(tid);
              const refText = payload?.referenceText;
              if (typeof refText === 'string') setPracticeText(refText || practiceText);
            }
            setShowAiModal(false);
            Modal.success({ title: '內容生成成功！', content: 'AI已為您準備練習內容，開始練習吧！' });
          } catch (err) {
            console.error('持久化生成内容失败:', err);
            Modal.error({ title: '保存失败', content: '寫入本地數據庫失敗，請稍後重試。' });
          }
        }}
      />

      {/* AI設置模態框 */}
      <Modal
        title="AI導師設置"
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
        width={800}
      >
        <GeminiSettings onSettingsChange={handleSettingsChange} />
      </Modal>

      {/* 语音设置弹窗 */}
      <VoiceSettingsModal
        open={showVoiceSettings}
        onCancel={() => setShowVoiceSettings(false)}
        onSave={() => setShowVoiceSettings(false)}
        tts={tts}
      />
      </div>
    );
};

export default Practice;