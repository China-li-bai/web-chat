/**
 * TTS缓存系统功能测试
 * 测试并发去重、可观测性埋点等新功能
 */

import { 
  getOrGenerateTTS, 
  clearAllCache, 
  preInitCache, 
  getComprehensiveStats,
  printObservabilityReport,
  resetObservabilityStats 
} from '../services/ttsCacheService.js';

// 模拟TTS生成器
const mockTTSGenerator = (text, delay = 1000) => {
  return async () => {
    console.log(`[MockGenerator] 开始生成TTS: ${text.substring(0, 30)}...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // 模拟生成音频数据
    const audioData = new TextEncoder().encode(`Mock audio for: ${text}`);
    const audioBlob = new Blob([audioData], { type: 'audio/wav' });
    
    console.log(`[MockGenerator] TTS生成完成: ${text.substring(0, 30)}...`);
    return {
      audioBlob,
      mimeType: 'audio/wav',
      voiceName: 'mock-voice',
      style: 'professional'
    };
  };
};

// 测试并发去重功能
async function testConcurrentDeduplication() {
  console.log('\n🔗 测试并发去重功能...');
  
  const params = {
    text: 'Hello, this is a test for concurrent deduplication.',
    voiceStyle: 'professional',
    lang: 'en-US',
    provider: 'test',
    version: 'v1.0'
  };
  
  // 同时发起5个相同的请求
  const promises = Array(5).fill().map((_, index) => {
    console.log(`[Test] 发起请求 ${index + 1}`);
    return getOrGenerateTTS(params, mockTTSGenerator(params.text, 2000));
  });
  
  const startTime = Date.now();
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  console.log(`[Test] 并发请求完成，耗时: ${endTime - startTime}ms`);
  console.log(`[Test] 结果来源分布:`, results.map(r => r.source));
  
  // 验证结果
  const networkCount = results.filter(r => r.source === 'network').length;
  const cacheCount = results.filter(r => r.source === 'cache').length;
  
  console.log(`[Test] 网络请求: ${networkCount}, 缓存命中: ${cacheCount}`);
  
  if (networkCount === 1 && cacheCount === 4) {
    console.log('✅ 并发去重测试通过：只有1次网络请求，4次从缓存获取');
  } else {
    console.log('❌ 并发去重测试失败：预期1次网络请求，4次缓存命中');
  }
}

// 测试缓存命中功能
async function testCacheHit() {
  console.log('\n🎯 测试缓存命中功能...');
  
  const params = {
    text: 'This is a cache hit test.',
    voiceStyle: 'cheerful',
    lang: 'en-US',
    provider: 'test',
    version: 'v1.0'
  };
  
  // 第一次请求（应该是网络生成）
  console.log('[Test] 第一次请求...');
  const result1 = await getOrGenerateTTS(params, mockTTSGenerator(params.text, 1000));
  console.log(`[Test] 第一次请求结果来源: ${result1.source}`);
  
  // 第二次请求（应该是缓存命中）
  console.log('[Test] 第二次请求...');
  const result2 = await getOrGenerateTTS(params, mockTTSGenerator(params.text, 1000));
  console.log(`[Test] 第二次请求结果来源: ${result2.source}`);
  
  if (result1.source === 'network' && result2.source === 'cache') {
    console.log('✅ 缓存命中测试通过');
  } else {
    console.log('❌ 缓存命中测试失败');
  }
}

// 测试可观测性统计
async function testObservability() {
  console.log('\n📊 测试可观测性统计...');
  
  // 获取统计信息
  const stats = await getComprehensiveStats();
  console.log('[Test] 当前统计信息:', JSON.stringify(stats, null, 2));
  
  // 打印详细报告
  printObservabilityReport();
  
  // 验证统计数据
  if (stats.observability.totalRequests > 0) {
    console.log('✅ 可观测性统计正常工作');
  } else {
    console.log('❌ 可观测性统计异常');
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始TTS缓存系统功能测试...');
  
  try {
    // 初始化缓存系统
    console.log('📦 初始化缓存系统...');
    await preInitCache();
    
    // 重置统计信息
    resetObservabilityStats();
    
    // 清空缓存确保测试环境干净
    await clearAllCache();
    
    // 运行测试
    await testCacheHit();
    await testConcurrentDeduplication();
    await testObservability();
    
    console.log('\n🎉 所有测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 如果直接运行此文件，执行测试
if (typeof window === 'undefined') {
  // Node.js环境
  runTests();
} else {
  // 浏览器环境，导出测试函数
  window.runCacheSystemTests = runTests;
  console.log('💡 在浏览器控制台中运行: runCacheSystemTests()');
}

export { runTests as runCacheSystemTests };