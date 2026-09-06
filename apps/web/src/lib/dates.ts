// Date helpers that respect the viewer's LOCAL day boundaries.
//
// Time columns are `timestamptz`. Deriving a day with `toISOString().split('T')[0]`
// uses the UTC calendar day, so for any non-UTC user the "day" is offset — e.g. a
// PST user at 6pm is already "tomorrow" in UTC. These helpers build the correct
// UTC *instants* for the start/end of a local calendar day and a stable local
// day key for grouping.

// "YYYY-MM-DD" for a date in LOCAL time (not UTC).
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Given a "YYYY-MM-DD" local date string, return the UTC ISO instants bounding
// that full local day: [00:00:00.000, 23:59:59.999].
export function localDayBounds(dateStr: string): { startISO: string; endISO: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

// UTC ISO bounds spanning a local date range (from start-of-`from` to end-of-`to`).
export function localRangeBounds(fromStr: string, toStr: string): { startISO: string; endISO: string } {
  return {
    startISO: localDayBounds(fromStr).startISO,
    endISO: localDayBounds(toStr).endISO,
  };
}
