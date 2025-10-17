import { checkWordbookExists, importWordbook } from '@/services/wordbookService';
import { defaultBaseByProvider, resolveBaseUrl } from './provider';
import type { WordbookGenerateBaseOptions, ExplicitProviderOptions, ProviderKey, ConfirmOverwrite } from './types';
import type { ImportFile } from '@/types/wordbook';

// 直接复用现有服务的生成实现，保持行为一致
import { generateWordbookWithUnifiedLLMFree, generateWordbookViaAI } from '@/services/wordbookAIService';

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