// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TTSWithCache } from './ttsWithCache.js';
import { TtsCacheDaoMemory } from '../lib/ttsCacheDao.memory.js';

async function blobToBytes(blob) {
  const buf = await blob.arrayBuffer();
  return Array.from(new Uint8Array(buf));
}

describe('TTSWithCache', () => {
  let dao;
  let svc;

  beforeEach(async () => {
    dao = new TtsCacheDaoMemory({ maxBytes: 1024 * 1024 });
    svc = new TTSWithCache(dao);
    await dao.init();
  });

  it('cache miss - generate - then hit uses cache and generator only called once', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const gen = vi.fn(async () => ({
      audioBlob: new Blob([bytes], { type: 'audio/wav' }),
      mimeType: 'audio/wav',
      style: 'professional'
    }));

    const params = {
      text: 'Hello world',
      voiceStyle: 'professional',
      lang: 'en-US',
      provider: 'gemini',
      version: 'v1'
    };

    // First time: miss -> network
    const r1 = await svc.getOrGenerate(params, gen);
    expect(r1.source).toBe('network');
    expect(await blobToBytes(r1.audioBlob)).toEqual(Array.from(bytes));
    expect(gen).toHaveBeenCalledTimes(1);

    // Second time: hit -> cache, no new generator call
    const r2 = await svc.getOrGenerate(params, gen);
    expect(r2.source).toBe('cache');
    expect(await blobToBytes(r2.audioBlob)).toEqual(Array.from(bytes));
    expect(gen).toHaveBeenCalledTimes(1);
  });

  it('different voiceStyle should generate new audio (cache miss)', async () => {
    const gen = vi.fn(async () => ({
      audioBlob: new Blob([new Uint8Array([9])], { type: 'audio/wav' })
    }));

    const base = { text: 'Hello world', lang: 'en-US', provider: 'gemini', version: 'v1' };
    const p1 = { ...base, voiceStyle: 'professional' };
    const p2 = { ...base, voiceStyle: 'cheerful' };

    await svc.getOrGenerate(p1, gen);
    await svc.getOrGenerate(p2, gen);

    expect(gen).toHaveBeenCalledTimes(2);
  });

  it('clearAll removes cache and forces regeneration', async () => {
    const gen = vi.fn(async () => ({
      audioBlob: new Blob([new Uint8Array([7])], { type: 'audio/wav' })
    }));

    const params = { text: 'Hi', voiceStyle: 'professional', lang: 'en-US', provider: 'gemini', version: 'v1' };

    await svc.getOrGenerate(params, gen);
    expect(gen).toHaveBeenCalledTimes(1);

    await svc.clearAll();

    await svc.getOrGenerate(params, gen);
    expect(gen).toHaveBeenCalledTimes(2);
  });
});