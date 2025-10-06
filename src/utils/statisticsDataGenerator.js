/**
 * 学习统计数据模拟生成器
 * 基于SM-2间隔重复算法生成真实的学习记录数据
 */

import dayjs from 'dayjs';

// SM-2算法参数
const SM2_PARAMS = {
  initialEase: 2.5,
  minEase: 1.3,
  intervalModifier: 1,
  correctResponse: (interval, ease) => Math.max(interval * ease, 1),
  incorrectResponse: (interval) => Math.max(interval * 0.5, 1)
};

/**
 * 生成单个单词的学习记录序列
 */
const generateWordLearningRecords = (wordId, startDate, totalSessions = 10) => {
  const records = [];
  let currentDate = dayjs(startDate);
  let interval = 1;
  let ease = SM2_PARAMS.initialEase;
  let stability = 0.5;

  for (let i = 0; i < totalSessions; i++) {
    // 模拟学习结果 - 基于当前稳定性
    const isCorrect = Math.random() < stability;
    const accuracy = isCorrect ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.4;
    
    records.push({
      wordId,
      sessionDate: currentDate.format('YYYY-MM-DD'),
      isCorrect,
      accuracy: parseFloat(accuracy.toFixed(2)),
      interval,
      ease,
      stability: parseFloat(stability.toFixed(2))
    });

    // 更新SM-2参数
    if (isCorrect) {
      interval = SM2_PARAMS.correctResponse(interval, ease);
      ease = Math.max(ease + 0.1, SM2_PARAMS.minEase);
      stability = Math.min(stability + 0.1, 0.95);
    } else {
      interval = SM2_PARAMS.incorrectResponse(interval);
      ease = Math.max(ease - 0.2, SM2_PARAMS.minEase);
      stability = Math.max(stability - 0.15, 0.2);
    }

    // 移动到下一个学习日期
    currentDate = currentDate.add(interval, 'day');
  }

  return records;
};

/**
 * 生成指定单词本的学习统计数据
 */
export const generateWordbookStatistics = (wordbookId, wordbookName, startDate, endDate, wordCount = 100) => {
  const allRecords = [];
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const totalDays = end.diff(start, 'day');

  // 为每个单词生成学习记录
  for (let i = 0; i < wordCount; i++) {
    const wordStartDate = start.add(Math.random() * totalDays * 0.8, 'day');
    const sessions = Math.floor(Math.random() * 15) + 5; // 5-20次学习
    const wordRecords = generateWordLearningRecords(
      `${wordbookId}_word_${i}`,
      wordStartDate,
      sessions
    );
    allRecords.push(...wordRecords);
  }

  // 按日期分组
  const recordsByDate = {};
  allRecords.forEach(record => {
    if (!recordsByDate[record.sessionDate]) {
      recordsByDate[record.sessionDate] = [];
    }
    recordsByDate[record.sessionDate].push(record);
  });

  // 生成每日统计
  const dailyStats = Object.keys(recordsByDate).map(date => {
    const dayRecords = recordsByDate[date];
    const totalSessions = dayRecords.length;
    const correctSessions = dayRecords.filter(r => r.isCorrect).length;
    const accuracy = totalSessions > 0 ? correctSessions / totalSessions : 0;
    const avgInterval = dayRecords.reduce((sum, r) => sum + r.interval, 0) / totalSessions;
    const avgStability = dayRecords.reduce((sum, r) => sum + r.stability, 0) / totalSessions;

    return {
      date,
      wordbook: wordbookName,
      wordbookId,
      totalSessions,
      correctSessions,
      accuracy: parseFloat(accuracy.toFixed(3)),
      avgInterval: parseFloat(avgInterval.toFixed(1)),
      avgStability: parseFloat(avgStability.toFixed(2)),
      uniqueWords: new Set(dayRecords.map(r => r.wordId)).size
    };
  });

  return {
    wordbookId,
    wordbookName,
    totalRecords: allRecords.length,
    totalWords: wordCount,
    dailyStats: dailyStats.sort((a, b) => a.date.localeCompare(b.date)),
    rawRecords: allRecords
  };
};

/**
 * 生成多个单词本的对比数据
 */
export const generateMultiWordbookStatistics = (startDate, endDate) => {
  const wordbooks = [
    { id: 'oxford3000', name: '牛津3000', wordCount: 300 },
    { id: 'cet4', name: '四级英语', wordCount: 400 },
    { id: 'postgraduate', name: '考研', wordCount: 500 },
    { id: 'interview', name: '面试英语', wordCount: 200 },
    { id: 'ielts', name: '雅思词汇', wordCount: 600 }
  ];

  const results = {};
  wordbooks.forEach(wb => {
    results[wb.id] = generateWordbookStatistics(
      wb.id,
      wb.name,
      startDate,
      endDate,
      wb.wordCount
    );
  });

  return results;
};

/**
 * 计算KPI指标
 */
export const calculateKPIs = (statisticsData, dateRange = null, selectedWordbooks = []) => {
  let allRecords = [];
  
  // 过滤数据
  Object.values(statisticsData).forEach(wbData => {
    if (selectedWordbooks.length === 0 || selectedWordbooks.includes(wbData.wordbookId)) {
      wbData.rawRecords.forEach(record => {
        if (!dateRange || (
          record.sessionDate >= dateRange[0] && 
          record.sessionDate <= dateRange[1]
        )) {
          allRecords.push(record);
        }
      });
    }
  });

  if (allRecords.length === 0) {
    return {
      totalSessions: 0,
      totalWords: 0,
      averageAccuracy: 0,
      averageInterval: 0,
      memoryStability: 0
    };
  }

  const totalSessions = allRecords.length;
  const correctSessions = allRecords.filter(r => r.isCorrect).length;
  const averageAccuracy = correctSessions / totalSessions;
  const averageInterval = allRecords.reduce((sum, r) => sum + r.interval, 0) / totalSessions;
  const memoryStability = allRecords.reduce((sum, r) => sum + r.stability, 0) / totalSessions;

  // 计算唯一单词数
  const uniqueWords = new Set(allRecords.map(r => r.wordId)).size;

  return {
    totalSessions,
    totalWords: uniqueWords,
    averageAccuracy: parseFloat(averageAccuracy.toFixed(3)),
    averageInterval: parseFloat(averageInterval.toFixed(1)),
    memoryStability: parseFloat(memoryStability.toFixed(2))
  };
};

export default {
  generateWordbookStatistics,
  generateMultiWordbookStatistics,
  calculateKPIs
};