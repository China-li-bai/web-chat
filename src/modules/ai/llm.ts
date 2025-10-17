import { LLMProvider, defaultModels, defaultBaseUrls, setLLMApiKey, getLLMApiKey, setCurrentLLMProvider, getCurrentLLMConfig, generateTextUnified, generateTextWithFreePriority } from '@/modules/ai/llmService';
import type { ProviderKey } from './types';
import { resolveBaseUrl } from './provider';

function providerKeyToLLM(p: Exclude<ProviderKey, 'free-priority'>): LLMProvider {
  switch (p) {
    case 'gemini': return LLMProvider.Gemini;
    case 'openai': return LLMProvider.OpenAI;
    case 'openrouter': return LLMProvider.OpenRouter;
    case 'zhipu': return LLMProvider.Zhipu;
    case 'ernie': return LLMProvider.Ernie;
    case 'hunyuan': return LLMProvider.Hunyuan;
    default:
      throw new Error(`Unsupported provider key: ${String(p)}`);
  }
}

/**
 * 统一模型调用（指定 Provider）
 */
export async function callModel(options: {
  provider: Exclude<ProviderKey, 'free-priority'>;
  prompt: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}): Promise<string> {
  const llmProvider = providerKeyToLLM(options.provider);
  const modelName = options.model || defaultModels[llmProvider];
  const apiKey = options.apiKey || getLLMApiKey(llmProvider);
  const baseUrl = resolveBaseUrl(options.provider, options.baseUrl) ?? defaultBaseUrls[llmProvider];

  return generateTextUnified({
    provider: llmProvider,
    prompt: options.prompt,
    apiKey,
    modelName,
    baseUrl,
  });
}

/**
 * 免费优先链路调用（GLM → ERNIE → Hunyuan → OpenRouter:free → Gemini → OpenAI）
 */
export async function callModelFreePriority(prompt: string): Promise<string> {
  return generateTextWithFreePriority(prompt);
}

/**
 * 管理 API Key（按 Provider）
 */
export function setApiKey(provider: Exclude<ProviderKey, 'free-priority'>, key: string) {
  const p = providerKeyToLLM(provider);
  setLLMApiKey(p, key);
}

export function getApiKey(provider: Exclude<ProviderKey, 'free-priority'>): string | undefined {
  return getLLMApiKey(providerKeyToLLM(provider));
}

/**
 * 当前 Provider/模型配置（供需要全局状态的地方使用）
 */
export function setCurrentProvider(provider: Exclude<ProviderKey, 'free-priority'>, model?: string) {
  setCurrentLLMProvider(providerKeyToLLM(provider), model);
}

export function getCurrentConfig() {
  return getCurrentLLMConfig();
}

// 便于外部获取默认模型与 baseUrl（只读）
export const AiDefaultModels = defaultModels;
export const AiDefaultBaseUrls = defaultBaseUrls;