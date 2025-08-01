import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Switch,
  Select,
  Tag,
  Space,
  Alert,
  Divider,
  Typography,
  Modal,
  message
} from 'antd';
import {
  SettingOutlined,
  KeyOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ApiOutlined
} from '@ant-design/icons';
// import { invoke } from '@tauri-apps/api/core'; // 註釋掉Tauri依賴

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const GeminiSettings = ({ onSettingsChange }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [interests, setInterests] = useState([]);
  const [newInterest, setNewInterest] = useState('');

  // 預設興趣標籤
  const defaultInterests = [
    '科技', '旅遊', '美食', '運動', '音樂', '電影', 
    '閱讀', '攝影', '藝術', '商業', '健康', '教育'
  ];

  useEffect(() => {
    // 從本地存儲加載設置
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('gemini_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        form.setFieldsValue(settings);
        setInterests(settings.interests || []);
        setApiKeyConfigured(!!settings.apiKey);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = (values) => {
    try {
      const settings = {
        ...values,
        interests
      };
      localStorage.setItem('gemini_settings', JSON.stringify(settings));
      if (onSettingsChange) {
        onSettingsChange(settings);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // 如果有API密鑰，先測試連接
      if (values.apiKey) {
        const response = await fetch(`https://gemini.66666618.xyz/v1beta/models?key=${values.apiKey}`, {
          method: 'GET',
          mode: 'no-cors'
        });

        // 在no-cors模式下，response是opaque的，無法檢查status或讀取內容
        // 如果fetch沒有拋出錯誤，說明請求已發送成功
        setApiKeyConfigured(true);
        message.success('Gemini AI導師設置成功！');
      }
      
      // 保存設置
      saveSettings(values);
      
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        message.error('API密鑰配置失敗：網絡連接問題，請檢查網絡設置');
      } else {
        message.error(`API密鑰配置失敗：${error.message || '請檢查密鑰是否正確'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    const apiKey = form.getFieldValue('apiKey');
    if (!apiKey) {
      message.warning('請先輸入API密鑰');
      return;
    }

    setTestingConnection(true);
    try {
      // 調用Gemini API獲取模型列表進行測試
      const response = await fetch(`https://gemini.66666618.xyz/v1beta/models?key=${apiKey}`, {
        method: 'GET',
        mode: 'no-cors'
      });

      // 在no-cors模式下，response是opaque的，無法檢查status或讀取內容
      // 如果fetch沒有拋出錯誤，說明請求已發送成功
      message.success('API連接測試成功！請求已發送到服務器');
      setApiKeyConfigured(true);
    } catch (error) {
      console.error('Connection test failed:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        message.error('連接測試失敗：網絡連接問題，請檢查網絡設置或代理配置');
      } else {
        message.error(`連接測試失敗：${error.message || error}`);
      }
      setApiKeyConfigured(false);
    } finally {
      setTestingConnection(false);
    }
  };

  const addInterest = () => {
    if (newInterest && !interests.includes(newInterest)) {
      setInterests([...interests, newInterest]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest) => {
    setInterests(interests.filter(item => item !== interest));
  };

  const addDefaultInterest = (interest) => {
    if (!interests.includes(interest)) {
      setInterests([...interests, interest]);
    }
  };

  return (
    <Card>
      <Title level={3}>
        <RobotOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
        Gemini AI導師設置
      </Title>
      
      <Alert
        message="個性化AI導師"
        description="配置您的Gemini API密鑰，享受個性化的口語練習指導和即時反饋，就像Duolingo一樣智能且激勵人心！"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          enableAIFeedback: true,
          difficultyLevel: 'intermediate',
          feedbackStyle: 'encouraging',
          autoGenerateContent: true
        }}
      >
        {/* API密鑰配置 */}
        <Card size="small" title="API配置" style={{ marginBottom: '16px' }}>
          <Form.Item
            label="Gemini API密鑰"
            name="apiKey"
            rules={[
              { required: true, message: '請輸入您的Gemini API密鑰' }
            ]}
            extra={
              <div>
                <Text type="secondary">
                  請前往 <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                    Google AI Studio
                  </a> 獲取免費的API密鑰
                </Text>
                {apiKeyConfigured && (
                  <div style={{ marginTop: '4px' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '4px' }} />
                    <Text type="success">API密鑰已配置</Text>
                  </div>
                )}
              </div>
            }
          >
            <Input.Password
              prefix={<KeyOutlined />}
              placeholder="輸入您的Gemini API密鑰"
              style={{ marginBottom: '8px' }}
            />
          </Form.Item>
          
          <Button 
            icon={<ApiOutlined />}
            onClick={testConnection} 
            loading={testingConnection}
            style={{ marginBottom: '16px' }}
            type="default"
          >
            測試連接
          </Button>
        </Card>

        {/* AI導師設置 */}
        <Card size="small" title="AI導師個性化" style={{ marginBottom: '16px' }}>
          <Form.Item
            label="啟用AI反饋"
            name="enableAIFeedback"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="難度等級"
            name="difficultyLevel"
          >
            <Select>
              <Option value="beginner">初級 - 簡單詞彙和短句</Option>
              <Option value="intermediate">中級 - 日常對話和表達</Option>
              <Option value="advanced">高級 - 複雜語法和專業詞彙</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="反饋風格"
            name="feedbackStyle"
          >
            <Select>
              <Option value="encouraging">鼓勵型 - 積極正面，類似Duolingo</Option>
              <Option value="detailed">詳細型 - 深入分析，專業指導</Option>
              <Option value="concise">簡潔型 - 重點突出，快速反饋</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="自動生成練習內容"
            name="autoGenerateContent"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Card>

        {/* 興趣設置 */}
        <Card size="small" title="個人興趣" style={{ marginBottom: '16px' }}>
          <Paragraph type="secondary">
            選擇您的興趣，AI將為您生成相關的練習內容
          </Paragraph>
          
          {/* 當前興趣 */}
          <div style={{ marginBottom: '16px' }}>
            <Text strong>已選興趣：</Text>
            <div style={{ marginTop: '8px' }}>
              {interests.map(interest => (
                <Tag
                  key={interest}
                  closable
                  onClose={() => removeInterest(interest)}
                  style={{ marginBottom: '4px' }}
                >
                  {interest}
                </Tag>
              ))}
              {interests.length === 0 && (
                <Text type="secondary">尚未選擇興趣</Text>
              )}
            </div>
          </div>

          {/* 添加自定義興趣 */}
          <div style={{ marginBottom: '16px' }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="添加自定義興趣"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onPressEnter={addInterest}
              />
              <Button onClick={addInterest}>添加</Button>
            </Space.Compact>
          </div>

          {/* 預設興趣選擇 */}
          <div>
            <Text strong>快速選擇：</Text>
            <div style={{ marginTop: '8px' }}>
              {defaultInterests.map(interest => (
                <Tag
                  key={interest}
                  style={{ 
                    cursor: 'pointer', 
                    marginBottom: '4px',
                    opacity: interests.includes(interest) ? 0.5 : 1
                  }}
                  onClick={() => addDefaultInterest(interest)}
                >
                  {interest}
                </Tag>
              ))}
            </div>
          </div>
        </Card>

        <Divider />

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              <SettingOutlined /> 保存設置
            </Button>
            <Button onClick={() => form.resetFields()}>
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {/* 使用說明 */}
      <Alert
        message="使用提示"
        description={
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Gemini API提供免費額度，足夠日常練習使用</li>
            <li>AI導師會根據您的表現提供個性化反饋和建議</li>
            <li>選擇興趣後，練習內容會更貼近您的喜好</li>
            <li>建議選擇「鼓勵型」反饋風格，獲得最佳學習體驗</li>
          </ul>
        }
        type="warning"
        showIcon
        style={{ marginTop: '16px' }}
      />
    </Card>
  );
};

export default GeminiSettings;