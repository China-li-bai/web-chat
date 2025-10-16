declare module '@ai-sdk/openrouter' {
  export function openrouter(model: string, config: { apiKey: string; baseURL?: string }): any;
}