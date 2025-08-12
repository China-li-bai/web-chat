/**
 * TTS cache DAO using wa-sqlite (IDB VFS by default) with safe memory fallback.
 *
 * Contract:
 *  - init(): initialize database, build schema if needed
 *  - get(key): Promise<null | { audioBlob: Blob, meta }>
 *  - put(record): Promise<void>  // evicts by createdAt when exceeding maxBytes
 *  - stats(): Promise<{ count:number, totalBytes:number }>
 *  - clearAll(): Promise<void>
 *  - clearExpired(beforeTs:number): Promise<void>
 *
 * Options:
 *  { dbName?: string, maxBytes?: number, vfs?: 'idb'|'opfs', forceMemory?: boolean }
 *
 * Note:
 *  - For Vitest/Node or environments without WASM/IDB support, pass { forceMemory: true }.
 *  - When wa-sqlite init fails at runtime, this class transparently falls back to in-memory DAO.
 */

import { TtsCacheDaoMemory } from './ttsCacheDao.memory.js';

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

export class TtsCacheDaoSqlite {
  /**
   * @param {{ dbName?: string, maxBytes?: number, vfs?: 'idb'|'opfs', forceMemory?: boolean }} options
   */
  constructor(options = {}) {
    this.dbName = options.dbName || 'tts_cache.db';
    this.maxBytes = typeof options.maxBytes === 'number' ? options.maxBytes : DEFAULT_MAX_BYTES;
    this.vfs = options.vfs || 'idb';
    this.forceMemory = !!options.forceMemory;

    // Fallback storage
    this._mem = new TtsCacheDaoMemory({ maxBytes: this.maxBytes });

    // SQLite internals (set only if wa-sqlite init succeeds)
    this._sqlite = null;
    this._db = null;

    // Whether we are currently delegated to memory
    this._usingMemory = this.forceMemory;
  }

  async init() {
    console.log('[ttsCacheDao.sqlite] 🚀 开始初始化缓存系统...');
    console.log('  配置:', { dbName: this.dbName, maxBytes: this.maxBytes, vfs: this.vfs, forceMemory: this.forceMemory });
    
    if (this._usingMemory) {
      console.log('[ttsCacheDao.sqlite] 💾 使用内存模式');
      await this._mem.init();
      return true;
    }

    try {
      console.log('[ttsCacheDao.sqlite] 📦 导入 wa-sqlite 模块...');
      // Dynamically import wa-sqlite. If any step fails, fallback to memory.
      const mod = await import('wa-sqlite');

      const sqlite3InitModule = mod.default || mod.sqlite3InitModule || mod;
      if (!sqlite3InitModule) throw new Error('wa-sqlite init module not found');

      console.log('[ttsCacheDao.sqlite] 🔧 初始化 SQLite WASM...');
      // Initialize SQLite WASM
      const sqlite3 = await sqlite3InitModule({
        print: () => {},
        printErr: () => {}
      });

      console.log('[ttsCacheDao.sqlite] 🗄️ 设置 VFS:', this.vfs);
      // Choose VFS (IDB is preferred cross-platform)
      if (this.vfs === 'idb') {
        // Use IDBBatchAtomicVFS for durability
        const { IDBBatchAtomicVFS } = await import('wa-sqlite/src/examples/IDBBatchAtomicVFS.js');
        // 使用固定的数据库名称，确保持久化
        const vfs = new IDBBatchAtomicVFS('tts-cache-db', { durability: 'strict' });
        sqlite3.vfs_register(vfs, true);
        console.log('[ttsCacheDao.sqlite] 🔧 IDBBatchAtomicVFS 注册成功，数据库名: tts-cache-db');
      } else {
        // OPFS 在本构建中禁用，统一回退到 IDB VFS，避免 Vite import 分析报错
        const { IDBBatchAtomicVFS } = await import('wa-sqlite/src/examples/IDBBatchAtomicVFS.js');
        const vfs = new IDBBatchAtomicVFS('tts-cache-db', { durability: 'strict' });
        sqlite3.vfs_register(vfs, true);
        console.log('[ttsCacheDao.sqlite] 🔧 IDBBatchAtomicVFS 注册成功（回退模式），数据库名: tts-cache-db');
      }

      console.log('[ttsCacheDao.sqlite] 🔓 打开数据库: tts-cache-db');
      // 使用固定的数据库名称，确保持久化
      const db = new sqlite3.oo1.DB('tts-cache-db', 'ct'); // create + read/write

      // Ensure schema
      this._sqlite = sqlite3;
      this._db = db;
      await this._ensureSchema();

      console.log('[ttsCacheDao.sqlite] ✅ SQLite 初始化成功！');
      return true;
    } catch (err) {
      // Fallback to memory
      console.error('[ttsCacheDao.sqlite] ❌ SQLite 初始化失败，回退到内存模式:', err?.message || err);
      console.error('  错误详情:', err);
      this._usingMemory = true;
      await this._mem.init();
      console.log('[ttsCacheDao.sqlite] 💾 内存模式初始化完成');
      return true;
    }
  }

