import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  SoundOutlined,
  BarChartOutlined,
  SettingOutlined,
  AudioOutlined,
  BookOutlined,
  LineChartOutlined,
  ReloadOutlined,
  BulbOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useLayoutStore } from '../store/layout-store';
import { LAYOUT_CONSTANTS } from '../store/layout-store';

const { Sider } = Layout;

/**
 * Sidebar - 智能侧边栏组件
 * 集成布局状态，实现乔布斯式极简交互
 */
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 布局状态 - 单一数据源
  const {
    sidebarWidth,
    isMobile,
    theme,
    toggleSidebar,
    setSidebarVisible
  } = useLayoutStore();

  // 菜单配置 - 数据驱动
  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/practice',
      icon: <AudioOutlined />,
      label: '口语练习',
    },
    {
      key: '/language-learning',
      icon: <BookOutlined />,
      label: '智能学习',
    },
    {
      key: '/review-planner',
      icon: <ReloadOutlined />,
      label: '复习计划',
    },
    {
      key: '/statistics',
      icon: <LineChartOutlined />,
      label: '学习统计',
    },
    {
      key: '/progress',
      icon: <BarChartOutlined />,
      label: '学习进度',
    },
    {
      key: '/marketing-copilot',
      icon: <BulbOutlined />,
      label: '智能文案',
    },
    {
      key: '/ai-content-creator',
      icon: <EditOutlined />,
      label: 'AI图文创作',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  // 导航处理
  const handleMenuClick = ({ key }) => {
    navigate(key);
    // 移动端点击后自动关闭侧边栏
    if (isMobile) {
      setSidebarVisible(false);
    }
  };

  // 侧边栏样式 - 数据驱动
  const sidebarStyle = {
    width: sidebarWidth,
    overflow: 'auto',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    background: 'var(--background)',
    boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
    zIndex: 101,
    transition: 'width 0.3s ease',
  };

  // Logo显示逻辑
  const showLogoText = sidebarWidth > LAYOUT_CONSTANTS.SIDEBAR_WIDTH.COLLAPSED + 20;

  return (
    <Sider
      style={sidebarStyle}
      theme={theme}
      className="sidebar"
    >
      {/* Logo区域 */}
      <div className="sidebar-logo">
        <SoundOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
        {showLogoText && (
          <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
            AI口语练习
          </span>
        )}
      </div>

      {/* 菜单 */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
        className="sidebar-menu"
      />
    </Sider>
  );
};

export default Sidebar;