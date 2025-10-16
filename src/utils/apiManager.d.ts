declare module '@/utils/apiManager' {
  export class APIManager {
    userApiKey: string | null;
    envApiKey?: string;
    backendUrl: string;
    setUserApiKey(apiKey: string): void;
    getEffectiveApiKey(): string | null;
    getApiType(): string;
    getStatus(): any;
  }
  export const apiManager: {
    getEffectiveApiKey(): string | null;
    setUserApiKey(apiKey: string): void;
    getStatus(): any;
  };
  export const API_TYPES: {
    TAURI: 'tauri';
    OFFICIAL_SDK: 'official_sdk';
    BACKEND: 'backend';
  };
  export const generateTTS: (text: string, style?: string, options?: any) => Promise<any>;
  export const playAudio: (audioBlob: Blob, onStart?: () => void, onEnd?: () => void, onError?: (e: any) => void) => Promise<void>;
  export const setUserApiKey: (apiKey: string) => void;
  export const getApiStatus: () => any;
}