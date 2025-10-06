import { 
  generateWordbookStatistics, 
  generateMultiWordbookStatistics, 
  calculateKPIs 
} from '../statisticsDataGenerator';
import dayjs from 'dayjs';

describe('Statistics Data Generator', () => {
  test('生成单个单词本统计数据', () => {
    const startDate = '2024-01-01';
    const endDate = '2024-03-01';
    const stats = generateWordbookStatistics('test', '测试单词本', startDate, endDate, 10);

    expect(stats.wordbookId).toBe('test');
    expect(stats.wordbookName).toBe('测试单词本');
    expect(stats.totalWords).toBe(10);
    expect(stats.totalRecords).toBeGreaterThan(0);
    expect(stats.dailyStats.length).toBeGreaterThan(0);

    // 验证每日统计数据格式
    const dailyStat = stats.dailyStats[0];
    expect(dailyStat).toHaveProperty('date');
    expect(dailyStat).toHaveProperty('totalSessions');
    expect(dailyStat).toHaveProperty('accuracy');
    expect(dailyStat.accuracy).toBeGreaterThanOrEqual(0);
    expect(dailyStat.accuracy).toBeLessThanOrEqual(1);
  });

  test('生成多个单词本对比数据', () => {
    const startDate = '2024-01-01';
    const endDate = '2024-02-01';
    const multiStats = generateMultiWordbookStatistics(startDate, endDate);

    expect(Object.keys(multiStats)).toContain('oxford3000');
    expect(Object.keys(multiStats)).toContain('cet4');
    expect(Object.keys(multiStats)).toContain('postgraduate');
    
    // 验证不同单词本的数据量差异
    expect(multiStats.oxford3000.totalWords).toBe(300);
    expect(multiStats.cet4.totalWords).toBe(400);
    expect(multiStats.postgraduate.totalWords).toBe(500);
  });

  test('计算KPI指标', () => {
    const startDate = '2024-01-01';
    const endDate = '2024-02-01';
    const multiStats = generateMultiWordbookStatistics(startDate, endDate);

    const kpis = calculateKPIs(multiStats);
    
    expect(kpis.totalSessions).toBeGreaterThan(0);
    expect(kpis.totalWords).toBeGreaterThan(0);
    expect(kpis.averageAccuracy).toBeGreaterThanOrEqual(0);
    expect(kpis.averageAccuracy).toBeLessThanOrEqual(1);
    expect(kpis.averageInterval).toBeGreaterThan(0);
    expect(kpis.memoryStability).toBeGreaterThanOrEqual(0);
    expect(kpis.memoryStability).toBeLessThanOrEqual(1);
  });

  test('KPI过滤功能 - 按日期范围', () => {
    const startDate = '2024-01-01';
    const endDate = '2024-03-01';
    const multiStats = generateMultiWordbookStatistics(startDate, endDate);

    const dateRange = ['2024-01-15', '2024-02-15'];
    const kpis = calculateKPIs(multiStats, dateRange);
    
    expect(kpis.totalSessions).toBeGreaterThan(0);
  });

  test('KPI过滤功能 - 按单词本选择', () => {
    const startDate = '2024-01-01';
    const endDate = '2024-02-01';
    const multiStats = generateMultiWordbookStatistics(startDate, endDate);

    const selectedWordbooks = ['oxford3000', 'cet4'];
    const kpis = calculateKPIs(multiStats, null, selectedWordbooks);
    
    expect(kpis.totalSessions).toBeGreaterThan(0);
  });

  test('SM-2算法学习记录生成', () => {
    const wordRecords = generateWordbookStatistics('sm2_test', 'SM2测试', '2024-01-01', '2024-02-01', 5);
    
    // 验证学习记录包含SM-2参数
    const sampleRecord = wordRecords.rawRecords[0];
    expect(sampleRecord).toHaveProperty('interval');
    expect(sampleRecord).toHaveProperty('ease');
    expect(sampleRecord).toHaveProperty('stability');
    expect(sampleRecord).toHaveProperty('isCorrect');
    expect(sampleRecord).toHaveProperty('accuracy');
  });

  test('数据边界情况处理', () => {
    // 空数据情况
    const emptyKpis = calculateKPIs({});
    expect(emptyKpis.totalSessions).toBe(0);
    expect(emptyKpis.averageAccuracy).toBe(0);

    // 极短时间范围
    const sameDayStats = generateWordbookStatistics('test', '测试', '2024-01-01', '2024-01-01', 1);
    expect(sameDayStats.dailyStats.length).toBeGreaterThan(0);
  });
});