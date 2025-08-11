/**
 * Repository 单元测试
 * 测试数据仓库的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Repository } from '../data/Repository.js';

// Mock dependencies
const mockCacheManager = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  getStats: vi.fn(() => Promise.resolve({ memory: { count: 0 }, storage: { count: 0 } })),
  storage: {
    keys: vi.fn(() => Promise.resolve([]))
  }
};

const mockSyncManager = {
  queueOperation: vi.fn(),
  getStats: vi.fn(() => Promise.resolve({ totalOperations: 0 }))
};

const mockNetworkMonitor = {
  isOnline: vi.fn(),
  getStats: vi.fn(() => Promise.resolve({ isOnline: true }))
};

describe('Repository', () => {
  let repository;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 确保默认返回值
    mockCacheManager.set.mockResolvedValue(true);
    mockCacheManager.delete.mockResolvedValue(true);
    mockSyncManager.queueOperation.mockResolvedValue('op-id');
    mockNetworkMonitor.isOnline.mockReturnValue(true);
    
    repository = new Repository({
      cacheManager: mockCacheManager,
      syncManager: mockSyncManager,
      networkMonitor: mockNetworkMonitor,
      defaultCachePolicy: 'cache-first',
      defaultTTL: 60000
    });
  });

  describe('初始化', () => {
    it('应该正确初始化数据仓库', async () => {
      await repository.init();
      expect(repository.isInitialized).toBe(true);
    });

    it('缺少依赖时应该抛出错误', async () => {
      const invalidRepo = new Repository({});
      await expect(invalidRepo.init()).rejects.toThrow('CacheManager is required for Repository');
    });
  });

  describe('数据获取', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('cache-first策略应该优先从缓存获取', async () => {
      const key = 'test-key';
      const cachedData = { value: 'cached-data', metadata: { source: 'cache' } };
      
      mockCacheManager.get.mockResolvedValue(cachedData);
      
      const result = await repository.get(key, { policy: 'cache-first' });
      
      expect(mockCacheManager.get).toHaveBeenCalledWith(key, { policy: 'cache-first' });
      expect(result).toEqual(cachedData);
    });

    it('cache-first策略缓存未命中时应该尝试网络获取', async () => {
      const key = 'network-fallback-key';
      const networkData = { data: 'network-data' };
      
      mockCacheManager.get.mockResolvedValue(null);
      mockNetworkMonitor.isOnline.mockReturnValue(true);
      
      const networkFetcher = vi.fn().mockResolvedValue(networkData);
      
      const result = await repository.get(key, { 
        policy: 'cache-first',
        networkFetcher
      });
      
      expect(networkFetcher).toHaveBeenCalledWith(key);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        key, 
        networkData, 
        expect.objectContaining({
          ttl: 60000,
          metadata: expect.objectContaining({ source: 'network' })
        })
      );
      expect(result.source).toBe('network');
    });

    it('network-first策略应该优先从网络获取', async () => {
      const key = 'network-first-key';
      const networkData = { data: 'network-data' };
      
      mockNetworkMonitor.isOnline.mockReturnValue(true);
      const networkFetcher = vi.fn().mockResolvedValue(networkData);
      
      const result = await repository.get(key, { 
        policy: 'network-first',
        networkFetcher
      });
      
      expect(networkFetcher).toHaveBeenCalledWith(key);
      expect(result.source).toBe('network');
    });

    it('cache-only策略应该只从缓存获取', async () => {
      const key = 'cache-only-key';
      const cachedData = { value: 'cached-data' };
      
      mockCacheManager.get.mockResolvedValue(cachedData);
      
      const result = await repository.get(key, { policy: 'cache-only' });
      
      expect(mockCacheManager.get).toHaveBeenCalledWith(key, { policy: 'cache-only' });
      expect(result).toEqual(cachedData);
    });

    it('network-only策略离线时应该抛出错误', async () => {
      const key = 'network-only-key';
      
      mockNetworkMonitor.isOnline.mockReturnValue(false);
      
      await expect(repository.get(key, { policy: 'network-only' }))
        .rejects.toThrow('Network is offline and network-only policy is specified');
    });
  });

  describe('数据设置', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('应该能够设置数据到缓存', async () => {
      const key = 'set-key';
      const data = { value: 'set-data' };
      
      const result = await repository.set(key, data);
      
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        key, 
        data, 
        expect.objectContaining({
          ttl: 60000,
          metadata: expect.objectContaining({
            source: 'local',
            updatedAt: expect.any(Number)
          })
        })
      );
      
      expect(mockSyncManager.queueOperation).toHaveBeenCalledWith({
        type: 'create',
        key,
        data,
        metadata: expect.objectContaining({ source: 'local' })
      });
      
      expect(result).toEqual({ success: true, source: 'local' });
    });

    it('离线时不应该添加到同步队列', async () => {
      const key = 'offline-set-key';
      const data = { value: 'offline-data' };
      
      mockNetworkMonitor.isOnline.mockReturnValue(false);
      
      await repository.set(key, data);
      
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(mockSyncManager.queueOperation).not.toHaveBeenCalled();
    });

    it('sync=false时不应该添加到同步队列', async () => {
      const key = 'no-sync-key';
      const data = { value: 'no-sync-data' };
      
      await repository.set(key, data, { sync: false });
      
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(mockSyncManager.queueOperation).not.toHaveBeenCalled();
    });
  });

  describe('数据更新', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('应该能够更新数据', async () => {
      const key = 'update-key';
      const data = { value: 'updated-data' };
      
      const result = await repository.update(key, data);
      
      expect(mockSyncManager.queueOperation).toHaveBeenCalledWith({
        type: 'update',
        key,
        data,
        metadata: expect.objectContaining({ source: 'local' })
      });
      
      expect(result).toEqual({ success: true, source: 'local' });
    });
  });

  describe('数据删除', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('应该能够删除数据', async () => {
      const key = 'delete-key';
      
      const result = await repository.delete(key);
      
      expect(mockCacheManager.delete).toHaveBeenCalledWith(key);
      expect(mockSyncManager.queueOperation).toHaveBeenCalledWith({
        type: 'delete',
        key
      });
      
      expect(result).toEqual({ success: true, source: 'local' });
    });
  });

  describe('数据查询', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('应该能够查询匹配的数据', async () => {
      const pattern = 'user:*';
      const keys = ['user:1', 'user:2'];
      const userData1 = { value: { name: 'User 1' }, metadata: { id: 1 } };
      const userData2 = { value: { name: 'User 2' }, metadata: { id: 2 } };
      
      mockCacheManager.storage.keys.mockResolvedValue(keys);
      mockCacheManager.get
        .mockResolvedValueOnce(userData1)
        .mockResolvedValueOnce(userData2);
      
      const results = await repository.query(pattern);
      
      expect(mockCacheManager.storage.keys).toHaveBeenCalledWith(pattern);
      expect(results).toEqual([
        { key: 'user:1', value: userData1.value, metadata: userData1.metadata },
        { key: 'user:2', value: userData2.value, metadata: userData2.metadata }
      ]);
    });

    it('查询结果为空时应该返回空数组', async () => {
      mockCacheManager.storage.keys.mockResolvedValue([]);
      
      const results = await repository.query('nonexistent:*');
      
      expect(results).toEqual([]);
    });
  });

  describe('统计信息', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('应该返回完整的统计信息', async () => {
      const stats = await repository.getStats();
      
      expect(stats).toEqual({
        initialized: true,
        cache: { memory: { count: 0 }, storage: { count: 0 } },
        sync: { totalOperations: 0 },
        network: { isOnline: true }
      });
    });

    it('未初始化时应该返回简单状态', async () => {
      const uninitializedRepo = new Repository({
        cacheManager: mockCacheManager,
        syncManager: mockSyncManager,
        networkMonitor: mockNetworkMonitor
      });
      
      const stats = await uninitializedRepo.getStats();
      
      expect(stats).toEqual({ initialized: false });
    });
  });

  describe('销毁', () => {
    it('应该正确销毁数据仓库', async () => {
      await repository.init();
      await repository.destroy();
      
      expect(repository.isInitialized).toBe(false);
    });
  });
});