  async _ensureSchema() {
    if (!this._db) return;

    console.log('[ttsCacheDao.sqlite] 📋 创建数据库表结构...');
    const ddl = `
      CREATE TABLE IF NOT EXISTS audio_cache (
        key TEXT PRIMARY KEY,
        text TEXT,
        voice_style TEXT,
        lang TEXT,
        provider TEXT,
        version TEXT,
        created_at INTEGER,
        size INTEGER,
        audio_blob BLOB
      );
      CREATE INDEX IF NOT EXISTS idx_audio_cache_created_at ON audio_cache(created_at);
    `;

    this._db.exec(ddl);
    
    // 检查表是否创建成功
    const tableCount = await this._selectOne(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='audio_cache'",
      []
    );
    console.log('[ttsCacheDao.sqlite] 📋 表结构检查:', tableCount?.count > 0 ? '✅ 表已存在' : '❌ 表创建失败');
    
    // 检查现有数据
    const existingCount = await this._selectOne('SELECT COUNT(*) as count FROM audio_cache', []);
    console.log('[ttsCacheDao.sqlite] 📊 现有缓存数据:', existingCount?.count || 0, '条');
  }

  _ensureMemoryMode() {
    return this._usingMemory || !this._db;
  }

  async get(key) {
    console.log('[ttsCacheDao.sqlite] 🔍 查找缓存:', key);
    
    if (this._ensureMemoryMode()) {
      console.log('[ttsCacheDao.sqlite] 💾 使用内存模式查找');
      const result = await this._mem.get(key);
      console.log('[ttsCacheDao.sqlite] 内存查找结果:', result ? '命中' : '未命中');
      return result;
    }

    try {
      const row = await this._selectOne(
        'SELECT key, text, voice_style, lang, provider, version, created_at, size, audio_blob FROM audio_cache WHERE key = ?1',
        [key]
      );
      
      if (!row) {
        console.log('[ttsCacheDao.sqlite] 🚫 SQLite 缓存未命中');
        return null;
      }

      const {
        key: k,
        text,
        voice_style,
        lang,
        provider,
        version,
        created_at,
        size,
        audio_blob
      } = row;

      const blob = new Blob([audio_blob], { type: 'audio/wav' });
      
      console.log('[ttsCacheDao.sqlite] ✅ SQLite 缓存命中:', {
        key: k,
        text: text.substring(0, 30) + '...',
        voiceStyle: voice_style,
        lang,
        provider,
        size
      });

      return {
        audioBlob: blob,
        meta: {
          key: k,
          text,
          voiceStyle: voice_style,
          lang,
          provider,
          version,
          createdAt: created_at,
          size,
          // 添加架构版本信息用于兼容性检查
          schemaVersion: version?.includes('v2.') ? 'v2.1' : 'v1.0' // 基于version推断架构版本
        }
      };
    } catch (e) {
      console.error('[ttsCacheDao.sqlite] ❌ SQLite 查找失败，回退到内存:', e?.message || e);
      return this._mem.get(key);
    }
  }

