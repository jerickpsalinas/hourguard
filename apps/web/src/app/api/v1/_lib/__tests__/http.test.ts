import { describe, it, expect } from 'vitest';
import { isUuid } from '../http';

describe('isUuid', () => {
  it('accepts a valid v4-shaped UUID', () => {
    expect(isUuid('3f9a1c2e-1234-4abc-89ab-0123456789ab')).toBe(true);
  });
  it('rejects malformed or non-string input', () => {
    expect(isUuid('abc')).toBe(false);
    expect(isUuid('3f9a1c2e-1234-4abc-89ab-0123456789')).toBe(false); // too short
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid("' OR 1=1--")).toBe(false);
  });
});
