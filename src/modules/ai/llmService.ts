import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

import { GoogleGenAI } from '@google/genai';
import Prompts from './prompts/Prompts';

// Provider 枚举
export enum LLMProvider {
  Gemini = 'gemini',
  OpenAI = 'openai',
  OpenRouter = 'openrouter',
  Groq = 'groq',
  Zhipu = 'zhipu',
  Ernie = 'ernie',
  Hunyuan = 'hunyuan',
}

const messages = async (msg: { role: string, content: string }) => {
  const content = await Prompts.get('anthropic_thinking_protocol');
  
  return [
    {
      role: "system",
      content
    },
    msg
  ]
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
  [LLMProvider.Ernie]: 'ernie-speed',
  [LLMProvider.Hunyuan]: 'hunyuan-lite',
};

// 默认 BaseURL（必要时）
export const defaultBaseUrls: Record<LLMProvider, string | undefined> = {
  [LLMProvider.Gemini]: undefined,
  [LLMProvider.OpenAI]: undefined,
  [LLMProvider.OpenRouter]: 'https://openrouter.ai/api/v1',
  [LLMProvider.Groq]: 'https://api.groq.com/openai/v1',
  // Zhipu OpenAI风格 V4 chat completions
  [LLMProvider.Zhipu]: 'https://open.bigmodel.cn/api/paas/v4',
  // ERNIE/文心 需要 access_token 或自定义网关，默认不提供，要求外部配置 baseUrl
  [LLMProvider.Ernie]: undefined,
  // 腾讯混元 OpenAI 兼容网关，默认不提供，要求外部配置 baseUrl
  [LLMProvider.Hunyuan]: undefined,
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

// 免费优先策略：GLM-4-Flash → ERNIE-Speed → hunyuan-lite → OpenRouter:free → Gemini → OpenAI
export async function generateTextWithFreePriority(prompt: string): Promise<string> {
  const order: Array<{ p: LLMProvider; model?: LLMModel }> = [
    { p: LLMProvider.Zhipu, model: defaultModels[LLMProvider.Zhipu] },
    { p: LLMProvider.Ernie, model: defaultModels[LLMProvider.Ernie] },
    { p: LLMProvider.Hunyuan, model: defaultModels[LLMProvider.Hunyuan] },
    { p: LLMProvider.OpenRouter, model: defaultModels[LLMProvider.OpenRouter] },
    { p: LLMProvider.Gemini, model: defaultModels[LLMProvider.Gemini] },
    { p: LLMProvider.OpenAI, model: defaultModels[LLMProvider.OpenAI] },
  ];

  let lastErr: any = null;
  for (const item of order) {
    try {
      const text = await generateTextUnified({
        provider: item.p,
        modelName: item.model,
        prompt,
        apiKey: getLLMApiKey(item.p),
        baseUrl: defaultBaseUrls[item.p],
      });
      if (text && text.trim()) return text.trim();
    } catch (e: any) {
      // 对于未配置/跳过的 Provider，继续尝试下一个
      lastErr = e;
      continue;
    }
  }
  throw new Error(`所有免费优先候选均不可用，最后错误：${String(lastErr?.message || lastErr || 'unknown')}`);
}

// 统一文本生成函数（输入 prompt，返回纯文本）
export async function generateTextUnified(options: {
  provider?: LLMProvider;
  prompt: string;
  apiKey?: string;
  modelName?: LLMModel;
  baseUrl?: string;
  responseFormat?: any
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
      contents: [{ parts: [{ text: options.prompt }] }],
      config: { responseModalities: ['TEXT'] },
    });
    const parts = resp?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: any) => p?.text || '').join('\n').trim();
    if (!text) throw new Error('Gemini 返回空内容');
    return text;
  }

  if (provider === LLMProvider.OpenAI) {
    const result = await generateText({ model: openai({ apiKey, baseURL: baseUrl })(modelId), prompt: options.prompt });
    const text = (result?.text || '').trim();
    if (!text) throw new Error('OpenAI 返回空内容');
    return text;
  }

  if (provider === LLMProvider.OpenRouter) {
    const result = await generateText({
      model: openai({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: {
          'HTTP-Referer': (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost',
          'X-Title': 'ai-speech-practice'
        }
      })(modelId),
      prompt: options.prompt
    });
    const text = (result?.text || '').trim();
    if (!text) throw new Error('OpenRouter 返回空内容');
    return text;
  }

  // Zhipu (GLM-4-Flash) - OpenAI 兼容 chat completions v4
  if (provider === LLMProvider.Zhipu) {
    const url = (baseUrl || '').replace(/\/+$/, '') + '/chat/completions';
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: await messages({ role: 'user', content: options.prompt }),
         response_format: {type: "json_object"} ,
        // ...(options.responseFormat ? { response_format: options.responseFormat } : {})
      }),
    });
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || data?.data || '';
    const t = String(text || '').trim();
    if (!t) throw new Error('Zhipu 返回空内容');
    return t;
  }

  // ERNIE-Speed（需外部提供 baseUrl 或 access_token 网关）
  if (provider === LLMProvider.Ernie) {
    if (!baseUrl) throw new Error('Ernie 未配置 baseUrl 或网关，已跳过');
    const url = (baseUrl || '').replace(/\/+$/, '') + '/chat/completions';
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ model: modelId, messages:await messages({ role: 'user', content: options.prompt })}),
    });
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const t = String(text || '').trim();
    if (!t) throw new Error('Ernie 返回空内容');
    return t;
  }

  // Hunyuan-Lite（需外部提供 OpenAI 兼容 baseUrl）
  if (provider === LLMProvider.Hunyuan) {
    if (!baseUrl) throw new Error('Hunyuan 未配置 baseUrl 或网关，已跳过');
    const url = (baseUrl || '').replace(/\/+$/, '') + '/chat/completions';
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ model: modelId, messages:await  messages({ role: 'user', content: options.prompt })}),
    });
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const t = String(text || '').trim();
    if (!t) throw new Error('Hunyuan 返回空内容');
    return t;
  }

  // 其他 Provider 可按需扩展
  throw new Error(`不支持的 Provider: ${provider}`);
}