import { create } from 'zustand';

// #region --- Type Definitions ---

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LayoutState {
  // 布局配置
  sidebarWidth: number;
  headerHeight: number;

  // 侧边栏状态
  sidebarCollapsed: boolean;
  sidebarVisible: boolean;

  // 响应式状态
  currentBreakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  // 主题状态
  theme: 'light' | 'dark';

  // 动画状态
  isTransitioning: boolean;
}

interface LayoutActions {
  // 侧边栏操作
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarVisible: (visible: boolean) => void;
  setSidebarWidth: (width: number) => void;

  // 断点操作
  setBreakpoint: (breakpoint: Breakpoint) => void;
  setIsMobile: (isMobile: boolean) => void;
  setIsTablet: (isTablet: boolean) => void;
  setIsDesktop: (isDesktop: boolean) => void;

  // 主题操作
  setTheme: (theme: 'light' | 'dark') => void;

  // 动画操作
  setTransitioning: (isTransitioning: boolean) => void;

  // 批量更新
  updateLayoutState: (updates: Partial<LayoutState>) => void;

  // 重置状态
  resetLayoutState: () => void;
}

type LayoutStore = LayoutState & LayoutActions;

// #endregion

// 布局常量 - 数据统一性
export const LAYOUT_CONSTANTS = {
  SIDEBAR_WIDTH: {
    COLLAPSED: 80,
    EXPANDED: 240,
    MOBILE: 280
  },
  HEADER_HEIGHT: 64,
  BREAKPOINTS: {
    XS: 480,
    SM: 576,
    MD: 768,
    LG: 992,
    XL: 1200
  },
  TRANSITION_DURATION: 300 // ms
} as const;

// 初始状态
const initialState: LayoutState = {
  sidebarWidth: LAYOUT_CONSTANTS.SIDEBAR_WIDTH.EXPANDED,
  headerHeight: LAYOUT_CONSTANTS.HEADER_HEIGHT,
  sidebarCollapsed: false,
  sidebarVisible: true,
  currentBreakpoint: 'lg',
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  theme: 'light',
  isTransitioning: false
};

// 创建Store
export const useLayoutStore = create<LayoutStore>()((set, get) => ({
  ...initialState,

  // 侧边栏操作
  toggleSidebar: () => {
    const { sidebarCollapsed, isMobile } = get();
    if (isMobile) {
      set({ sidebarVisible: !sidebarCollapsed });
    } else {
      set({
        sidebarCollapsed: !sidebarCollapsed,
        sidebarWidth: !sidebarCollapsed
          ? LAYOUT_CONSTANTS.SIDEBAR_WIDTH.COLLAPSED
          : LAYOUT_CONSTANTS.SIDEBAR_WIDTH.EXPANDED
      });
    }
  },

  setSidebarCollapsed: (collapsed) => {
    set({
      sidebarCollapsed: collapsed,
      sidebarWidth: collapsed
        ? LAYOUT_CONSTANTS.SIDEBAR_WIDTH.COLLAPSED
        : LAYOUT_CONSTANTS.SIDEBAR_WIDTH.EXPANDED
    });
  },

  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),

  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  // 断点操作
  setBreakpoint: (breakpoint) => set({ currentBreakpoint: breakpoint }),

  setIsMobile: (isMobile) => {
    const state = get();
    set({
      isMobile,
      isTablet: !isMobile && state.isTablet,
      isDesktop: !isMobile && !state.isTablet,
      sidebarWidth: isMobile
        ? LAYOUT_CONSTANTS.SIDEBAR_WIDTH.MOBILE
        : state.sidebarCollapsed
        ? LAYOUT_CONSTANTS.SIDEBAR_WIDTH.COLLAPSED
        : LAYOUT_CONSTANTS.SIDEBAR_WIDTH.EXPANDED,
      sidebarVisible: !isMobile // 桌面端默认显示
    });
  },

  setIsTablet: (isTablet) => {
    const state = get();
    set({
      isTablet,
      isMobile: !isTablet && state.isMobile,
      isDesktop: !isTablet && !state.isMobile
    });
  },

  setIsDesktop: (isDesktop) => {
    const state = get();
    set({
      isDesktop,
      isMobile: !isDesktop && state.isMobile,
      isTablet: !isDesktop && state.isTablet,
      sidebarWidth: !isDesktop
        ? state.sidebarWidth
        : state.sidebarCollapsed
        ? LAYOUT_CONSTANTS.SIDEBAR_WIDTH.COLLAPSED
        : LAYOUT_CONSTANTS.SIDEBAR_WIDTH.EXPANDED
    });
  },

  // 主题操作
  setTheme: (theme) => set({ theme }),

  // 动画操作
  setTransitioning: (isTransitioning) => set({ isTransitioning }),

  // 批量更新
  updateLayoutState: (updates) => set(updates),

  // 重置状态
  resetLayoutState: () => set(initialState)
}));

// 选择器函数 - 性能优化
export const useLayoutSelector = <T>(selector: (state: LayoutStore) => T): T =>
  useLayoutStore(selector);

export default useLayoutStore;
