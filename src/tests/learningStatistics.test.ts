// 此文件用于测试学习统计功能
// 可以在项目中通过以下方式测试：
// 1. 在 LanguageLearning 组件中导入 testLearningStatistics
// 2. 添加一个测试按钮，点击时调用 testLearningStatistics
// 3. 查看控制台输出的测试结果

/*
示例代码：

import { testLearningStatistics } from '../services/learningService';

// 在组件中添加测试按钮
<button 
  onClick={async () => {
    const result = await testLearningStatistics();
    console.log('测试结果:', result);
  }}
>
  测试学习统计
</button>
*/

// 测试结果将包含：
// 1. success: 测试是否成功
// 2. learningStats: 学习统计数据
// 3. wordTypeStats: 单词类型统计数据