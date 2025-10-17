export interface WordbookGenerateBaseOptions {
  name: string;
  topic?: string;
  targetLanguage?: string;
  level?: string;
  wordCount: number;
  description?: string;
}

export type ProviderKey =
  | 'free-priority'
  | 'zhipu'
  | 'ernie'
  | 'hunyuan'
  | 'openrouter'
  | 'gemini'
  | 'openai';

export interface ExplicitProviderOptions extends WordbookGenerateBaseOptions {
  provider: Exclude<ProviderKey, 'free-priority'>;
  model?: string;
  apiKey: string;
  baseUrl?: string;
}

export type ConfirmOverwrite = (name: string) => Promise<boolean>;