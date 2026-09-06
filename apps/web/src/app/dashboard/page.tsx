'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { localDateKey, localDayBounds } from '@/lib/dates';
import { EmptyState } from '@/components/empty-state';

type DayBar = { label: string; hours: number };
type ProjectTotal = { name: string; hours: number };

export default function DashboardPage() {
  const supabase = createClient();
  const { member } = useAuth();
  const [summary, setSummary] = useState<any[]>([]);
  const [stats, setStats] = useState({ members: 0, projects: 0, totalHours: 0 });
  const [weekBars, setWeekBars] = useState<DayBar[]>([]);
  const [topProjects, setTopProjects] = useState<ProjectTotal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) return;
    const orgId = member.organizationId;
    const now = new Date();
    const todayBounds = localDayBounds(localDateKey(now));
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekStartISO = localDayBounds(localDateKey(weekAgo)).startISO;

    (async () => {
      const [entriesResult, weekResult, membersResult, projectsResult] = await Promise.all([
        supabase
          .from('hg_time_entries')
          .select('member_id, started_at, stopped_at, activity_percent, hg_members(full_name), hg_projects(name)')
          .eq('organization_id', orgId)
          .gte('started_at', todayBounds.startISO)
          .lte('started_at', todayBounds.endISO)
          .order('started_at', { ascending: false }),
        supabase
          .from('hg_time_entries')
          .select('started_at, stopped_at')
          .eq('organization_id', orgId)
          .not('stopped_at', 'is', null)
          .gte('started_at', weekStartISO),
        supabase
          .from('hg_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('is_active', true),
        supabase
          .from('hg_projects')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('is_active', true),
      ]);

      const entries = entriesResult.data;
      const memberCount = membersResult.count;
      const projectCount = projectsResult.count;

      const userTotals = new Map<string, { name: string; seconds: number; avgActivity: number; count: number }>();
      const projectSecs = new Map<string, number>();
      let totalSecs = 0;

      for (const entry of entries ?? []) {
        const name = (entry as any).hg_members?.full_name ?? 'Unknown';
        const existing = userTotals.get(entry.member_id) ?? { name, seconds: 0, avgActivity: 0, count: 0 };
        // Only completed intervals contribute to hours and to the activity average,
        // so an in-progress row can't dilute the average or a null skew it to NaN.
        if (entry.stopped_at) {
          const secs = (new Date(entry.stopped_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
          existing.seconds += secs;
          totalSecs += secs;
          const pName = (entry as any).hg_projects?.name ?? 'No project';
          projectSecs.set(pName, (projectSecs.get(pName) ?? 0) + secs);
          existing.avgActivity += entry.activity_percent ?? 0;
          existing.count++;
        }
        userTotals.set(entry.member_id, existing);
      }

      // Last 7 days daily totals
      const dayMap = new Map<string, number>();
      for (const e of weekResult.data ?? []) {
        const key = localDateKey(new Date(e.started_at));
        const secs = (new Date(e.stopped_at!).getTime() - new Date(e.started_at).getTime()) / 1000;
        dayMap.set(key, (dayMap.get(key) ?? 0) + secs);
      }
      const bars: DayBar[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = localDateKey(d);
        bars.push({
          label: d.toLocaleDateString(undefined, { weekday: 'short' }),
          hours: Math.round(((dayMap.get(key) ?? 0) / 3600) * 10) / 10,
        });
      }

      setSummary(
        Array.from(userTotals.values()).map((u) => ({
          ...u,
          hours: (u.seconds / 3600).toFixed(1),
          avgActivity: u.count > 0 ? Math.round(u.avgActivity / u.count) : 0,
        }))
      );
      setWeekBars(bars);
      setTopProjects(
        Array.from(projectSecs.entries())
          .map(([name, secs]) => ({ name, hours: Math.round((secs / 3600) * 10) / 10 }))
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 5)
      );
      setStats({
        members: memberCount ?? 0,
        projects: projectCount ?? 0,
        totalHours: Math.round((totalSecs / 3600) * 10) / 10,
      });
      setLoading(false);
    })();
  }, [member]);

  const maxBar = Math.max(1, ...weekBars.map((b) => b.hours));
  const maxProject = Math.max(1, ...topProjects.map((p) => p.hours));

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">Today&apos;s Overview</h1>
      <p className="text-sm text-white/40 font-mono text-xs tracking-wider uppercase mb-6">// dashboard</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Hours Today', value: `${stats.totalHours}h` },
          { label: 'Active Members', value: stats.members },
          { label: 'Active Projects', value: stats.projects },
        ].map((card) => (
          <div key={card.label} className="glass-card p-5">
            <p className="text-sm text-white/40">{card.label}</p>
            <p className={`text-2xl font-display font-bold mt-1 ${loading ? 'animate-pulse text-white/20' : ''}`}>
              {loading ? '—' : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 7-day hours trend */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-display font-semibold mb-4">Hours — Last 7 Days</h2>
          {loading ? (
            <div className="h-32 animate-pulse rounded-xl bg-white/[0.04]" />
          ) : (
            <div className="flex items-end justify-between gap-2 h-32">
              {weekBars.map((b, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-brand/70 hover:bg-brand transition-all"
                      style={{ height: `${Math.max(2, (b.hours / maxBar) * 100)}%` }}
                      title={`${b.hours}h`}
                    />
                  </div>
                  <span className="text-[10px] text-white/40">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top projects today */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-display font-semibold mb-4">Top Projects Today</h2>
          {loading ? (
            <div className="h-32 animate-pulse rounded-xl bg-white/[0.04]" />
          ) : topProjects.length === 0 ? (
            <p className="text-sm text-white/40">No tracked project time today.</p>
          ) : (
            <div className="space-y-3">
              {topProjects.map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70 truncate">{p.name}</span>
                    <span className="text-white/40">{p.hours}h</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${(p.hours / maxProject) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <h2 className="text-lg font-display font-semibold mb-4">Activity by Member</h2>
      <div className="grid gap-3">
        {!loading && summary.length === 0 && (
          <EmptyState
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            title="No time tracked today"
            description="Once your team starts tracking with the desktop app, their hours and activity show up here."
          />
        )}
        {summary.map((user, i) => (
          <div key={i} className="flex items-center justify-between glass-card p-4">
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-white/40">{user.hours}h tracked</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/70">Activity: {user.avgActivity}%</p>
              <div className="mt-1 h-2 w-24 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-brand transition-all"
                  style={{ width: `${user.avgActivity}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
