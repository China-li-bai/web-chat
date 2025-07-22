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
  Spin
} from 'antd';
import {
  AudioOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  ReloadOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/tauri';

const { Title, Text, Paragraph } = Typography;

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
      
      // 调用Tauri命令
      await invoke('start_recording');
    } catch (error) {
      console.error('录音失败:', error);
      Modal.error({
        title: '录音失败',
        content: '无法访问麦克风，请检查系统权限设置并重启应用。',
      });
    }
  };

  // 停止录音
  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      // 调用Tauri命令
      await invoke('stop_recording');
    }
  };

  // 处理音频
  const processAudio = async (audioBlob) => {
    setLoading(true);
    try {
      // 转换为base64
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
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('处理音频失败:', error);
      Modal.error({
        title: '处理失败',
        content: '音频处理失败，请重试。',
      });
    } finally {
      setLoading(false);
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
      const audioData = await invoke('text_to_speech', { text: practiceText });
      // 这里应该播放返回的音频数据
      console.log('播放示例音频:', audioData);
    } catch (error) {
      console.error('播放示例失败:', error);
    }
  };

  // 重新开始
  const restart = () => {
    setRecordedAudio(null);
    setTranscription('');
    setScores(null);
    setIsPlaying(false);
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
        <Title level={2}>
          <AudioOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
          AI口语练习
        </Title>
        
        {/* 麦克风权限状态 */}
        <div style={{ marginBottom: '16px' }}>
          {micPermission ? (
            <Alert
              message="麦克风权限已获取"
              type="success"
              showIcon
              style={{ width: 'fit-content' }}
            />
          ) : (
            <Alert
              message="麦克风权限未获取"
              description={
                <div>
                  <p>在 Tauri 应用中，麦克风权限需要在系统级别授予。请确保您已在系统设置中允许此应用访问麦克风。</p>
                  <p><strong>Windows:</strong> 设置 &gt; 隐私和安全性 &gt; 麦克风</p>
                  <p><strong>macOS:</strong> 系统偏好设置 &gt; 安全性与隐私 &gt; 麦克风</p>
                  <p><strong>Linux:</strong> 请参考您的发行版文档</p>
                  <p>授予权限后，请重启应用。</p>
                </div>
              }
              type="warning"
              showIcon
              style={{ width: 'fit-content' }}
            />
          )}
        </div>
        
        {/* 主题选择 */}
        <div style={{ marginBottom: '24px' }}>
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
                    <Button 
                      icon={<SoundOutlined />} 
                      onClick={playExample}
                      style={{ marginTop: '8px' }}
                    >
                      播放示例
                    </Button>
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
      </Card>
    </div>
  );
};

export default Practice;