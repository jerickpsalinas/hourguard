import { describe, it, expect } from 'vitest';
import { paginateParams } from '../auth';

describe('paginateParams', () => {
  it('defaults to page 1, limit 50, offset 0', () => {
    expect(paginateParams(null, null)).toEqual({ page: 1, limit: 50, offset: 0 });
  });

  it('computes offset from page and limit', () => {
    expect(paginateParams('3', '10')).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it('clamps limit to [1, 100]', () => {
    expect(paginateParams('1', '500').limit).toBe(100);
    expect(paginateParams('1', '0').limit).toBe(1);
    expect(paginateParams('1', '-5').limit).toBe(1);
  });

  it('clamps page to a minimum of 1', () => {
    expect(paginateParams('0', '10').page).toBe(1);
    expect(paginateParams('-2', '10').page).toBe(1);
  });

  it('falls back to defaults for non-numeric input (no NaN)', () => {
    const r = paginateParams('abc', 'xyz');
    expect(r).toEqual({ page: 1, limit: 50, offset: 0 });
    expect(Number.isNaN(r.offset)).toBe(false);
  });
});
