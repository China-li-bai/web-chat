/**
 * StorageManager 单元测试
 * 测试存储管理器的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from '../storage/StorageManager.js';

// Mock makeSqlite
vi.mock('../../packages/index.ts', () => ({
  makeSqlite: vi.fn()
}));

import { makeSqlite } from '../../packages/index.ts';

describe('StorageManager', () => {
  let storageManager;
  let mockSqliteAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock SQLite adapter
    mockSqliteAdapter = {
      run: vi.fn(),
      query: vi.fn()
    };
    
    makeSqlite.mockResolvedValue(mockSqliteAdapter);
    
    storageManager = new StorageManager({
      dbName: 'test_storage',
      maxSize: 1024 * 1024, // 1MB
      enableMemoryFallback: true
    });
  });

  describe('初始化', () => {
    it('应该成功初始化SQLite存储', async () => {
      mockSqliteAdapter.run.mockResolvedValue({ rowsAffected: 0 });
      
      await storageManager.init();
      
      expect(makeSqlite).toHaveBeenCalledWith('test_storage');
      expect(mockSqliteAdapter.run).toHaveBeenCalledWith({
        sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS kv_storage')
      });
      expect(storageManager.isInitialized).toBe(true);
      expect(storageManager.usingMemory).toBe(false);
    });

    it('SQLite初始化失败时应该回退到内存存储', async () => {
      makeSqlite.mockRejectedValue(new Error('SQLite init failed'));
      
      await storageManager.init();
      
      expect(storageManager.isInitialized).toBe(true);
      expect(storageManager.usingMemory).toBe(true);
    });

    it('禁用内存回退时SQLite失败应该抛出错误', async () => {
      storageManager = new StorageManager({
        dbName: 'test_storage',
        enableMemoryFallback: false
      });
      
      makeSqlite.mockRejectedValue(new Error('SQLite init failed'));
      
      await expect(storageManager.init()).rejects.toThrow('SQLite init failed');
    });
  });

  describe('数据操作 - SQLite模式', () => {
    beforeEach(async () => {
      mockSqliteAdapter.run.mockResolvedValue({ rowsAffected: 1 });
      await storageManager.init();
    });

    it('应该能够存储和获取数据', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      const metadata = { type: 'test' };

      // 模拟存储操作
      await storageManager.set(key, value, { metadata, ttl: 60000 });
      
      expect(mockSqliteAdapter.run).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT OR REPLACE INTO kv_storage'),
        args: expect.arrayContaining([
          key,
          JSON.stringify(value),
          JSON.stringify(metadata),
          expect.any(Number), // created_at
          expect.any(Number), // updated_at
          expect.any(Number), // expires_at
          expect.any(Number)  // size
        ])
      });

      // 模拟获取操作
      mockSqliteAdapter.query.mockResolvedValue([{
        value: JSON.stringify(value),
        metadata: JSON.stringify(metadata),
        expires_at: Date.now() + 60000
      }]);

      const result = await storageManager.get(key);
      
      expect(mockSqliteAdapter.query).toHaveBeenCalledWith({
        sql: expect.stringContaining('SELECT value, metadata, expires_at FROM kv_storage WHERE key = ?'),
        args: [key, expect.any(Number)]
      });
      
      expect(result).toEqual({
        value,
        metadata
      });
    });

    it('获取不存在的数据应该返回null', async () => {
      mockSqliteAdapter.query.mockResolvedValue([]);
      
      const result = await storageManager.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('应该能够删除数据', async () => {
      const key = 'delete-test';
      
      mockSqliteAdapter.run.mockResolvedValue({ rowsAffected: 1 });
      
      const result = await storageManager.delete(key);
      
      expect(mockSqliteAdapter.run).toHaveBeenCalledWith({
        sql: 'DELETE FROM kv_storage WHERE key = ?',
        args: [key]
      });
      expect(result).toBe(true);
    });

    it('应该能够获取所有键', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockSqliteAdapter.query.mockResolvedValue(
        keys.map(key => ({ key }))
      );
      
      const result = await storageManager.keys();
      
      expect(mockSqliteAdapter.query).toHaveBeenCalledWith({
        sql: expect.stringContaining('SELECT key FROM kv_storage'),
        args: [expect.any(Number)]
      });
      expect(result).toEqual(keys);
    });

    it('应该支持模式匹配查询键', async () => {
      mockSqliteAdapter.query.mockResolvedValue([
        { key: 'user:1' },
        { key: 'user:2' }
      ]);
      
      const result = await storageManager.keys('user:*');
      
      expect(mockSqliteAdapter.query).toHaveBeenCalledWith({
        sql: expect.stringContaining('AND key LIKE ?'),
        args: [expect.any(Number), 'user:%']
      });
      expect(result).toEqual(['user:1', 'user:2']);
    });

    it('应该能够清空所有数据', async () => {
      mockSqliteAdapter.run.mockResolvedValue({ rowsAffected: 5 });
      
      const result = await storageManager.clear();
      
      expect(mockSqliteAdapter.run).toHaveBeenCalledWith({
        sql: 'DELETE FROM kv_storage'
      });
      expect(result).toBe(true);
    });

    it('应该返回正确的统计信息', async () => {
      mockSqliteAdapter.query.mockResolvedValue([{
        count: 10,
        total_size: 1024
      }]);
      
      const stats = await storageManager.getStats();
      
      expect(stats).toEqual({
        count: 10,
        totalSize: 1024,
        usingMemory: false
      });
    });
  });

  describe('数据操作 - 内存模式', () => {
    beforeEach(async () => {
      makeSqlite.mockRejectedValue(new Error('SQLite not available'));
      await storageManager.init();
    });

    it('应该能够在内存模式下存储和获取数据', async () => {
      const key = 'memory-test';
      const value = { data: 'memory-data' };
      
      await storageManager.set(key, value);
      const result = await storageManager.get(key);
      
      expect(result.value).toEqual(value);
    });

    it('内存模式下应该正确处理过期数据', async () => {
      const key = 'expire-test';
      const value = { data: 'expire-data' };
      
      // 设置1毫秒TTL
      await storageManager.set(key, value, { ttl: 1 });
      
      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await storageManager.get(key);
      expect(result).toBeNull();
    });

    it('内存模式下应该返回正确的统计信息', async () => {
      await storageManager.set('test1', { data: '1' });
      await storageManager.set('test2', { data: '2' });
      
      const stats = await storageManager.getStats();
      
      expect(stats.count).toBe(2);
      expect(stats.usingMemory).toBe(true);
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      mockSqliteAdapter.run.mockResolvedValue({ rowsAffected: 1 });
      await storageManager.init();
    });

    it('SQLite操作失败时应该回退到内存操作', async () => {
      const key = 'fallback-test';
      const value = { data: 'fallback-data' };
      
      // 模拟SQLite写入失败
      mockSqliteAdapter.run.mockRejectedValue(new Error('SQLite write failed'));
      
      const result = await storageManager.set(key, value);
      expect(result).toBe(true); // 内存操作成功
      
      // 模拟SQLite读取失败
      mockSqliteAdapter.query.mockRejectedValue(new Error('SQLite read failed'));
      
      const getData = await storageManager.get(key);
      expect(getData.value).toEqual(value); // 从内存获取成功
    });
  });

  describe('销毁', () => {
    it('应该正确销毁存储管理器', async () => {
      await storageManager.init();
      await storageManager.set('destroy-test', { data: 'test' });
      
      await storageManager.destroy();
      
      expect(storageManager.isInitialized).toBe(false);
      expect(storageManager.memoryCache.size).toBe(0);
    });
  });
});