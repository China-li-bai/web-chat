import type { DatabaseAdapter } from './wa-sqlite-adapter/databaseAdapter';
export type VFSType = 'auto' | 'IDBBatchAtomicVFS' | 'IDBMinimalVFS';

import { BasicDatabase } from './wa-sqlite-adapter/database';

/**
 * 便捷函数：创建SQLite数据库适配器
 */
export async function createSqliteDatabaseAdapter(
  dbName: string
): Promise<DatabaseAdapter> {
  const { DatabaseAdapter: AdapterClass } = await import('./wa-sqlite-adapter/adapter');
  
  // 创建基础数据库实例
  const db = await BasicDatabase.init(dbName);
  
  // 创建数据库适配器
  const adapter = new AdapterClass(db);
  
  return adapter;
}

/**
 * 创建带有指定 VFS 类型的 SQLite 数据库适配器
 */
export async function createSqliteDatabaseAdapterWithVFS(
  dbName: string,
  vfsType: VFSType
): Promise<DatabaseAdapter> {
  const { BasicDatabase } = await import('./wa-sqlite-adapter/database');
  const { DatabaseAdapter: AdapterClass } = await import('./wa-sqlite-adapter/adapter');
  
  let db;
  
  if (vfsType === 'auto') {
    // 使用默认的自动选择逻辑
    db = await BasicDatabase.init(dbName);
  } else {
    // 使用指定的 VFS 类型
    const { IDBBatchAtomicVFS } = await import('wa-sqlite/src/examples/IDBBatchAtomicVFS.js');
    const { IDBMinimalVFS } = await import('wa-sqlite/src/examples/IDBMinimalVFS.js');
    
    let vfs;
    if (vfsType === 'IDBBatchAtomicVFS') {
      vfs = await new IDBBatchAtomicVFS(dbName);
    } else if (vfsType === 'IDBMinimalVFS') {
      vfs = await new IDBMinimalVFS(dbName);
    } else {
      throw new Error(`不支持的 VFS 类型: ${vfsType}`);
    }
    
    db = await BasicDatabase.initWithCustomVFS(dbName, vfs);
  }
  
  // 创建数据库适配器
  const adapter = new AdapterClass(db);
  
  return adapter;
}