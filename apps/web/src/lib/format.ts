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
