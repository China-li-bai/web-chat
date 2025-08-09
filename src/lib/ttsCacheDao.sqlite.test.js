// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { TtsCacheDaoSqlite } from './ttsCacheDao.sqlite.js';

async function blobBytes(blob) {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

describe('TtsCacheDaoSqlite (memory-forced TDD)', () => {
  let dao;

  beforeEach(async () => {
    // Force memory path to ensure tests run in Node/jsdom without WASM/IDB
    dao = new TtsCacheDaoSqlite({ maxBytes: 1024, forceMemory: true });
    await dao.init();
  });

  it('put/get works and preserves bytes', async () => {
    const bytes = new Uint8Array([10, 20, 30]);
    const blob = new Blob([bytes], { type: 'audio/wav' });

    await dao.put({
      key: 'sqlite-k1',
      text: 'foo',
      voiceStyle: 'professional',
      lang: 'en-US',
      provider: 'gemini',
      version: 'v1',
      audioBlob: blob,
      createdAt: 1234
    });

    const hit = await dao.get('sqlite-k1');
    expect(hit).not.toBeNull();
    expect(hit.meta.key).toBe('sqlite-k1');
    expect(hit.meta.text).toBe('foo');
    expect(hit.meta.voiceStyle).toBe('professional');
    expect(hit.meta.lang).toBe('en-US');
    expect(hit.meta.createdAt).toBe(1234);
    expect(hit.meta.size).toBe(bytes.length);

    const got = await blobBytes(hit.audioBlob);
    expect(Array.from(got)).toEqual(Array.from(bytes));
  });

  it('evicts oldest when exceeding maxBytes', async () => {
    const b1 = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' }); // 3
    const b2 = new Blob([new Uint8Array([4, 5, 6])], { type: 'audio/wav' }); // 3

    const small = new TtsCacheDaoSqlite({ maxBytes: 5, forceMemory: true });
    await small.init();

    await small.put({ key: 'a', text: 't', voiceStyle: 's', lang: 'en', audioBlob: b1, createdAt: 1 });
    await small.put({ key: 'b', text: 't', voiceStyle: 's', lang: 'en', audioBlob: b2, createdAt: 2 });

    expect(await small.get('a')).toBeNull();
    expect(await small.get('b')).not.toBeNull();

    const s = await small.stats();
    expect(s.count).toBe(1);
    expect(s.totalBytes).toBe(3);
  });

  it('clearExpired and clearAll behave correctly', async () => {
    const b = new Blob([new Uint8Array([7])], { type: 'audio/wav' });

    await dao.put({ key: 'x', text: 't', voiceStyle: 's', lang: 'en', audioBlob: b, createdAt: 100 });
    await dao.put({ key: 'y', text: 't', voiceStyle: 's', lang: 'en', audioBlob: b, createdAt: 200 });

    await dao.clearExpired(150);
    expect(await dao.get('x')).toBeNull();
    expect(await dao.get('y')).not.toBeNull();

    await dao.clearAll();
    const stats = await dao.stats();
    expect(stats.count).toBe(0);
    expect(stats.totalBytes).toBe(0);
  });
});