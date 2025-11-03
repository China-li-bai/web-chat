import React from 'react';
import { Layout, Avatar, Dropdown, Space, Typography, Button } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { useLayoutStore } from '../store/layout-store';
import ThemeToggle from './ui/theme-toggle';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

/**
 * Header - 智能头部组件
 * 集成布局状态，实现乔布斯式极简交互
 */
const Header = () => {
  // 布局状态 - 单一数据源
  const {
    sidebarWidth,
    headerHeight,
    isMobile,
    theme,
    toggleSidebar,
    setSidebarVisible
  } = useLayoutStore();

  // 用户菜单配置
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账户设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  // 菜单处理
  const handleMenuClick = ({ key }) => {
    switch (key) {
      case 'logout':
        console.log('退出登录');
        break;
      case 'profile':
        console.log('个人资料');
        break;
      case 'settings':
        console.log('账户设置');
        break;
      default:
        break;
    }
  };

  // 头部样式 - 数据驱动
  const headerStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    left: isMobile ? 0 : sidebarWidth,
    height: headerHeight,
    padding: '0 24px',
    background: 'var(--background)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'left 0.3s ease',
  };

  return (
    <AntHeader style={headerStyle} className="app-header">
      {/* 左侧区域 */}
      <div className="header-left">
        {/* 移动端菜单按钮 */}
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setSidebarVisible(true)}
            style={{ fontSize: '16px' }}
          />
        )}
        {!isMobile && (
          <Text strong style={{ fontSize: '16px' }}>
            欢迎使用AI口语练习系统
          </Text>
        )}
      </div>

      {/* 右侧区域 */}
      <div className="header-right">
        <Space size="middle">
          {/* 主题切换 */}
          <ThemeToggle />

          {/* 练习时间 - 桌面端显示 */}
          {!isMobile && (
            <Text type="secondary">
              今日练习时间: 25分钟
            </Text>
          )}

          {/* 用户菜单 */}
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: handleMenuClick,
            }}
            placement="bottomRight"
            arrow
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size={isMobile ? 'default' : 'small'} icon={<UserOutlined />} />
              {!isMobile && <Text>用户名</Text>}
            </Space>
          </Dropdown>
        </Space>
      </div>
    </AntHeader>
  );
};

export default Header;