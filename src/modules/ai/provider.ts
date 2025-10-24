import type { ProviderKey } from './types';

export const defaultBaseByProvider: Record<Exclude<ProviderKey, 'free-priority'>, string | undefined> = {
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  ernie: undefined,      // 需自行提供网关
  hunyuan: undefined,    // 需自行提供 OpenAI 兼容网关
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  gemini: undefined,
  openai: undefined,
};

export function resolveBaseUrl(
  provider: Exclude<ProviderKey, 'free-priority'>,
  input?: string
): string | undefined {
  const explicit = (typeof input === 'string' && input.trim()) ? input.trim() : undefined;
  return explicit ?? defaultBaseByProvider[provider];
}

// OpenRouter 特殊 headers 集中管理
export function getOpenRouterHeaders(
  appTitle: string = 'ai-speech-practice',
  refererOrigin?: string
): Record<string, string> {
  const origin = refererOrigin ?? (
    typeof window !== 'undefined' && (window as any).location && (window as any).location.origin
      ? (window as any).location.origin
      : 'http://localhost'
  );
  return {
    'HTTP-Referer': origin,
    'X-Title': appTitle,
  };
}