import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Drawer } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  SoundOutlined,
  BarChartOutlined,
  SettingOutlined,
  AudioOutlined,
  BookOutlined,
  LineChartOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar = ({ collapsed, onCollapse, isMobile, drawerVisible, onDrawerClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // 移除内部的移动端状态管理，使用从App传递的props
  // const [isMobile, setIsMobile] = useState(false);
  // const [drawerVisible, setDrawerVisible] = useState(false);

  // 移除内部的屏幕尺寸检测，使用从App传递的props
  // useEffect(() => {
  //   const checkScreenSize = () => {
  //     const mobile = window.innerWidth < 768;
  //     setIsMobile(mobile);
  //     if (mobile && drawerVisible) {
  //       setDrawerVisible(false);
  //     }
  //   };

  //   checkScreenSize();
  //   window.addEventListener('resize', checkScreenSize);
  //   return () => window.removeEventListener('resize', checkScreenSize);
  // }, [drawerVisible]);

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
      key: 'language-learning',
      icon: <BookOutlined />,
      label: '智能学习',
      children: [
        {
          key: '/language-learning',
          icon: <BookOutlined />,
          label: '本次学习统计',
        },
        {
          key: '/long-term-statistics',
          icon: <LineChartOutlined />,
          label: '长期学习统计',
        },
      ],
    },
    {
      key: '/progress',
      icon: <BarChartOutlined />,
      label: '学习进度',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
    // 移动端点击菜单后关闭抽屉
    if (isMobile) {
      onDrawerClose();
    }
  };

  const toggleDrawer = () => {
    // 这个函数现在不需要了，因为抽屉的开关由App组件控制
    // 但为了保持兼容性，我们可以调用onDrawerClose来关闭抽屉
    if (drawerVisible) {
      onDrawerClose();
    }
  };

  // Logo组件
  const LogoComponent = () => (
    <div className="sidebar-logo">
      <SoundOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
      <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>AI口语练习</span>
    </div>
  );

  // 菜单组件
  const MenuComponent = () => (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ borderRight: 0 }}
      className="sidebar-menu"
    />
  );

  // 移动端使用抽屉
  if (isMobile) {
    return (
      <>
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={toggleDrawer}
          className="mobile-menu-trigger"
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 1001,
            fontSize: '18px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '8px'
          }}
        />
        <Drawer
          title={<LogoComponent />}
          placement="left"
          onClose={onDrawerClose}
          open={drawerVisible}
          bodyStyle={{ padding: 0 }}
          width={280}
          className="mobile-sidebar-drawer"
        >
          <MenuComponent />
        </Drawer>
      </>
    );
  }

  // 桌面端使用侧边栏
  return (
    <Sider
      width={200}
      className="desktop-sidebar"
      theme="light"
      collapsed={collapsed}
      collapsible
      trigger={
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onCollapse}
          style={{
            fontSize: '16px',
            width: 64,
            height: 64,
          }}
        />
      }
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      <LogoComponent />
      <MenuComponent />
    </Sider>
  );
};

export default Sidebar;