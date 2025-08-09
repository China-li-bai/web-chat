import { describe, it, expect, beforeEach } from 'vitest';
import { TtsCacheDaoMemory } from './ttsCacheDao.memory.js';

async function blobBytes(blob) {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

describe('TtsCacheDaoMemory', () => {
  let dao;

  beforeEach(async () => {
    dao = new TtsCacheDaoMemory({ maxBytes: 1024 * 1024 });
    await dao.init();
  });

  it('put/get works with Blob and preserves bytes', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const blob = new Blob([bytes], { type: 'audio/wav' });

    await dao.put({
      key: 'k1',
      text: 'Hello',
      voiceStyle: 'professional',
      lang: 'en-US',
      provider: 'gemini',
      version: 'v1',
      audioBlob: blob,
      createdAt: 1000
    });

    const hit = await dao.get('k1');
    expect(hit).not.toBeNull();
    expect(hit.meta.key).toBe('k1');
    expect(hit.meta.text).toBe('Hello');
    expect(hit.meta.voiceStyle).toBe('professional');
    expect(hit.meta.lang).toBe('en-US');
    expect(hit.meta.size).toBe(bytes.length);

    const gotBytes = await blobBytes(hit.audioBlob);
    expect(Array.from(gotBytes)).toEqual(Array.from(bytes));

    const stats = await dao.stats();
    expect(stats.count).toBe(1);
    expect(stats.totalBytes).toBe(bytes.length);
  });

  it('evicts oldest when exceeding maxBytes', async () => {
    const daoSmall = new TtsCacheDaoMemory({ maxBytes: 5 });
    await daoSmall.init();

    const b1 = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' }); // size 3
    const b2 = new Blob([new Uint8Array([4, 5, 6])], { type: 'audio/wav' }); // size 3

    await daoSmall.put({ key: 'k1', text: 't1', voiceStyle: 's', lang: 'en', provider: 'p', version: 'v', audioBlob: b1, createdAt: 1 });
    await daoSmall.put({ key: 'k2', text: 't2', voiceStyle: 's', lang: 'en', provider: 'p', version: 'v', audioBlob: b2, createdAt: 2 });

    const hit1 = await daoSmall.get('k1');
    const hit2 = await daoSmall.get('k2');

    expect(hit1).toBeNull(); // evicted
    expect(hit2).not.toBeNull(); // kept
    const stats = await daoSmall.stats();
    expect(stats.count).toBe(1);
    expect(stats.totalBytes).toBe(3);
  });

  it('clearExpired removes items older than threshold', async () => {
    const b = new Blob([new Uint8Array([1])], { type: 'audio/wav' });

    await dao.put({ key: 'a', text: 't', voiceStyle: 's', lang: 'en', audioBlob: b, createdAt: 100 });
    await dao.put({ key: 'b', text: 't', voiceStyle: 's', lang: 'en', audioBlob: b, createdAt: 200 });
    await dao.put({ key: 'c', text: 't', voiceStyle: 's', lang: 'en', audioBlob: b, createdAt: 300 });

    await dao.clearExpired(250);

    expect(await dao.get('a')).toBeNull();
    expect(await dao.get('b')).toBeNull();
    expect(await dao.get('c')).not.toBeNull();

    const stats = await dao.stats();
    expect(stats.count).toBe(1);
    expect(stats.totalBytes).toBe(1);
  });

  it('clearAll resets the store', async () => {
    const b = new Blob([new Uint8Array([1, 2])], { type: 'audio/wav' });

    await dao.put({ key: 'x', text: 't', voiceStyle: 's', lang: 'en', audioBlob: b, createdAt: 1 });
    await dao.put({ key: 'y', text: 't', voiceStyle: 's', lang: 'en', audioBlob: b, createdAt: 2 });

    const before = await dao.stats();
    expect(before.count).toBe(2);

    await dao.clearAll();

    const after = await dao.stats();
    expect(after.count).toBe(0);
    expect(after.totalBytes).toBe(0);
  });

  it('put with same key updates record and totalBytes', async () => {
    const b1 = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' }); // size 3
    const b2 = new Blob([new Uint8Array([9])], { type: 'audio/wav' }); // size 1

    await dao.put({ key: 'same', text: 't', voiceStyle: 's', lang: 'en', audioBlob: b1, createdAt: 10 });
    let stats = await dao.stats();
    expect(stats.totalBytes).toBe(3);

    await dao.put({ key: 'same', text: 't', voiceStyle: 's', lang: 'en', audioBlob: b2, createdAt: 20 });
    stats = await dao.stats();
    expect(stats.totalBytes).toBe(1);

    const hit = await dao.get('same');
    expect(hit.meta.createdAt).toBe(20);
    const bytes = await blobBytes(hit.audioBlob);
    expect(Array.from(bytes)).toEqual([9]);
  });
});