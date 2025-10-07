import dayjs from 'dayjs';
import { learningDataService } from '../services/learningDataService';

/**
 * 基于真实学习数据生成统计信息
 * @param {string} startDate - 开始日期 YYYY-MM-DD
 * @param {string} endDate - 结束日期 YYYY-MM-DD
 * @returns {Promise<Object>} 统计数据结构
 */
export const generateStatisticsFromWordbooks = async (startDate, endDate) => {
  try {
    // 获取所有单词本数据
    const wordbooks = await learningDataService.getAllWordbooks();
    
    const statistics = {};
    
    for (const wordbook of wordbooks) {
      // 获取该词书的真实学习数据
      const learningRecords = await learningDataService.getLearningRecordsByWordbook(wordbook.id);
      const learningSessions = await learningDataService.getLearningSessionsByWordbook(wordbook.id);
      const vocabularies = await learningDataService.getVocabulariesByWordbook(wordbook.id);
      
      // 过滤日期范围内的记录
      const filteredRecords = learningRecords.filter(record => {
        const recordDate = dayjs(record.timestamp);
        return recordDate.isAfter(dayjs(startDate).subtract(1, 'day')) && 
               recordDate.isBefore(dayjs(endDate).add(1, 'day'));
      });
      
      const filteredSessions = learningSessions.filter(session => {
        const sessionDate = dayjs(session.startTime);
        return sessionDate.isAfter(dayjs(startDate).subtract(1, 'day')) && 
               sessionDate.isBefore(dayjs(endDate).add(1, 'day'));
      });
      
      // 计算统计信息
      const totalSessions = filteredSessions.length;
      const totalWords = vocabularies.length;
      const correctRecords = filteredRecords.filter(r => r.result === 'correct').length;
      const accuracy = filteredRecords.length > 0 ? correctRecords / filteredRecords.length : 0;
      
      // 计算平均间隔和稳定度
      let totalInterval = 0;
      let totalStability = 0;
      let intervalCount = 0;
      
      filteredRecords.forEach(record => {
        if (record.interval !== undefined) {
          totalInterval += record.interval;
          intervalCount++;
        }
        if (record.stability !== undefined) {
          totalStability += record.stability;
        }
      });
      
      const avgInterval = intervalCount > 0 ? totalInterval / intervalCount : 0;
      const avgStability = filteredRecords.length > 0 ? totalStability / filteredRecords.length : 0;
      
      statistics[wordbook.id] = {
        wordbookName: wordbook.name,
        wordbookId: wordbook.id,
        dailyStats: generateDailyStatsFromRecords(filteredRecords, startDate, endDate),
        rawRecords: convertRecordsFormat(filteredRecords, wordbook.id),
        totalSessions,
        totalWords,
        accuracy,
        avgInterval,
        avgStability
      };
    }
    
    return statistics;
  } catch (error) {
    console.error('生成真实统计信息失败:', error);
    throw new Error('无法生成统计信息: ' + error.message);
  }
};

/**
 * 基于真实学习记录生成每日统计数据
 */
const generateDailyStatsFromRecords = (learningRecords, startDate, endDate) => {
  const stats = [];
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const days = end.diff(start, 'day');
  
  // 按日期分组学习记录
  const recordsByDate = {};
  learningRecords.forEach(record => {
    const date = dayjs(record.timestamp).format('YYYY-MM-DD');
    if (!recordsByDate[date]) {
      recordsByDate[date] = [];
    }
    recordsByDate[date].push(record);
  });
  
  // 为每一天生成统计数据
  for (let i = 0; i <= days; i++) {
    const currentDate = start.add(i, 'day');
    const dateStr = currentDate.format('YYYY-MM-DD');
    const dayRecords = recordsByDate[dateStr] || [];
    
    if (dayRecords.length > 0) {
      const correctRecords = dayRecords.filter(r => r.result === 'correct').length;
      const accuracy = correctRecords / dayRecords.length;
      
      // 计算平均间隔和稳定度
      let totalInterval = 0;
      let totalStability = 0;
      let intervalCount = 0;
      
      dayRecords.forEach(record => {
        if (record.interval !== undefined) {
          totalInterval += record.interval;
          intervalCount++;
        }
        if (record.stability !== undefined) {
          totalStability += record.stability;
        }
      });
      
      const avgInterval = intervalCount > 0 ? totalInterval / intervalCount : 0;
      const avgStability = dayRecords.length > 0 ? totalStability / dayRecords.length : 0;
      
      stats.push({
        date: dateStr,
        totalSessions: dayRecords.length,
        accuracy,
        avgInterval,
        avgStability
      });
    }
  }
  
  return stats;
};

/**
 * 转换学习记录格式以适配统计组件
 */
const convertRecordsFormat = (learningRecords, wordbookId) => {
  return learningRecords.map(record => ({
    sessionDate: dayjs(record.timestamp).format('YYYY-MM-DD'),
    wordbookId: wordbookId,
    wordId: record.vocabularyId,
    isCorrect: record.result === 'correct',
    interval: record.interval || 1,
    stability: record.stability || 0.5,
    difficulty: record.difficulty || 0.5
  }));
};

/**
 * 计算基于真实数据的KPI指标
 */
export const calculateRealKPIs = (statistics, dateRange, selectedWordbooks) => {
  if (!statistics) {
    return {
      totalSessions: 0,
      totalWords: 0,
      averageAccuracy: 0,
      averageInterval: 0,
      memoryStability: 0
    };
  }

  let totalSessions = 0;
  let totalWords = 0;
  let totalAccuracy = 0;
  let totalInterval = 0;
  let totalStability = 0;
  let wordbookCount = 0;

  const wordbooksToCalculate = selectedWordbooks.length > 0 ? 
    selectedWordbooks : Object.keys(statistics);

  wordbooksToCalculate.forEach(wordbookId => {
    const wbData = statistics[wordbookId];
    if (!wbData) return;

    totalSessions += wbData.totalSessions;
    totalWords += wbData.totalWords;
    totalAccuracy += wbData.accuracy;
    totalInterval += wbData.avgInterval;
    totalStability += wbData.avgStability;
    wordbookCount++;
  });

  return {
    totalSessions,
    totalWords,
    averageAccuracy: wordbookCount > 0 ? totalAccuracy / wordbookCount : 0,
    averageInterval: wordbookCount > 0 ? totalInterval / wordbookCount : 0,
    memoryStability: wordbookCount > 0 ? totalStability / wordbookCount : 0
  };
};