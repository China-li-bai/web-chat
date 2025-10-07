// Import the asynchronous WASM build because we will be using IndexedDB
// which is an async Virtual File System (VFS).
import SQLiteAsyncESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs'
import * as SQLite from 'wa-sqlite'
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js'
import { IDBMinimalVFS } from 'wa-sqlite/src/examples/IDBMinimalVFS.js'
import { Mutex } from 'async-mutex'
import { resultToRows } from '../util/results'
import type { Row, SqlValue, Statement } from '../types'

type DBDebug = {
  persisted?: boolean
  quota?: number
  usage?: number
  free?: number
  recovered?: boolean
  fellBackToMemory?: boolean
  vfsType?: string
  vfsStatus?: 'success' | 'fallback' | 'memory'
}
function setDebug(patch: Partial<DBDebug>) {
  if (typeof window !== 'undefined') {
    (window as any).__dbDebug = { ...(window as any).__dbDebug, ...patch }
  }
}

// 全局VFS状态跟踪
function getVFSStatus(): DBDebug {
  if (typeof window !== 'undefined') {
    return (window as any).__dbDebug || {}
  }
  return {}
}

export type Database = Pick<
  BasicDatabase,
  'name' | 'exec' | 'getRowsModified'
>

// 导出VFS状态获取函数
export { getVFSStatus }

type SQLiteCompatibleType = number | string | Uint8Array | Array<number> | bigint | null;

