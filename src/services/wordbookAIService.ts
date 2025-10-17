import { ensureImportFileSchema, GenerateOptions, ImportFile } from '@/types/wordbook';
import { importWordbook } from '@/services/wordbookService';

import { generateTextWithFreePriority, } from '@/modules/ai';





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