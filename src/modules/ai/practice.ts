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



export async function generatePracticeFromGoal(params: PracticeGenerateParams): Promise<{ sessionId: number; turnId: number; referenceText: string; }> {
  const lang = params.lang || 'en-US';
  const tone = params.tone || 'friendly';
  const roles = params.roles || ['Learner', 'Partner'];
  const constraints = params.constraints || [];

  const prompt = await Prompts.get('practice-goal-driven', {
    goalText: params.goal || '',
    lang,
    level: params.difficulty || 'intermediate',
    tone,
    roles,
    constraints
  });

  let text = '';
  if (params.provider === 'free-priority') {
    text = await generateTextWithFreePriority(prompt);
  } else {
    const pEnum = providerToEnum(params.provider);
    if (!pEnum) {
      message.error('Unsupported provider');
      throw new Error('Unsupported provider');
    }
    text = await generateTextUnified({
      provider: pEnum,
      prompt,
      apiKey: params.apiKey,
      modelName: params.model || defaultModels[pEnum],
      baseUrl: params.baseUrl,
    });
  }

  let parsed: any = null;
  const s = (text || '').trim();
  if (s.startsWith('{') && s.endsWith('}')) {
    try {
      parsed = JSON.parse(s);
    } catch (e) {
      console.error('LLM JSON parse failed:', e);
    }
  }

  const referenceText: string = (parsed && typeof parsed.referenceText === 'string') ? parsed.referenceText : s;
  const dialogueItems: Array<{ role: string; originalRole?: string; content: string; contentZh?: string }> = (parsed && Array.isArray(parsed.dialogue)) ? parsed.dialogue : [];
  const tips: string[] = (parsed && Array.isArray(parsed.tips)) ? parsed.tips : [];
  const tipsZh: string[] = (parsed && Array.isArray(parsed.tipsZh)) ? parsed.tipsZh : [];
  const vocabulary: Array<{ word: string; gloss: string; glossZh?: string }> = (parsed && Array.isArray(parsed.vocabulary)) ? parsed.vocabulary : [];
  const metaOut: any = (parsed && parsed.meta) ? parsed.meta : { goal: params.goal, level: params.difficulty, lang };

  if (!referenceText) {
    message.error('AI returned empty content');
    throw new Error('Empty content');
  }

  const userId = 'local-user';
  const { sessionId, turnId } = await beginPracticeSession(
    userId,
    'Goal-Driven Practice',
    params.difficulty || 'intermediate',
    referenceText,
    [
      { role: 'system', content: 'Practice generation via AiGenerateModal', lang, meta: { origin: 'AiGenerateModal', goal: params.goal } },
      { role: 'user', content: prompt, lang, meta: { provider: params.provider } },
    ]
  );

  const mapRole = (r: string) => (r === 'Learner' ? 'user' : 'assistant');
  for (const d of dialogueItems) {
    if (d && typeof d.content === 'string' && typeof d.role === 'string') {
      const meta: any = { origin: 'AiGenerateModal', goal: params.goal };
      if (d.originalRole) meta.originalRole = d.originalRole;
      if (d.contentZh) meta.contentZh = d.contentZh;
      await appendMessage({
        sessionId,
        role: mapRole(d.role),
        content: d.content,
        lang,
        meta
      });
    }
  }

  // Separate system messages for tips and vocabulary to match practice-query readers
  if (tips.length) {
    const tMeta: any = { type: 'tips' };
    if (tipsZh && tipsZh.length) tMeta.tipsZh = tipsZh;
    await appendMessage({ sessionId, role: 'system', content: tips.join('\n'), lang, meta: tMeta });
  }

  if (vocabulary.length) {
    const vocabText = vocabulary.map(v => `${v.word} — ${v.gloss}${v.glossZh ? ' ｜ ' + v.glossZh : ''}`).join('\n');
    await appendMessage({ sessionId, role: 'system', content: vocabText, lang, meta: { type: 'vocabulary', items: vocabulary } });
  }

  const latestTurn = await getLatestTurn(sessionId);
  return { sessionId, turnId, referenceText: latestTurn?.referenceText || referenceText };
}