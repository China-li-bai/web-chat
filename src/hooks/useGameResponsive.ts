import React, { useState, useEffect } from 'react';

// 屏幕断点配置
export const breakpoints = {
  xs: 480,   // 极小屏幕 (手机竖屏)
  sm: 576,   // 小屏幕 (手机横屏)
  md: 768,   // 中等屏幕 (平板竖屏)
  lg: 992,   // 大屏幕 (平板横屏/小笔记本)
  xl: 1200,  // 超大屏幕 (桌面)
  xxl: 1600  // 极大屏幕 (大桌面)
};

export type Breakpoint = keyof typeof breakpoints;

// 响应式钩子
export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 判断当前屏幕类型
  const currentBreakpoint = (): Breakpoint => {
    const width = windowSize.width;
    if (width < breakpoints.xs) return 'xs';
    if (width < breakpoints.sm) return 'sm';
    if (width < breakpoints.md) return 'md';
    if (width < breakpoints.lg) return 'lg';
    if (width < breakpoints.xl) return 'xl';
    return 'xxl';
  };

  // 便捷方法
  const isMobile = windowSize.width < breakpoints.md;
  const isTablet = windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg;
  const isDesktop = windowSize.width >= breakpoints.lg;
  const isSmallMobile = windowSize.width < breakpoints.sm;

  // 媒体查询方法
  const isBreakpoint = (breakpoint: Breakpoint): boolean => {
    return windowSize.width >= breakpoints[breakpoint];
  };

  // 获取屏幕密度
  const getPixelRatio = () => {
    return window.devicePixelRatio || 1;
  };

  // 获取安全区域（刘海屏等）
  const getSafeAreaInsets = () => {
    if (typeof document === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
    
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
      right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
      bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0')
    };
  };

  return {
    windowSize,
    currentBreakpoint: currentBreakpoint(),
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    isBreakpoint,
    getPixelRatio,
    getSafeAreaInsets
  };
};

// 响应式组件属性生成器
export const useResponsiveProps = () => {
  const { isMobile, isTablet, isDesktop, isSmallMobile } = useResponsive();

  const getGridProps = (desktop: any, tablet?: any, mobile?: any) => {
    if (isMobile) return { xs: 24, ...mobile };
    if (isTablet) return { xs: 24, sm: 12, ...tablet };
    return { xs: 24, sm: 12, md: 8, lg: 6, ...desktop };
  };

  const getSpacing = (desktop: number, tablet?: number, mobile?: number) => {
    if (isSmallMobile) return mobile || Math.floor(desktop * 0.5);
    if (isMobile) return mobile || Math.floor(desktop * 0.75);
    if (isTablet) return tablet || Math.floor(desktop * 0.9);
    return desktop;
  };

  const getFontSize = (desktop: string, tablet?: string, mobile?: string) => {
    if (isSmallMobile) return mobile || '12px';
    if (isMobile) return mobile || '14px';
    if (isTablet) return tablet || '16px';
    return desktop;
  };

  const getButtonSize = () => {
    if (isSmallMobile) return 'small';
    if (isMobile) return 'middle';
    return 'large';
  };

  const getCardPadding = () => {
    if (isSmallMobile) return 12;
    if (isMobile) return 16;
    if (isTablet) return 20;
    return 24;
  };

  return {
    getGridProps,
    getSpacing,
    getFontSize,
    getButtonSize,
    getCardPadding
  };
};