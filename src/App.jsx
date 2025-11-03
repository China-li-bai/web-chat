import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import { useResponsive } from './hooks/useResponsive';
import { useLayoutStore } from './store/layout-store';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Home from './pages/Home';
import Practice from './pages/Practice';
import LanguageLearning from './pages/LanguageLearning/index';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import LearningSessionPage from './pages/LanguageLearning/LearningSessionPage';
import StatisticsPage from './pages/LanguageLearning/StatisticsPage';
import TodayPlanPage from './pages/TodayPlan/today-plan-page';
import ReviewPlannerPage from './pages/ReviewPlanner/review-planner-page';
import MarketingCopilot from './pages/MarketingCopilot';
import AIContentCreator from './components/AIContentCreator';

import './styles/App.css';

// #region --- Layout Context Provider ---
/**
 * LayoutProvider - 统一布局状态管理
 * INTJ原则：单一数据源，系统性思维
 * 乔布斯原则：极简设计，隐藏复杂性
 */
const LayoutProvider = ({ children }) => {
  // 响应式Hook - 自动检测屏幕尺寸
  useResponsive();

  // 布局状态
  const {
    sidebarWidth,
    headerHeight,
    sidebarVisible,
    sidebarCollapsed,
    isMobile,
    isTablet,
    theme
  } = useLayoutStore();

  // 移动端自动隐藏侧边栏
  // 仅在切换到移动端时触发，不监听sidebarVisible变化（避免竞态条件）
  React.useEffect(() => {
    if (isMobile) {
      useLayoutStore.getState().setSidebarVisible(false);
    }
  }, [isMobile]);

  // 点击外部关闭侧边栏
  React.useEffect(() => {
    const handleOutsideClick = (event) => {
      // 仅在移动端且侧边栏可见时处理
      if (isMobile && sidebarVisible) {
        const target = event.target;
        const sidebar = document.querySelector('.sidebar');
        const header = document.querySelector('.app-header');

        // 如果点击的不是侧边栏或头部（菜单按钮），则关闭侧边栏
        if (sidebar && !sidebar.contains(target) && header && !header.contains(target)) {
          useLayoutStore.getState().setSidebarVisible(false);
        }
      }
    };

    // 添加全局点击事件监听器
    document.addEventListener('mousedown', handleOutsideClick);

    // 清理函数
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMobile, sidebarVisible]);

  // 布局样式 - 数据驱动
  const layoutStyle = {
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--background)',
  };

  const contentStyle = {
    marginLeft: isMobile ? 0 : sidebarWidth,
    marginTop: headerHeight,
    height: `calc(100vh - ${headerHeight}px)`,
    overflow: 'auto',
    background: 'var(--background)',
    transition: 'margin-left 0.3s ease',
  };

  const innerLayoutStyle = {
    height: '100%',
  };

  // 遮罩层样式 - 移动端侧边栏打开时显示
  const overlayStyle = isMobile && sidebarVisible ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 99,
    animation: 'fadeIn 0.3s ease',
  } : {};

  return (
    <Layout style={layoutStyle} className={`app-layout ${theme}`}>
      {/* 侧边栏 - 智能显示 */}
      {sidebarVisible && <Sidebar />}
      {/* 遮罩层 - 移动端侧边栏打开时显示 */}
      {overlayStyle.position && <div style={overlayStyle} onClick={() => useLayoutStore.getState().setSidebarVisible(false)} />}
      <Layout style={innerLayoutStyle}>
        {/* 头部 - 固定定位 */}
        <Header />
        {/* 内容区域 - 自适应布局 */}
        <Layout.Content style={contentStyle} className="app-content">
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

// #endregion

// #region --- Router Provider ---
/**
 * RouterProvider - 路由管理
 * 极简设计：路由配置集中管理
 */
const RouterProvider = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/practice" element={<Practice />} />
      <Route path="/today-plan" element={<TodayPlanPage />} />
      <Route path="/language-learning" element={<LanguageLearning />} />
      <Route path="/learning-session/:wordbookId" element={<LearningSessionPage />} />
      <Route path="/statistics" element={<StatisticsPage />} />
      <Route path="/review-planner" element={<ReviewPlannerPage />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/marketing-copilot" element={<MarketingCopilot />} />
      <Route path="/ai-content-creator" element={<AIContentCreator />} />
    </Routes>
  );
};

// #endregion

// #region --- Main App Component ---
/**
 * App - 主应用组件
 *
 * 设计原则：
 * 1. INTJ系统性：分层架构，单一数据源
 * 2. 乔布斯美学：极简，去除冗余
 * 3. 数据统一：所有布局状态集中管理
 * 4. 响应式：自动适配，无需手动切换
 */
function App() {
  return (
    <LayoutProvider>
      <RouterProvider />
    </LayoutProvider>
  );
}

// #endregion

export default App;