  async put(p) {
    console.log('[ttsCacheDao.sqlite] 💾 存储缓存:', {
      key: p.key,
      text: (p.text || '').substring(0, 30) + '...',
      voiceStyle: p.voiceStyle,
      lang: p.lang,
      provider: p.provider,
      audioSize: p.audioBlob?.size || 0
    });
    
    if (this._ensureMemoryMode()) {
      console.log('[ttsCacheDao.sqlite] 💾 使用内存模式存储');
      const result = await this._mem.put(p);
      console.log('[ttsCacheDao.sqlite] 内存存储完成');
      return result;
    }

    try {
      const createdAt = typeof p.createdAt === 'number' ? p.createdAt : Date.now();
      const audioBlob = await this._toBlob(p.audioBlob);
      const size = audioBlob.size || 0;
      const bytes = new Uint8Array(await audioBlob.arrayBuffer());

      console.log('[ttsCacheDao.sqlite] 🗄️ 写入 SQLite 数据库...');
      this._db.exec(
        'INSERT INTO audio_cache (key, text, voice_style, lang, provider, version, created_at, size, audio_blob) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9) ON CONFLICT(key) DO UPDATE SET text=excluded.text, voice_style=excluded.voice_style, lang=excluded.lang, provider=excluded.provider, version=excluded.version, created_at=excluded.created_at, size=excluded.size, audio_blob=excluded.audio_blob;',
        {
          bind: [
            p.key,
            p.text || '',
            p.voiceStyle || '',
            p.lang || '',
            p.provider || 'unknown',
            p.version || '1',
            createdAt,
            size,
            bytes
          ]
        }
      );

      await this._enforceMaxBytes();
      console.log('[ttsCacheDao.sqlite] ✅ SQLite 存储成功');
    } catch (e) {
      console.error('[ttsCacheDao.sqlite] ❌ SQLite 存储失败，回退到内存:', e?.message || e);
      return this._mem.put(p);
    }
  }

  async stats() {
    if (this._ensureMemoryMode()) {
      return this._mem.stats();
    }

    try {
      const row = await this._selectOne(
        'SELECT COUNT(*) AS cnt, IFNULL(SUM(size), 0) AS total FROM audio_cache',
        []
      );
      return { count: Number(row.cnt || 0), totalBytes: Number(row.total || 0) };
    } catch (e) {
      console.warn('[ttsCacheDao.sqlite] stats failed, delegate to memory:', e?.message || e);
      return this._mem.stats();
    }
  }

  async clearAll() {
    if (this._ensureMemoryMode()) {
      return this._mem.clearAll();
    }

    try {
      this._db.exec('DELETE FROM audio_cache;');
    } catch (e) {
      console.warn('[ttsCacheDao.sqlite] clearAll failed, delegate to memory:', e?.message || e);
      return this._mem.clearAll();
    }
  }

  async clearExpired(beforeTs) {
    if (this._ensureMemoryMode()) {
      return this._mem.clearExpired(beforeTs);
    }

    try {
      this._db.exec('DELETE FROM audio_cache WHERE created_at < ?1;', { bind: [beforeTs] });
    } catch (e) {
      console.warn('[ttsCacheDao.sqlite] clearExpired failed, delegate to memory:', e?.message || e);
      return this._mem.clearExpired(beforeTs);
    }
  }

  async _enforceMaxBytes() {
    if (this._ensureMemoryMode()) {
      return this._mem._enforceMaxBytes?.();
    }

    const { totalBytes } = await this.stats();
    if (totalBytes <= this.maxBytes) return;

    try {
      const rows = await this._selectAll(
        'SELECT key, size FROM audio_cache ORDER BY created_at ASC',
        []
      );

      let running = totalBytes;
      for (const r of rows) {
        if (running <= this.maxBytes) break;
        this._db.exec('DELETE FROM audio_cache WHERE key = ?1;', { bind: [r.key] });
        running -= Number(r.size || 0);
      }
    } catch (e) {
      console.warn('[ttsCacheDao.sqlite] enforceMaxBytes failed:', e?.message || e);
    }
  }

  async _selectOne(sql, bind) {
    const rows = await this._selectAll(sql, bind);
    return rows[0] || null;
  }

  async _selectAll(sql, bind) {
    if (!this._db) return [];
    const rows = [];
    this._db.exec({
      sql,
      bind,
      rowMode: 'object',
      callback: (row) => rows.push(row)
    });
    return rows;
  }

  async _toBlob(input) {
    if (input instanceof Blob) return input;
    if (input instanceof Uint8Array) return new Blob([input], { type: 'audio/wav' });
    if (input instanceof ArrayBuffer) return new Blob([new Uint8Array(input)], { type: 'audio/wav' });
    return new Blob([input], { type: 'audio/wav' });
  }
}

export default TtsCacheDaoSqlite;