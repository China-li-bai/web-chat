/**
 * WA-SQLite Factory Utility
 * 
 * A robust factory pattern implementation for wa-sqlite with enhanced error handling,
 * WASM module loading optimization, and comprehensive type safety.
 * 
 * Features:
 * - Singleton pattern for database instances
 * - Automatic retry mechanism for network failures
 * - Comprehensive error classification and handling
 * - Memory leak prevention
 * - Thread-safe initialization
 * - Performance monitoring and logging
 * 
 * @author Web-Chat Team
 * @version 1.0.0
 * @since 2025-01-27
 */

import SQLiteAsyncESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs'
import * as SQLite from 'wa-sqlite'
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js'
import { Mutex } from 'async-mutex'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration options for the SQLite factory
 */
export interface WaSqliteFactoryConfig {
  /** Database name */
  dbName: string
  /** Custom path to SQLite WASM files */
  locateSqliteDist?: string | ((path: string) => string)
  /** Maximum retry attempts for initialization */
  maxRetries?: number
  /** Retry delay in milliseconds */
  retryDelay?: number
  /** Enable debug logging */
  enableLogging?: boolean
  /** VFS lock policy */
  lockPolicy?: 'shared+hint' | 'exclusive' | 'shared'
  /** Connection timeout in milliseconds */
  connectionTimeout?: number
}

/**
 * Error types for better error handling
 */
export enum WaSqliteErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  WASM_LOAD_ERROR = 'WASM_LOAD_ERROR',
  VFS_ERROR = 'VFS_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR'
}

/**
 * Custom error class for wa-sqlite operations
 */
export class WaSqliteError extends Error {
  constructor(
    message: string,
    public readonly type: WaSqliteErrorType,
    public readonly originalError?: Error,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'WaSqliteError'
  }
}

/**
 * Database instance interface
 */
export interface WaSqliteInstance {
  readonly name: string
  readonly sqlite3: SQLiteAPI
  readonly db: number
  readonly isConnected: boolean
  readonly createdAt: Date
  exec(sql: string, params?: any[]): Promise<any[]>
  close(): Promise<void>
  getRowsModified(): number
}

/**
 * Factory statistics for monitoring
 */
export interface FactoryStats {
  totalInstances: number
  activeInstances: number
  failedInitializations: number
  totalRetries: number
  averageInitTime: number
  lastError?: WaSqliteError
}

// ============================================================================
// Main Factory Class
// ============================================================================

/**
 * WA-SQLite Factory - Singleton pattern implementation for managing SQLite instances
 * 
 * This factory provides:
 * - Centralized database instance management
 * - Automatic error recovery and retry mechanisms
 * - Memory leak prevention
 * - Performance monitoring
 * - Thread-safe operations
 * 
 * @example
 * ```typescript
 * const factory = WaSqliteFactory.getInstance()
 * 
 * try {
 *   const db = await factory.createDatabase({
 *     dbName: 'my-app.db',
 *     enableLogging: true
 *   })
 *   
 *   const results = await db.exec('SELECT * FROM users')
 *   console.log(results)
 * } catch (error) {
 *   if (error instanceof WaSqliteError) {
 *     console.error(`SQLite Error [${error.type}]:`, error.message)
 *   }
 * }
 * ```
 */
export class WaSqliteFactory {
  private static instance: WaSqliteFactory | null = null
  private readonly instances = new Map<string, WaSqliteInstance>()
  private readonly initializationPromises = new Map<string, Promise<WaSqliteInstance>>()
  private readonly mutex = new Mutex()
  private readonly stats: FactoryStats = {
    totalInstances: 0,
    activeInstances: 0,
    failedInitializations: 0,
    totalRetries: 0,
    averageInitTime: 0,
    lastError: undefined
  }

  private constructor() {
    // Private constructor for singleton pattern
    this.setupCleanupHandlers()
  }

  /**
   * Get the singleton instance of the factory
   */
  public static getInstance(): WaSqliteFactory {
    if (!WaSqliteFactory.instance) {
      WaSqliteFactory.instance = new WaSqliteFactory()
    }
    return WaSqliteFactory.instance
  }

