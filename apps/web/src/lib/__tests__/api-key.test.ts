import { describe, it, expect } from 'vitest';
import { sha256Hex, generateApiKey } from '../api-key';

describe('sha256Hex', () => {
  it('matches the known SHA-256 vector for "abc"', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('is deterministic', async () => {
    expect(await sha256Hex('hg_test')).toBe(await sha256Hex('hg_test'));
  });
});

describe('generateApiKey', () => {
  it('produces an hg_-prefixed, hex, unique key', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a).toMatch(/^hg_[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });
});
