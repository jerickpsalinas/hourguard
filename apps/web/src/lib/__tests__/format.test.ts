import { describe, it, expect } from 'vitest';
import { formatCurrency, formatHours, formatDuration } from '../format';

describe('formatCurrency', () => {
  it('formats USD with two decimals', () => {
    // Non-breaking space / symbol placement varies by ICU, so assert on parts.
    const out = formatCurrency(1234.5, 'USD');
    expect(out).toMatch(/1,234\.50/);
    expect(out).toMatch(/\$/);
  });

  it('defaults to USD and coerces non-numbers to 0', () => {
    expect(formatCurrency(NaN)).toMatch(/0\.00/);
    expect(formatCurrency(0)).toMatch(/0\.00/);
  });

  it('falls back gracefully for an unknown currency code', () => {
    const out = formatCurrency(10, 'NOTACURRENCY');
    expect(out).toContain('NOTACURRENCY');
    expect(out).toContain('10.00');
  });
});

describe('formatHours', () => {
  it('formats to one decimal with an h suffix', () => {
    expect(formatHours(3)).toBe('3.0h');
    expect(formatHours(3.456)).toBe('3.5h');
    expect(formatHours(0)).toBe('0.0h');
  });
});

describe('formatDuration', () => {
  const start = '2026-06-01T09:00:00Z';
  it('formats hours and minutes', () => {
    expect(formatDuration(start, '2026-06-01T11:30:00Z')).toBe('2h 30m');
    expect(formatDuration(start, '2026-06-01T09:05:00Z')).toBe('0h 5m');
  });
  it('returns "In progress" when there is no end', () => {
    expect(formatDuration(start, null)).toBe('In progress');
  });
  it('clamps negative/invalid durations to 0h 0m', () => {
    expect(formatDuration('2026-06-01T11:00:00Z', '2026-06-01T09:00:00Z')).toBe('0h 0m');
  });
});
