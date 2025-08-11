# LocalFirst 架构设计

## 概述

LocalFirst架构是一个离线优先的数据管理系统，以wa-sqlite作为核心缓存层，提供完整的离线数据存储、同步和冲突解决机制。

## 架构原则

1. **离线优先** - 应用在离线状态下完全可用
2. **数据持久化** - 使用wa-sqlite(IDB VFS)确保数据持久化
3. **智能同步** - 网络恢复时自动同步数据
4. **冲突解决** - 提供多种冲突解决策略
5. **性能优化** - 内存缓存 + 磁盘存储的多层缓存策略

## 核心组件

### 1. 存储层 (Storage Layer)
- **SQLiteStorage** - wa-sqlite数据库存储
- **MemoryStorage** - 内存缓存存储
- **StorageAdapter** - 统一存储接口

### 2. 缓存管理层 (Cache Management)
- **CacheManager** - 缓存策略管理
- **CachePolicy** - 缓存策略定义
- **EvictionStrategy** - 缓存淘汰策略

### 3. 同步管理层 (Sync Management)
- **SyncManager** - 数据同步管理
- **ConflictResolver** - 冲突解决器
- **SyncQueue** - 同步队列管理

### 4. 网络管理层 (Network Management)
- **NetworkMonitor** - 网络状态监控
- **OfflineQueue** - 离线操作队列
- **RetryStrategy** - 重试策略

### 5. 数据访问层 (Data Access Layer)
- **Repository** - 数据仓库模式
- **QueryBuilder** - 查询构建器
- **Transaction** - 事务管理

## 数据流

```
API Request → Repository → CacheManager → StorageAdapter → wa-sqlite
     ↓              ↓            ↓             ↓
Network Monitor → SyncManager → ConflictResolver → Update UI
```

## 使用示例

```javascript
import { LocalFirstManager } from './LocalFirst';

// 初始化
const manager = new LocalFirstManager({
  dbName: 'app_cache',
  maxCacheSize: 100 * 1024 * 1024, // 100MB
  syncInterval: 30000 // 30秒
});

// 获取数据（自动缓存）
const data = await manager.get('api/users', {
  cacheFirst: true,
  maxAge: 300000 // 5分钟
});

// 更新数据（离线队列）
await manager.update('api/users/1', userData);
```

## 配置选项

- `dbName`: 数据库名称
- `maxCacheSize`: 最大缓存大小
- `syncInterval`: 同步间隔
- `conflictStrategy`: 冲突解决策略
- `retryPolicy`: 重试策略
- `cachePolicy`: 缓存策略