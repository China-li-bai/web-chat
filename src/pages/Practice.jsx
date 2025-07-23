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
  Tag,
  Modal,
  Spin,
  Select,
  Switch,
  Tooltip,
  message
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
import { generateSpeechWithGemini, playAudioBlob } from '../utils/geminiTTS';

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
  
  // AI導師相關狀態
  const [aiTutorEnabled, setAiTutorEnabled] = useState(true);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiSettings, setAiSettings] = useState(null);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState('intermediate');
  
  // 語音風格選擇
  const [voiceStyle, setVoiceStyle] = useState('professional');
  
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
  
  // 组件加载时请求麦克风权限
  useEffect(() => {
    requestMicrophonePermission();
  }, []);

  // 练习主题
  const topics = [
    { key: 'daily', label: '日常对话', color: 'blue' },
    { key: 'business', label: '商务英语', color: 'green' },
    { key: 'travel', label: '旅游英语', color: 'orange' },
    { key: 'academic', label: '学术讨论', color: 'purple' },
  ];

  // 示例文本
  const sampleTexts = {
    daily: 'Hello, how are you today? I hope you are having a wonderful day.',
    business: 'Good morning, I would like to schedule a meeting to discuss our project timeline.',
    travel: 'Excuse me, could you please tell me how to get to the nearest subway station?',
    academic: 'The research methodology we employed in this study follows a quantitative approach.'
  };

  // 检查是否在Tauri环境中
  const isTauriApp = () => {
    return typeof window !== 'undefined' && window.__TAURI__;
  };

  // 加載AI設置
  useEffect(() => {
    loadAISettings();
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

  // 生成AI練習內容
  const generateAIPracticeContent = async () => {
    setGeneratingContent(true);
    try {
      if (isTauriApp()) {
        // Tauri環境：使用後端API生成內容
        const topicKey = topics.find(t => t.label === currentTopic)?.key || 'daily';
        const content = await invoke('generate_practice_content', {
          topic: topicKey,
          difficultyLevel,
          userInterests: aiSettings?.interests || []
        });
        
        setPracticeText(content);
        restart(); // 清除之前的練習結果
        
        Modal.success({
          title: '內容生成成功！',
          content: 'AI已為您生成個性化的練習內容，開始練習吧！',
        });
      } else {
        // H5環境：如果有API key則可以調用後端API，否則使用預設內容
        if (!aiSettings?.apiKey) {
          // 沒有API key時使用預設的高質量練習內容
          const topicKey = topics.find(t => t.label === currentTopic)?.key || 'daily';
          const advancedTexts = {
            daily: [
              "Good morning! How did you sleep last night? I hope you had sweet dreams and feel refreshed today.",
              "What are your plans for this beautiful weekend? I'm thinking of visiting the local farmers market.",
              "The weather has been quite unpredictable lately, hasn't it? Yesterday was sunny, but today looks cloudy."
            ],
            business: [
              "Let's schedule a meeting to discuss the quarterly sales report and our marketing strategy for next quarter.",
              "I'd like to present our new product proposal to the board of directors next Tuesday morning.",
              "Our customer satisfaction ratings have improved significantly since we implemented the new service protocols."
            ],
            travel: [
              "I'm planning a trip to Europe next summer and would love to visit the historic cities of Rome and Paris.",
              "The flight was delayed for three hours due to bad weather, but the airline provided excellent customer service.",
              "Have you ever been to a traditional Japanese ryokan? The experience is absolutely unforgettable."
            ],
            academic: [
              "The research methodology we discussed in yesterday's seminar was quite comprehensive and well-structured.",
              "Climate change continues to be one of the most pressing environmental challenges of our generation.",
              "The professor's lecture on quantum physics was fascinating, though admittedly quite complex to understand."
            ]
          };
          
          const texts = advancedTexts[topicKey] || advancedTexts.daily;
          const randomText = texts[Math.floor(Math.random() * texts.length)];
          setPracticeText(randomText);
          restart();
          
          Modal.info({
            title: '使用預設內容',
            content: '已為您選擇高質量的練習內容。如需AI個性化生成，請在設置中配置Gemini API密鑰。',
          });
        } else {
          // 有API key時可以嘗試調用後端生成（如果後端支持的話）
          Modal.info({
            title: '功能開發中',
            content: 'H5環境下的AI內容生成功能正在開發中，目前為您提供精選的練習內容。',
          });
          
          // 暫時使用預設內容
          const topicKey = topics.find(t => t.label === currentTopic)?.key || 'daily';
          const advancedTexts = {
            daily: [
              "Good morning! How did you sleep last night? I hope you had sweet dreams and feel refreshed today.",
              "What are your plans for this beautiful weekend? I'm thinking of visiting the local farmers market."
            ],
            business: [
              "Let's schedule a meeting to discuss the quarterly sales report and our marketing strategy for next quarter.",
              "I'd like to present our new product proposal to the board of directors next Tuesday morning."
            ],
            travel: [
              "I'm planning a trip to Europe next summer and would love to visit the historic cities of Rome and Paris.",
              "The flight was delayed for three hours due to bad weather, but the airline provided excellent customer service."
            ],
            academic: [
              "The research methodology we discussed in yesterday's seminar was quite comprehensive and well-structured.",
              "Climate change continues to be one of the most pressing environmental challenges of our generation."
            ]
          };
          
          const texts = advancedTexts[topicKey] || advancedTexts.daily;
          const randomText = texts[Math.floor(Math.random() * texts.length)];
          setPracticeText(randomText);
          restart();
        }
      }
    } catch (error) {
      console.error('Failed to generate content:', error);
      Modal.error({
        title: '生成失敗',
        content: '內容生成失敗，請檢查網絡連接或稍後重試。',
      });
    } finally {
      setGeneratingContent(false);
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
          
          // 调用语音识别
          const text = await invoke('speech_to_text', { audioData: base64Audio });
          setTranscription(text);
          
          // 调用发音评分
          const scoreResult = await invoke('pronunciation_score', {
            audioData: base64Audio,
            referenceText: practiceText
          });
          setScores(scoreResult);
          
          // 如果啟用AI導師，顯示反饋
          if (aiTutorEnabled && aiSettings?.apiKey) {
            setShowAIFeedback(true);
          }
        };
        reader.readAsDataURL(audioBlob);
      } else {
        // H5环境：模拟处理结果
        setTimeout(() => {
          setTranscription('这是模拟的语音识别结果：' + practiceText.substring(0, 20) + '...');
          const mockScores = {
            overall: Math.floor(Math.random() * 30) + 70,
            pronunciation: Math.floor(Math.random() * 30) + 70,
            fluency: Math.floor(Math.random() * 30) + 70,
            completeness: Math.floor(Math.random() * 30) + 70
          };
          setScores(mockScores);
          
          // 如果啟用AI導師，顯示反饋
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

  // 播放Gemini示例 - 使用官方SDK
  const playGeminiExample = async () => {
    if (!practiceText) {
      message.warning('请先选择练习内容');
      return;
    }

    const messageKey = 'gemini-tts';
    
    try {
      message.loading({ content: '🤖 Gemini AI 語音生成中...', key: messageKey, duration: 0 });
      
      // 使用官方 Gemini SDK 生成语音
      // 优先从环境变量获取 API 密钥，用户设置的密钥作为备选
      const result = await generateSpeechWithGemini(
        practiceText, 
        aiSettings?.apiKey, // 用户设置的 API 密钥作为备选
        voiceStyle
      );
      
      message.destroy(messageKey);
      
      // 播放生成的音频
      await playAudioBlob(
        result.audioBlob,
        () => {
          message.info(`🤖 Gemini AI 語音播放中... (${result.voiceName} - ${result.style})`);
        },
        () => {
          message.success('🤖 Gemini AI 語音播放完成');
        },
        (error) => {
          console.error('語音播放錯誤:', error);
          message.error('語音播放失敗');
        }
      );
      
    } catch (error) {
      message.destroy(messageKey);
      console.error('Gemini TTS SDK 错误:', error);
      
      // 根據錯誤類型給出具體的提示
      if (error.message.includes('API密鑰')) {
        message.error('Gemini API 密鑰無效或未配置，請在設置中配置正確的 API 密鑰');
      } else if (error.message.includes('配額')) {
        message.error('API 配額已用完，請稍後再試或檢查您的 Gemini API 配額');
      } else if (error.message.includes('模型不可用')) {
        message.error('TTS 模型暫時不可用，請稍後再試');
      } else {
        message.error(`Gemini TTS 生成失敗: ${error.message}`);
      }
      
      // 不再回退到 SpeechSynthesisUtterance，而是提示用户解决问题
      message.info('請檢查網絡連接和 API 密鑰配置，或稍後再試');
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

  // 切换主题
  const changeTopic = (topicKey) => {
    const topic = topics.find(t => t.key === topicKey);
    setCurrentTopic(topic.label);
    setPracticeText(sampleTexts[topicKey]);
    restart();
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
              <Text strong>选择练习主题：</Text>
              <div style={{ marginTop: '8px' }}>
                <Space wrap>
                  {topics.map(topic => (
                    <Tag
                      key={topic.key}
                      color={topic.color}
                      style={{ cursor: 'pointer', padding: '4px 12px' }}
                      onClick={() => changeTopic(topic.key)}
                    >
                      {topic.label}
                    </Tag>
                  ))}
                </Space>
              </div>
            </Col>
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
                <Button
                  type="primary"
                  ghost
                  icon={<BulbOutlined />}
                  onClick={generateAIPracticeContent}
                  loading={generatingContent}
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
                        <Button 
                            type="primary"
                            ghost
                            icon={<ThunderboltOutlined />} 
                            onClick={playGeminiExample}
                          >
                            🤖 AI語音
                          </Button>
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
              onFeedbackReceived={(feedback) => {
                console.log('AI Feedback received:', feedback);
              }}
            />
          </div>
        )}
      </Card>
      
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