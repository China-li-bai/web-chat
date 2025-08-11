/**
 * LocalFirst 主入口文件
 * 导出所有核心组件和管理器
 */

// 核心管理器
export { LocalFirstManager } from './core/LocalFirstManager.js';

// 存储层
export { StorageManager } from './storage/StorageManager.js';

// 缓存层
export { CacheManager } from './cache/CacheManager.js';

// 同步层
export { SyncManager } from './sync/SyncManager.js';

// 网络层
export { NetworkMonitor } from './network/NetworkMonitor.js';

// 数据访问层
export { Repository } from './data/Repository.js';

// 默认导出主管理器
export { LocalFirstManager as default } from './core/LocalFirstManager.js';