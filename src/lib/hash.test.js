import { describe, it, expect } from 'vitest';
import { normalizeText, sha256Hex, buildTtsKey } from './hash.js';

describe('hash utils', () => {
  it('normalizeText collapses whitespace and trims', () => {
    expect(normalizeText('  hello   world  ')).toBe('hello world');
    expect(normalizeText('\nfoo\tbar  baz \t')).toBe('foo bar baz');
    expect(normalizeText('')).toBe('');
    expect(normalizeText(null)).toBe('');
  });

  it('sha256Hex returns 64-char hex and is stable', async () => {
    const a = await sha256Hex('hello');
    const b = await sha256Hex('hello');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('buildTtsKey changes when voiceStyle changes', async () => {
    const base = { text: 'Hello world!', voiceStyle: 'professional', lang: 'en-US', provider: 'gemini', version: 'v1' };
    const k1 = await buildTtsKey(base);
    const k2 = await buildTtsKey({ ...base, voiceStyle: 'cheerful' });
    expect(k1).not.toBe(k2);
  });

  it('buildTtsKey changes when lang changes', async () => {
    const base = { text: 'Hello world!', voiceStyle: 'professional', lang: 'en-US', provider: 'gemini', version: 'v1' };
    const k1 = await buildTtsKey(base);
    const k2 = await buildTtsKey({ ...base, lang: 'en-GB' });
    expect(k1).not.toBe(k2);
  });

  it('buildTtsKey changes when provider/version changes', async () => {
    const base = { text: 'Hello world!', voiceStyle: 'professional', lang: 'en-US', provider: 'gemini', version: 'v1' };
    const k1 = await buildTtsKey(base);
    const k2 = await buildTtsKey({ ...base, provider: 'gemini', version: 'v2' });
    const k3 = await buildTtsKey({ ...base, provider: 'another', version: 'v1' });
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k2).not.toBe(k3);
  });

  it('buildTtsKey is robust to text whitespace differences', async () => {
    const p1 = { text: 'Hello   world!', voiceStyle: 'professional', lang: 'en-US', provider: 'gemini', version: 'v1' };
    const p2 = { text: '  Hello world!  ', voiceStyle: 'professional', lang: 'en-US', provider: 'gemini', version: 'v1' };
    const k1 = await buildTtsKey(p1);
    const k2 = await buildTtsKey(p2);
    expect(k1).toBe(k2);
  });
});