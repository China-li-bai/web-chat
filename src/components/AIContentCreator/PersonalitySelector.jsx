import React from 'react';

const personalities = [
  {
    id: 'enfp',
    name: 'ENFP - 热情创作者',
    description: '充满活力，富有创意，善于激发共鸣',
    traits: ['热情洋溢', '创意无限', '感染力强', '乐观向上'],
    color: 'from-pink-400 to-red-400',
    icon: '🌟',
    example: '哇！今天发现了一个超棒的咖啡店！☕️ 氛围绝了，必须分享给大家～'
  },
  {
    id: 'intj',
    name: 'INTJ - 深度分析师',
    description: '理性思考，深度分析，逻辑清晰',
    traits: ['逻辑严密', '深度思考', '独立见解', '追求完美'],
    color: 'from-blue-500 to-purple-600',
    icon: '🧠',
    example: '从数据角度分析，这个趋势背后的三个核心驱动因素是...'
  },
  {
    id: 'esfj',
    name: 'ESFJ - 温暖分享者',
    description: '温暖贴心，善于分享，关注他人感受',
    traits: ['温暖贴心', '善于倾听', '乐于助人', '情感丰富'],
    color: 'from-green-400 to-blue-500',
    icon: '💝',
    example: '姐妹们，今天想和大家分享一个小心得，希望对你们有帮助～'
  },
  {
    id: 'istp',
    name: 'ISTP - 实用主义者',
    description: '务实高效，注重实用，简洁明了',
    traits: ['务实高效', '注重实用', '简洁明了', '解决问题'],
    color: 'from-gray-500 to-gray-700',
    icon: '🔧',
    example: '直接说重点：这个方法实测有效，步骤如下...'
  }
];

const PersonalitySelector = ({ selectedPersonality, onPersonalitySelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {personalities.map((personality) => (
        <div
          key={personality.id}
          className={`
            relative cursor-pointer transition-all duration-300 transform hover:scale-105
            ${selectedPersonality?.id === personality.id 
              ? 'ring-4 ring-blue-500 shadow-xl' 
              : 'hover:shadow-lg'
            }
          `}
          onClick={() => onPersonalitySelect(personality)}
        >
          <div className={`
            bg-gradient-to-br ${personality.color} 
            rounded-xl p-6 text-white relative overflow-hidden
          `}>
            {/* 背景装饰 */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
            
            {/* 图标 */}
            <div className="text-3xl mb-3">{personality.icon}</div>
            
            {/* 标题 */}
            <h3 className="text-lg font-bold mb-2">{personality.name}</h3>
            
            {/* 描述 */}
            <p className="text-sm opacity-90 mb-4">{personality.description}</p>
            
            {/* 特征标签 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {personality.traits.map((trait, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs"
                >
                  {trait}
                </span>
              ))}
            </div>
            
            {/* 示例 */}
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <p className="text-xs opacity-75 mb-1">示例风格：</p>
              <p className="text-sm italic">"{personality.example}"</p>
            </div>
            
            {/* 选中指示器 */}
            {selectedPersonality?.id === personality.id && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PersonalitySelector;