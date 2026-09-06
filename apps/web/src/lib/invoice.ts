// Canonical invoice math, shared by the dashboard generator and the REST API so
// both produce identical totals.

export interface BillableInterval {
  started_at: string;
  stopped_at: string | null;
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
