import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Select, Input, message, Spin } from 'antd';
import { generateTextWithFreePriority } from '../../modules/ai/llmService';
import './AIContentCreator.css';

const { TextArea } = Input;
const { Option } = Select;

const AIContentCreator = () => {
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef(null);

  // 智能提示詞
  const smartSuggestions = [
    '寫一篇關於咖啡文化的小紅書文案',
    '創作一個健身勵志的朋友圈文案',
    '製作一個美食探店的推廣內容',
    '撰寫一篇讀書心得分享',
    '設計一個旅行攻略的種草文案'
  ];

  // 平台配置
  const platforms = [
    { id: 'xiaohongshu', name: '小紅書', icon: '📱', color: '#ff2442' },
    { id: 'wechat', name: '微信', icon: '💬', color: '#07c160' },
    { id: 'weibo', name: '微博', icon: '🐦', color: '#ff8200' },
    { id: 'douyin', name: '抖音', icon: '🎵', color: '#000000' }
  ];

  // 初始化選中的平台
  const [selectedPlatform, setSelectedPlatform] = useState(platforms[0]);

  useEffect(() => {
    // 自动聚焦输入框
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 生成内容的核心函数
  const generateContent = async () => {
    if (!inputValue.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const platformInfo = platforms.find(p => p.id === selectedPlatform);
      const prompt = `请为${platformInfo.name}平台创作内容，主题：${inputValue}。要求：
1. 符合${platformInfo.name}平台的风格和用户习惯
2. 内容有趣、有价值、易传播
3. 包含适当的emoji和话题标签
4. 字数控制在适合的范围内
5. 语言生动活泼，贴近年轻用户

请直接输出最终的文案内容，不需要额外说明。`;

      const content = await generateTextWithFreePriority(prompt);
      setGeneratedContent({
        text: content,
        platform: platformInfo,
        timestamp: new Date().toLocaleString()
      });
    } catch (err) {
      setError('生成失败，请稍后重试');
      console.error('Content generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 处理输入框回车
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateContent();
    }
  };

  // 複製內容到剪貼板
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      message.success('內容已複製到剪貼板！');
    } catch (err) {
      message.error('複製失敗，請手動複製');
    }
  };

  // 分享內容
  const shareContent = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI 創作內容',
          text: generatedContent
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          message.error('分享失敗');
        }
      }
    } else {
      // 降級到複製
      copyToClipboard();
    }
  };

  // 重新生成内容
  const regenerateContent = async () => {
    if (!inputValue.trim()) return;
    await generateContent();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 sm:py-12 mobile-optimized">
        {/* 品牌区域 */}
        <div className="text-center mb-8 sm:mb-12 animate-slide-up">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-4">
            AI 智能创作
          </h1>
          <p className="text-gray-600 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            一键生成优质内容，让创意无限延伸
          </p>
        </div>

        {/* 主輸入區域 */}
        <div className="max-w-3xl mx-auto mb-8 animate-fade-in">
          <Card className="shadow-2xl border-0 overflow-hidden" style={{ borderRadius: '24px' }}>
            {/* 平台選擇 */}
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                {platforms.map((platform) => (
                  <Button
                      key={platform.id}
                      onClick={() => setSelectedPlatform(platform)}
                      type={selectedPlatform.id === platform.id ? 'primary' : 'default'}
                      className={`flex items-center space-x-2 touch-friendly ${
                        selectedPlatform.id === platform.id ? 'animate-pulse-glow' : ''
                      }`}
                      style={{
                        backgroundColor: selectedPlatform.id === platform.id ? platform.color : undefined,
                        borderColor: selectedPlatform.id === platform.id ? platform.color : undefined,
                        borderRadius: '12px'
                      }}
                    >
                    <span className="text-sm sm:text-base">{platform.icon}</span>
                    <span className="text-xs sm:text-sm font-medium">{platform.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* 輸入區域 */}
            <div className="p-4 sm:p-6">
              <div className="relative">
                <TextArea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`為${selectedPlatform.name}創作內容...`}
                    className="mobile-input"
                    style={{ 
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      borderRadius: '16px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                    }}
                    rows={6}
                    disabled={isGenerating}
                  />
                
                {/* 智能提示 */}
                {inputValue.length === 0 && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex flex-wrap gap-2">
                        {smartSuggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            size="small"
                            onClick={() => setInputValue(suggestion)}
                            className="bg-white bg-opacity-80 text-gray-600 hover:bg-opacity-100 shadow-sm"
                            style={{ borderRadius: '8px' }}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* 生成按鈕 */}
              <div className="mt-6 text-center">
                <Button
                  type="primary"
                  size="large"
                  onClick={generateContent}
                  disabled={!inputValue.trim() || isGenerating}
                  loading={isGenerating}
                  className="touch-friendly animate-pulse-glow"
                  style={{
                    height: '60px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)',
                    border: 'none',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}
                >
                  {isGenerating ? (
                    <>
                      <Spin size="small" />
                      <span style={{ marginLeft: '8px' }}>AI 正在創作中...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">✨</span>
                      <span style={{ marginLeft: '8px' }}>開始創作</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-red-500">⚠️</span>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* 內容展示區域 */}
        {generatedContent && (
          <div className="max-w-3xl mx-auto animate-slide-up">
            <Card className="shadow-2xl border-0 overflow-hidden" style={{ borderRadius: '24px' }}>
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center animate-pulse-glow">
                      <span className="text-white text-lg">{selectedPlatform.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{selectedPlatform.name} 內容</h3>
                      <p className="text-sm text-gray-500">AI 生成的創意內容</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={copyToClipboard}
                      className="touch-friendly"
                      style={{ borderRadius: '12px' }}
                    >
                      📋 複製
                    </Button>
                    <Button
                      onClick={shareContent}
                      className="touch-friendly"
                      style={{ borderRadius: '12px' }}
                    >
                      📤 分享
                    </Button>
                  </div>
                </div>

                <div 
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 sm:p-6 mb-4"
                  style={{ minHeight: '120px' }}
                >
                  <p className="text-gray-800 text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                    {generatedContent}
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={regenerateContent}
                    disabled={isGenerating}
                    loading={isGenerating}
                    className="touch-friendly"
                    style={{
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      color: 'white'
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <Spin size="small" />
                        <span style={{ marginLeft: '8px' }}>重新生成中...</span>
                      </>
                    ) : (
                      <>
                        <span>🔄</span>
                        <span style={{ marginLeft: '8px' }}>重新生成</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 底部提示 */}
        <div className="text-center mt-8 text-xs sm:text-sm text-gray-400">
          <p>💡 按 Enter 快速生成 • Shift + Enter 换行</p>
        </div>
      </div>
    </div>
  );
};

export default AIContentCreator;