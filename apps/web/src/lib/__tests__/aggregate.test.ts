import { describe, it, expect } from 'vitest';
import { summarizeEntries, sumSecondsByLocalDay, RawEntry } from '../aggregate';
import { localDateKey } from '../dates';

// Helper to build an entry spanning `hours` from a base time.
function entry(memberId: string, startISO: string, hours: number | null, opts: Partial<RawEntry> = {}): RawEntry {
  const start = new Date(startISO);
  const stopped_at = hours === null ? null : new Date(start.getTime() + hours * 3600_000).toISOString();
  return { member_id: memberId, started_at: startISO, stopped_at, ...opts };
}

describe('summarizeEntries', () => {
  it('sums hours per member and totals across members', () => {
    const res = summarizeEntries([
      entry('m1', '2026-06-15T09:00:00Z', 2, { hg_members: { full_name: 'Alice' }, activity_percent: 80 }),
      entry('m1', '2026-06-15T13:00:00Z', 1, { hg_members: { full_name: 'Alice' }, activity_percent: 60 }),
      entry('m2', '2026-06-15T09:00:00Z', 3, { hg_members: { full_name: 'Bob' }, activity_percent: 50 }),
    ]);
    expect(res.totalHours).toBe(6);
    const alice = res.members.find((m) => m.memberId === 'm1')!;
    expect(alice.name).toBe('Alice');
    expect(alice.hours).toBe(3);
    expect(alice.avgActivity).toBe(70); // (80 + 60) / 2
  });

  it('ignores in-progress entries in hours and activity average', () => {
    const res = summarizeEntries([
      entry('m1', '2026-06-15T09:00:00Z', 2, { activity_percent: 100 }),
      entry('m1', '2026-06-15T13:00:00Z', null, { activity_percent: 0 }), // in progress
    ]);
    const m = res.members.find((x) => x.memberId === 'm1')!;
    expect(m.hours).toBe(2);
    expect(m.avgActivity).toBe(100); // in-progress row excluded, not averaged in
  });

  it('never yields NaN when activity_percent is null', () => {
    const res = summarizeEntries([
      entry('m1', '2026-06-15T09:00:00Z', 1, { activity_percent: null }),
    ]);
    expect(res.members[0].avgActivity).toBe(0);
    expect(Number.isNaN(res.members[0].avgActivity)).toBe(false);
  });

  it('buckets project time and sorts projects by time desc', () => {
    const res = summarizeEntries([
      entry('m1', '2026-06-15T09:00:00Z', 1, { hg_projects: { name: 'Small' } }),
      entry('m1', '2026-06-15T10:00:00Z', 4, { hg_projects: { name: 'Big' } }),
      entry('m1', '2026-06-15T15:00:00Z', 2, {}), // no project
    ]);
    expect(res.projects[0].name).toBe('Big');
    expect(res.projects.map((p) => p.name)).toContain('No project');
  });

  it('returns zeros for no entries', () => {
    const res = summarizeEntries([]);
    expect(res.totalHours).toBe(0);
    expect(res.members).toEqual([]);
    expect(res.projects).toEqual([]);
  });
});

describe('sumSecondsByLocalDay', () => {
  it('accumulates completed seconds keyed by local day and skips in-progress', () => {
    const start = '2026-06-15T09:00:00Z';
    const map = sumSecondsByLocalDay([
      entry('m1', start, 1),
      entry('m1', start, 2),
      entry('m1', start, null), // skipped
    ]);
    const key = localDateKey(new Date(start));
    expect(map.get(key)).toBe(3 * 3600);
  });
});
