import React, { useState, useEffect } from 'react';
import { Select, Spin, message } from 'antd';
import { wordbookService } from '../services/wordbookService';

const { Option } = Select;

/**
 * 公用单词书选择下拉框组件
 * 统一使用 wordbookService 作为数据源，确保数据一致性
 */
const WordbookSelector = ({
  value,
  onChange,
  placeholder = "请选择单词本",
  allowClear = true,
  multiple = false,
  disabled = false,
  style = {},
  size = "default",
  showSearch = true,
  filterOption = true,
  onLoad = null, // 数据加载完成回调
  includeInactive = false, // 是否包含非激活的单词本
  categoryFilter = null, // 分类过滤
  difficultyFilter = null, // 难度过滤
  ...restProps
}) => {
  const [wordbooks, setWordbooks] = useState([]);
  const [loading, setLoading] = useState(false);

  // 加载单词本数据
  const loadWordbooks = async () => {
    setLoading(true);
    try {
      let data = await wordbookService.getWordbooks();
      
      // 过滤非激活的单词本（如果需要）
      if (!includeInactive) {
        data = data.filter(wb => wb.isActive);
      }
      
      // 分类过滤
      if (categoryFilter) {
        data = data.filter(wb => wb.category === categoryFilter);
      }
      
      // 难度过滤
      if (difficultyFilter) {
        data = data.filter(wb => wb.difficulty === difficultyFilter);
      }
      
      setWordbooks(data);
      
      // 触发加载完成回调
      if (onLoad) {
        onLoad(data);
      }
    } catch (error) {
      console.error('加载单词本列表失败:', error);
      message.error('加载单词本列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWordbooks();
  }, [includeInactive, categoryFilter, difficultyFilter]);

  // 获取分类标签
  const getCategoryLabel = (category) => {
    const categoryMap = {
      academic: '学术',
      exam: '考试',
      business: '商务',
      daily: '日常',
      custom: '自定义'
    };
    return categoryMap[category] || category;
  };

  // 获取难度标签
  const getDifficultyLabel = (difficulty) => {
    const difficultyMap = {
      beginner: '初级',
      intermediate: '中级',
      advanced: '高级',
      expert: '专家'
    };
    return difficultyMap[difficulty] || difficulty;
  };

  // 自定义搜索过滤
  const customFilterOption = (input, option) => {
    if (!filterOption) return true;
    if (typeof filterOption === 'function') {
      return filterOption(input, option);
    }
    
    const wordbook = wordbooks.find(wb => wb.id === option.value);
    if (!wordbook) return false;
    
    const searchText = input.toLowerCase();
    return (
      wordbook.name.toLowerCase().includes(searchText) ||
      (wordbook.description && wordbook.description.toLowerCase().includes(searchText)) ||
      getCategoryLabel(wordbook.category).toLowerCase().includes(searchText) ||
      getDifficultyLabel(wordbook.difficulty).toLowerCase().includes(searchText)
    );
  };

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      allowClear={allowClear}
      mode={multiple ? 'multiple' : undefined}
      disabled={disabled || loading}
      style={style}
      size={size}
      showSearch={showSearch}
      filterOption={showSearch ? customFilterOption : false}
      loading={loading}
      notFoundContent={loading ? '加载中...' : '暂无数据'}
      {...restProps}
    >
      {wordbooks.map(wordbook => (
        <Option 
          key={wordbook.id} 
          value={wordbook.id}
          title={`${wordbook.name} - ${wordbook.description || ''}`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{wordbook.name}</span>
            <div style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
              <span>{getCategoryLabel(wordbook.category)}</span>
              <span style={{ margin: '0 4px' }}>·</span>
              <span>{getDifficultyLabel(wordbook.difficulty)}</span>
              <span style={{ margin: '0 4px' }}>·</span>
              <span>{wordbook.wordCount || 0}词</span>
            </div>
          </div>
        </Option>
      ))}
    </Select>
  );
};

export default WordbookSelector;