// Formatting helpers shared across the dashboard.

// Format a monetary amount using the browser's locale and the invoice's currency.
// Falls back to a plain prefixed number if the currency code is unknown.
export function formatCurrency(amount: number, currency = 'USD'): string {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

// Compact hours label, e.g. 3.5 -> "3.5h".
export function formatHours(hours: number): string {
  return `${(Number(hours) || 0).toFixed(1)}h`;
}

// Duration between two timestamps as "Hh Mm". Returns "In progress" for an
// entry with no end, and clamps negatives (bad data) to "0h 0m".
export function formatDuration(startISO: string, endISO: string | null): string {
  if (!endISO) return 'In progress';
  const secs = (new Date(endISO).getTime() - new Date(startISO).getTime()) / 1000;
  if (!Number.isFinite(secs) || secs < 0) return '0h 0m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}
