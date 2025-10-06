import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Home from './pages/Home';
import Practice from './pages/Practice';
import LanguageLearning from './pages/LanguageLearning';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import LongTermStatistics from './pages/LongTermStatistics';
import WordbookManager from './pages/WordbookManager';
import './styles/App.css';

const { Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // 检测屏幕尺寸
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // 移动端默认折叠侧边栏
      if (mobile) {
        setCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleCollapse = (collapsed) => {
    setCollapsed(collapsed);
  };

  return (
    <Layout className="app-layout">
      <Sidebar 
        collapsed={collapsed} 
        onCollapse={handleCollapse}
        isMobile={isMobile}
        drawerVisible={drawerVisible}
        onDrawerClose={() => setDrawerVisible(false)}
      />
      <Layout className={`main-layout ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}>
        <Header 
          isMobile={isMobile}
          onMobileMenuClick={() => setDrawerVisible(true)}
        />
        <Content className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/language-learning" element={<LanguageLearning />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/long-term-statistics" element={<LongTermStatistics />} />
            <Route path="/wordbook-manager" element={<WordbookManager />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;