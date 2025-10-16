import { GoogleGenAI } from '@google/genai';
import { apiManager } from '@/utils/apiManager';
import { ensureImportFileSchema, ImportFile } from '@/types/wordbook';
import { importWordbook } from '@/services/wordbookService';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { openrouter } from '@ai-sdk/openrouter';

import { generateTextWithFreePriority } from '@/services/llmService';

export interface GenerateOptions {
  name: string; // 生成后词书名称
  description?: string; // 词书描述
  topic?: string; // 主题，例如 "Travel", "IT", "Business"
  targetLanguage?: string; // 目标语言，例如 "English", "Chinese"
  level?: 'beginner' | 'intermediate' | 'advanced' | 'cet4' | 'cet6' | 'sat' | 'gmat';
  wordCount?: number; // 希望生成的词条数量
  provider?: 'gemini' | 'openai' | 'openrouter'; // 统一前端方案：可选 Provider
  model?: string; // 具体模型 ID（可选）
  apiKey?: string; // 对应 Provider 的 API Key（优先使用此字段）
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

function extractJson(text: string): any {
  // Attempt direct JSON parse first
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Fallback: extract first {...} block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const candidate = text.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) {}
  }
  throw new Error('AI 返回内容不是有效 JSON');
}

export async function generateWordbookWithGemini(options: GenerateOptions): Promise<ImportFile> {
  const apiKey = apiManager.getEffectiveApiKey();
  if (!apiKey) {
    throw new Error('未配置 Gemini API 密钥，请在设置中填写或通过环境变量提供');
  }

  const prompt = buildPrompt(options);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseModalities: ['TEXT'] },
    });

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: any) => p?.text || '').join('\n').trim();
    if (!text) {
      throw new Error('Gemini 返回空内容');
    }

    const raw = extractJson(text);
    // Fill in name/description if model omitted them
    if (!raw.name) raw.name = options.name;
    if (options.description && !raw.description) raw.description = options.description;

    const normalized = ensureImportFileSchema(raw);
    return normalized;
  } catch (error: any) {
    console.error('[WordbookAIService] 生成失败:', error);
    const msg = String(error?.message || error);
    if (msg.includes('API_KEY_INVALID') || msg.includes('401')) {
      throw new Error('Gemini API 密钥无效');
    }
    if (msg.includes('QUOTA_EXCEEDED') || msg.includes('429')) {
      throw new Error('Gemini API 配额已用完，请稍后重试');
    }
    throw new Error(`Gemini 生成失败: ${msg}`);
  }
}

export async function generateWordbookViaAI(options: GenerateOptions): Promise<ImportFile> {
  const provider = options.provider || 'openrouter';
  if (provider === 'gemini') {
    return generateWordbookWithGemini(options);
  }
  const apiKey = options.apiKey || '';
  if (!apiKey) {
    throw new Error('未配置所选 Provider 的 API 密钥');
  }
  const prompt = buildPrompt(options);
  try {
    let text = '';
    if (provider === 'openai') {
      const modelId = options.model || 'gpt-4o-mini';
      const result = await generateText({ model: openai(modelId, { apiKey }), prompt });
      text = (result?.text || '').trim();
    } else if (provider === 'openrouter') {
      const modelId = options.model || 'deepseek/deepseek-r1:free';
      const result = await generateText({ model: openrouter(modelId, { apiKey }), prompt });
      text = (result?.text || '').trim();
    } else {
      throw new Error(`不支持的 Provider: ${provider}`);
    }

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

export async function generateAndImportWordbook(options: GenerateOptions, userId: string) {
  const provider = options.provider || 'openrouter';
  const file: ImportFile = provider === 'gemini'
    ? await generateWordbookWithGemini(options)
    : await generateWordbookViaAI(options);
  const json = JSON.stringify(file);
  return importWordbook(json, userId);
}

/**
 * 使用统一 LLM 免费优先策略生成词书（GLM-4-Flash → ERNIE-Speed → hunyuan-lite ...）
 * 不依赖特定 Provider 的密钥，按可用性自动降级。
 */
export async function generateWordbookWithUnifiedLLMFree(options: GenerateOptions): Promise<ImportFile> {
  const name = options.name.trim();
  const description = (options.description || '').trim();
  const topic = (options.topic || 'General English Vocabulary').trim();
  const lang = (options.targetLanguage || 'English').trim();
  const level = options.level || 'intermediate';
  const wordCount = Math.max(10, Math.min(options.wordCount || 50, 200));

  const prompt = [
    'You are an expert language-learning assistant. Generate a clean JSON object representing a wordbook.',
    'The output MUST be ONLY valid JSON. No markdown, no commentary.',
    'Schema: { name: string; description?: string; words: { word: string; definition: string; phonetic?: string; example?: string; type?: string; }[] }',
    `Name the wordbook: "${name}"`,
    description ? `Description: ${description}` : '',
    `Language: ${lang}`,
    `Difficulty: ${level}`,
    `Topic: ${topic}`,
    `Entries: ${wordCount}`,
    'Rules:',
    '- Ensure words are relevant to the topic and avoid duplicates.',
    "- Definitions concise (<= 120 characters).",
    "- If type is absent, it's okay; it will default to 'vocabulary'.",
  ].filter(Boolean).join('\
');

  const text = await generateTextWithFreePriority(prompt);
  const raw = extractJson(text);

  if (!raw.name) raw.name = name;
  if (description && !raw.description) raw.description = description;

  const normalized = ensureImportFileSchema(raw);
  return normalized;
}

/**
 * 统一免费优先策略：直接生成并入库
 */
export async function generateAndImportWordbookUnified(options: GenerateOptions, userId: string) {
  const file: ImportFile = await generateWordbookWithUnifiedLLMFree(options);
  const json = JSON.stringify(file);
  return importWordbook(json, userId);
}