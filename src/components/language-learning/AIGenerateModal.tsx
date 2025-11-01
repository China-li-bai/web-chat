import React from 'react';
import { Modal, Form, Input, Select, InputNumber, Typography, message } from 'antd';
import { generateWordbookFile } from '@/modules/ai';
import { type ImportFile } from '@/types/wordbook';

const { TextArea } = Input;
const { Text } = Typography;

export interface AIGenerateModalProps {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onSuccess: (file: ImportFile) => void;
  onLoadingChange: (loading: boolean) => void;
  userId: string | null;
}

export const AIGenerateModal: React.FC<AIGenerateModalProps> = ({
  open,
  loading,
  onCancel,
  onSuccess,
  onLoadingChange,
  userId,
}) => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const handleGenerate = async (values: any) => {
    if (!userId) {
      messageApi.error('User not ready');
      return;
    }

    try {
      onLoadingChange(true);
      const file = await generateWordbookFile(values);
      onSuccess(file as ImportFile);
      form.resetFields();
      messageApi.success('Generated wordbook file. Please review before import.');
    } catch (e: any) {
      if (String(e?.message).includes('User cancelled overwrite')) {
        return;
      }
      console.error('AI generate failed:', e);
      messageApi.error(String(e?.message || 'AI generate failed'));
    } finally {
      onLoadingChange(false);
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onCancel();
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title="AI Generate Wordbook"
        open={open}
        onCancel={handleCancel}
        onOk={() => form.submit()}
        okText={loading ? 'Generating...' : 'Generate'}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ wordCount: 50, targetLanguage: 'English', provider: 'free-priority', goal: true }}
          onFinish={handleGenerate}
          onFinishFailed={() => messageApi.error('Please complete required fields')}
        >
          <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Please input name' }]}>
            <Input placeholder="e.g., Travel English Starter" />
          </Form.Item>

          <Form.Item label="User Goal" name="userGoal" rules={[{ required: true, message: 'Please input your goal' }]}>
            <TextArea rows={3} placeholder="e.g., Pass frontend engineer English interview; IELTS; CET4" />
          </Form.Item>

          <Form.Item label="Target Language" name="targetLanguage">
            <Input placeholder="e.g., English, Chinese" />
          </Form.Item>

          <Form.Item label="Word Count" name="wordCount" rules={[{ type: 'number', min: 10, max: 200 }]}>
            <InputNumber min={10} max={200} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Provider" name="provider">
            <Select
              options={[
                { label: 'Free Priority (GLM → ERNIE → Hunyuan → OpenRouter:free → Gemini → OpenAI)', value: 'free-priority' },
                { label: 'Zhipu AI (GLM)', value: 'zhipu' },
                { label: 'Baidu ERNIE', value: 'ernie' },
                { label: 'Tencent Hunyuan', value: 'hunyuan' },
                { label: 'OpenRouter', value: 'openrouter' },
                { label: 'Gemini', value: 'gemini' },
                { label: 'OpenAI', value: 'openai' },
              ]}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.provider !== curr.provider}>
            {({ getFieldValue }) => {
              const provider = getFieldValue('provider');
              if (provider && provider !== 'free-priority') {
                const modelPlaceholder =
                  provider === 'zhipu' ? 'e.g., glm-4-flash' :
                    provider === 'ernie' ? 'e.g., ernie-speed' :
                      provider === 'hunyuan' ? 'e.g., hunyuan-lite' :
                        provider === 'openrouter' ? 'e.g., deepseek/deepseek-r1:free' :
                          provider === 'openai' ? 'e.g., gpt-4o-mini' :
                            'e.g., gemini-1.5-flash';
                const basePlaceholder =
                  provider === 'zhipu' ? 'https://open.bigmodel.cn/api/paas/v4' :
                    provider === 'openrouter' ? 'https://openrouter.ai/api/v1' :
                      provider === 'ernie' ? 'Your ERNIE-compatible gateway base URL' :
                        provider === 'hunyuan' ? 'Your Hunyuan OpenAI-compatible gateway base URL' :
                          '';
                return (
                  <>
                    <Form.Item label="Model (optional)" name="model">
                      <Input placeholder={modelPlaceholder} />
                    </Form.Item>
                    <Form.Item label="API Key" name="apiKey" rules={[{ required: true, message: 'Please input API Key for the selected provider' }]}>
                      <Input.Password placeholder="Your API Key" />
                    </Form.Item>
                    <Form.Item label="Base URL (optional)" name="baseUrl">
                      <Input placeholder={basePlaceholder} />
                    </Form.Item>
                  </>
                );
              }
              return (
                <Form.Item>
                  <Text type="secondary">
                    Using Free Priority chain by default: GLM-4-Flash → ERNIE-Speed → hunyuan-lite → OpenRouter:free → Gemini → OpenAI
                  </Text>
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AIGenerateModal;