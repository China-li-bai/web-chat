import type { ProviderKey } from './types';

export const defaultBaseByProvider: Record<Exclude<ProviderKey, 'free-priority'>, string | undefined> = {
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  ernie: undefined,      // 需自行提供网关
  hunyuan: undefined,    // 需自行提供 OpenAI 兼容网关
  openrouter: 'https://openrouter.ai/api/v1',
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