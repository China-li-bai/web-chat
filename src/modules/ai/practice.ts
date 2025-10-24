import Prompts from '@/modules/ai/prompts/Prompts';
import { generateTextWithFreePriority, generateTextUnified, LLMProvider, defaultModels } from '@/modules/ai/llmService';
import { beginPracticeSession, appendMessage, getLatestTurn } from '@/services/practice-dao';
import { message } from 'antd';

export type PracticeGenerateParams = {
  goal: string;
  difficulty: string; // 'beginner' | 'intermediate' | 'advanced'
  provider: string;   // 'free-priority' | 'gemini' | 'openai' | 'openrouter' | 'zhipu' | 'ernie' | 'hunyuan'
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  lang?: string;      // default 'en-US'
  tone?: string;      // default 'friendly'
  roles?: string[];   // default ['Learner', 'Partner']
  constraints?: string[]; // default []
};

function providerToEnum(p: string): LLMProvider | null {
  switch (p) {
    case 'gemini': return LLMProvider.Gemini;
    case 'openai': return LLMProvider.OpenAI;
    case 'openrouter': return LLMProvider.OpenRouter;
    case 'zhipu': return LLMProvider.Zhipu;
    case 'ernie': return LLMProvider.Ernie;
    case 'hunyuan': return LLMProvider.Hunyuan;
    default: return null;
  }
}



