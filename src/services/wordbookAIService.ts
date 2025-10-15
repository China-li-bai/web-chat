import { GoogleGenAI } from '@google/genai';
import { apiManager } from '@/utils/apiManager';
import { ensureImportFileSchema, ImportFile } from '@/types/wordbook';
import { importWordbook } from '@/services/wordbookService';

export interface GenerateOptions {
  name: string; // 生成后词书名称
  description?: string; // 词书描述
  topic?: string; // 主题，例如 "Travel", "IT", "Business"
  targetLanguage?: string; // 目标语言，例如 "English", "Chinese"
  level?: 'beginner' | 'intermediate' | 'advanced' | 'cet4' | 'cet6' | 'sat' | 'gmat';
  wordCount?: number; // 希望生成的词条数量
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

export async function generateAndImportWordbook(options: GenerateOptions, userId: string) {
  const file: ImportFile = await generateWordbookWithGemini(options);
  const json = JSON.stringify(file);
  return importWordbook(json, userId);
}