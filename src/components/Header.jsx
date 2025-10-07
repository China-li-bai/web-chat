import React from 'react';
import { Layout, Avatar, Dropdown, Space, Typography } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header = () => {
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
        marginLeft: 200, // 为侧边栏留出空间
      }}
    >
      <div className="header-left">
        <Text strong style={{ fontSize: '16px' }}>
          欢迎使用AI口语练习系统
        </Text>
      </div>
      
      <div className="header-right">
        <Space size="middle">
          <Text type="secondary">今日练习时间: 25分钟</Text>
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: handleMenuClick,
            }}
            placement="bottomRight"
            arrow
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text>用户名</Text>
            </Space>
          </Dropdown>
        </Space>
      </div>
    </AntHeader>
  );
};

export default Header;