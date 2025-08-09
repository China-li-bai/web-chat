/**
 * 应用配置文件
 * 包含各个语音服务提供商的配置信息
 */

module.exports = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:1420',
      credentials: true
    }
  },

  // 数据库配置
  database: {
    path: process.env.DB_PATH || './data/speech_practice.db',
    backup: {
      enabled: true,
      interval: 24 * 60 * 60 * 1000, // 24小时
      maxBackups: 7
    }
  },

  // 文件上传配置
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['audio/wav', 'audio/mp3', 'audio/webm', 'audio/ogg'],
    destination: './uploads/audio/',
    tempDir: './uploads/temp/'
  },

  // 百度语音服务配置
  baidu: {
    apiKey: process.env.BAIDU_API_KEY || 'your_baidu_api_key',
    secretKey: process.env.BAIDU_SECRET_KEY || 'your_baidu_secret_key',
    // 免费额度：每日50000次调用
    endpoints: {
      token: 'https://aip.baidubce.com/oauth/2.0/token',
      asr: 'https://vop.baidu.com/server_api',
      tts: 'https://tsn.baidu.com/text2audio'
    },
    options: {
      format: 'wav',
      rate: 16000,
      channel: 1,
      lan: 'zh',
      timeout: 10000
    }
  },

  // 科大讯飞配置
  xunfei: {
    appId: process.env.XUNFEI_APP_ID || 'your_xunfei_app_id',
    apiKey: process.env.XUNFEI_API_KEY || 'your_xunfei_api_key',
    apiSecret: process.env.XUNFEI_API_SECRET || 'your_xunfei_api_secret',
    endpoints: {
      asr: 'wss://iat-api.xfyun.cn/v2/iat',
      tts: 'wss://tts-api.xfyun.cn/v2/tts'
    },
    options: {
      language: 'zh_cn',
      accent: 'mandarin',
      domain: 'iat',
      timeout: 10000
    }
  },

  // 腾讯云配置
  tencent: {
    secretId: process.env.TENCENT_SECRET_ID || 'your_tencent_secret_id',
    secretKey: process.env.TENCENT_SECRET_KEY || 'your_tencent_secret_key',
    region: process.env.TENCENT_REGION || 'ap-beijing',
    endpoints: {
      asr: 'asr.tencentcloudapi.com',
      tts: 'tts.tencentcloudapi.com'
    },
    options: {
      engineType: '16k_zh',
      voiceType: 1,
      timeout: 10000
    }
  },

  // 阿里云配置
  alibaba: {
    accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID || 'your_alibaba_access_key_id',
    accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET || 'your_alibaba_access_key_secret',
    region: process.env.ALIBABA_REGION || 'cn-shanghai',
    endpoints: {
      asr: 'https://nls-meta.cn-shanghai.aliyuncs.com',
      tts: 'https://nls-gateway.cn-shanghai.aliyuncs.com'
    },
    options: {
      format: 'wav',
      sampleRate: 16000,
      timeout: 10000
    }
  },

  // 默认语音服务提供商
  defaultProvider: process.env.DEFAULT_SPEECH_PROVIDER || 'baidu',

  // 语音服务优先级（按成本和可用性排序）
  providerPriority: [
    'baidu',    // 免费额度大
    'xunfei',   // 准确度高
    'tencent',  // 稳定性好
    'alibaba'   // 备选方案
  ],

  // 发音评分配置
  scoring: {
    weights: {
      pronunciation: 0.4,  // 发音准确度权重
      fluency: 0.3,       // 流利度权重
      completeness: 0.3   // 完整度权重
    },
    thresholds: {
      excellent: 90,
      good: 75,
      fair: 60,
      poor: 0
    }
  },

  // 缓存配置
  cache: {
    enabled: true,
    ttl: 60 * 60 * 1000, // 1小时
    maxSize: 100, // 最大缓存条目数
    cleanupInterval: 10 * 60 * 1000 // 10分钟清理一次
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: true,
      path: './logs/',
      maxSize: '10m',
      maxFiles: 5
    },
    console: {
      enabled: true,
      colorize: true
    }
  },

  // 安全配置
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 最大请求次数
      message: '请求过于频繁，请稍后再试'
    },
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:1420',
      credentials: true,
      optionsSuccessStatus: 200
    },
    helmet: {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }
  },

  // 开发环境配置
  development: {
    mockServices: process.env.MOCK_SERVICES === 'true',
    debugMode: process.env.DEBUG_MODE === 'true',
    hotReload: true
  },

  // 生产环境配置
  production: {
    compression: true,
    minify: true,
    clustering: true,
    monitoring: {
      enabled: true,
      interval: 60000 // 1分钟
    }
  },

  // 功能开关
  features: {
    realTimeRecognition: true,
    offlineMode: false,
    multiLanguage: true,
    voiceCloning: false,
    advancedScoring: true,
    socialFeatures: false
  },

  // 用户配置
  user: {
    defaultSettings: {
      language: 'zh-CN',
      theme: 'light',
      speechProvider: 'baidu',
      ttsVoice: 'female',
      speechSpeed: 1.0,
      volume: 0.8,
      autoSave: true,
      notifications: true,
      difficulty: 'beginner'
    },
    limits: {
      dailyPracticeTime: 120, // 分钟
      maxRecordingLength: 60, // 秒
      maxStorageSize: 100 * 1024 * 1024 // 100MB
    }
  },

  // 练习内容配置
  practice: {
    categories: [
      '基础对话',
      '生活场景',
      '商务英语',
      '旅游英语',
      '学术英语',
      '考试英语'
    ],
    difficulties: [
      'beginner',
      'intermediate',
      'advanced',
      'expert'
    ],
    defaultDuration: 30, // 秒
    maxRetries: 3
  },

  // 通知配置
  notifications: {
    enabled: true,
    types: {
      practiceReminder: true,
      scoreImprovement: true,
      dailyGoal: true,
      weeklyReport: true
    },
    schedule: {
      dailyReminder: '20:00',
      weeklyReport: 'sunday 09:00'
    }
  },

  // 数据分析配置
  analytics: {
    enabled: true,
    retention: 90, // 天
    metrics: [
      'practice_sessions',
      'score_trends',
      'topic_preferences',
      'usage_patterns'
    ]
  },

  // 错误处理配置
  errorHandling: {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackProvider: 'baidu',
    gracefulDegradation: true
  }
};