  /**
   * Create or retrieve a database instance
   * 
   * @param config - Configuration options for the database
   * @returns Promise resolving to a database instance
   * @throws {WaSqliteError} When initialization fails
   */
  public async createDatabase(config: WaSqliteFactoryConfig): Promise<WaSqliteInstance> {
    const release = await this.mutex.acquire()
    
    try {
      // Check if instance already exists
      const existingInstance = this.instances.get(config.dbName)
      if (existingInstance && existingInstance.isConnected) {
        this.log(config, `Returning existing instance for database: ${config.dbName}`)
        return existingInstance
      }

      // Check if initialization is already in progress
      const existingPromise = this.initializationPromises.get(config.dbName)
      if (existingPromise) {
        this.log(config, `Waiting for ongoing initialization: ${config.dbName}`)
        return await existingPromise
      }

      // Start new initialization
      const initPromise = this.initializeDatabase(config)
      this.initializationPromises.set(config.dbName, initPromise)

      try {
        const instance = await initPromise
        this.instances.set(config.dbName, instance)
        this.stats.totalInstances++
        this.stats.activeInstances++
        return instance
      } finally {
        this.initializationPromises.delete(config.dbName)
      }
    } finally {
      release()
    }
  }

  /**
   * Initialize a new database instance with retry logic
   */
  private async initializeDatabase(config: WaSqliteFactoryConfig): Promise<WaSqliteInstance> {
    const startTime = Date.now()
    const maxRetries = config.maxRetries ?? 3
    const retryDelay = config.retryDelay ?? 1000
    const connectionTimeout = config.connectionTimeout ?? 30000

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.log(config, `Initializing database: ${config.dbName} (attempt ${attempt + 1}/${maxRetries + 1})`)

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new WaSqliteError(
              `Database initialization timeout after ${connectionTimeout}ms`,
              WaSqliteErrorType.TIMEOUT_ERROR,
              undefined,
              false
            ))
          }, connectionTimeout)
        })

        // Create initialization promise
        const initPromise = this.performInitialization(config)

        // Race between initialization and timeout
        const instance = await Promise.race([initPromise, timeoutPromise])
        
        const initTime = Date.now() - startTime
        this.updateStats(initTime, attempt)
        this.log(config, `Database initialized successfully in ${initTime}ms`)
        
        return instance

      } catch (error) {
        lastError = error
        this.stats.totalRetries++
        
        const sqliteError = this.classifyError(error, attempt < maxRetries)
        this.stats.lastError = sqliteError
        
        this.log(config, `Initialization attempt ${attempt + 1} failed: ${sqliteError.message}`)

        if (!sqliteError.retryable || attempt === maxRetries) {
          this.stats.failedInitializations++
          throw sqliteError
        }

        // Wait before retry
        if (attempt < maxRetries) {
          await this.delay(retryDelay * Math.pow(2, attempt)) // Exponential backoff
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new WaSqliteError(
      'Maximum retry attempts exceeded',
      WaSqliteErrorType.INITIALIZATION_ERROR,
      lastError || undefined,
      false
    )
  }

  /**
   * Perform the actual database initialization
   */
  private async performInitialization(config: WaSqliteFactoryConfig): Promise<WaSqliteInstance> {
    try {
      // Initialize SQLite WASM module
      const locateFile = this.createLocateFileFunction(config.locateSqliteDist)
      
      this.log(config, 'Loading SQLite WASM module...')
      const SQLiteAsyncModule = await SQLiteAsyncESMFactory({
        locateFile: locateFile,
      })

      this.log(config, 'Creating VFS...')
      const vfs: SQLiteVFS = await IDBBatchAtomicVFS.create(
        config.dbName, 
        SQLiteAsyncModule, 
        { lockPolicy: config.lockPolicy ?? 'shared+hint' }
      )

      this.log(config, 'Building SQLite API...')
      const sqlite3 = SQLite.Factory(SQLiteAsyncModule)

      this.log(config, 'Registering VFS...')
      sqlite3.vfs_register(vfs, true)

      this.log(config, 'Opening database connection...')
      const db = await sqlite3.open_v2(config.dbName)

      return new WaSqliteInstanceImpl(config.dbName, sqlite3, db, config.enableLogging)

    } catch (error) {
      throw this.classifyError(error, true)
    }
  }

  /**
   * Create a locateFile function based on configuration
   */
  private createLocateFileFunction(locateSqliteDist?: string | ((path: string) => string)) {
    if (typeof locateSqliteDist === 'string') {
      return (path: string) => locateSqliteDist + path
    }
    return locateSqliteDist
  }

  /**
   * Classify errors for better handling
   */
  private classifyError(error: any, retryable: boolean): WaSqliteError {
    if (error instanceof WaSqliteError) {
      return error
    }

    const message = error?.message || 'Unknown error'
    const originalError = error instanceof Error ? error : new Error(String(error))

    // Network-related errors
    if (message.includes('fetch') || message.includes('network') || message.includes('NETWORK_ERR')) {
      return new WaSqliteError(
        `Network error during WASM loading: ${message}`,
        WaSqliteErrorType.NETWORK_ERROR,
        originalError,
        retryable
      )
    }

    // WASM loading errors
    if (message.includes('wasm') || message.includes('WebAssembly') || message.includes('instantiate')) {
      return new WaSqliteError(
        `WASM module loading failed: ${message}`,
        WaSqliteErrorType.WASM_LOAD_ERROR,
        originalError,
        retryable
      )
    }

    // VFS errors
    if (message.includes('VFS') || message.includes('IndexedDB') || message.includes('IDB')) {
      return new WaSqliteError(
        `Virtual File System error: ${message}`,
        WaSqliteErrorType.VFS_ERROR,
        originalError,
        retryable
      )
    }

    // Memory errors
    if (message.includes('memory') || message.includes('allocation') || message.includes('OutOfMemory')) {
      return new WaSqliteError(
        `Memory allocation error: ${message}`,
        WaSqliteErrorType.MEMORY_ERROR,
        originalError,
        false // Memory errors are usually not retryable
      )
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('Timeout')) {
      return new WaSqliteError(
        `Operation timeout: ${message}`,
        WaSqliteErrorType.TIMEOUT_ERROR,
        originalError,
        retryable
      )
    }

    // Default to database error
    return new WaSqliteError(
      `Database initialization error: ${message}`,
      WaSqliteErrorType.DATABASE_ERROR,
      originalError,
      retryable
    )
  }

  /**
   * Update factory statistics
   */
  private updateStats(initTime: number, retries: number): void {
    const totalTime = this.stats.averageInitTime * (this.stats.totalInstances - retries)
    this.stats.averageInitTime = (totalTime + initTime) / (this.stats.totalInstances - retries + 1)
  }

  /**
   * Close a specific database instance
   */
  public async closeDatabase(dbName: string): Promise<void> {
    const release = await this.mutex.acquire()
    
    try {
      const instance = this.instances.get(dbName)
      if (instance) {
        await instance.close()
        this.instances.delete(dbName)
        this.stats.activeInstances--
        this.log({ enableLogging: true } as WaSqliteFactoryConfig, `Closed database: ${dbName}`)
      }
    } finally {
      release()
    }
  }

  /**
   * Close all database instances
   */
  public async closeAllDatabases(): Promise<void> {
    const release = await this.mutex.acquire()
    
    try {
      const closePromises = Array.from(this.instances.values()).map(instance => instance.close())
      await Promise.all(closePromises)
      
      this.instances.clear()
      this.stats.activeInstances = 0
      this.log({ enableLogging: true } as WaSqliteFactoryConfig, 'All databases closed')
    } finally {
      release()
    }
  }

  /**
   * Get factory statistics
   */
  public getStats(): Readonly<FactoryStats> {
    return { ...this.stats }
  }

  /**
   * Check if a database instance exists and is connected
   */
  public isConnected(dbName: string): boolean {
    const instance = this.instances.get(dbName)
    return instance ? instance.isConnected : false
  }

  /**
   * Get list of active database names
   */
  public getActiveDatabases(): string[] {
    return Array.from(this.instances.keys()).filter(name => this.isConnected(name))
  }

  /**
   * Setup cleanup handlers for graceful shutdown
   */
  private setupCleanupHandlers(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.closeAllDatabases().catch(console.error)
      })
    }

    if (typeof process !== 'undefined') {
      process.on('exit', () => {
        this.closeAllDatabases().catch(console.error)
      })
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Logging utility
   */
  private log(config: WaSqliteFactoryConfig, message: string): void {
    if (config.enableLogging) {
      console.log(`[WaSqliteFactory] ${new Date().toISOString()} - ${message}`)
    }
  }
}

