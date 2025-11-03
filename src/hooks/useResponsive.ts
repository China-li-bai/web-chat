import { useEffect, useCallback, useState } from 'react';
import { useLayoutStore, LAYOUT_CONSTANTS } from '../store/layout-store';

// 断点类型
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// 响应式信息接口
interface ResponsiveInfo {
  breakpoint: Breakpoint;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
}

/**
 * useResponsive Hook
 * 统一管理响应式逻辑，遵循INTJ的系统性原则
 * - 单点数据源
 * - 自动更新布局状态
 * - 性能优化
 */
export const useResponsive = () => {
  const {
    setBreakpoint,
    setIsMobile,
    setIsTablet,
    setIsDesktop,
    updateLayoutState
  } = useLayoutStore();

  // 检测当前断点
  const getBreakpoint = useCallback((width: number): Breakpoint => {
    if (width < LAYOUT_CONSTANTS.BREAKPOINTS.XS) return 'xs';
    if (width < LAYOUT_CONSTANTS.BREAKPOINTS.SM) return 'sm';
    if (width < LAYOUT_CONSTANTS.BREAKPOINTS.MD) return 'md';
    if (width < LAYOUT_CONSTANTS.BREAKPOINTS.LG) return 'lg';
    return 'xl';
  }, []);

  // 检测设备类型
  const getDeviceType = useCallback((width: number) => {
    return {
      isMobile: width < LAYOUT_CONSTANTS.BREAKPOINTS.MD,
      isTablet: width >= LAYOUT_CONSTANTS.BREAKPOINTS.MD && width < LAYOUT_CONSTANTS.BREAKPOINTS.LG,
      isDesktop: width >= LAYOUT_CONSTANTS.BREAKPOINTS.LG
    };
  }, []);

  // 更新布局状态
  const updateResponsiveState = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width);
    const { isMobile, isTablet, isDesktop } = getDeviceType(width);

    // 批量更新状态，提高性能
    updateLayoutState({
      currentBreakpoint: breakpoint,
      isMobile,
      isTablet,
      isDesktop
    });

    // 设置具体状态
    setBreakpoint(breakpoint);
    setIsMobile(isMobile);
    setIsTablet(isTablet);
    setIsDesktop(isDesktop);
  }, [getBreakpoint, getDeviceType, updateLayoutState, setBreakpoint, setIsMobile, setIsTablet, setIsDesktop]);

  // 监听窗口大小变化
  useEffect(() => {
    // 初始加载
    updateResponsiveState();

    // 创建防抖函数
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateResponsiveState, 100);
    };

    // 添加监听器
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // 清理函数
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [updateResponsiveState]);

  // 返回响应式信息
  const responsiveInfo: ResponsiveInfo = {
    breakpoint: getBreakpoint(window.innerWidth),
    width: window.innerWidth,
    height: window.innerHeight,
    ...getDeviceType(window.innerWidth),
    isLandscape: window.innerWidth > window.innerHeight,
    isPortrait: window.innerWidth <= window.innerHeight
  };

  return responsiveInfo;
};

// 快捷Hook - 仅获取特定断点信息
export const useBreakpoint = () => {
  const { currentBreakpoint, isMobile, isTablet, isDesktop } = useLayoutStore();
  return { currentBreakpoint, isMobile, isTablet, isDesktop };
};

// 快捷Hook - 获取当前窗口尺寸
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return windowSize;
};

export default useResponsive;
