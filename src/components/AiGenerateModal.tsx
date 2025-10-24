import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Modal, Form, Input, Select, Typography, message } from 'antd';
import { generateTextWithFreePriority, generateTextUnified, LLMProvider, defaultModels } from '@/modules/ai/llmService';
import Prompts from '@/modules/ai/prompts/Prompts';


const { Text } = Typography;

export type AiGenerateMode = 'practice' | 'wordbook';

export interface AiGenerateModalProps {
  open: boolean;
  mode: AiGenerateMode;
  goal?: string;
  onCancel: () => void;
  onSuccess?: (payload: any) => void; // practice: { sessionId, turnId, referenceText }
}

const PROVIDER_OPTIONS = [
  { label: 'Free Priority (GLM → ERNIE → Hunyuan → OpenRouter:free → Gemini → OpenAI)', value: 'free-priority' },
  { label: 'Zhipu AI (GLM)', value: 'zhipu' },
  { label: 'Baidu ERNIE', value: 'ernie' },
  { label: 'Tencent Hunyuan', value: 'hunyuan' },
  { label: 'OpenRouter', value: 'openrouter' },
  { label: 'Groq', value: 'groq' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'OpenAI', value: 'openai' },
];

function providerToEnum(p: string): LLMProvider | null {
  switch (p) {
    case 'gemini': return LLMProvider.Gemini;
    case 'openai': return LLMProvider.OpenAI;
    case 'openrouter': return LLMProvider.OpenRouter;
    case 'zhipu': return LLMProvider.Zhipu;
    case 'ernie': return LLMProvider.Ernie;
    case 'hunyuan': return LLMProvider.Hunyuan;
    case 'groq': return LLMProvider.Groq;
    default: return null;
  }
}



const AiGenerateModal: React.FC<AiGenerateModalProps> = ({ open, mode, goal, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const initialValues = useMemo(() => ({
    provider: 'free-priority',
    difficulty: 'intermediate',
    userGoal: 'Improve daily conversation fluency',
  }), []);

  const parseLLMJson = (raw: string): any => {
    const s = (raw || '').trim();
    const fenced = s.replace(/^```(json)?\s*/i, '').replace(/```$/,'').trim();
    try { return JSON.parse(fenced); } catch {}
    const firstBrace = fenced.indexOf('{');
    const lastBrace = fenced.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = fenced.slice(firstBrace, lastBrace + 1);
      try { return JSON.parse(candidate); } catch {}
    }
    return { referenceText: s };
  };

  useEffect(() => {
    if (open && goal) {
      try {
        form.setFieldsValue({ userGoal: goal });
      } catch (e) {
        console.error('prefill goal failed:', e);
      }
    }
  }, [open, goal, form]);

  const handleOk = useCallback(async () => {
    if (submitting) { // 防重入：正在提交時禁止再次點擊
      message.info('請求正在處理，請稍候');
      return;
    }
    setSubmitting(true);
    const hide = message.loading('正在生成...', 0);
    try {
      const values = await form.validateFields();
      const {
        provider,
        model,
        apiKey,
        baseUrl,
        difficulty,
        userGoal,
      } = values;

      // Build final prompt from Prompts.get (统一入口)
      const promptFromTemplate = await Prompts.get('practice-goal-driven', {
        userGoal: userGoal || '',
        lang: 'en-US',
        level: difficulty || 'intermediate',
        tone: 'friendly',
      });

      let text: string;
      if (provider === 'free-priority') {
        text = await generateTextWithFreePriority(promptFromTemplate);
      } else {
        const pEnum = providerToEnum(provider);
        if (!pEnum) {
          message.error('Unsupported provider');
          return;
        }
        text = await generateTextUnified({
          provider: pEnum,
          prompt: promptFromTemplate,
          apiKey,
          modelName: model || defaultModels[pEnum],
          baseUrl,
        });
      }

      const results = parseLLMJson(text || '');
      const referenceText: string = typeof results.referenceText === 'string'
        ? results.referenceText.trim()
        : (text || '').trim();
      console.log({ results, text });

      if (!referenceText) {
        message.error('AI 返回空内容');
        return;
      }

      onSuccess && onSuccess(JSON.parse(JSON.stringify(results)));

      message.success('生成成功');
      onCancel();
    } catch (e: any) {
      console.error('AI generate failed:', e);
      message.error(e?.message || '生成失败，请稍后重试');
    } finally {
      hide?.();
      setSubmitting(false);
    }
  }, [form, onCancel, onSuccess, submitting]);

  return (
    <Modal
      title="AI Generate Practice"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Generate"
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
      >

        <Form.Item label="Difficulty" name="difficulty" rules={[{ required: true }]}>
          <Select
            options={[
              { label: '初級', value: 'beginner' },
              { label: '中級', value: 'intermediate' },
              { label: '高級', value: 'advanced' },
            ]}
          />
        </Form.Item>
        <Form.Item label="User Goal" name="userGoal" rules={[{ required: true }]}>
          <Input.TextArea rows={3} placeholder="e.g., Pass interview; IELTS; Daily conversation" />
        </Form.Item>

        <Form.Item label="Provider" name="provider" rules={[{ required: true }]}>
          <Select options={PROVIDER_OPTIONS} />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.provider !== curr.provider}>
          {({ getFieldValue }) => {
            const p = getFieldValue('provider');
            if (p && p !== 'free-priority') {
              const modelPh =
                p === 'zhipu' ? 'e.g., glm-4-flash' :
                p === 'ernie' ? 'e.g., ernie-speed' :
                p === 'hunyuan' ? 'e.g., hunyuan-lite' :
                p === 'openrouter' ? 'e.g., deepseek/deepseek-r1:free' :
                p === 'groq' ? 'e.g., llama3.1-8b-instant' :
                p === 'openai' ? 'e.g., gpt-4o-mini' :
                'e.g., gemini-1.5-flash';
              const basePh =
                p === 'zhipu' ? 'https://open.bigmodel.cn/api/paas/v4' :
                p === 'openrouter' ? 'https://openrouter.ai/api/v1' :
                p === 'ernie' ? 'Your ERNIE-compatible gateway base URL' :
                p === 'hunyuan' ? 'Your Hunyuan OpenAI-compatible gateway base URL' :
                p === 'groq' ? 'https://api.groq.com/openai/v1' :
                '';

              return (
                <>
                  <Form.Item label="Model (optional)" name="model">
                    <Input placeholder={modelPh} />
                  </Form.Item>
                  <Form.Item label="API Key" name="apiKey" rules={[{ required: true, message: 'Please input API Key for the selected provider' }]}> 
                    <Input.Password placeholder="Your API Key" />
                  </Form.Item>
                  <Form.Item label="Base URL (optional)" name="baseUrl">
                    <Input placeholder={basePh} />
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
  );
};

export default AiGenerateModal;