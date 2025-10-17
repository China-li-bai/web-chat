import { checkWordbookExists, importWordbook } from '@/services/wordbookService';
import { defaultBaseByProvider, resolveBaseUrl } from './provider';
import type { WordbookGenerateBaseOptions, ExplicitProviderOptions, ProviderKey, ConfirmOverwrite } from './types';
import { ensureImportFileSchema, type GenerateOptions, type ImportFile } from '@/types/wordbook';
import { generateTextUnified, LLMProvider } from './llmService';
import { default as Prompts } from '@/modules/ai/prompts/Prompts'
// 直接复用现有服务的生成实现，保持行为一致
function extractJson(text: string): any {
  // Attempt direct JSON parse first
  try {
    return JSON.parse(text);
  } catch (_) { }

  // Fallback: extract first {...} block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const candidate = text.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) { }
  }
  throw new Error('AI 返回内容不是有效 JSON');
}


function buildPrompt(opts: GenerateOptions): string {
  const name = opts.name.trim();
  const description = (opts.description || '').trim();
  const topic = (opts.topic || 'General English Vocabulary').trim();
  const lang = (opts.targetLanguage || 'English').trim();
  const level = opts.level || 'intermediate';
  const wordCount = Math.max(10, Math.min(opts.wordCount || 50, 200));

  const constraints = [
    `Language: ${lang}`,
    `Difficulty: ${level}`,
    `Topic: ${topic}`,
    `Entries: ${wordCount}`,
    `Each entry must include: word (string), definition (string). Optional: phonetic (string), example (string).`,
  ].join('\n');

  return [
    `You are an expert language-learning assistant. Generate a clean JSON object representing a wordbook for students.`,
    `The output MUST be ONLY valid JSON. No markdown, no commentary.`,
    `Schema: { name: string; description?: string; words: { word: string; definition: string; phonetic?: string; example?: string; }[] }`,
    `Name the wordbook: "${name}"`,
    description ? `Description: ${description}` : '',
    constraints,
    `Ensure words are relevant to the topic, avoid duplicates, and definitions concise (<= 120 characters).`,
  ].filter(Boolean).join('\n');
}
export async function generateWordbookViaAI(options: GenerateOptions & { baseUrl?: string }): Promise<ImportFile> {
  const provider = options.provider || 'openrouter';
  // 单独走 Gemini 官方 SDK（已实现）

  const apiKey = options.apiKey || '';
  if (!apiKey) {
    throw new Error('未配置所选 Provider 的 API 密钥');
  }
  const prompt = await (async () => {
    try {

      const wb = await Prompts.get('wordbook-generate', {
        name: options.name.trim(),
        description: (options.description || '').trim(),
        targetLanguage: (options.targetLanguage || 'English').trim(),
        level: options.level || 'intermediate',
        topic: (options.topic || 'General English Vocabulary').trim(),
        wordCount: Math.max(10, Math.min(options.wordCount || 50, 200))
      });
      return `${wb}`;
    } catch {
      return buildPrompt(options);
    }
  })();
  try {
    let text = '';
    // 统一入口：通过 llmService.generateTextUnified，支持 zhipu/ernie/hunyuan/openrouter/gemini/openai
    const mappedProvider =
      provider === 'openai' ? LLMProvider.OpenAI :
        provider === 'openrouter' ? LLMProvider.OpenRouter :
          provider === 'zhipu' ? LLMProvider.Zhipu :
            provider === 'ernie' ? LLMProvider.Ernie :
              provider === 'hunyuan' ? LLMProvider.Hunyuan :
                LLMProvider.OpenAI;
    const t = await generateTextUnified({
      provider: mappedProvider,
      prompt,
      apiKey,
      modelName: options.model,
      baseUrl: options.baseUrl
    });
    text = (t || '').trim();

    if (!text) {
      throw new Error('所选 Provider 返回空内容');
    }

    const raw = extractJson(text);
    // 填充缺失的元信息
    if (!raw.name) raw.name = options.name;
    if (options.description && !raw.description) raw.description = options.description;

    const normalized = ensureImportFileSchema(raw);
    return normalized;
  } catch (error: any) {
    console.error('[WordbookAIService] 生成失败:', error);
    const msg = String(error?.message || error);
    throw new Error(`AI 生成失败(${provider}): ${msg}`);
  }
}

