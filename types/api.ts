// API接口类型定义

// 基础响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页查询响应
export interface PaginatedResponse<T> extends ApiResponse<{
  records: T[];
  total: number;
  page: number;
  limit: number;
}> {}

// 语音识别相关类型
export interface SpeechToTextRequest {
  audio: File | Blob;
  provider?: 'baidu' | 'xunfei' | 'tencent';
  config?: Record<string, any>;
}

export interface SpeechToTextResponse {
  text: string;
  confidence?: number;
}

// 语音合成相关类型
export interface TextToSpeechRequest {
  text: string;
  voice?: string;
  provider?: 'baidu' | 'xunfei' | 'tencent' | 'gemini';
  config?: Record<string, any>;
  style?: 'cheerful' | 'friendly' | 'professional' | 'formal' | 'warm' | 'conversational' | 'authoritative' | 'serious' | 'dynamic' | 'energetic';
  speaker?: string;
}

export interface TextToSpeechResponse {
  audio: string; // base64 encoded
  format?: string;
}

// Gemini TTS 相关类型
export interface GeminiTTSRequest extends TextToSpeechRequest {
  apiKey: string;
  voice?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';
}

export interface GeminiTTSResponse {
  success: boolean;
  audioData: string; // base64 encoded
  mimeType: string;
  error?: string;
  details?: string;
}

// 发音评分相关类型
export interface PronunciationScoreRequest {
  transcription: string;
  referenceText: string;
}

export interface PronunciationScore {
  overall: number; // 总分 0-100
  pronunciation: number; // 发音准确度 0-100
  fluency: number; // 流利度 0-100
  completeness: number; // 完整度 0-100
  details?: {
    recognizedLength: number;
    referenceLength: number;
    similarity: number;
  };
}

// 练习记录相关类型
export interface PracticeRecord {
  id: string;
  topic: string;
  referenceText: string;
  userText: string;
  score: PronunciationScore;
  duration: number; // 秒
  audioUrl?: string;
  timestamp: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: 'daily' | 'business' | 'academic' | 'travel' | 'custom';
}

export interface CreatePracticeRecordRequest {
  topic: string;
  referenceText: string;
  userText: string;
  score: PronunciationScore;
  duration: number;
  audioUrl?: string;
  difficulty?: string;
  category?: string;
}

// 用户统计数据类型
export interface UserStats {
  totalSessions: number;
  totalMinutes: number;
  averageScore: number;
  streak: number; // 连续练习天数
  improvementRate?: number; // 进步率
  favoriteTopics?: string[];
  weeklyProgress?: Array<{
    date: string;
    sessions: number;
    averageScore: number;
  }>;
}

// 配置相关类型
export interface ServiceConfig {
  apiKey?: string;
  apiSecret?: string;
  appId?: string;
  secretKey?: string;
  secretId?: string;
  region?: string;
}

export interface ConfigCheckResponse {
  geminiApiKey: string;
  geminiApiKeyPrefix?: string;
  useGeminiProxy: boolean;
  geminiProxyUrl: string;
  nodeEnv: string;
  port: number;
}

// WebSocket 消息类型
export interface WebSocketMessage<T = any> {
  type: string;
  data?: T;
  timestamp: number;
}

export interface RealtimeRecognitionResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

// 练习主题类型
export interface PracticeTopic {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'daily' | 'business' | 'academic' | 'travel' | 'custom';
  sentences: string[];
  estimatedTime: number; // 分钟
  tags: string[];
}

// AI 导师反馈类型
export interface AITutorFeedback {
  overallAssessment: string;
  strengths: string[];
  areasForImprovement: string[];
  specificSuggestions: string[];
  nextTopics: string[];
  motivationalMessage: string;
}
