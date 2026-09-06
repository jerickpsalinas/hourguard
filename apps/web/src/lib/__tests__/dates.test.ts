import { describe, it, expect } from 'vitest';
import { localDateKey, todayLocal, localDayBounds, localRangeBounds } from '../dates';

describe('localDateKey', () => {
  it('formats a local date as zero-padded YYYY-MM-DD', () => {
    // Constructed from local components, so this is deterministic in any timezone.
    expect(localDateKey(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 11, 31, 23, 30, 0))).toBe('2026-12-31');
  });
});

describe('todayLocal', () => {
  it('matches localDateKey(now)', () => {
    expect(todayLocal()).toBe(localDateKey(new Date()));
  });
});

describe('localDayBounds', () => {
  it('spans local midnight to local end-of-day for the given date', () => {
    const { startISO, endISO } = localDayBounds('2026-06-15');
    const start = new Date(startISO);
    const end = new Date(endISO);

    // Bounds land on the correct local day...
    expect(localDateKey(start)).toBe('2026-06-15');
    expect(localDateKey(end)).toBe('2026-06-15');

    // ...at the start and end of that local day.
    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0]);
    expect([end.getHours(), end.getMinutes(), end.getSeconds()]).toEqual([23, 59, 59]);

    // The returned values are UTC instants (ISO strings ending in Z).
    expect(startISO.endsWith('Z')).toBe(true);
    expect(new Date(endISO).getTime()).toBeGreaterThan(new Date(startISO).getTime());
  });
});

describe('localRangeBounds', () => {
  it('starts at the start of `from` and ends at the end of `to`', () => {
    const { startISO, endISO } = localRangeBounds('2026-06-01', '2026-06-30');
    expect(localDateKey(new Date(startISO))).toBe('2026-06-01');
    expect(localDateKey(new Date(endISO))).toBe('2026-06-30');
    expect(new Date(startISO).getHours()).toBe(0);
    expect(new Date(endISO).getHours()).toBe(23);
  });
});