export async function generateAndImportWordbook(options: GenerateOptions & { baseUrl?: string }, userId: string) {
  const file: ImportFile = await generateWordbookViaAI(options);
  const json = JSON.stringify(file);
  return importWordbook(json, userId);
}

function normalizeBaseOptions(values: any): WordbookGenerateBaseOptions {
  const { name, topic, targetLanguage, level, wordCount, description } = values || {};
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('Please input a valid name');
  }
  return {
    name: trimmedName,
    topic: topic ? String(topic).trim() : undefined,
    targetLanguage: targetLanguage ? String(targetLanguage).trim() : 'English',
    level: (level as WordbookGenerateBaseOptions['level']) || 'intermediate',
    wordCount: Number(wordCount || 50),
    description: description ? String(description).trim() : undefined,
  };
}

/**
 * 将页面表单值规范化为“显式 Provider”配置（非 free-priority）
 * - 校验 apiKey
 * - 解析 baseUrl（如果未提供且存在默认值，则填充默认）
 */
function buildExplicitOptions(values: any, base: WordbookGenerateBaseOptions): ExplicitProviderOptions {
  const { provider, model, apiKey, baseUrl } = values || {};
  const providerValue = (provider || 'free-priority') as ProviderKey;

  if (providerValue === 'free-priority') {
    throw new Error('Explicit provider options requested but provider is free-priority');
  }
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error('Please provide API Key for the selected provider');
  }
  const mappedProvider = providerValue as Exclude<ProviderKey, 'free-priority'>;

  return {
    ...base,
    provider: mappedProvider,
    model: model ? String(model).trim() : undefined,
    apiKey: String(apiKey).trim(),
    baseUrl: resolveBaseUrl(mappedProvider, baseUrl),
  };
}

/**
 * 仅生成 ImportFile（不落库），供页面预览导入
 * - free-priority：使用统一免费优先链
 * - 显式 Provider：走对应 Provider（需 apiKey / 可选 baseUrl / model）
 */
export async function generateWordbookFile(values: any): Promise<ImportFile> {
  const baseOptions = normalizeBaseOptions(values);
  const providerValue = (values?.provider || 'free-priority') as ProviderKey;

  if (providerValue === 'free-priority') {
    const file: ImportFile = await generateWordbookWithUnifiedLLMFree(baseOptions as any);
    return file;
  } else {
    const explicitOptions = buildExplicitOptions(values, baseOptions);
    if (!explicitOptions.baseUrl && defaultBaseByProvider[explicitOptions.provider]) {
      explicitOptions.baseUrl = defaultBaseByProvider[explicitOptions.provider];
    }
    const file: ImportFile = await generateWordbookViaAI(explicitOptions as any);
    return file;
  }
}

/**
 * 统一提交入口：页面层提供 confirmOverwrite 回调以决定覆盖。
 * - values: 表单值
 * - userId: 当前用户ID
 * - confirmOverwrite: 弹窗确认函数（由页面实现）
 */
export async function handleAiGenerate(
  values: any,
  userId: string,
  confirmOverwrite: ConfirmOverwrite
): Promise<{ ok: boolean; name: string; file?: ImportFile; importResult?: any; error?: string }> {
  const baseOptions = normalizeBaseOptions(values);
  const providerValue = (values?.provider || 'free-priority') as ProviderKey;

  // 覆盖确认
  const exists = await checkWordbookExists(baseOptions.name);
  if (exists) {
    const ok = await confirmOverwrite(baseOptions.name);
    if (!ok) {
      throw new Error('User cancelled overwrite');
    }
  }

  // 执行生成与导入（同时确保结构化 ImportFile）
  if (providerValue === 'free-priority') {
    // 先生成结构化文件，再导入，便于返回 file
    const file: ImportFile = await generateWordbookWithUnifiedLLMFree(baseOptions as any);
    const json = JSON.stringify(file);
    const importResult = await importWordbook(json, userId);
    return { ok: true, name: baseOptions.name, file, importResult };
  } else {
    const explicitOptions = buildExplicitOptions(values, baseOptions);
    if (!explicitOptions.baseUrl && defaultBaseByProvider[explicitOptions.provider]) {
      explicitOptions.baseUrl = defaultBaseByProvider[explicitOptions.provider];
    }
    // 同样先生成结构化文件，再导入
    const file: ImportFile = await generateWordbookViaAI(explicitOptions as any);
    const json = JSON.stringify(file);
    const importResult = await importWordbook(json, userId);
    return { ok: true, name: baseOptions.name, file, importResult };
  }
}