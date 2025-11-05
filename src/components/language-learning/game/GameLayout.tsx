import React from 'react';
import { Card, Typography, Button, Space } from 'antd';
import { 
  MobileOutlined, 
  TabletOutlined, 
  DesktopOutlined,
  HeartOutlined
} from '@ant-design/icons';
import { useGameResponsive } from '@/hooks/useGameResponsive';

const { Text, Title } = Typography;

interface GameLayoutProps {
  children: React.ReactNode;
  showDeviceInfo?: boolean;
  className?: string;
}

export const GameLayout: React.FC<GameLayoutProps> = ({ 
  children, 
  showDeviceInfo = false,
  className = ''
}) => {
  const { isMobile, isTablet, isDesktop, getCardPadding } = useGameResponsive();
  const padding = getCardPadding();

  const getLayoutStyle = () => {
    if (isMobile) {
      return {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: '8px',
        margin: 0,
        borderRadius: 0
      };
    }
    
    if (isTablet) {
      return {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: '12px',
        margin: '0 auto',
        maxWidth: '768px'
      };
    }
    
    return {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '20px',
      margin: '0 auto',
      maxWidth: '1200px'
    };
  };

  const getCardStyle = () => {
    const style: React.CSSProperties = {
      borderRadius: isMobile ? 8 : 12,
      boxShadow: isMobile ? 
        '0 2px 8px rgba(0,0,0,0.1)' : 
        '0 4px 12px rgba(0,0,0,0.15)',
      marginBottom: isMobile ? '8px' : '16px',
      border: 'none'
    };

    return style;
  };

  const getCardBodyStyle = () => {
    return {
      padding: isMobile ? '12px' : '20px'
    };
  };

  const getTitleSize = () => {
    if (isMobile) return 3;
    if (isTablet) return 2;
    return 2;
  };

  const getIconSize = () => {
    if (isMobile) return 16;
    if (isTablet) return 20;
    return 24;
  };

  const getButtonSize = () => {
    if (isMobile) return 'small';
    if (isTablet) return 'middle';
    return 'large';
  };

  return (
    <div style={getLayoutStyle()} className={className}>
      {/* 设备信息显示 */}
      {showDeviceInfo && (
        <Card 
          size="small" 
          style={{ 
            marginBottom: '12px',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #e8e8e8'
          }}
          bodyStyle={{ padding: '8px 12px' }}
        >
          <Space size="small" align="center">
            {isMobile ? (
              <MobileOutlined style={{ fontSize: 14, color: '#1890ff' }} />
            ) : isTablet ? (
              <TabletOutlined style={{ fontSize: 14, color: '#52c41a' }} />
            ) : (
              <DesktopOutlined style={{ fontSize: 14, color: '#722ed1' }} />
            )}
            <Text style={{ fontSize: '12px', margin: 0 }}>
              {isMobile ? '移动端' : isTablet ? '平板端' : '桌面端'}体验
            </Text>
          </Space>
        </Card>
      )}
      
      <Card style={getCardStyle()} bodyStyle={getCardBodyStyle()}>
        {children}
      </Card>
      
      {/* 底部信息 */}
      {!isMobile && (
        <Card 
          size="small" 
          style={{ 
            marginTop: '16px',
            background: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
            border: '1px solid #e8e8e8'
          }}
          bodyStyle={{ padding: '8px 16px' }}
        >
          <Space size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>
              游戏化学习系统
            </Text>
            <HeartOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              让学习更有趣
            </Text>
          </Space>
        </Card>
      )}
    </div>
  );
};

// 移动端优化的按钮组件
export const GameButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
  size?: 'small' | 'middle' | 'large';
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  danger?: boolean;
  style?: React.CSSProperties;
  className?: string;
}> = ({ 
  children, 
  onClick, 
  type = 'primary',
  size,
  block = false,
  disabled = false,
  loading = false,
  icon,
  danger = false,
  style,
  className = ''
}) => {
  const { isMobile, isSmallMobile } = useGameResponsive();
  const finalSize = size || (isSmallMobile ? 'small' : isMobile ? 'middle' : 'large');
  const finalBlock = block || isMobile;
  
  const getResponsiveStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      borderRadius: isMobile ? 6 : 8,
      fontWeight: isMobile ? 'bold' : 'normal',
      height: isMobile ? (isSmallMobile ? 32 : 36) : 'auto',
      padding: isMobile ? (isSmallMobile ? '4px 8px' : '6px 12px') : undefined,
      ...style
    };
    
    return baseStyle;
  };

  return (
    <Button
      type={type}
      size={finalSize}
      block={finalBlock}
      disabled={disabled}
      loading={loading}
      icon={icon}
      danger={danger}
      onClick={onClick}
      style={getResponsiveStyle()}
      className={className}
    >
      {children}
    </Button>
  );
};

// 移动端优化的统计卡片组件
export const GameStatCard: React.FC<{
  title: string;
  value: string | number;
  suffix?: string;
  prefix?: React.ReactNode;
  color?: string;
  loading?: boolean;
  onClick?: () => void;
}> = ({ 
  title, 
  value, 
  suffix, 
  prefix, 
  color = '#1890ff',
  loading = false,
  onClick
}) => {
  const { isMobile, isSmallMobile } = useGameResponsive();
  
  const getCardStyle = (): React.CSSProperties => ({
    backgroundColor: isMobile ? 'rgba(255,255,255,0.9)' : '#fff',
    borderRadius: isMobile ? 6 : 8,
    padding: isMobile ? (isSmallMobile ? 8 : 12) : 16,
    textAlign: 'center' as const,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s ease',
    border: isMobile ? '1px solid #e8e8e8' : 'none',
    boxShadow: isMobile ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
  });

  const getTitleSize = () => {
    if (isSmallMobile) return 12;
    if (isMobile) return 13;
    return 14;
  };

  const getValueSize = () => {
    if (isSmallMobile) return 16;
    if (isMobile) return 18;
    return 24;
  };

  return (
    <div 
      style={getCardStyle()} 
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = isMobile ? '0 2px 4px rgba(0,0,0,0.1)' : 'none';
        }
      }}
    >
      <Text 
        type="secondary" 
        style={{ 
          fontSize: getTitleSize(),
          display: 'block',
          marginBottom: 4
        }}
      >
        {title}
      </Text>
      <div style={{ 
        color, 
        fontSize: getValueSize(), 
        fontWeight: 'bold',
        lineHeight: 1.2
      }}>
        {prefix && <span style={{ marginRight: 4 }}>{prefix}</span>}
        {value}
        {suffix && <span style={{ marginLeft: 4 }}>{suffix}</span>}
      </div>
    </div>
  );
};

// 响应式网格布局组件
export const GameGrid: React.FC<{
  children: React.ReactNode;
  gutter?: [number, number] | number;
  className?: string;
}> = ({ children, gutter = 16, className = '' }) => {
  const { isMobile, isSmallMobile } = useGameResponsive();
  
  const getGutter = () => {
    if (isSmallMobile) return [8, 8];
    if (isMobile) return [12, 12];
    return gutter;
  };

  const style: React.CSSProperties = {
    width: '100%'
  };

  return (
    <div 
      style={style} 
      className={className}
    >
      {/* 使用CSS Grid实现响应式布局 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isSmallMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: isMobile ? (isSmallMobile ? 8 : 12) : 16,
        width: '100%'
      }}>
        {children}
      </div>
    </div>
  );
};