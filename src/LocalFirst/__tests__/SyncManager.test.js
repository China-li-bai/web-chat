/**
 * SyncManager 单元测试
 * 测试同步管理器的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncManager } from '../sync/SyncManager.js';

// Mock StorageManager
const mockStorage = {
  init: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  getStats: vi.fn(() => Promise.resolve({ count: 0, totalSize: 0 }))
};

// Mock NetworkMonitor
const mockNetworkMonitor = {
  isOnline: vi.fn(() => true),
  on: vi.fn(),
  off: vi.fn(),
  getStats: vi.fn(() => Promise.resolve({ isOnline: true }))
};

describe('SyncManager', () => {
  let syncManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    syncManager = new SyncManager({
      storage: mockStorage,
      networkMonitor: mockNetworkMonitor,
      syncInterval: 1000, // 1秒用于测试
      conflictStrategy: 'client-wins',
      maxRetries: 2
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('应该正确初始化同步管理器', async () => {
      await syncManager.init();
      
      expect(syncManager.isInitialized).toBe(true);
      expect(mockNetworkMonitor.on).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockNetworkMonitor.on).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('没有storage时应该抛出错误', async () => {
      const invalidManager = new SyncManager({ networkMonitor: mockNetworkMonitor });
      await expect(invalidManager.init()).rejects.toThrow('Storage is required for SyncManager');
    });

    it('没有networkMonitor时应该抛出错误', async () => {
      const invalidManager = new SyncManager({ storage: mockStorage });
      await expect(invalidManager.init()).rejects.toThrow('NetworkMonitor is required for SyncManager');
    });
  });

  describe('同步队列操作', () => {
    beforeEach(async () => {
      await syncManager.init();
    });

    it('应该能够添加操作到同步队列', async () => {
      const operation = {
        type: 'create',
        key: 'test-key',
        data: { value: 'test-data' }
      };

      const operationId = await syncManager.queueOperation(operation);
      
      expect(operationId).toMatch(/^sync_\d+_[a-z0-9]+$/);
      expect(syncManager.syncQueue.has(operationId)).toBe(true);
      
      const queuedOperation = syncManager.syncQueue.get(operationId);
      expect(queuedOperation).toMatchObject({
        id: operationId,
        type: 'create',
        key: 'test-key',
        data: { value: 'test-data' },
        status: 'pending',
        retries: 0
      });
    });

    it('在线时应该立即尝试同步新操作', async () => {
      mockNetworkMonitor.isOnline.mockReturnValue(true);
      
      const operation = {
        type: 'update',
        key: 'immediate-sync',
        data: { value: 'immediate-data' }
      };

      const operationId = await syncManager.queueOperation(operation);
      
      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const queuedOperation = syncManager.syncQueue.get(operationId);
      expect(queuedOperation.status).toBe('completed');
    });

    it('离线时应该将操作保存在队列中', async () => {
      mockNetworkMonitor.isOnline.mockReturnValue(false);
      
      const operation = {
        type: 'delete',
        key: 'offline-operation'
      };

      const operationId = await syncManager.queueOperation(operation);
      
      const queuedOperation = syncManager.syncQueue.get(operationId);
      expect(queuedOperation.status).toBe('pending');
    });
  });

  describe('同步执行', () => {
    beforeEach(async () => {
      await syncManager.init();
    });

    it('应该能够立即执行同步', async () => {
      mockNetworkMonitor.isOnline.mockReturnValue(true);
      
      // 添加一些待同步的操作
      await syncManager.queueOperation({ type: 'create', key: 'sync1' });
      await syncManager.queueOperation({ type: 'update', key: 'sync2' });
      
      await syncManager.syncNow();
      
      // 检查所有操作都已完成
      const operations = Array.from(syncManager.syncQueue.values());
      operations.forEach(op => {
        expect(op.status).toBe('completed');
      });
    });

    it('离线时不应该执行同步', async () => {
      mockNetworkMonitor.isOnline.mockReturnValue(false);
      
      await syncManager.queueOperation({ type: 'create', key: 'offline-test' });
      await syncManager.syncNow();
      
      const operations = Array.from(syncManager.syncQueue.values());
      expect(operations[0].status).toBe('pending');
    });

    it('同步进行中时不应该重复执行', async () => {
      mockNetworkMonitor.isOnline.mockReturnValue(true);
      syncManager.isSyncing = true;
      
      await syncManager.queueOperation({ type: 'create', key: 'concurrent-test' });
      await syncManager.syncNow();
      
      const operations = Array.from(syncManager.syncQueue.values());
      expect(operations[0].status).toBe('pending');
    });
  });

  describe('网络状态处理', () => {
    beforeEach(async () => {
      await syncManager.init();
    });

    it('网络上线时应该触发同步', async () => {
      // 模拟网络上线事件
      const onlineCallback = mockNetworkMonitor.on.mock.calls
        .find(call => call[0] === 'online')[1];
      
      await syncManager.queueOperation({ type: 'create', key: 'online-sync' });
      
      mockNetworkMonitor.isOnline.mockReturnValue(true);
      await onlineCallback();
      
      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const operations = Array.from(syncManager.syncQueue.values());
      expect(operations[0].status).toBe('completed');
    });
  });

  describe('统计信息', () => {
    beforeEach(async () => {
      await syncManager.init();
    });

    it('应该返回正确的统计信息', async () => {
      await syncManager.queueOperation({ type: 'create', key: 'stats1' });
      await syncManager.queueOperation({ type: 'update', key: 'stats2' });
      
      const stats = await syncManager.getStats();
      
      expect(stats).toEqual({
        totalOperations: 2,
        pendingOperations: 2,
        failedOperations: 0,
        isSyncing: false,
        isOnline: true
      });
    });
  });

  describe('清理操作', () => {
    beforeEach(async () => {
      await syncManager.init();
    });

    it('应该能够清空同步队列', async () => {
      await syncManager.queueOperation({ type: 'create', key: 'clear1' });
      await syncManager.queueOperation({ type: 'update', key: 'clear2' });
      
      expect(syncManager.syncQueue.size).toBe(2);
      
      await syncManager.clearQueue();
      
      expect(syncManager.syncQueue.size).toBe(0);
    });

    it('应该正确销毁同步管理器', async () => {
      await syncManager.queueOperation({ type: 'create', key: 'destroy-test' });
      
      await syncManager.destroy();
      
      expect(syncManager.isInitialized).toBe(false);
      expect(syncManager.syncQueue.size).toBe(0);
      expect(syncManager.syncTimer).toBeNull();
      expect(mockNetworkMonitor.off).toHaveBeenCalled();
    });
  });

  describe('定期同步', () => {
    beforeEach(async () => {
      await syncManager.init();
    });

    it('应该定期执行同步', async () => {
      mockNetworkMonitor.isOnline.mockReturnValue(true);
      
      await syncManager.queueOperation({ type: 'create', key: 'periodic-sync' });
      
      // 快进时间触发定期同步
      vi.advanceTimersByTime(1000);
      
      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const operations = Array.from(syncManager.syncQueue.values());
      expect(operations[0].status).toBe('completed');
    });
  });
});