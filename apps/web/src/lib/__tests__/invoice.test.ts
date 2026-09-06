import { describe, it, expect } from 'vitest';
import { computeInvoiceTotals, validateInvoiceInput, BillableInterval } from '../invoice';

describe('validateInvoiceInput', () => {
  it('accepts a valid body and coerces the rate', () => {
    const r = validateInvoiceInput({ from_date: '2026-06-01', to_date: '2026-06-30', hourly_rate: '50' });
    expect(r).toEqual({ ok: true, value: { from_date: '2026-06-01', to_date: '2026-06-30', hourly_rate: 50 } });
  });
  it('requires from_date and to_date', () => {
    expect(validateInvoiceInput({ to_date: '2026-06-30', hourly_rate: 10 }).ok).toBe(false);
    expect(validateInvoiceInput({ from_date: '2026-06-01', hourly_rate: 10 }).ok).toBe(false);
  });
  it('rejects a negative or non-numeric rate', () => {
    expect(validateInvoiceInput({ from_date: 'a', to_date: 'b', hourly_rate: -1 }).ok).toBe(false);
    expect(validateInvoiceInput({ from_date: 'a', to_date: 'b', hourly_rate: 'abc' }).ok).toBe(false);
  });
  it('accepts a zero rate', () => {
    expect(validateInvoiceInput({ from_date: 'a', to_date: 'b', hourly_rate: 0 }).ok).toBe(true);
  });
});

const iv = (startISO: string, hours: number | null): BillableInterval => ({
  started_at: startISO,
  stopped_at: hours === null ? null : new Date(new Date(startISO).getTime() + hours * 3600_000).toISOString(),
});

describe('computeInvoiceTotals', () => {
  it('sums completed hours and multiplies by rate', () => {
    const r = computeInvoiceTotals([iv('2026-06-01T09:00:00Z', 2), iv('2026-06-01T13:00:00Z', 3)], 50);
    expect(r.totalHours).toBe(5);
    expect(r.totalAmount).toBe(250);
  });

  it('ignores in-progress intervals', () => {
    const r = computeInvoiceTotals([iv('2026-06-01T09:00:00Z', 2), iv('2026-06-01T12:00:00Z', null)], 100);
    expect(r.totalHours).toBe(2);
    expect(r.totalAmount).toBe(200);
  });

  it('rounds hours and amount to two decimals', () => {
    // 25 minutes = 0.4166… h -> 0.42
    const r = computeInvoiceTotals([iv('2026-06-01T09:00:00Z', 25 / 60)], 90);
    expect(r.totalHours).toBe(0.42);
    expect(r.totalAmount).toBe(37.8); // 0.42 * 90
  });

  it('returns zeros for no entries', () => {
    expect(computeInvoiceTotals([], 50)).toEqual({ totalHours: 0, totalAmount: 0 });
  });
});
