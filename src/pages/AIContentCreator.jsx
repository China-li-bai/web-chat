import React, { useState } from 'react';
import PersonalitySelector from '../components/AIContentCreator/PersonalitySelector';
import ContentGenerator from '../components/AIContentCreator/ContentGenerator';
import TemplatePreview from '../components/AIContentCreator/TemplatePreview';
import ExportPanel from '../components/AIContentCreator/ExportPanel';

const AIContentCreator = () => {
  const [selectedPersonality, setSelectedPersonality] = useState(null);
  const [topic, setTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePersonalitySelect = (personality) => {
    setSelectedPersonality(personality);
  };

  const handleTopicChange = (newTopic) => {
    setTopic(newTopic);
  };

  const handleGenerate = async () => {
    if (!selectedPersonality || !topic.trim()) return;
    
    setIsGenerating(true);
    try {
      // 调用AI生成服务
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personality: selectedPersonality,
          topic: topic.trim(),
          platform: 'xiaohongshu'
        }),
      });
      
      const content = await response.json();
      setGeneratedContent(content);
    } catch (error) {
      console.error('生成内容失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            AI智能图文创作工具
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            选择AI人格，输入主题，一键生成个性化的小红书图文内容
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左侧：创作区域 */}
            <div className="space-y-8">
              {/* 人格选择器 */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                  选择AI人格
                </h2>
                <PersonalitySelector
                  selectedPersonality={selectedPersonality}
                  onPersonalitySelect={handlePersonalitySelect}
                />
              </div>

              {/* 内容生成器 */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                  输入创作主题
                </h2>
                <ContentGenerator
                  topic={topic}
                  onTopicChange={handleTopicChange}
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  disabled={!selectedPersonality}
                />
              </div>
            </div>

            {/* 右侧：预览和导出区域 */}
            <div className="space-y-8">
              {/* 模板预览 */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                  内容预览
                </h2>
                <TemplatePreview
                  content={generatedContent}
                  personality={selectedPersonality}
                  isGenerating={isGenerating}
                />
              </div>

              {/* 导出面板 */}
              {generatedContent && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                    导出内容
                  </h2>
                  <ExportPanel content={generatedContent} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIContentCreator;