/**
 * CacheManager 单元测试
 * 测试缓存管理器的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from '../cache/CacheManager.js';

// Mock StorageManager
const mockStorage = {
  init: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  getStats: vi.fn(() => Promise.resolve({ count: 0, totalSize: 0 }))
};

describe('CacheManager', () => {
  let cacheManager;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheManager = new CacheManager({
      storage: mockStorage,
      policy: 'cache-first',
      maxSize: 1024 * 1024, // 1MB
      defaultTTL: 60000, // 1分钟
      memoryCache: true
    });
  });

  describe('初始化', () => {
    it('应该正确初始化缓存管理器', async () => {
      await cacheManager.init();
      expect(cacheManager.isInitialized).toBe(true);
    });

    it('没有storage时应该抛出错误', async () => {
      const invalidManager = new CacheManager({});
      await expect(invalidManager.init()).rejects.toThrow('Storage is required for CacheManager');
    });
  });

  describe('缓存操作', () => {
    beforeEach(async () => {
      await cacheManager.init();
    });

    it('应该能够设置和获取缓存数据', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      
      mockStorage.set.mockResolvedValue(true);
      mockStorage.get.mockResolvedValue({ value, metadata: { cachedAt: Date.now() } });

      // 设置缓存
      await cacheManager.set(key, value);
      expect(mockStorage.set).toHaveBeenCalledWith(
        key, 
        value, 
        expect.objectContaining({
          ttl: 60000,
          metadata: expect.objectContaining({
            cachedAt: expect.any(Number),
            ttl: 60000
          })
        })
      );

      // 获取缓存
      const result = await cacheManager.get(key);
      expect(result).toEqual({
        value,
        metadata: expect.objectContaining({
          cachedAt: expect.any(Number)
        }),
        source: 'memory'
      });
    });

    it('应该优先从内存缓存获取数据', async () => {
      const key = 'memory-test';
      const value = { data: 'memory-data' };

      // 先设置缓存
      await cacheManager.set(key, value);
      
      // 清除storage mock调用记录
      mockStorage.get.mockClear();
      
      // 再次获取应该从内存获取，不调用storage
      const result = await cacheManager.get(key);
      expect(result.source).toBe('memory');
      expect(mockStorage.get).not.toHaveBeenCalled();
    });

    it('内存缓存过期后应该从storage获取', async () => {
      const key = 'expire-test';
      const value = { data: 'expire-data' };
      
      // 设置一个很短的TTL
      await cacheManager.set(key, value, { ttl: 1 });
      
      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 10));
      
      mockStorage.get.mockResolvedValue({ 
        value, 
        metadata: { cachedAt: Date.now() } 
      });
      
      const result = await cacheManager.get(key);
      expect(result.source).toBe('storage');
      expect(mockStorage.get).toHaveBeenCalledWith(key);
    });

    it('应该能够删除缓存', async () => {
      const key = 'delete-test';
      const value = { data: 'delete-data' };

      // 先设置缓存
      mockStorage.set.mockResolvedValue(true);
      await cacheManager.set(key, value);
      
      // 设置删除后的mock行为
      mockStorage.delete.mockResolvedValue(true);
      mockStorage.get.mockResolvedValue(null); // 确保storage也返回null
      
      // 删除缓存
      await cacheManager.delete(key);
      expect(mockStorage.delete).toHaveBeenCalledWith(key);
      
      // 内存缓存和storage都应该返回null
      const result = await cacheManager.get(key);
      expect(result).toBeNull();
    });

    it('应该能够清空所有缓存', async () => {
      const key1 = 'clear-test-1';
      const key2 = 'clear-test-2';
      
      await cacheManager.set(key1, { data: '1' });
      await cacheManager.set(key2, { data: '2' });
      
      mockStorage.clear.mockResolvedValue(true);
      
      await cacheManager.clear();
      expect(mockStorage.clear).toHaveBeenCalled();
      expect(cacheManager.memoryCache.size).toBe(0);
    });
  });

  describe('缓存策略', () => {
    beforeEach(async () => {
      await cacheManager.init();
    });

    it('cache-first策略应该优先使用缓存', async () => {
      const key = 'strategy-test';
      const value = { data: 'strategy-data' };
      
      await cacheManager.set(key, value);
      
      const result = await cacheManager.get(key, { policy: 'cache-first' });
      expect(result.source).toBe('memory');
    });

    it('cache-only策略应该只使用缓存', async () => {
      const key = 'cache-only-test';
      
      mockStorage.get.mockResolvedValue(null);
      
      const result = await cacheManager.get(key, { policy: 'cache-only' });
      expect(result).toBeNull();
    });
  });

  describe('统计信息', () => {
    beforeEach(async () => {
      await cacheManager.init();
    });

    it('应该返回正确的统计信息', async () => {
      const key = 'stats-test';
      const value = { data: 'stats-data' };
      
      await cacheManager.set(key, value);
      
      const stats = await cacheManager.getStats();
      expect(stats).toEqual({
        memory: {
          count: 1,
          size: expect.any(Number)
        },
        storage: {
          count: 0,
          totalSize: 0
        }
      });
    });

    it('未初始化时应该返回空统计信息', async () => {
      const uninitializedManager = new CacheManager({ storage: mockStorage });
      const stats = await uninitializedManager.getStats();
      
      expect(stats).toEqual({
        memory: { count: 0, size: 0 },
        storage: { count: 0, totalSize: 0 }
      });
    });
  });

  describe('销毁', () => {
    it('应该正确销毁缓存管理器', async () => {
      await cacheManager.init();
      await cacheManager.set('destroy-test', { data: 'test' });
      
      await cacheManager.destroy();
      
      expect(cacheManager.isInitialized).toBe(false);
      expect(cacheManager.memoryCache.size).toBe(0);
    });
  });
});