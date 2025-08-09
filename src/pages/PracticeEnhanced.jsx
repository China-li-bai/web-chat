import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Progress,
  message,
  Row,
  Col,
  Divider,
  Switch,
  Select,
  Tag,
  Avatar,
  Tooltip,
  Modal,
  Alert,
  Spin,
  Tabs,
  Drawer,
  Form,
  Input,
  Radio,
  Slider,
  Badge,
  Statistic,
  Timeline,
  Empty
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  SettingOutlined,
  TrophyOutlined,
  BookOutlined,
  SoundOutlined,
  StopOutlined,
  RedoOutlined,
  CheckCircleOutlined,
  StarOutlined,
  FireOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  RobotOutlined,
  LineChartOutlined,
  HeartOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import AITutorFeedback from '../components/AITutorFeedback';
import useAppStore from '../store/useAppStore';
import RecordRTC from 'recordrtc';
import WaveSurfer from 'wavesurfer.js';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const PracticeEnhanced = () => {
  // 从 Store 获取状态和操作
  const {
    currentPractice,
    practiceTopics,
    settings,
    userStats,
    startPractice,
    setRecording,
    setPlaying,
    setAudioBlob,
    setTranscription,
    setScore,
    clearCurrentPractice,
    addPracticeRecord,
    updateDuration,
    updateStreak
  } = useAppStore();

  // 本地状态
  const [loading, setLoading] = useState(false);
  const [micPermission, setMicPermission] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [practiceMode, setPracticeMode] = useState('guided'); // guided, free, adaptive
  const [showStats, setShowStats] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const waveformRef = useRef(null);
  const timerRef = useRef(null);

  // 检查麦克风权限
  const checkMicPermission = useCallback(async () => {
    try {
      if (!navigator.mediaDevices) {
        throw new Error('navigator.mediaDevices 不可用');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermission(true);
      return true;
    } catch (error) {
      console.error('麦克风权限检查失败:', error);
      setMicPermission(false);
      return false;
    }
  }, []);

  // 组件初始化
  useEffect(() => {
    checkMicPermission();
    
    // 如果有未完成的练习，恢复状态
    if (currentPractice.topic && !selectedTopic) {
      setSelectedTopic(currentPractice.topic);
    }
  }, [checkMicPermission, currentPractice.topic, selectedTopic]);

  // 计时器效果
  useEffect(() => {
    if (currentPractice.isRecording) {
      timerRef.current = setInterval(() => {
        updateDuration();
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentPractice.isRecording, updateDuration]);

  // 开始练习
  const handleStartPractice = useCallback((topic) => {
    setSelectedTopic(topic);
    startPractice(topic);
    setCurrentSentenceIndex(0);
    message.success(`开始练习: ${topic.title}`);
  }, [startPractice]);

  // 开始录音
  const handleStartRecording = async () => {
    if (!micPermission) {
      const hasPermission = await checkMicPermission();
      if (!hasPermission) {
        Modal.error({
          title: '麦克风权限',
          content: '无法访问麦克风，请在浏览器设置中允许麦克风权限。',
        });
        return;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        processAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      message.info('开始录音...');
    } catch (error) {
      console.error('录音失败:', error);
      message.error('录音失败，请检查麦克风权限');
    }
  };

  // 停止录音
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && currentPractice.isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
      message.info('录音已停止，正在分析...');
    }
  };

  // 处理录音
  const processAudio = async (audioBlob) => {
    setLoading(true);
    
    try {
      // 创建 FormData 发送到后端
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('provider', settings.speechSettings.provider);
      
      // 语音识别
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('语音识别失败');
      }
      
      const { text } = await response.json();
      setTranscription(text);
      
      // 发音评分
      const scoreResponse = await fetch('/api/pronunciation-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription: text,
          referenceText: currentPractice.referenceText,
        }),
      });
      
      if (!scoreResponse.ok) {
        throw new Error('发音评分失败');
      }
      
      const scores = await scoreResponse.json();
      setScore(scores);
      
      // 保存练习记录
      const record = {
        topic: selectedTopic.title,
        referenceText: currentPractice.referenceText,
        userText: text,
        score: scores,
        duration: currentPractice.duration,
        difficulty: selectedTopic.difficulty,
        category: selectedTopic.category,
      };
      
      // 保存到本地状态
      addPracticeRecord(record);
      
      // 保存到服务器
      await fetch('/api/practice-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });
      
      // 更新连续练习天数
      updateStreak();
      
      // 显示 AI 反馈
      if (settings.practiceSettings.showHints) {
        setShowAIFeedback(true);
      }
      
      message.success('练习完成！');
    } catch (error) {
      console.error('处理录音失败:', error);
      message.error('处理录音失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 播放示例音频
  const playExample = async () => {
    try {
      const response = await fetch('/api/gemini-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: currentPractice.referenceText,
          voice: settings.speechSettings.voice,
          style: settings.speechSettings.style,
          apiKey: settings.apiKeys.gemini,
        }),
      });
      
      if (!response.ok) {
        throw new Error('语音合成失败');
      }
      
      const { audioData } = await response.json();
      const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.play();
      
      message.success('正在播放示例音频...');
    } catch (error) {
      console.error('播放示例失败:', error);
      message.error('播放示例失败，请检查网络连接');
    }
  };

  // 下一个句子
  const nextSentence = () => {
    if (selectedTopic && currentSentenceIndex < selectedTopic.sentences.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1);
      clearCurrentPractice();
      startPractice({
        ...selectedTopic,
        sentences: [selectedTopic.sentences[currentSentenceIndex + 1]]
      });
    } else {
      // 练习完成
      Modal.success({
        title: '练习完成！',
        content: `恭喜你完成了 "${selectedTopic.title}" 的练习！`,
        onOk: () => {
          clearCurrentPractice();
          setSelectedTopic(null);
          setCurrentSentenceIndex(0);
        }
      });
    }
  };

  // 获取分数颜色
  const getScoreColor = (score) => {
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#1890ff';
    if (score >= 70) return '#faad14';
    return '#f5222d';
  };

  // 渲染练习主题选择
  const renderTopicSelection = () => (
    <Card title="选择练习主题" size="small">
      <Row gutter={[16, 16]}>
        {practiceTopics.map(topic => (
          <Col xs={24} sm={12} md={8} key={topic.id}>
            <Card
              hoverable
              size="small"
              onClick={() => handleStartPractice(topic)}
              style={{ height: '100%' }}
              bodyStyle={{ padding: '12px' }}
            >
              <div style={{ textAlign: 'center' }}>
                <Avatar
                  size={48}
                  style={{ backgroundColor: topic.category === 'daily' ? '#1890ff' : '#52c41a' }}
                  icon={<BookOutlined />}
                />
                <Title level={5} style={{ margin: '8px 0 4px' }}>
                  {topic.title}
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {topic.description}
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Tag color={topic.difficulty === 'beginner' ? 'green' : topic.difficulty === 'intermediate' ? 'orange' : 'red'}>
                    {topic.difficulty === 'beginner' ? '初级' : topic.difficulty === 'intermediate' ? '中级' : '高级'}
                  </Tag>
                  <Tag>{topic.estimatedTime}分钟</Tag>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );

  // 渲染练习界面
  const renderPracticeInterface = () => (
    <Row gutter={[24, 24]}>
      {/* 练习控制区 */}
      <Col xs={24} lg={12}>
        <Card title={`练习: ${selectedTopic.title}`} size="small">
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <Text type="secondary">
              句子 {currentSentenceIndex + 1} / {selectedTopic.sentences.length}
            </Text>
          </div>
          
          <Alert
            message="请跟读以下内容"
            description={
              <div style={{ marginTop: '12px' }}>
                <Paragraph style={{ fontSize: '18px', lineHeight: '1.8', textAlign: 'center' }}>
                  {currentPractice.referenceText}
                </Paragraph>
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
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
                      onClick={playExample}
                    >
                      AI 语音
                    </Button>
                  </Space>
                </div>
              </div>
            }
            type="info"
            showIcon
          />
          
          {/* 录音控制 */}
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Space direction="vertical" size="large">
              <div>
                <Button
                  type={currentPractice.isRecording ? 'danger' : 'primary'}
                  size="large"
                  shape="circle"
                  icon={currentPractice.isRecording ? <StopOutlined /> : <AudioOutlined />}
                  onClick={currentPractice.isRecording ? handleStopRecording : handleStartRecording}
                  style={{ 
                    width: '80px', 
                    height: '80px', 
                    fontSize: '24px',
                    boxShadow: currentPractice.isRecording ? '0 0 20px rgba(255, 77, 79, 0.6)' : '0 0 20px rgba(24, 144, 255, 0.6)'
                  }}
                  loading={loading}
                  disabled={!micPermission}
                />
              </div>
              
              <div>
                <Text strong>
                  {currentPractice.isRecording 
                    ? `录音中 ${Math.floor(currentPractice.duration / 60)}:${(currentPractice.duration % 60).toString().padStart(2, '0')}` 
                    : micPermission ? '点击开始录音' : '麦克风权限未获取'
                  }
                </Text>
              </div>

              {!micPermission && (
                <Button 
                  type="dashed" 
                  onClick={checkMicPermission}
                  icon={<AudioOutlined />}
                >
                  获取麦克风权限
                </Button>
              )}
            </Space>
          </div>

          {/* 录音播放 */}
          {currentPractice.audioBlob && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <audio 
                ref={audioRef} 
                src={URL.createObjectURL(currentPractice.audioBlob)} 
                onEnded={() => setPlaying(false)} 
              />
              <Space>
                <Button
                  icon={currentPractice.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={() => {
                    if (currentPractice.isPlaying) {
                      audioRef.current.pause();
                      setPlaying(false);
                    } else {
                      audioRef.current.play();
                      setPlaying(true);
                    }
                  }}
                >
                  {currentPractice.isPlaying ? '暂停' : '播放录音'}
                </Button>
                <Button 
                  icon={<RedoOutlined />} 
                  onClick={() => {
                    clearCurrentPractice();
                    startPractice(selectedTopic);
                  }}
                >
                  重新录音
                </Button>
              </Space>
            </div>
          )}
        </Card>
      </Col>

      {/* 结果显示区 */}
      <Col xs={24} lg={12}>
        <Card title="练习结果" size="small">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>正在分析您的发音...</div>
            </div>
          ) : (
            <>
              {currentPractice.transcription && (
                <div style={{ marginBottom: '24px' }}>
                  <Text strong>识别文本：</Text>
                  <div style={{ 
                    background: '#f5f5f5', 
                    padding: '12px', 
                    borderRadius: '6px',
                    marginTop: '8px'
                  }}>
                    {currentPractice.transcription}
                  </div>
                </div>
              )}

              {currentPractice.score && (
                <div>
                  <Text strong>发音评分：</Text>
                  <div style={{ marginTop: '16px' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text>总体得分</Text>
                        <Progress 
                          percent={currentPractice.score.overall} 
                          strokeColor={getScoreColor(currentPractice.score.overall)}
                          format={(percent) => `${percent}分`}
                        />
                      </div>
                      <div>
                        <Text>发音准确度</Text>
                        <Progress 
                          percent={currentPractice.score.pronunciation} 
                          strokeColor={getScoreColor(currentPractice.score.pronunciation)}
                          format={(percent) => `${percent}分`}
                        />
                      </div>
                      <div>
                        <Text>流利度</Text>
                        <Progress 
                          percent={currentPractice.score.fluency} 
                          strokeColor={getScoreColor(currentPractice.score.fluency)}
                          format={(percent) => `${percent}分`}
                        />
                      </div>
                      <div>
                        <Text>完整度</Text>
                        <Progress 
                          percent={currentPractice.score.completeness} 
                          strokeColor={getScoreColor(currentPractice.score.completeness)}
                          format={(percent) => `${percent}分`}
                        />
                      </div>
                    </Space>
                    
                    {currentPractice.score.overall >= 80 && (
                      <Alert
                        message="太棒了！"
                        description="您的发音非常标准，继续保持！"
                        type="success"
                        icon={<CheckCircleOutlined />}
                        style={{ marginTop: '16px' }}
                      />
                    )}

                    {/* 下一步按钮 */}
                    {currentPractice.score && (
                      <div style={{ textAlign: 'center', marginTop: '24px' }}>
                        <Space>
                          <Button 
                            type="primary"
                            onClick={nextSentence}
                            disabled={currentSentenceIndex >= selectedTopic.sentences.length - 1}
                          >
                            下一句
                          </Button>
                          <Button onClick={() => {
                            clearCurrentPractice();
                            setSelectedTopic(null);
                            setCurrentSentenceIndex(0);
                          }}>
                            结束练习
                          </Button>
                        </Space>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </Col>
    </Row>
  );

  // 渲染统计信息
  const renderStats = () => (
    <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
      <Col span={6}>
        <Statistic 
          title="总练习次数" 
          value={userStats.totalSessions} 
          prefix={<TrophyOutlined />}
          valueStyle={{ color: '#1890ff' }}
        />
      </Col>
      <Col span={6}>
        <Statistic 
          title="练习时长(分钟)" 
          value={userStats.totalMinutes} 
          prefix={<ClockCircleOutlined />}
          valueStyle={{ color: '#52c41a' }}
        />
      </Col>
      <Col span={6}>
        <Statistic 
          title="平均得分" 
          value={userStats.averageScore} 
          suffix="分"
          prefix={<StarOutlined />}
          valueStyle={{ color: '#faad14' }}
        />
      </Col>
      <Col span={6}>
        <Statistic 
          title="连续练习" 
          value={userStats.streak} 
          suffix="天"
          prefix={<FireOutlined />}
          valueStyle={{ color: '#f5222d' }}
        />
      </Col>
    </Row>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        {/* 头部 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px' 
        }}>
          <Title level={2} style={{ margin: 0 }}>
            <AudioOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
            AI 口语练习
          </Title>
          <Space>
            <Badge count={userStats.totalSessions} showZero>
              <Button 
                icon={<LineChartOutlined />} 
                onClick={() => setShowStats(!showStats)}
              >
                学习统计
              </Button>
            </Badge>
            <Button 
              icon={<SettingOutlined />} 
              onClick={() => setShowSettings(true)}
            >
              设置
            </Button>
          </Space>
        </div>

        {/* 统计信息 */}
        {showStats && renderStats()}
        
        <Divider />

        {/* 主要内容 */}
        {!selectedTopic ? renderTopicSelection() : renderPracticeInterface()}

        {/* AI 反馈 */}
        {showAIFeedback && currentPractice.score && (
          <div style={{ marginTop: '24px' }}>
            <AITutorFeedback
              userPerformance={currentPractice.score}
              practiceContext={currentPractice.referenceText}
              visible={showAIFeedback}
              onFeedbackReceived={(feedback) => {
                console.log('AI Feedback received:', feedback);
                setShowAIFeedback(false);
              }}
            />
          </div>
        )}
      </Card>

      {/* 设置抽屉 */}
      <Drawer
        title="练习设置"
        placement="right"
        onClose={() => setShowSettings(false)}
        open={showSettings}
        width={400}
      >
        <Form layout="vertical">
          <Form.Item label="语音提供商">
            <Select value={settings.speechSettings.provider} style={{ width: '100%' }}>
              <Option value="gemini">Google Gemini</Option>
              <Option value="baidu">百度语音</Option>
              <Option value="xunfei">科大讯飞</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="语音风格">
            <Select value={settings.speechSettings.style} style={{ width: '100%' }}>
              <Option value="professional">专业</Option>
              <Option value="friendly">友好</Option>
              <Option value="cheerful">愉快</Option>
              <Option value="serious">严肃</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="显示提示">
            <Switch checked={settings.practiceSettings.showHints} />
          </Form.Item>
          
          <Form.Item label="自动下一题">
            <Switch checked={settings.practiceSettings.autoNext} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default PracticeEnhanced;
