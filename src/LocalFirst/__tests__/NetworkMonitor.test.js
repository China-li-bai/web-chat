/**
 * NetworkMonitor 单元测试
 * 测试网络状态监控器的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NetworkMonitor } from '../network/NetworkMonitor.js';

// Mock fetch
global.fetch = vi.fn();

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: { onLine: true },
  writable: true
});

// Mock window events
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
});

describe('NetworkMonitor', () => {
  let networkMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    networkMonitor = new NetworkMonitor({
      checkInterval: 1000, // 1秒用于测试
      timeout: 500 // 0.5秒超时
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('应该正确初始化网络监控器', async () => {
      await networkMonitor.init();
      
      expect(networkMonitor.isInitialized).toBe(true);
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('应该根据navigator.onLine设置初始状态', () => {
      global.navigator.onLine = false;
      const monitor = new NetworkMonitor();
      
      expect(monitor.isOnline()).toBe(false);
    });
  });

  describe('网络状态检查', () => {
    beforeEach(async () => {
      await networkMonitor.init();
    });

    it('网络请求成功时应该返回在线状态', async () => {
      fetch.mockResolvedValue({ ok: true });
      
      const isOnline = await networkMonitor.checkNetworkStatus();
      
      expect(fetch).toHaveBeenCalledWith('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: expect.any(AbortSignal)
      });
      expect(isOnline).toBe(true);
      expect(networkMonitor.isOnline()).toBe(true);
    });

    it('网络请求失败时应该返回离线状态', async () => {
      fetch.mockRejectedValue(new Error('Network error'));
      
      const isOnline = await networkMonitor.checkNetworkStatus();
      
      expect(isOnline).toBe(false);
      expect(networkMonitor.isOnline()).toBe(false);
    });

    it('网络请求超时时应该返回离线状态', async () => {
      // 模拟超时
      fetch.mockImplementation(() => new Promise(() => {})); // 永不resolve
      
      const checkPromise = networkMonitor.checkNetworkStatus();
      
      // 快进时间触发超时
      vi.advanceTimersByTime(600);
      
      const isOnline = await checkPromise;
      expect(isOnline).toBe(false);
    });
  });

  describe('事件监听', () => {
    beforeEach(async () => {
      await networkMonitor.init();
    });

    it('应该能够添加和触发事件监听器', async () => {
      const onlineCallback = vi.fn();
      const offlineCallback = vi.fn();
      
      networkMonitor.on('online', onlineCallback);
      networkMonitor.on('offline', offlineCallback);
      
      // 模拟状态变化：离线 -> 在线
      networkMonitor.isOnlineState = false;
      networkMonitor._updateOnlineStatus(true);
      
      expect(onlineCallback).toHaveBeenCalled();
      expect(offlineCallback).not.toHaveBeenCalled();
      
      // 模拟状态变化：在线 -> 离线
      vi.clearAllMocks();
      networkMonitor._updateOnlineStatus(false);
      
      expect(offlineCallback).toHaveBeenCalled();
      expect(onlineCallback).not.toHaveBeenCalled();
    });

    it('状态未变化时不应该触发事件', async () => {
      const onlineCallback = vi.fn();
      
      networkMonitor.on('online', onlineCallback);
      networkMonitor.isOnlineState = true;
      
      // 重复设置相同状态
      networkMonitor._updateOnlineStatus(true);
      
      expect(onlineCallback).not.toHaveBeenCalled();
    });

    it('应该能够移除事件监听器', async () => {
      const callback = vi.fn();
      
      networkMonitor.on('online', callback);
      networkMonitor.off('online', callback);
      
      networkMonitor.isOnlineState = false;
      networkMonitor._updateOnlineStatus(true);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('事件回调出错时不应该影响其他回调', async () => {
      const errorCallback = vi.fn(() => { throw new Error('Callback error'); });
      const normalCallback = vi.fn();
      
      networkMonitor.on('online', errorCallback);
      networkMonitor.on('online', normalCallback);
      
      networkMonitor.isOnlineState = false;
      networkMonitor._updateOnlineStatus(true);
      
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('浏览器事件处理', () => {
    beforeEach(async () => {
      await networkMonitor.init();
    });

    it('应该处理浏览器online事件', async () => {
      const onlineCallback = vi.fn();
      networkMonitor.on('online', onlineCallback);
      
      // 模拟浏览器online事件
      const browserOnlineHandler = mockWindow.addEventListener.mock.calls
        .find(call => call[0] === 'online')[1];
      
      networkMonitor.isOnlineState = false;
      browserOnlineHandler();
      
      expect(networkMonitor.isOnline()).toBe(true);
      expect(onlineCallback).toHaveBeenCalled();
    });

    it('应该处理浏览器offline事件', async () => {
      const offlineCallback = vi.fn();
      networkMonitor.on('offline', offlineCallback);
      
      // 模拟浏览器offline事件
      const browserOfflineHandler = mockWindow.addEventListener.mock.calls
        .find(call => call[0] === 'offline')[1];
      
      networkMonitor.isOnlineState = true;
      browserOfflineHandler();
      
      expect(networkMonitor.isOnline()).toBe(false);
      expect(offlineCallback).toHaveBeenCalled();
    });
  });

  describe('定期检查', () => {
    beforeEach(async () => {
      await networkMonitor.init();
    });

    it('应该定期检查网络状态', async () => {
      fetch.mockResolvedValue({ ok: true });
      
      // 快进时间触发定期检查
      vi.advanceTimersByTime(1000);
      
      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('统计信息', () => {
    beforeEach(async () => {
      await networkMonitor.init();
    });

    it('应该返回正确的统计信息', async () => {
      const onlineCallback = vi.fn();
      const offlineCallback = vi.fn();
      
      networkMonitor.on('online', onlineCallback);
      networkMonitor.on('offline', offlineCallback);
      
      const stats = await networkMonitor.getStats();
      
      expect(stats).toEqual({
        isOnline: true,
        lastCheck: expect.any(Number),
        listeners: {
          online: 1,
          offline: 1
        }
      });
    });
  });

  describe('销毁', () => {
    it('应该正确销毁网络监控器', async () => {
      await networkMonitor.init();
      
      networkMonitor.on('online', vi.fn());
      networkMonitor.on('offline', vi.fn());
      
      await networkMonitor.destroy();
      
      expect(networkMonitor.isInitialized).toBe(false);
      expect(networkMonitor.listeners.size).toBe(0);
      expect(networkMonitor.checkTimer).toBeNull();
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });
});