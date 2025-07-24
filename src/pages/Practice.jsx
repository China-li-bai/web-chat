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

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// L16 PCM 轉 WAV 格式的工具函數
const convertL16ToWav = (pcmData, sampleRate = 24000, numChannels = 1) => {
  const bitsPerSample = 16;
  const blockAlign = numChannels * bitsPerSample / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;
  
  // 創建 WAV 文件頭
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  // RIFF chunk descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, fileSize, true); // file size
  view.setUint32(8, 0x57415645, false); // "WAVE"
  
  // fmt sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, numChannels, true); // number of channels
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, byteRate, true); // byte rate
  view.setUint16(32, blockAlign, true); // block align
  view.setUint16(34, bitsPerSample, true); // bits per sample
  
  // data sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true); // data size
  
  // 合併頭部和音頻數據
  const wavData = new Uint8Array(44 + dataSize);
  wavData.set(new Uint8Array(header), 0);
  wavData.set(pcmData, 44);
  
  return wavData;
};

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
    if (!aiSettings?.apiKey) {
      Modal.warning({
        title: '需要配置API密鑰',
        content: '請先在設置中配置Gemini API密鑰以使用AI生成功能。',
      });
      return;
    }

    setGeneratingContent(true);
    try {
      const topicKey = topics.find(t => t.label === currentTopic)?.key || 'daily';
      const content = await invoke('generate_practice_content', {
        topic: topicKey,
        difficultyLevel,
        userInterests: aiSettings.interests || []
      });
      
      setPracticeText(content);
      restart(); // 清除之前的練習結果
      
      Modal.success({
        title: '內容生成成功！',
        content: 'AI已為您生成個性化的練習內容，開始練習吧！',
      });
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

  // Gemini AI 語音播放
  const playGeminiExample = async () => {
    if (isTauriApp()) {
      try {
        const result = await invoke('gemini_text_to_speech', { 
          text: practiceText,
          voice_config: { voice: 'Kore' }
        });
        
        // 解析Gemini返回的音頻數據
        const audioData = JSON.parse(result);
        
        if (audioData.audio && audioData.mimeType) {
          // 處理 Gemini TTS 返回的音頻數據
          let audioBlob;
          
          if (audioData.mimeType.includes('audio/L16') || audioData.mimeType.includes('pcm')) {
            // Gemini TTS 返回 L16 PCM 格式，需要轉換為 WAV
            const pcmData = Uint8Array.from(atob(audioData.audio), c => c.charCodeAt(0));
            const wavData = convertL16ToWav(pcmData, 24000, 1); // 24kHz, mono
            audioBlob = new Blob([wavData], { type: 'audio/wav' });
          } else {
            // 其他格式直接使用
            audioBlob = new Blob([Uint8Array.from(atob(audioData.audio), c => c.charCodeAt(0))], {
              type: audioData.mimeType
            });
          }
          
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          audio.onloadstart = () => {
            message.info('🤖 Gemini AI 語音播放中...');
          };
          
          audio.onerror = (event) => {
            console.error('Gemini語音播放錯誤:', event);
            message.error('Gemini語音播放失敗');
          };
          
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            message.success('🤖 Gemini AI 語音播放完成');
          };
          
          await audio.play();
        } else {
          throw new Error('未收到有效的音頻數據');
        }
        
      } catch (error) {
        console.error('Gemini TTS error:', error);
        message.error('Gemini語音合成失敗: ' + error);
      }
    } else {
      // H5環境下調用後端API獲取Gemini音頻
      if (!aiSettings?.apiKey) {
        message.warning('請先在設置中配置 Gemini API 密鑰以使用 AI 語音功能');
        return;
      }
      
      try {
        message.loading('🤖 Gemini AI 正在生成語音...', 0);
        
        // 調用後端API獲取Gemini音頻
        const response = await fetch('/api/gemini-tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: practiceText,
            apiKey: aiSettings.apiKey,
            voice: 'Kore', // 使用 Kore 語音
            config: {}
          })
        });
        
        message.destroy(); // 清除loading消息
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.audio && result.mimeType) {
          // 處理 Gemini TTS 返回的音頻數據
          let audioBlob;
          
          if (result.mimeType.includes('audio/L16') || result.mimeType.includes('pcm')) {
            // Gemini TTS 返回 L16 PCM 格式，需要轉換為 WAV
            const pcmData = Uint8Array.from(atob(result.audio), c => c.charCodeAt(0));
            const wavData = convertL16ToWav(pcmData, 24000, 1); // 24kHz, mono
            audioBlob = new Blob([wavData], { type: 'audio/wav' });
          } else {
            // 其他格式直接使用
            audioBlob = new Blob([Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))], {
              type: result.mimeType
            });
          }
          
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          audio.onloadstart = () => {
            message.info('🤖 Gemini AI 語音播放中...');
          };
          
          audio.onerror = (event) => {
            console.error('語音播放錯誤:', event);
            message.error('語音播放失敗');
          };
          
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            message.success('🤖 Gemini AI 語音播放完成');
          };
          
          await audio.play();
        } else {
          throw new Error('未收到有效的音頻數據');
        }
        
      } catch (error) {
        message.destroy(); // 確保清除loading消息
        console.error('Gemini TTS error:', error);
        
        // 如果API調用失敗，回退到基礎語音合成
        message.warning('Gemini API 調用失敗，使用基礎語音合成模式');
        
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(practiceText);
          utterance.lang = 'en-US';
          utterance.rate = 0.8;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          const voices = window.speechSynthesis.getVoices();
          const preferredVoices = voices.filter(voice => 
            voice.lang.startsWith('en') && 
            (voice.name.includes('Google') || voice.name.includes('Microsoft'))
          );
          
          if (preferredVoices.length > 0) {
            utterance.voice = preferredVoices[0];
          }
          
          utterance.onstart = () => {
            message.info('🔊 基礎語音播放中...');
          };
          
          window.speechSynthesis.speak(utterance);
        } else {
          message.error('您的瀏覽器不支持語音播放功能');
        }
      }
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
            <Tooltip title="AI導師功能">
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
              AI設置
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
                  <Text strong>難度：</Text>
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
                  disabled={!aiSettings?.apiKey}
                >
                  AI生成內容
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
                    <Space style={{ marginTop: '8px' }}>
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