// ============================================================================
// Database Instance Implementation
// ============================================================================

/**
 * Implementation of the WaSqliteInstance interface
 */
class WaSqliteInstanceImpl implements WaSqliteInstance {
  private _isConnected = true
  private readonly _createdAt = new Date()
  private readonly executionMutex = new Mutex()

  constructor(
    public readonly name: string,
    public readonly sqlite3: SQLiteAPI,
    public readonly db: number,
    private readonly enableLogging: boolean = false
  ) {}

  get isConnected(): boolean {
    return this._isConnected
  }

  get createdAt(): Date {
    return this._createdAt
  }

  /**
   * Execute SQL statement with parameters
   */
  async exec(sql: string, params?: any[]): Promise<any[]> {
    if (!this._isConnected) {
      throw new WaSqliteError(
        'Database connection is closed',
        WaSqliteErrorType.DATABASE_ERROR,
        undefined,
        false
      )
    }

    const release = await this.executionMutex.acquire()
    
    try {
      this.log(`Executing SQL: ${sql}`)
      
      const results: any[] = []
      
      for await (const stmt of this.sqlite3.statements(this.db, sql)) {
        if (params && params.length > 0) {
          this.sqlite3.bind_collection(stmt, params)
        }
        
        const rows: any[] = []
        let columns: string[] = []
        
        while ((await this.sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
          if (columns.length === 0) {
            columns = this.sqlite3.column_names(stmt)
          }
          
          const row = this.sqlite3.row(stmt)
          const rowObject: any = {}
          
          columns.forEach((col, index) => {
            rowObject[col] = row[index]
          })
          
          rows.push(rowObject)
        }
        
        results.push(...rows)
      }
      
      this.log(`SQL executed successfully, returned ${results.length} rows`)
      return results
      
    } catch (error) {
      this.log(`SQL execution failed: ${error}`)
      throw new WaSqliteError(
        `SQL execution failed: ${error}`,
        WaSqliteErrorType.DATABASE_ERROR,
        error instanceof Error ? error : new Error(String(error)),
        false
      )
    } finally {
      release()
    }
  }

  /**
   * Get number of rows modified by last statement
   */
  getRowsModified(): number {
    return this.sqlite3.changes(this.db)
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (!this._isConnected) {
      return
    }

    const release = await this.executionMutex.acquire()
    
    try {
      this.log(`Closing database: ${this.name}`)
      await this.sqlite3.close(this.db)
      this._isConnected = false
      this.log(`Database closed: ${this.name}`)
    } catch (error) {
      this.log(`Error closing database: ${error}`)
      throw new WaSqliteError(
        `Failed to close database: ${error}`,
        WaSqliteErrorType.DATABASE_ERROR,
        error instanceof Error ? error : new Error(String(error)),
        false
      )
    } finally {
      release()
    }
  }

  /**
   * Logging utility
   */
  private log(message: string): void {
    if (this.enableLogging) {
      console.log(`[WaSqliteInstance:${this.name}] ${new Date().toISOString()} - ${message}`)
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Convenience function to create a database instance
 * 
 * @param config - Database configuration
 * @returns Promise resolving to a database instance
 */
export async function createWaSqliteDatabase(config: WaSqliteFactoryConfig): Promise<WaSqliteInstance> {
  const factory = WaSqliteFactory.getInstance()
  return await factory.createDatabase(config)
}

/**
 * Convenience function to close a database
 * 
 * @param dbName - Name of the database to close
 */
export async function closeWaSqliteDatabase(dbName: string): Promise<void> {
  const factory = WaSqliteFactory.getInstance()
  await factory.closeDatabase(dbName)
}

/**
 * Convenience function to get factory statistics
 * 
 * @returns Factory statistics
 */
export function getWaSqliteFactoryStats(): Readonly<FactoryStats> {
  const factory = WaSqliteFactory.getInstance()
  return factory.getStats()
}

// ============================================================================
// Default Export
// ============================================================================

export default WaSqliteFactory