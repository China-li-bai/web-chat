import React, { useState } from 'react';

const TemplatePreview = ({ generatedContent, selectedPersonality, platform }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('template1');
  const [customizations, setCustomizations] = useState({
    fontSize: 'medium',
    colorScheme: 'default',
    layout: 'standard'
  });

  const templates = {
    template1: {
      name: '经典卡片',
      preview: 'bg-white border rounded-lg shadow-sm',
      description: '简洁大方，适合各种内容类型'
    },
    template2: {
      name: '渐变背景',
      preview: 'bg-gradient-to-br from-blue-400 to-purple-500 text-white rounded-lg',
      description: '视觉冲击力强，适合重点推荐'
    },
    template3: {
      name: '小红书风格',
      preview: 'bg-red-50 border-2 border-red-200 rounded-lg',
      description: '符合小红书视觉风格，提高曝光率'
    },
    template4: {
      name: '简约黑白',
      preview: 'bg-gray-900 text-white rounded-lg border border-gray-700',
      description: '高端简约，适合专业内容'
    }
  };

  const fontSizes = {
    small: { title: 'text-lg', content: 'text-sm', tags: 'text-xs' },
    medium: { title: 'text-xl', content: 'text-base', tags: 'text-sm' },
    large: { title: 'text-2xl', content: 'text-lg', tags: 'text-base' }
  };

  const colorSchemes = {
    default: { bg: 'bg-white', text: 'text-gray-800', accent: 'text-blue-500' },
    warm: { bg: 'bg-orange-50', text: 'text-orange-900', accent: 'text-orange-600' },
    cool: { bg: 'bg-blue-50', text: 'text-blue-900', accent: 'text-blue-600' },
    nature: { bg: 'bg-green-50', text: 'text-green-900', accent: 'text-green-600' }
  };

  const renderPreview = () => {
    if (!generatedContent) {
      return (
        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>生成内容后即可预览模板效果</p>
          </div>
        </div>
      );
    }

    const template = templates[selectedTemplate];
    const fontSize = fontSizes[customizations.fontSize];
    const colorScheme = colorSchemes[customizations.colorScheme];

    // 解析内容结构
    const lines = generatedContent.split('\n').filter(line => line.trim());
    const title = lines[0] || '';
    const content = lines.slice(1).join('\n');
    const hashtags = content.match(/#[\u4e00-\u9fa5\w]+/g) || [];

    return (
      <div className={`${template.preview} p-6 h-96 overflow-y-auto`}>
        {/* 标题 */}
        <h2 className={`${fontSize.title} font-bold mb-4 ${colorScheme.text}`}>
          {title.replace(/[🌟📱💬🐦📘🔍📊💕🔧]/g, '')}
        </h2>

        {/* 内容 */}
        <div className={`${fontSize.content} ${colorScheme.text} mb-4 leading-relaxed`}>
          {content.split('\n').map((line, index) => {
            if (line.startsWith('#')) return null; // 跳过标签行
            if (line.trim() === '') return <br key={index} />;
            
            return (
              <p key={index} className="mb-2">
                {line}
              </p>
            );
          })}
        </div>

        {/* 标签 */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {hashtags.map((tag, index) => (
              <span
                key={index}
                className={`
                  ${fontSize.tags} px-2 py-1 rounded-full
                  ${selectedTemplate === 'template2' 
                    ? 'bg-white bg-opacity-20 text-white' 
                    : `${colorScheme.accent} bg-opacity-10`
                  }
                `}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 人格标识 */}
        {selectedPersonality && (
          <div className="mt-4 pt-4 border-t border-gray-200 border-opacity-30">
            <div className="flex items-center text-sm opacity-75">
              <span className="mr-2">{selectedPersonality.icon}</span>
              <span>由 {selectedPersonality.name} 创作</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 模板选择 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">选择模板样式</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(templates).map(([key, template]) => (
            <div
              key={key}
              className={`
                cursor-pointer transition-all duration-200 transform hover:scale-105
                ${selectedTemplate === key ? 'ring-2 ring-blue-500' : ''}
              `}
              onClick={() => setSelectedTemplate(key)}
            >
              <div className={`${template.preview} h-24 mb-2 flex items-center justify-center`}>
                <div className="text-xs text-center opacity-75">
                  {template.name}
                </div>
              </div>
              <p className="text-xs text-gray-600 text-center">
                {template.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 自定义选项 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 字体大小 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            字体大小
          </label>
          <select
            value={customizations.fontSize}
            onChange={(e) => setCustomizations(prev => ({ ...prev, fontSize: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="small">小号</option>
            <option value="medium">中号</option>
            <option value="large">大号</option>
          </select>
        </div>

        {/* 配色方案 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            配色方案
          </label>
          <select
            value={customizations.colorScheme}
            onChange={(e) => setCustomizations(prev => ({ ...prev, colorScheme: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="default">默认</option>
            <option value="warm">暖色调</option>
            <option value="cool">冷色调</option>
            <option value="nature">自然色</option>
          </select>
        </div>

        {/* 布局样式 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            布局样式
          </label>
          <select
            value={customizations.layout}
            onChange={(e) => setCustomizations(prev => ({ ...prev, layout: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="standard">标准</option>
            <option value="compact">紧凑</option>
            <option value="spacious">宽松</option>
          </select>
        </div>
      </div>

      {/* 预览区域 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">预览效果</h3>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600">
              📱 手机版
            </button>
            <button className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600">
              💻 桌面版
            </button>
          </div>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          {renderPreview()}
        </div>
      </div>

      {/* 导出选项 */}
      {generatedContent && (
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            📋 复制文本
          </button>
          <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            🖼️ 导出图片
          </button>
          <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            📤 直接发布
          </button>
          <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
            💾 保存草稿
          </button>
        </div>
      )}
    </div>
  );
};

export default TemplatePreview;