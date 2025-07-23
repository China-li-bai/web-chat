import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Divider,
  Typography,
  Space,
  Slider,
  Radio,
  Alert,
  Modal,
  message
} from 'antd';
import {
  SettingOutlined,
  SoundOutlined,
  AudioOutlined,
  GlobalOutlined,
  BellOutlined,
  SecurityScanOutlined,
  ExportOutlined,
  ImportOutlined,
  DeleteOutlined,
  RobotOutlined
} from '@ant-design/icons';
import GeminiSettings from '../components/GeminiSettings';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testingMic, setTestingMic] = useState(false);
  const [testingSpeaker, setTestingSpeaker] = useState(false);

  // 初始设置值
  const initialValues = {
    // 基本设置
    username: '用户名',
    email: 'user@example.com',
    language: 'zh-CN',
    theme: 'light',
    
    // 语音设置
    microphoneDevice: 'default',
    speakerDevice: 'default',
    microphoneVolume: 80,
    speakerVolume: 70,
    noiseReduction: true,
    autoGainControl: true,
    
    // AI设置
    speechProvider: 'baidu',
    ttsProvider: 'xunfei',
    voiceType: 'female',
    speechSpeed: 1.0,
    
    // 学习设置
    difficultyLevel: 'intermediate',
    practiceReminder: true,
    reminderTime: '20:00',
    autoSave: true,
    
    // 隐私设置
    dataCollection: false,
    voiceStorage: true,
    analyticsSharing: false
  };

  // 保存设置
  const handleSave = async (values) => {
    setLoading(true);
    try {
      // 这里调用保存设置的API
      console.log('保存设置:', values);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API调用
      message.success('设置保存成功！');
    } catch (error) {
      message.error('保存设置失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  // 测试麦克风
  const testMicrophone = async () => {
    setTestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      message.success('麦克风测试成功！');
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      message.error('麦克风测试失败，请检查设备权限。');
    } finally {
      setTestingMic(false);
    }
  };

  // 测试扬声器
  const testSpeaker = () => {
    setTestingSpeaker(true);
    // 播放测试音频
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    audio.play().then(() => {
      message.success('扬声器测试成功！');
    }).catch(() => {
      message.error('扬声器测试失败。');
    }).finally(() => {
      setTestingSpeaker(false);
    });
  };

  // 重置设置
  const resetSettings = () => {
    Modal.confirm({
      title: '确认重置',
      content: '确定要重置所有设置到默认值吗？此操作不可撤销。',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        form.setFieldsValue(initialValues);
        message.success('设置已重置到默认值。');
      }
    });
  };

  // 导出设置
  const exportSettings = () => {
    const settings = form.getFieldsValue();
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ai-speech-settings.json';
    link.click();
    URL.revokeObjectURL(url);
    message.success('设置已导出。');
  };

  // 导入设置
  const importSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const settings = JSON.parse(e.target.result);
            form.setFieldsValue(settings);
            message.success('设置已导入。');
          } catch (error) {
            message.error('导入失败，文件格式不正确。');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <SettingOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
        设置
      </Title>

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSave}
      >
        {/* 基本设置 */}
        <Card title="基本设置" style={{ marginBottom: '24px' }}>
          <Form.Item label="用户名" name="username">
            <Input placeholder="请输入用户名" />
          </Form.Item>
          
          <Form.Item label="邮箱" name="email">
            <Input type="email" placeholder="请输入邮箱地址" />
          </Form.Item>
          
          <Form.Item label="界面语言" name="language">
            <Select>
              <Option value="zh-CN">简体中文</Option>
              <Option value="en-US">English</Option>
              <Option value="ja-JP">日本語</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="主题" name="theme">
            <Radio.Group>
              <Radio value="light">浅色主题</Radio>
              <Radio value="dark">深色主题</Radio>
              <Radio value="auto">跟随系统</Radio>
            </Radio.Group>
          </Form.Item>
        </Card>

        {/* 语音设备设置 */}
        <Card 
          title={
            <Space>
              <AudioOutlined />
              语音设备设置
            </Space>
          } 
          style={{ marginBottom: '24px' }}
        >
          <Form.Item label="麦克风设备" name="microphoneDevice">
            <Select>
              <Option value="default">默认麦克风</Option>
              <Option value="device1">内置麦克风</Option>
              <Option value="device2">外接麦克风</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="扬声器设备" name="speakerDevice">
            <Select>
              <Option value="default">默认扬声器</Option>
              <Option value="device1">内置扬声器</Option>
              <Option value="device2">外接扬声器</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="麦克风音量" name="microphoneVolume">
            <Slider min={0} max={100} marks={{ 0: '0%', 50: '50%', 100: '100%' }} />
          </Form.Item>
          
          <Form.Item label="扬声器音量" name="speakerVolume">
            <Slider min={0} max={100} marks={{ 0: '0%', 50: '50%', 100: '100%' }} />
          </Form.Item>
          
          <Form.Item label="噪音抑制" name="noiseReduction" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          <Form.Item label="自动增益控制" name="autoGainControl" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          <Space>
            <Button 
              icon={<AudioOutlined />} 
              onClick={testMicrophone}
              loading={testingMic}
            >
              测试麦克风
            </Button>
            <Button 
              icon={<SoundOutlined />} 
              onClick={testSpeaker}
              loading={testingSpeaker}
            >
              测试扬声器
            </Button>
          </Space>
        </Card>

        {/* AI服务设置 */}
        <Card 
          title={
            <Space>
              <GlobalOutlined />
              AI服务设置
            </Space>
          } 
          style={{ marginBottom: '24px' }}
        >
          <Form.Item label="语音识别服务" name="speechProvider">
            <Select>
              <Option value="baidu">百度语音（免费）</Option>
              <Option value="xunfei">科大讯飞</Option>
              <Option value="tencent">腾讯云</Option>
              <Option value="aliyun">阿里云</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="语音合成服务" name="ttsProvider">
            <Select>
              <Option value="xunfei">科大讯飞</Option>
              <Option value="tencent">腾讯云</Option>
              <Option value="aliyun">阿里云</Option>
              <Option value="baidu">百度语音</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="语音类型" name="voiceType">
            <Radio.Group>
              <Radio value="female">女声</Radio>
              <Radio value="male">男声</Radio>
              <Radio value="child">童声</Radio>
            </Radio.Group>
          </Form.Item>
          
          <Form.Item label="语音速度" name="speechSpeed">
            <Slider 
              min={0.5} 
              max={2.0} 
              step={0.1}
              marks={{ 0.5: '0.5x', 1.0: '1.0x', 1.5: '1.5x', 2.0: '2.0x' }}
            />
          </Form.Item>
        </Card>

        {/* Gemini AI导师设置 */}
        <Card 
          title={
            <Space>
              <RobotOutlined />
              Gemini AI導師設置
            </Space>
          } 
          style={{ marginBottom: '24px' }}
        >
          <GeminiSettings />
        </Card>

        {/* 学习设置 */}
        <Card 
          title={
            <Space>
              <BellOutlined />
              学习设置
            </Space>
          } 
          style={{ marginBottom: '24px' }}
        >
          <Form.Item label="难度级别" name="difficultyLevel">
            <Select>
              <Option value="beginner">初级</Option>
              <Option value="intermediate">中级</Option>
              <Option value="advanced">高级</Option>
              <Option value="expert">专家</Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="练习提醒" name="practiceReminder" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          <Form.Item label="提醒时间" name="reminderTime">
            <Input type="time" />
          </Form.Item>
          
          <Form.Item label="自动保存" name="autoSave" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Card>

        {/* 隐私设置 */}
        <Card 
          title={
            <Space>
              <SecurityScanOutlined />
              隐私设置
            </Space>
          } 
          style={{ marginBottom: '24px' }}
        >
          <Alert
            message="隐私保护"
            description="我们重视您的隐私，所有语音数据仅用于改善服务质量，不会用于其他用途。"
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          
          <Form.Item label="允许数据收集" name="dataCollection" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          <Form.Item label="本地存储语音" name="voiceStorage" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          <Form.Item label="分享分析数据" name="analyticsSharing" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Card>

        {/* 操作按钮 */}
        <Card title="数据管理">
          <Space wrap>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存设置
            </Button>
            <Button onClick={resetSettings}>
              重置设置
            </Button>
            <Button icon={<ExportOutlined />} onClick={exportSettings}>
              导出设置
            </Button>
            <Button icon={<ImportOutlined />} onClick={importSettings}>
              导入设置
            </Button>
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => {
                Modal.confirm({
                  title: '确认清除',
                  content: '确定要清除所有本地数据吗？此操作不可撤销。',
                  okText: '确认',
                  cancelText: '取消',
                  onOk: () => {
                    // 清除本地数据的逻辑
                    message.success('本地数据已清除。');
                  }
                });
              }}
            >
              清除数据
            </Button>
          </Space>
        </Card>
      </Form>
    </div>
  );
};

export default Settings;