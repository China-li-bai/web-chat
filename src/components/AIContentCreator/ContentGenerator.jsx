import React, { useState } from 'react';

const ContentGenerator = ({ selectedPersonality, onContentGenerated }) => {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('xiaohongshu');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);

  const platforms = [
    { id: 'xiaohongshu', name: '小红书', icon: '📱', color: 'text-red-500' },
    { id: 'wechat', name: '微信公众号', icon: '💬', color: 'text-green-500' },
    { id: 'twitter', name: 'Twitter', icon: '🐦', color: 'text-blue-500' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'text-blue-600' }
  ];

  const topicSuggestions = [
    '今日穿搭分享',
    '美食探店体验',
    '护肤心得总结',
    '旅行攻略推荐',
    '读书笔记分享',
    '健身打卡记录',
    '工作效率提升',
    '生活小技巧'
  ];

  // 模拟AI内容生成
  const generateContent = async () => {
    if (!selectedPersonality || !topic.trim()) {
      alert('请选择人格类型并输入主题');
      return;
    }

    setIsGenerating(true);
    
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 根据人格类型生成不同风格的内容
    const content = generateContentByPersonality(selectedPersonality, topic, platform);
    
    setGeneratedContent(content);
    setIsGenerating(false);
    
    if (onContentGenerated) {
      onContentGenerated(content);
    }
  };

  const generateContentByPersonality = (personality, topic, platform) => {
    const contentTemplates = {
      enfp: {
        xiaohongshu: `🌟 ${topic} | 超级推荐！

哇塞！今天必须和大家分享这个！✨
真的太棒了，忍不住要安利给所有姐妹们～

💫 亮点总结：
• 第一印象就被惊艳到了
• 体验感超级棒，细节满分
• 性价比真的很高
• 强烈推荐给大家

📸 图片都是实拍，无滤镜！
快来评论区和我互动吧～

#${topic} #种草分享 #生活记录 #推荐好物`,
        
        wechat: `${topic}：一次意外的惊喜发现

大家好！今天想和大家分享一个特别的发现。

说起${topic}，相信很多朋友都有自己的心得。但今天我要分享的这个经历，真的让我眼前一亮！

【核心亮点】
✨ 超出预期的体验
✨ 细节处理很用心
✨ 性价比确实不错

【我的感受】
从第一次接触开始，就感受到了不一样的品质。每一个细节都能看出用心，这种感觉真的很难得。

【推荐理由】
如果你也在寻找相关的产品或服务，这个真的值得一试。相信你也会和我一样，被这份用心所打动。

你们有类似的经历吗？欢迎在评论区分享～`
      },
      
      intj: {
        xiaohongshu: `${topic} | 深度分析报告

经过详细调研和实测，整理了这份分析报告。

🔍 核心数据：
• 功能完整度：★★★★☆
• 性价比指数：★★★★★
• 用户体验：★★★★☆
• 创新程度：★★★☆☆

📊 优势分析：
1. 解决了核心痛点
2. 技术实现相对成熟
3. 市场定位精准

⚠️ 注意事项：
• 适用场景有限制
• 学习成本需考虑
• 长期效果待观察

💡 结论：
基于当前市场环境和个人需求分析，推荐指数4/5。

#${topic} #深度测评 #数据分析 #理性消费`,
        
        wechat: `${topic}：基于数据的深度分析

在信息爆炸的时代，我们需要更理性的判断标准。

【分析框架】
本次分析采用多维度评估模型，从功能性、经济性、可持续性三个维度进行评估。

【数据收集】
• 市场调研：对比了15个同类产品
• 用户反馈：收集了200+真实评价
• 专业测试：进行了30天深度体验

【核心发现】
1. 功能完整度达到85%，满足主流需求
2. 性价比在同类产品中排名前20%
3. 用户满意度稳定在4.2/5.0

【投资建议】
基于ROI分析，建议在当前价位进行配置。预期在6-12个月内能看到明显效果。

【风险提示】
任何选择都存在不确定性，建议根据个人情况谨慎决策。`
      },
      
      esfj: {
        xiaohongshu: `${topic} 💕 和姐妹们的温暖分享

亲爱的宝贝们，今天想和大家聊聊${topic}～

最近很多姐妹私信问我相关的问题，所以特地整理了这份分享，希望能帮到大家💝

🌸 我的小心得：
• 刚开始也有些担心和疑虑
• 慢慢尝试后发现真的不错
• 现在已经成为日常必备了
• 真心推荐给需要的姐妹们

💌 贴心提醒：
每个人的情况不同，大家可以根据自己的需求来选择哦～如果有任何问题，随时来找我聊天！

评论区见，爱你们～ 💕

#${topic} #姐妹分享 #生活日常 #温暖推荐`,
        
        wechat: `${topic}：和朋友们的温暖分享

亲爱的朋友们，大家好！

最近收到很多朋友的咨询，关于${topic}的话题。作为一个愿意分享的人，我想把自己的一些心得和大家聊聊。

【我的故事】
其实一开始，我也和大家一样，对此有些犹豫和不确定。但在朋友的鼓励下，我决定尝试一下。

【温暖的发现】
这个过程中，我不仅收获了预期的效果，更重要的是，我感受到了生活中的小美好。每一个细节都让我觉得，选择是对的。

【想对大家说】
每个人的情况都不一样，我的经历只是一个参考。但如果你也在考虑类似的选择，我想说：相信自己的判断，也相信生活的美好。

【结语】
希望我的分享能给大家一些启发。如果你有任何想法或疑问，欢迎随时和我交流。我们一起成长，一起变得更好。`
      },
      
      istp: {
        xiaohongshu: `${topic} | 实测报告

直接说结论：值得入手。

🔧 测试条件：
• 使用时长：30天
• 测试环境：日常场景
• 对比产品：3款同类

📋 核心数据：
• 功能实现度：90%
• 操作便捷性：★★★★☆
• 耐用程度：★★★★★
• 性价比：★★★★☆

✅ 优点：
- 解决核心需求
- 操作简单直接
- 质量稳定可靠

❌ 缺点：
- 价格略高
- 部分功能冗余

💡 购买建议：
有明确需求就入，没需求别跟风。

#${topic} #实测分享 #效率工具 #实用推荐`,
        
        wechat: `${topic}：实用性评估报告

【测试目的】
验证产品是否能有效解决实际问题。

【测试方法】
• 时间：连续使用30天
• 场景：模拟真实使用环境
• 标准：以解决问题为核心指标

【测试结果】
功能完成度：9/10
操作便捷性：8/10
稳定可靠性：9/10
综合评分：8.7/10

【核心优势】
1. 直击痛点，解决效率问题
2. 操作逻辑清晰，学习成本低
3. 质量稳定，故障率极低

【使用建议】
适合有明确需求的用户。如果你正面临相关问题，这是一个可靠的解决方案。

【总结】
实用性强，推荐购买。但请根据个人实际需求决策，避免冲动消费。`
      }
    };

    return contentTemplates[personality.id]?.[platform] || `基于${personality.name}风格生成的${topic}相关内容...`;
  };

  return (
    <div className="space-y-6">
      {/* 平台选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          选择发布平台
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`
                p-3 rounded-lg border-2 transition-all duration-200
                ${platform === p.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className={`text-2xl mb-1 ${p.color}`}>{p.icon}</div>
              <div className="text-sm font-medium">{p.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 主题输入 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          输入内容主题
        </label>
        <div className="relative">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例如：今日穿搭分享、美食探店体验..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {topic && (
            <button
              onClick={() => setTopic('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* 主题建议 */}
        <div className="mt-3">
          <p className="text-sm text-gray-500 mb-2">热门主题推荐：</p>
          <div className="flex flex-wrap gap-2">
            {topicSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setTopic(suggestion)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={generateContent}
        disabled={!selectedPersonality || !topic.trim() || isGenerating}
        className={`
          w-full py-4 px-6 rounded-lg font-medium text-white transition-all duration-200
          ${(!selectedPersonality || !topic.trim() || isGenerating)
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105'
          }
        `}
      >
        {isGenerating ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            AI正在创作中...
          </div>
        ) : (
          '🎨 生成内容'
        )}
      </button>

      {/* 生成的内容预览 */}
      {generatedContent && (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">生成的内容</h3>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                复制
              </button>
              <button className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">
                编辑
              </button>
            </div>
          </div>
          <div className="bg-white p-4 rounded border">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {generatedContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentGenerator;