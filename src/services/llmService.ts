import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { openrouter } from '@ai-sdk/openrouter';
import { GoogleGenAI } from '@google/genai';

// Provider 枚举
export enum LLMProvider {
  Gemini = 'gemini',
  OpenAI = 'openai',
  OpenRouter = 'openrouter',
  Groq = 'groq',
  Zhipu = 'zhipu',
}

// 模型 ID 类型（各 Provider 的字符串）
export type LLMModel = string;

// 默认模型（全局）
export const defaultModels: Record<LLMProvider, LLMModel> = {
  [LLMProvider.Gemini]: 'gemini-1.5-flash',
  [LLMProvider.OpenAI]: 'gpt-4o-mini',
  [LLMProvider.OpenRouter]: 'deepseek/deepseek-r1:free', // OpenRouter 默认使用免费模型
  [LLMProvider.Groq]: 'llama3-8b-8192',
  [LLMProvider.Zhipu]: 'glm-4-flash',
};

// 默认 BaseURL（必要时）
export const defaultBaseUrls: Record<LLMProvider, string | undefined> = {
  [LLMProvider.Gemini]: undefined,
  [LLMProvider.OpenAI]: undefined,
  [LLMProvider.OpenRouter]: 'https://openrouter.ai/api/v1',
  [LLMProvider.Groq]: 'https://api.groq.com/openai/v1',
  [LLMProvider.Zhipu]: 'https://open.bigmodel.cn/api/paas/v4',
};

// API Key 内存存储（可按需改为持久化）
const apiKeys: Partial<Record<LLMProvider, string>> = {};
export function setLLMApiKey(provider: LLMProvider, key: string) {
  apiKeys[provider] = key || '';
}
export function getLLMApiKey(provider: LLMProvider): string | undefined {
  return apiKeys[provider];
}

// 全局当前选择（默认设为 OpenRouter 免费模型）
let currentSelectedProvider: LLMProvider = LLMProvider.OpenRouter;
let currentSelectedModel: LLMModel = defaultModels[LLMProvider.OpenRouter];

export function setCurrentLLMProvider(provider: LLMProvider, model?: LLMModel) {
  currentSelectedProvider = provider;
  currentSelectedModel = model || defaultModels[provider];
}

export function getCurrentLLMConfig() {
  return {
    provider: currentSelectedProvider,
    model: currentSelectedModel,
    baseUrl: defaultBaseUrls[currentSelectedProvider],
    apiKey: getLLMApiKey(currentSelectedProvider),
  };
}

// 统一文本生成函数（输入 prompt，返回纯文本）
export async function generateTextUnified(options: {
  provider?: LLMProvider;
  prompt: string;
  apiKey?: string;
  modelName?: LLMModel;
  baseUrl?: string;
}): Promise<string> {
  const provider = options.provider || currentSelectedProvider;
  const modelId = options.modelName || defaultModels[provider];
  const apiKey = options.apiKey || getLLMApiKey(provider);
  const baseUrl = options.baseUrl ?? defaultBaseUrls[provider];

  if (!modelId) throw new Error('未指定模型');
  if (!apiKey) throw new Error('未配置所选 Provider 的 API 密钥');

  if (provider === LLMProvider.Gemini) {
    const ai = new GoogleGenAI({ apiKey });
    const resp = await ai.models.generateContent({
      model: modelId,
      contents: [{ parts: [{ text: options.prompt }]}],
      config: { responseModalities: ['TEXT'] },
    });
    const parts = resp?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: any) => p?.text || '').join('\n').trim();
    if (!text) throw new Error('Gemini 返回空内容');
    return text;
  }

  if (provider === LLMProvider.OpenAI) {
    const result = await generateText({ model: openai(modelId, { apiKey, baseURL: baseUrl }), prompt: options.prompt });
    const text = (result?.text || '').trim();
    if (!text) throw new Error('OpenAI 返回空内容');
    return text;
  }

  if (provider === LLMProvider.OpenRouter) {
    const result = await generateText({ model: openrouter(modelId, { apiKey }), prompt: options.prompt });
    const text = (result?.text || '').trim();
    if (!text) throw new Error('OpenRouter 返回空内容');
    return text;
  }

  // 其他 Provider 可按需扩展（Groq/Zhipu 等）
  throw new Error(`不支持的 Provider: ${provider}`);
}