import { localDateKey } from './dates';

// Shape of a time-entry row (with optional joined member/project) as returned
// from Supabase for the dashboard aggregations.
// Supabase can type a to-one relation as either an object or a single-element
// array depending on the query, so accept both and normalize.
type Rel<T> = T | T[] | null | undefined;
const one = <T>(v: Rel<T>): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

export interface RawEntry {
  member_id: string;
  started_at: string;
  stopped_at: string | null;
  activity_percent?: number | null;
  hg_members?: Rel<{ full_name?: string | null }>;
  hg_projects?: Rel<{ name?: string | null }>;
}

type Interval = { started_at: string; stopped_at: string | null };

export interface MemberSummary {
  memberId: string;
  name: string;
  hours: number;
  avgActivity: number;
}

export interface ProjectSummary {
  name: string;
  seconds: number;
}

export interface DaySummary {
  members: MemberSummary[];
  projects: ProjectSummary[]; // sorted by seconds desc
  totalHours: number;
}

const seconds = (start: string, end: string) =>
  (new Date(end).getTime() - new Date(start).getTime()) / 1000;

// Summarize entries for a single period (e.g. today). Only completed intervals
// (those with a stopped_at) contribute to hours and the activity average, so an
// in-progress row can't dilute the average or a null activity skew it to NaN.
export function summarizeEntries(entries: RawEntry[]): DaySummary {
  const byMember = new Map<string, { name: string; seconds: number; activitySum: number; count: number }>();
  const byProject = new Map<string, number>();
  let totalSecs = 0;

  for (const e of entries) {
    const name = one(e.hg_members)?.full_name ?? 'Unknown';
    const m = byMember.get(e.member_id) ?? { name, seconds: 0, activitySum: 0, count: 0 };
    if (e.stopped_at) {
      const s = seconds(e.started_at, e.stopped_at);
      m.seconds += s;
      totalSecs += s;
      m.activitySum += e.activity_percent ?? 0;
      m.count++;
      const pName = one(e.hg_projects)?.name ?? 'No project';
      byProject.set(pName, (byProject.get(pName) ?? 0) + s);
    }
    byMember.set(e.member_id, m);
  }

  const members: MemberSummary[] = Array.from(byMember.entries()).map(([memberId, m]) => ({
    memberId,
    name: m.name,
    hours: Math.round((m.seconds / 3600) * 10) / 10,
    avgActivity: m.count > 0 ? Math.round(m.activitySum / m.count) : 0,
  }));

  const projects: ProjectSummary[] = Array.from(byProject.entries())
    .map(([name, secs]) => ({ name, seconds: secs }))
    .sort((a, b) => b.seconds - a.seconds);

  return {
    members,
    projects,
    totalHours: Math.round((totalSecs / 3600) * 10) / 10,
  };
}

// Sum completed-interval seconds per LOCAL calendar day, keyed "YYYY-MM-DD".
export function sumSecondsByLocalDay(entries: Interval[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (!e.stopped_at) continue;
    const key = localDateKey(new Date(e.started_at));
    map.set(key, (map.get(key) ?? 0) + seconds(e.started_at, e.stopped_at));
  }
  return map;
}