function isMobileUA() {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * 检测iOS版本，特别针对iOS 14.x的识别
 * @returns {object} iOS检测结果，包含版本信息
 */
function detectiOSVersion() {
  if (typeof navigator === 'undefined') {
    return { isIOS: false, version: null, isIOS14: false }
  }

  const userAgent = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
  
  if (!isIOS) {
    return { isIOS: false, version: null, isIOS14: false }
  }

  // 解析iOS版本号
  const versionMatch = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/)
  if (!versionMatch) {
    return { isIOS: true, version: null, isIOS14: false }
  }

  const majorVersion = parseInt(versionMatch[1], 10)
  const minorVersion = parseInt(versionMatch[2], 10)
  const patchVersion = versionMatch[3] ? parseInt(versionMatch[3], 10) : 0
  
  const version = `${majorVersion}.${minorVersion}.${patchVersion}`
  const isIOS14 = majorVersion === 14

  return {
    isIOS: true,
    version,
    majorVersion,
    minorVersion,
    patchVersion,
    isIOS14
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class BasicDatabase {
  #mutex: Mutex

  // Do not use this constructor directly.
  // Create a Database instance using the static `init` method instead.
  private constructor(
    public name: string,
    private sqlite3: SQLiteAPI,
    private db: number
  ) {
    this.#mutex = new Mutex()
  }

  async exec(statement: Statement): Promise<Row[]> {
    // Uses a mutex to ensure that the execution of SQL statements is not interleaved
    // otherwise wa-sqlite may encounter problems such as indices going out of bounds
    // all calls to wa-sqlite need to be coordinated through this mutex
    const release = await this.#mutex.acquire()
    try {
      return await this.execSql(statement)
    } finally {
      release()
    }
  }

  private async execSql(statement: Statement): Promise<Row[]> {
    const isMobile = isMobileUA()

    // Iterate statements
    for await (const stmt of this.sqlite3.statements(this.db, statement.sql)) {
      if (typeof statement.args !== 'undefined') {
        this.sqlite3.bind_collection(
          stmt,
          statement.args as
            | { [index: string]: SQLiteCompatibleType }
            | SQLiteCompatibleType[]
        )
      }
      const rows: SqlValue[][] = []
      let cols: string[] = []
      while ((await this.sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
        cols = cols.length === 0 ? this.sqlite3.column_names(stmt) : cols
        const row = this.sqlite3.row(stmt) as SqlValue[]
        rows.push(row)

        // On mobile add tiny delay to reduce I/O pressure
        if (isMobile && rows.length % 10 === 0) {
          await sleep(1)
        }
      }
      const res = { columns: cols, values: rows }
      return resultToRows(res) // exit loop after one statement
    }
    return [] // no statement case
  }

  getRowsModified() {
    return this.sqlite3.changes(this.db)
  }

  // Apply conservative PRAGMAs to avoid WAL/idb issues
  private async applyPragmas(isMobile: boolean): Promise<void> {
    const pragmas = [
      "PRAGMA journal_mode=DELETE",
      "PRAGMA synchronous=NORMAL",
      "PRAGMA temp_store=MEMORY",
      // approx 256 pages negative means KB units; keep small to reduce cache pressure
      "PRAGMA cache_size=-512"
    ]
    for (const p of pragmas) {
      // ignore errors for individual pragmas
      try {
        await this.exec({ sql: p })
        if (isMobile) await sleep(2)
      } catch {}
    }
  }

  // Write-read sanity check to surface env problems early
  private async sanityCheck(): Promise<void> {
    const id = Math.random().toString(36).slice(2)
    try {
      await this.exec({ sql: "CREATE TABLE IF NOT EXISTS __sanity__(k TEXT PRIMARY KEY, v TEXT)" })
      await this.exec({ sql: `INSERT OR REPLACE INTO __sanity__(k, v) VALUES ('probe','${id}')` })
      const rows = await this.exec({ sql: "SELECT v FROM __sanity__ WHERE k='probe' LIMIT 1" })
      const ok = Array.isArray(rows) && rows[0] && (rows[0] as any).v === id
      if (!ok) throw new Error("sanity check failed")
    } catch (e:any) {
      throw new Error(e?.message || "sanity failed")
    }
  }

  private static isIOErrorMessage(msg: string): boolean {
    if (!msg) return false
    const m = msg.toLowerCase()
    return m.includes('ioerr') || m.includes('disk i/o') || m.includes('disk i&#x2f;o') || m.includes('i/o')
  }

  /**
   * Creates and opens a DB backed by an IndexedDB filesystem
   */
  static async init(
    dbName: string,
    locateSqliteDist?: string | ((path: string) => string)
  ) {
    // const isMobile = isMobileUA()
    const iosInfo = detectiOSVersion()

    // Request persistent storage (best effort)
    if (typeof navigator !== 'undefined' && (navigator as any).storage?.persist) {
      try {
        const ok = await (navigator as any).storage.persist()
        setDebug({ persisted: !!ok })
      } catch {}
    }
    // Estimate quota (best effort, logging only)
    if (typeof navigator !== 'undefined' && (navigator as any).storage?.estimate) {
      try {
        const est = await (navigator as any).storage.estimate()
        const quota = (est as any)?.quota || 0
        const usage = (est as any)?.usage || 0
        const free = Math.max(0, quota - usage)
        setDebug({ quota, usage, free })
        if (free < 2 * 1024 * 1024) {
          console.warn('Storage free space is low:', free)
        }
      } catch {}
    }

    // iOS 专用VFS选择逻辑
    let vfs: SQLiteVFS
    try {
      if (iosInfo.isIOS) {
        // iOS 设备使用 IDBMinimalVFS 避免兼容性问题
        console.log(`检测到iOS设备 ${iosInfo.version || 'Unknown'}，使用IDBMinimalVFS以确保数据持久化`)
        vfs = await new IDBMinimalVFS(dbName)
        setDebug({ vfsType: 'IDBMinimalVFS', vfsStatus: 'success' })
      } else {
        // 其他平台使用 IDBBatchAtomicVFS
        vfs = await new IDBBatchAtomicVFS(dbName)
        setDebug({ vfsType: 'IDBBatchAtomicVFS', vfsStatus: 'success' })
      }
    } catch (e:any) {
      console.error(`创建${iosInfo.isIOS ? 'IDBMinimalVFS' : 'IDBBatchAtomicVFS'}失败:`, e?.message || e)
      
      // iOS 的降级策略：IDBMinimalVFS -> IDBBatchAtomicVFS
      if (iosInfo.isIOS) {
        try {
          console.warn('IDBMinimalVFS失败，尝试降级到IDBBatchAtomicVFS')
          vfs = await new IDBBatchAtomicVFS(dbName)
          setDebug({ vfsType: 'IDBBatchAtomicVFS', vfsStatus: 'fallback' })
        } catch (e2:any) {
          console.error('IDBBatchAtomicVFS也失败:', e2?.message || e2)
          throw e2
        }
      } else {
        // 非iOS 的降级策略：IDBBatchAtomicVFS -> IDBMinimalVFS
        try {
          console.warn('IDBBatchAtomicVFS失败，尝试降级到IDBMinimalVFS')
          vfs = await new IDBMinimalVFS(dbName)
          setDebug({ vfsType: 'IDBMinimalVFS', vfsStatus: 'fallback' })
        } catch (e2:any) {
          console.error('IDBMinimalVFS也失败:', e2?.message || e2)
          throw e2
        }
      }
    }

    return BasicDatabase._init(
      dbName,
      vfs,
      locateSqliteDist
    )
  }

  /**
   * Creates and opens a DB backed by a custom VFS
   */
  static async initWithCustomVFS(
    dbName: string,
    vfs: SQLiteVFS,
    locateSqliteDist?: string | ((path: string) => string)
  ) {
    return BasicDatabase._init(dbName, vfs, locateSqliteDist)
  }

  private static async _openSqlite(
    dbName: string,
    vfs: SQLiteVFS | null,
    locateSqliteDist?: string | ((path: string) => string)
  ): Promise<{ sqlite3: SQLiteAPI, db: number }> {
    const locateFile =
      typeof locateSqliteDist === 'string'
        ? (path: string) => locateSqliteDist + path
        : locateSqliteDist

    const SQLiteAsyncModule = await SQLiteAsyncESMFactory({ locateFile })
    const sqlite3 = SQLite.Factory(SQLiteAsyncModule)

    if (vfs) sqlite3.vfs_register(vfs, true)

    let db: number
    const isMobile = isMobileUA()
    if (dbName === ':memory:') {
      db = await sqlite3.open_v2(
        ':memory:',
        SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE
      )
      return { sqlite3, db }
    }

    if (isMobile) {
      db = await sqlite3.open_v2(
        dbName,
        SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE,
        dbName
      )
    } else {
      db = await sqlite3.open_v2(
        dbName
        // default flags
      )
    }
    return { sqlite3, db }
  }

  private static async _init(
    dbName: string,
    vfs: SQLiteVFS,
    locateSqliteDist?: string | ((path: string) => string)
  ) {
    const isMobile = isMobileUA()
    const iosInfo = detectiOSVersion()

    // First attempt: IDB VFS
    try {
      const { sqlite3, db } = await BasicDatabase._openSqlite(dbName, vfs, locateSqliteDist)
      const instance = new BasicDatabase(dbName, sqlite3, db)
      // Apply conservative pragmas
      await instance.applyPragmas(isMobile)
      // Sanity check with tiny write-read
      await instance.sanityCheck()
      return instance
    } catch (e:any) {
      const msg = e?.message || String(e)
      console.error('DB open/sanity failed:', msg)

      // Cool-down and retry one more time for transient I/O
      if (BasicDatabase.isIOErrorMessage(msg)) {
        // iOS 14.x 使用更长的延迟时间
        const retryDelay = iosInfo.isIOS14 ? 2000 : 1000
        console.log(`检测到I/O错误，等待${retryDelay}ms后重试...`)
        await sleep(retryDelay)
        
        try {
          const { sqlite3, db } = await BasicDatabase._openSqlite(dbName, vfs, locateSqliteDist)
          const instance = new BasicDatabase(dbName, sqlite3, db)
          await instance.applyPragmas(isMobile)
          await instance.sanityCheck()
          console.warn('Recovered after transient I/O error.')
          setDebug({ recovered: true })
          return instance
        } catch (e2:any) {
          console.error('Retry failed:', e2?.message || e2)
        }
      }

      // Final fallback: in-memory DB to keep app usable
      try {
        console.warn('Falling back to in-memory SQLite database (:memory:)')
        const { sqlite3, db } = await BasicDatabase._openSqlite(':memory:', null, locateSqliteDist)
        const instance = new BasicDatabase(':memory:', sqlite3, db)
        await instance.applyPragmas(isMobile)
        // No persistence here; still run sanity to be safe
        await instance.sanityCheck()
        setDebug({ fellBackToMemory: true, vfsType: 'Memory', vfsStatus: 'memory' })
        return instance
      } catch (memErr:any) {
        console.error('Open in-memory DB failed:', memErr?.message || memErr)
        throw new Error(`数据库连接失败: ${msg}`)
      }
    }
  }
}