/**
 * 基础DAO类
 * 提供通用的数据库操作方法，确保类型安全和数据一致性
 */

import { DatabaseConnection } from '../connection';
import type { 
  BaseRecord, 
  DatabaseResult, 
  QueryOptions, 
  PaginatedResult 
} from '../types';

export abstract class BaseDAO<T extends BaseRecord> {
  protected db: DatabaseConnection;
  protected tableName: string;

  constructor(tableName: string) {
    this.db = DatabaseConnection.getInstance();
    this.tableName = tableName;
  }

  /**
   * 生成唯一ID
   */
  protected generateId(): string {
    return `${this.tableName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建记录
   */
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseResult<T>> {
    try {
      const id = this.generateId();
      const now = new Date().toISOString();
      
      const record = {
        id,
        created_at: now,
        updated_at: now,
        ...data
      } as unknown as T;

      const { columns, placeholders, values } = this.buildInsertQuery(record);
      
      const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
      const result = await this.db.execute(sql, values);

      if (result.changes > 0) {
        // 记录同步状态
        await this.recordSyncStatus(id, 'insert', record);
        
        return {
          success: true,
          data: record,
          rowsAffected: result.changes
        };
      } else {
        return {
          success: false,
          error: '创建记录失败'
        };
      }
    } catch (error) {
      console.error(`创建${this.tableName}记录失败:`, error);
      return {
        success: false,
        error: `创建记录失败: ${error}`
      };
    }
  }

  /**
   * 根据ID查找记录
   */
  async findById(id: string): Promise<DatabaseResult<T>> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const results = await this.db.query<T>(sql, [id]);
      
      if (results.length > 0) {
        return {
          success: true,
          data: this.transformRecord(results[0])
        };
      } else {
        return {
          success: false,
          error: '记录不存在'
        };
      }
    } catch (error) {
      console.error(`查找${this.tableName}记录失败:`, error);
      return {
        success: false,
        error: `查找记录失败: ${error}`
      };
    }
  }

  /**
   * 查找多条记录
   */
  async findMany(options: QueryOptions = {}): Promise<DatabaseResult<T[]>> {
    try {
      const { sql, params } = this.buildSelectQuery(options);
      const results = await this.db.query<T>(sql, params);
      
      return {
        success: true,
        data: results.map(record => this.transformRecord(record))
      };
    } catch (error) {
      console.error(`查找${this.tableName}记录失败:`, error);
      return {
        success: false,
        error: `查找记录失败: ${error}`
      };
    }
  }

  /**
   * 分页查询
   */
  async findPaginated(options: QueryOptions & { page: number; pageSize: number }): Promise<DatabaseResult<PaginatedResult<T>>> {
    try {
      const { page = 1, pageSize = 20, ...queryOptions } = options;
      const offset = (page - 1) * pageSize;

      // 查询总数
      const countSql = this.buildCountQuery(queryOptions);
      const countResult = await this.db.query<{ count: number }>(countSql.sql, countSql.params);
      const total = countResult[0]?.count || 0;

      // 查询数据
      const dataSql = this.buildSelectQuery({
        ...queryOptions,
        limit: pageSize,
        offset
      });
      const results = await this.db.query<T>(dataSql.sql, dataSql.params);

      return {
        success: true,
        data: {
          items: results.map(record => this.transformRecord(record)),
          total,
          page,
          pageSize,
          hasMore: offset + results.length < total
        }
      };
    } catch (error) {
      console.error(`分页查询${this.tableName}失败:`, error);
      return {
        success: false,
        error: `分页查询失败: ${error}`
      };
    }
  }

  /**
   * 更新记录
   */
  async update(id: string, data: Partial<Omit<T, 'id' | 'created_at'>>): Promise<DatabaseResult<T>> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { setClause, values } = this.buildUpdateQuery(updateData);
      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      const params = [...values, id];

      const result = await this.db.execute(sql, params);

      if (result.changes > 0) {
        // 获取更新后的记录
        const updatedRecord = await this.findById(id);
        if (updatedRecord.success && updatedRecord.data) {
          // 记录同步状态
          await this.recordSyncStatus(id, 'update', updatedRecord.data);
          
          return updatedRecord;
        }
      }

      return {
        success: false,
        error: '更新记录失败'
      };
    } catch (error) {
      console.error(`更新${this.tableName}记录失败:`, error);
      return {
        success: false,
        error: `更新记录失败: ${error}`
      };
    }
  }

  /**
   * 删除记录
   */
  async delete(id: string): Promise<DatabaseResult<boolean>> {
    try {
      // 先获取记录用于同步
      const existingRecord = await this.findById(id);
      
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.db.execute(sql, [id]);

      if (result.changes > 0) {
        // 记录同步状态
        if (existingRecord.success && existingRecord.data) {
          await this.recordSyncStatus(id, 'delete', existingRecord.data);
        }
        
        return {
          success: true,
          data: true,
          rowsAffected: result.changes
        };
      } else {
        return {
          success: false,
          error: '删除记录失败'
        };
      }
    } catch (error) {
      console.error(`删除${this.tableName}记录失败:`, error);
      return {
        success: false,
        error: `删除记录失败: ${error}`
      };
    }
  }

  /**
   * 批量创建
   */
  async createMany(dataList: Array<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<DatabaseResult<T[]>> {
    try {
      const results: T[] = [];
      
      await this.db.transaction(async () => {
        for (const data of dataList) {
          const result = await this.create(data);
          if (result.success && result.data) {
            results.push(result.data);
          } else {
            throw new Error(result.error || '批量创建失败');
          }
        }
      });

      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error(`批量创建${this.tableName}记录失败:`, error);
      return {
        success: false,
        error: `批量创建失败: ${error}`
      };
    }
  }

  /**
   * 批量更新
   */
  async updateMany(updates: Array<{ id: string; data: Partial<Omit<T, 'id' | 'created_at'>> }>): Promise<DatabaseResult<T[]>> {
    try {
      const results: T[] = [];
      
      await this.db.transaction(async () => {
        for (const { id, data } of updates) {
          const result = await this.update(id, data);
          if (result.success && result.data) {
            results.push(result.data);
          } else {
            throw new Error(result.error || '批量更新失败');
          }
        }
      });

      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error(`批量更新${this.tableName}记录失败:`, error);
      return {
        success: false,
        error: `批量更新失败: ${error}`
      };
    }
  }

  /**
   * 记录同步状态
   */
  private async recordSyncStatus(recordId: string, operation: 'insert' | 'update' | 'delete', data: T): Promise<void> {
    try {
      const syncId = `sync_${recordId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sql = `
        INSERT INTO sync_status (id, table_name, record_id, operation, data_snapshot)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await this.db.execute(sql, [
        syncId,
        this.tableName,
        recordId,
        operation,
        JSON.stringify(data)
      ]);
    } catch (error) {
      console.warn('记录同步状态失败:', error);
      // 不抛出错误，避免影响主要操作
    }
  }

  /**
   * 构建插入查询
   */
  private buildInsertQuery(record: T): { columns: string; placeholders: string; values: any[] } {
    const keys = Object.keys(record);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(key => (record as any)[key]);

    return { columns, placeholders, values };
  }

  /**
   * 构建选择查询
   */
  private buildSelectQuery(options: QueryOptions): { sql: string; params: any[] } {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    // WHERE条件
    if (options.where) {
      const conditions: string[] = [];
      Object.entries(options.where).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          conditions.push(`${key} IN (${value.map(() => '?').join(', ')})`);
          params.push(...value);
        } else {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      });
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    // ORDER BY
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    }

    // LIMIT和OFFSET
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }
    if (options.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    return { sql, params };
  }

  /**
   * 构建计数查询
   */
  private buildCountQuery(options: QueryOptions): { sql: string; params: any[] } {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];

    if (options.where) {
      const conditions: string[] = [];
      Object.entries(options.where).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          conditions.push(`${key} IN (${value.map(() => '?').join(', ')})`);
          params.push(...value);
        } else {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      });
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    return { sql, params };
  }

  /**
   * 构建更新查询
   */
  private buildUpdateQuery(data: Record<string, any>): { setClause: string; values: any[] } {
    const keys = Object.keys(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = keys.map(key => data[key]);

    return { setClause, values };
  }

  /**
   * 转换记录（处理日期等类型转换）
   */
  protected transformRecord(record: any): T {
    // 转换日期字段
    const transformed = { ...record };
    
    if (transformed.created_at && typeof transformed.created_at === 'string') {
      transformed.created_at = new Date(transformed.created_at);
    }
    if (transformed.updated_at && typeof transformed.updated_at === 'string') {
      transformed.updated_at = new Date(transformed.updated_at);
    }
    if (transformed.due_date && typeof transformed.due_date === 'string') {
      transformed.due_date = new Date(transformed.due_date);
    }
    if (transformed.start_time && typeof transformed.start_time === 'string') {
      transformed.start_time = new Date(transformed.start_time);
    }
    if (transformed.end_time && typeof transformed.end_time === 'string') {
      transformed.end_time = new Date(transformed.end_time);
    }
    if (transformed.last_review && typeof transformed.last_review === 'string') {
      transformed.last_review = new Date(transformed.last_review);
    }

    return transformed as T;
  }

  /**
   * 执行原始SQL查询
   */
  async rawQuery<R = any>(sql: string, params: any[] = []): Promise<DatabaseResult<R[]>> {
    try {
      const results = await this.db.query<R>(sql, params);
      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('原始SQL查询失败:', error);
      return {
        success: false,
        error: `查询失败: ${error}`
      };
    }
  }

  /**
   * 执行原始SQL命令
   */
  async rawExecute(sql: string, params: any[] = []): Promise<DatabaseResult<{ changes: number; lastInsertRowid: number }>> {
    try {
      const result = await this.db.execute(sql, params);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('原始SQL执行失败:', error);
      return {
        success: false,
        error: `执行失败: ${error}`
      };
    }
  }
}