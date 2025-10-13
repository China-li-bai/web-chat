import React, { useEffect } from 'react';
import { Button } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useAppStore } from '../../store/useAppStore';

const ThemeToggle = () => {
  const { settings, updateSettings } = useAppStore();
  const { uiSettings } = settings;
  const { theme } = uiSettings;
  
  // 初始化主题
  useEffect(() => {
    // 从本地存储获取主题设置
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    
    // 如果保存的主题与当前状态不一致，更新状态
    if (initialTheme !== theme) {
      updateSettings({
        ...settings,
        uiSettings: {
          ...uiSettings,
          theme: initialTheme as 'light' | 'dark'
        }
      });
    }
    
    // 应用主题
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);
  
  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // 只有在用户没有手动设置主题时才跟随系统主题
      if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        updateSettings({
          ...settings,
          uiSettings: {
            ...uiSettings,
            theme: newTheme
          }
        });
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings, uiSettings, updateSettings]);
  
  // 切换主题
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    updateSettings({
      ...settings,
      uiSettings: {
        ...uiSettings,
        theme: newTheme
      }
    });
    
    // 更新DOM类名
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    
    // 保存到本地存储
    localStorage.setItem('theme', newTheme);
  };
  
  return (
    <Button
      type="text"
      icon={theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
      onClick={toggleTheme}
      title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
    />
  );
};

export default ThemeToggle;