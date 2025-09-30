import type { DatabaseAdapter } from './wa-sqlite-adapter/databaseAdapter';

export { BasicDatabase } from './wa-sqlite-adapter/database';

/**
 * 便捷函数：创建SQLite数据库适配器
 */
export async function createSqliteDatabaseAdapter(
  dbName: string
): Promise<DatabaseAdapter> {
  const { BasicDatabase } = await import('./wa-sqlite-adapter/database');
  const { DatabaseAdapter: AdapterClass } = await import('./wa-sqlite-adapter/adapter');
  
  // 创建基础数据库实例
  const db = await BasicDatabase.init(dbName);
  
  // 创建数据库适配器
  const adapter = new AdapterClass(db);
  
  return adapter;
}