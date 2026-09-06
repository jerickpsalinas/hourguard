// Canonical invoice math, shared by the dashboard generator and the REST API so
// both produce identical totals.

export interface BillableInterval {
  started_at: string;
  stopped_at: string | null;
}

export interface InvoiceInput {
  from_date: string;
  to_date: string;
  hourly_rate: number;
}

// Validate an invoice request body. Returns the coerced input or an error string.
export function validateInvoiceInput(
  body: { from_date?: unknown; to_date?: unknown; hourly_rate?: unknown }
): { ok: true; value: InvoiceInput } | { ok: false; error: string } {
  const from_date = typeof body.from_date === 'string' ? body.from_date : '';
  const to_date = typeof body.to_date === 'string' ? body.to_date : '';
  if (!from_date || !to_date) {
    return { ok: false, error: 'from_date and to_date are required' };
  }
  const hourly_rate = Number(body.hourly_rate);
  if (!Number.isFinite(hourly_rate) || hourly_rate < 0) {
    return { ok: false, error: 'hourly_rate must be a non-negative number' };
  }
  return { ok: true, value: { from_date, to_date, hourly_rate } };
}

export function computeInvoiceTotals(entries: BillableInterval[], hourlyRate: number) {
  const totalSeconds = entries.reduce((sum, e) => {
    if (!e.stopped_at) return sum;
    return sum + (new Date(e.stopped_at).getTime() - new Date(e.started_at).getTime()) / 1000;
  }, 0);

  const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;
  const totalAmount = Math.round(totalHours * hourlyRate * 100) / 100;
  return { totalHours, totalAmount };
}
