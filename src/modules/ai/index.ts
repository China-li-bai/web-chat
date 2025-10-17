export * from './types';
export * from './provider';
export * from './wordbook';
export * from './llm';

// 兼容旧服务命名与入口（llmService 常用导出别名）
export { callModel as generateTextUnified } from './llm';
export { callModelFreePriority as generateTextWithFreePriority } from './llm';
export { setApiKey as setLLMApiKey } from './llm';
export { getApiKey as getLLMApiKey } from './llm';
export { setCurrentProvider as setCurrentLLMProvider } from './llm';
export { getCurrentConfig as getCurrentLLMConfig } from './llm';
export { AiDefaultModels as defaultModels } from './llm';
export { AiDefaultBaseUrls as defaultBaseUrls } from './llm';

