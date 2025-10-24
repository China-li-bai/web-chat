import Prompts from './prompts/Prompts';

export type OpenAICompatCallOptions = {
  providerName: string;
  modelId: string;
  baseUrl: string;
  apiKey?: string;
  prompt: string;
  responseFormat?: any;
  includeSystemPrompt?: boolean;
};

const buildChatCompletionsUrl = (baseUrl: string) => (baseUrl || '').replace(/\/+$/, '') + '/chat/completions';

async function buildMessages(msg: { role: string; content: string }, includeSystemPrompt: boolean) {
  if (!includeSystemPrompt) return [msg];
  const content = await Prompts.get('anthropic_thinking_protocol');
  return [
    {
      role: 'system',
      content,
    },
    msg,
  ];
}

export async function callOpenAICompatibleChatCompletions(opts: OpenAICompatCallOptions): Promise<string> {
  const { providerName, modelId, baseUrl, apiKey, prompt, responseFormat, includeSystemPrompt = true } = opts;
  if (!baseUrl) throw new Error(`${providerName} 未配置 baseUrl 或网关，已跳过`);

  const url = buildChatCompletionsUrl(baseUrl);
  const body: any = {
    model: modelId,
    messages: await buildMessages({ role: 'user', content: prompt }, includeSystemPrompt),
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  } else if (providerName.toLowerCase() === 'zhipu') {
    body.response_format = { type: 'json_object' };
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`${providerName} 请求失败(${resp.status}): ${errText || '未知错误'}`);
  }

  let data: any;
  try {
    data = await resp.json();
  } catch (e) {
    throw new Error(`${providerName} 返回非 JSON，解析失败`);
  }

  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error(`${providerName} 返回空内容`);
  return text.trim();
}