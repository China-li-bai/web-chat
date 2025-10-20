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
  Input
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
import Prompts from '@/modules/ai/prompts/Prompts';


const { Title, Text, Paragraph } = Typography;
const { Option } = Select;



const Practice = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTopic, setCurrentTopic] = useState('日常对话');
  const [practiceText, setPracticeText] = useState('Hello, how are you today? I hope you are having a wonderful day.');
  const [micPermission, setMicPermission] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [turnId, setTurnId] = useState(null);

  // AI導師相關狀態
  const [aiTutorEnabled, setAiTutorEnabled] = useState(true);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiSettings, setAiSettings] = useState(null);
  const [userGoal, setUserGoal] = useState('');

  const [showAiModal, setShowAiModal] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState('intermediate');

  // 語音風格選擇
  const [voiceStyle, setVoiceStyle] = useState('professional');
  const [ttsSource, setTtsSource] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  // 请求麦克风权限函数
  const requestMicrophonePermission = async () => {
    try {
      // 在 Tauri v1 中，navigator.mediaDevices 可能为 undefined
      if (!navigator.mediaDevices) {
        console.error('navigator.mediaDevices 不可用');
        Modal.error({
          title: '麦克风权限',
          content: '在 Tauri 应用中，麦克风权限需要在系统级别授予。请确保您已在系统设置中允许此应用访问麦克风，然后重启应用。',
        });
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 获取权限后立即释放资源
      stream.getTracks().forEach(track => track.stop());
      setMicPermission(true);
      console.log('麦克风权限已获取');
      return true;
    } catch (error) {
      console.error('无法获取麦克风权限:', error);
      Modal.error({
        title: '麦克风权限',
        content: '无法访问麦克风，请在系统设置中允许此应用访问麦克风，然后重启应用。',
      });
      return false;
    }
  };

  // 组件加载时请求麦克风权限 + 尝试加载最近一次会话
  useEffect(() => {
    requestMicrophonePermission();

    (async () => {
      const userId = 'local-user';
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





  // 检查是否在Tauri环境中
  const isTauriApp = () => {
    return typeof window !== 'undefined' && window.__TAURI__;
  };

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
  const startRecording = async () => {
    // 如果之前没有获取到麦克风权限，先尝试获取
    if (!micPermission) {
      // 在 Tauri v1 中，navigator.mediaDevices 可能为 undefined
      if (!navigator.mediaDevices) {
        console.error('navigator.mediaDevices 不可用');
        Modal.error({
          title: '麦克风权限',
          content: '在 Tauri 应用中，麦克风权限需要在系统级别授予。请确保您已在系统设置中允许此应用访问麦克风，然后重启应用。',
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // 获取权限后立即释放资源
        stream.getTracks().forEach(track => track.stop());
        setMicPermission(true);
        console.log('麦克风权限已获取');
      } catch (error) {
        console.error('无法获取麦克风权限:', error);
        Modal.error({
          title: '麦克风权限',
          content: '无法访问麦克风，请在系统设置中允许此应用访问麦克风，然后重启应用。',
        });
        return; // 如果无法获取权限，直接返回
      }
    }

    try {
      // 在 Tauri v1 中，navigator.mediaDevices 可能为 undefined
      if (!navigator.mediaDevices) {
        console.error('navigator.mediaDevices 不可用');
        Modal.error({
          title: '麦克风权限',
          content: '在 Tauri 应用中，麦克风权限需要在系统级别授予。请确保您已在系统设置中允许此应用访问麦克风，然后重启应用。',
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio(audioUrl);

        // 处理录音数据
        processAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      console.log('录音开始');

      // 只在Tauri环境中调用Tauri命令
      if (isTauriApp()) {
        await invoke('start_recording');
      }
    } catch (error) {
      console.error('录音失败:', error);
      let errorMessage = '无法访问麦克风，请检查权限设置。';

      if (error.name === 'NotAllowedError') {
        errorMessage = '麦克风权限被拒绝。请在浏览器地址栏左侧点击锁图标，允许麦克风权限后重试。';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '未找到麦克风设备，请检查设备连接。';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '当前浏览器不支持录音功能，建议使用Chrome或Firefox浏览器。';
      }

      alert(errorMessage);
    }
  };

  // 停止录音
  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);

      // 只在Tauri环境中调用Tauri命令
      if (isTauriApp()) {
        await invoke('stop_recording');
      }
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
  const playRecording = () => {
    if (recordedAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // 播放示例音频
  const playExample = async () => {
    try {
      if (isTauriApp()) {
        const audioData = await invoke('text_to_speech', { text: practiceText });
        // 这里应该播放返回的音频数据
        console.log('播放示例音频:', audioData);
      } else {
        // H5环境：使用Web Speech API
        if ('speechSynthesis' in window) {
          // 停止当前播放的语音
          window.speechSynthesis.cancel();

          // 创建语音合成实例
          const utterance = new SpeechSynthesisUtterance(practiceText);

          // 设置语音参数
          utterance.lang = 'en-US'; // 根据练习文本语言设置
          utterance.rate = 0.8; // 语速稍慢，便于学习
          utterance.pitch = 1; // 音调
          utterance.volume = 1; // 音量

          // 尝试选择合适的语音
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(voice =>
            voice.lang.startsWith('en') && voice.name.includes('Female')
          ) || voices.find(voice => voice.lang.startsWith('en'));

          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }

          // 播放语音
          window.speechSynthesis.speak(utterance);

          // 显示成功提示
          message.success('正在播放示例音频...');
        } else {
          // 浏览器不支持Web Speech API
          Modal.info({
            title: '示例音频',
            content: '您的浏览器不支持语音合成功能，建议使用Chrome、Firefox或Edge浏览器。',
          });
        }
      }
    } catch (error) {
      console.error('播放示例失败:', error);
      message.error('播放示例音频失败，请重试。');
    }
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
    setRecordedAudio(null);
    setTranscription('');
    setScores(null);
    setIsPlaying(false);
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
        </div>

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

              {recordedAudio && (
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <audio ref={audioRef} src={recordedAudio} onEnded={() => setIsPlaying(false)} />
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

        {/* AI導師反饋 */}
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
      </Card>

      {/* AI生成练习弹窗 */}
      <AiGenerateModal
        open={showAiModal}
        mode="practice"
        goal={userGoal}
        onCancel={() => setShowAiModal(false)}
        onSuccess={async ({ sessionId: sid, turnId: tid, referenceText }) => {
          setSessionId(sid);
          setTurnId(tid);
          setPracticeText(referenceText || practiceText);
          setShowAiModal(false);
          Modal.success({ title: '內容生成成功！', content: 'AI已為您準備練習內容，開始練習吧！' });
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
    </div>
  );
};

export default Practice;