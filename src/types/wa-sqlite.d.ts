/**
 * Type definitions for wa-sqlite and related modules
 */

declare module 'wa-sqlite/dist/wa-sqlite-async.mjs' {
  interface SQLiteAsyncFactoryOptions {
    locateFile?: (path: string) => string
  }
  
  const SQLiteAsyncESMFactory: (options?: SQLiteAsyncFactoryOptions) => Promise<any>
  export = SQLiteAsyncESMFactory
}

declare module 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js' {
  interface IDBBatchAtomicVFSOptions {
    durability?: string
    lockPolicy?: string
  }

  interface IDBBatchAtomicVFSConstructor {
    new (name: string, options?: IDBBatchAtomicVFSOptions): any
    create(
      name: string, 
      module: any, 
      options?: IDBBatchAtomicVFSOptions
    ): Promise<SQLiteVFS>
  }

  export const IDBBatchAtomicVFS: IDBBatchAtomicVFSConstructor
}

declare global {
  interface SQLiteAPI {
    statements(db: number, sql: string): AsyncIterable<number>
    bind_collection(stmt: number, values: any): void
    step(stmt: number): Promise<number>
    column_names(stmt: number): string[]
    row(stmt: number): any[]
    changes(db: number): number
    open_v2(filename: string, flags?: number, vfs?: string): Promise<number>
    close(db: number): Promise<void>
    vfs_register(vfs: SQLiteVFS, makeDefault: boolean): void
  }

  interface SQLiteVFS {
    // VFS interface - specific implementation details may vary
  }

  interface SQLiteModule {
    // SQLite module interface
  }
}

export {}