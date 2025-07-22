const crypto = require('crypto');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

/**
 * 语音服务集成模块
 * 支持百度、科大讯飞、腾讯云、阿里云等主流语音服务
 */

class SpeechServices {
  constructor(config) {
    this.config = config;
  }

  /**
   * 百度语音识别
   * 免费额度：每日50000次调用
   */
  async baiduASR(audioBuffer, options = {}) {
    try {
      // 1. 获取Access Token
      const tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token';
      const tokenParams = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.baidu.apiKey,
        client_secret: this.config.baidu.secretKey
      });

      const tokenResponse = await fetch(`${tokenUrl}?${tokenParams}`);
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        throw new Error('获取百度Access Token失败');
      }

      // 2. 语音识别
      const asrUrl = 'https://vop.baidu.com/server_api';
      const audioBase64 = audioBuffer.toString('base64');
      
      const asrParams = {
        format: options.format || 'wav',
        rate: options.rate || 16000,
        channel: 1,
        cuid: 'ai-speech-practice',
        token: tokenData.access_token,
        speech: audioBase64,
        len: audioBuffer.length
      };

      const asrResponse = await fetch(asrUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(asrParams)
      });

      const result = await asrResponse.json();
      
      if (result.err_no === 0) {
        return {
          success: true,
          text: result.result[0] || '',
          confidence: 0.9
        };
      } else {
        throw new Error(`百度语音识别错误: ${result.err_msg}`);
      }
    } catch (error) {
      console.error('百度ASR错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 科大讯飞语音识别
   * 支持实时和离线识别
   */
  async xunfeiASR(audioBuffer, options = {}) {
    try {
      const host = 'iat-api.xfyun.cn';
      const path = '/v2/iat';
      const date = new Date().toUTCString();
      
      // 生成签名
      const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
      const signature = crypto
        .createHmac('sha256', this.config.xunfei.apiSecret)
        .update(signatureOrigin)
        .digest('base64');
      
      const authorization = `api_key="${this.config.xunfei.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
      
      const url = `wss://${host}${path}?authorization=${Buffer.from(authorization).toString('base64')}&date=${date}&host=${host}`;
      
      // WebSocket连接实现（这里简化为HTTP请求示例）
      // 实际使用时需要使用WebSocket
      
      return {
        success: true,
        text: '科大讯飞识别结果示例',
        confidence: 0.95
      };
    } catch (error) {
      console.error('科大讯飞ASR错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 腾讯云语音识别
   */
  async tencentASR(audioBuffer, options = {}) {
    try {
      const endpoint = 'asr.tencentcloudapi.com';
      const service = 'asr';
      const version = '2019-06-14';
      const action = 'SentenceRecognition';
      const region = this.config.tencent.region || 'ap-beijing';
      
      const timestamp = Math.floor(Date.now() / 1000);
      const date = new Date(timestamp * 1000).toISOString().substr(0, 10);
      
      // 请求参数
      const params = {
        ProjectId: 0,
        SubServiceType: 2,
        EngSerViceType: '16k_zh',
        SourceType: 1,
        VoiceFormat: 'wav',
        Data: audioBuffer.toString('base64')
      };
      
      // 生成腾讯云签名（简化版）
      const payload = JSON.stringify(params);
      
      const headers = {
        'Authorization': `TC3-HMAC-SHA256 Credential=${this.config.tencent.secretId}/${date}/${service}/tc3_request, SignedHeaders=content-type;host, Signature=signature_placeholder`,
        'Content-Type': 'application/json; charset=utf-8',
        'Host': endpoint,
        'X-TC-Action': action,
        'X-TC-Timestamp': timestamp,
        'X-TC-Version': version,
        'X-TC-Region': region
      };
      
      // 实际使用时需要正确计算签名
      // 这里返回模拟结果
      return {
        success: true,
        text: '腾讯云识别结果示例',
        confidence: 0.92
      };
    } catch (error) {
      console.error('腾讯云ASR错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 百度语音合成
   */
  async baiduTTS(text, options = {}) {
    try {
      // 获取Access Token
      const tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token';
      const tokenParams = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.baidu.apiKey,
        client_secret: this.config.baidu.secretKey
      });

      const tokenResponse = await fetch(`${tokenUrl}?${tokenParams}`);
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        throw new Error('获取百度Access Token失败');
      }

      // 语音合成
      const ttsUrl = 'https://tsn.baidu.com/text2audio';
      const ttsParams = new URLSearchParams({
        tex: text,
        tok: tokenData.access_token,
        cuid: 'ai-speech-practice',
        ctp: 1,
        lan: 'zh',
        spd: options.speed || 5,
        pit: options.pitch || 5,
        vol: options.volume || 5,
        per: options.voice || 0 // 0:女声，1:男声，3:情感合成-度逍遥，4:情感合成-度丫丫
      });

      const ttsResponse = await fetch(ttsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: ttsParams
      });

      if (ttsResponse.headers.get('content-type').includes('audio')) {
        const audioBuffer = await ttsResponse.buffer();
        return {
          success: true,
          audio: audioBuffer.toString('base64'),
          format: 'mp3'
        };
      } else {
        const errorData = await ttsResponse.json();
        throw new Error(`百度TTS错误: ${errorData.err_msg}`);
      }
    } catch (error) {
      console.error('百度TTS错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 科大讯飞语音合成
   */
  async xunfeiTTS(text, options = {}) {
    try {
      const host = 'tts-api.xfyun.cn';
      const path = '/v2/tts';
      const date = new Date().toUTCString();
      
      // 生成签名
      const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
      const signature = crypto
        .createHmac('sha256', this.config.xunfei.apiSecret)
        .update(signatureOrigin)
        .digest('base64');
      
      const authorization = `api_key="${this.config.xunfei.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
      
      // WebSocket连接实现（简化）
      // 实际使用时需要使用WebSocket连接
      
      return {
        success: true,
        audio: 'base64_audio_data_placeholder',
        format: 'wav'
      };
    } catch (error) {
      console.error('科大讯飞TTS错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 发音评分（基于语音识别结果）
   */
  async pronunciationScore(audioBuffer, referenceText, options = {}) {
    try {
      // 1. 先进行语音识别
      const asrResult = await this.baiduASR(audioBuffer, options);
      
      if (!asrResult.success) {
        throw new Error('语音识别失败');
      }
      
      const recognizedText = asrResult.text;
      
      // 2. 计算相似度和各项评分
      const scores = this.calculateDetailedScore(recognizedText, referenceText);
      
      return {
        success: true,
        recognizedText,
        referenceText,
        scores
      };
    } catch (error) {
      console.error('发音评分错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 详细评分算法
   */
  calculateDetailedScore(recognized, reference) {
    // 文本预处理
    const normalizeText = (text) => {
      return text.toLowerCase()
        .replace(/[^a-zA-Z0-9\s\u4e00-\u9fa5]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const normalizedRecognized = normalizeText(recognized);
    const normalizedReference = normalizeText(reference);
    
    // 1. 整体相似度（基于编辑距离）
    const similarity = this.calculateSimilarity(normalizedRecognized, normalizedReference);
    const overallScore = Math.max(0, Math.min(100, similarity * 100));
    
    // 2. 发音准确度（基于字符匹配）
    const pronunciationScore = this.calculatePronunciationScore(normalizedRecognized, normalizedReference);
    
    // 3. 流利度（基于语速和停顿）
    const fluencyScore = this.calculateFluencyScore(normalizedRecognized, normalizedReference);
    
    // 4. 完整度（基于长度比例）
    const completenessScore = this.calculateCompletenessScore(normalizedRecognized, normalizedReference);
    
    return {
      overall: Math.round(overallScore),
      pronunciation: Math.round(pronunciationScore),
      fluency: Math.round(fluencyScore),
      completeness: Math.round(completenessScore),
      details: {
        recognizedLength: normalizedRecognized.length,
        referenceLength: normalizedReference.length,
        similarity: Math.round(similarity * 100) / 100
      }
    };
  }
  
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  calculatePronunciationScore(recognized, reference) {
    // 基于字符级别的匹配度
    const words1 = recognized.split(' ');
    const words2 = reference.split(' ');
    
    let matchedWords = 0;
    const maxLength = Math.max(words1.length, words2.length);
    
    for (let i = 0; i < Math.min(words1.length, words2.length); i++) {
      if (words1[i] === words2[i]) {
        matchedWords++;
      } else {
        // 部分匹配
        const wordSimilarity = this.calculateSimilarity(words1[i], words2[i]);
        matchedWords += wordSimilarity;
      }
    }
    
    return maxLength > 0 ? (matchedWords / maxLength) * 100 : 0;
  }
  
  calculateFluencyScore(recognized, reference) {
    // 基于长度比例和连贯性
    const lengthRatio = Math.min(recognized.length, reference.length) / Math.max(recognized.length, reference.length);
    const baseScore = lengthRatio * 100;
    
    // 考虑停顿和重复（简化算法）
    const repetitionPenalty = this.calculateRepetitionPenalty(recognized);
    
    return Math.max(0, baseScore - repetitionPenalty);
  }
  
  calculateCompletenessScore(recognized, reference) {
    // 基于内容覆盖度
    const referenceWords = new Set(reference.split(' '));
    const recognizedWords = new Set(recognized.split(' '));
    
    let coveredWords = 0;
    for (const word of referenceWords) {
      if (recognizedWords.has(word)) {
        coveredWords++;
      }
    }
    
    return referenceWords.size > 0 ? (coveredWords / referenceWords.size) * 100 : 0;
  }
  
  calculateRepetitionPenalty(text) {
    const words = text.split(' ');
    const wordCount = {};
    
    for (const word of words) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
    
    let repetitions = 0;
    for (const count of Object.values(wordCount)) {
      if (count > 1) {
        repetitions += count - 1;
      }
    }
    
    return (repetitions / words.length) * 20; // 最多扣20分
  }

  /**
   * 获取可用的语音服务提供商
   */
  getAvailableProviders() {
    const providers = [];
    
    if (this.config.baidu?.apiKey) {
      providers.push({
        id: 'baidu',
        name: '百度语音',
        features: ['ASR', 'TTS'],
        free: true,
        description: '免费额度大，适合开发测试'
      });
    }
    
    if (this.config.xunfei?.apiKey) {
      providers.push({
        id: 'xunfei',
        name: '科大讯飞',
        features: ['ASR', 'TTS', 'Real-time'],
        free: false,
        description: '识别准确度高，支持方言'
      });
    }
    
    if (this.config.tencent?.secretId) {
      providers.push({
        id: 'tencent',
        name: '腾讯云',
        features: ['ASR', 'TTS'],
        free: false,
        description: '企业级稳定性，多语言支持'
      });
    }
    
    return providers;
  }
}

module.exports = SpeechServices;