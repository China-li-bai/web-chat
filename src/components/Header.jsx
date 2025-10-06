import React from 'react';
import { Layout, Avatar, Dropdown, Space, Typography, Button } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined, MenuOutlined } from '@ant-design/icons';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header = ({ isMobile, onMobileMenuClick }) => {
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

  const handleMenuClick = ({ key }) => {
    switch (key) {
      case 'logout':
        // 处理退出登录
        console.log('退出登录');
        break;
      case 'profile':
        // 处理个人资料
        console.log('个人资料');
        break;
      case 'settings':
        // 处理账户设置
        console.log('账户设置');
        break;
      default:
        break;
    }
  };

  return (
    <AntHeader
      className="app-header"
      style={{
        padding: '0 24px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        right: 0,
        left: isMobile ? 0 : 200,
        zIndex: 99,
        transition: 'left 0.3s ease',
      }}
    >
      <div className="header-left">
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMobileMenuClick}
            className="mobile-menu-trigger"
            style={{
              marginRight: '16px',
              border: 'none',
              boxShadow: 'none',
            }}
          />
        )}
        <Text strong style={{ fontSize: isMobile ? '14px' : '16px' }}>
          {isMobile ? 'AI口语练习' : '欢迎使用AI口语练习系统'}
        </Text>
      </div>
      
      <div className="header-right">
        <Space size={isMobile ? "small" : "middle"}>
          {!isMobile && (
            <Text type="secondary">今日练习时间: 25分钟</Text>
          )}
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: handleMenuClick,
            }}
            placement="bottomRight"
            arrow
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size={isMobile ? "small" : "default"} icon={<UserOutlined />} />
              {!isMobile && <Text>用户名</Text>}
            </Space>
          </Dropdown>
        </Space>
      </div>
    </AntHeader>
  );
};

export default Header;