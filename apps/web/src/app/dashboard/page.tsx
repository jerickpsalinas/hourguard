'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function DashboardPage() {
  const supabase = createClient();
  const [summary, setSummary] = useState<any[]>([]);
  const [stats, setStats] = useState({ members: 0, projects: 0, totalHours: 0 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('hg_members')
        .select('organization_id')
        .eq('auth_user_id', user.id)
        .single();
      if (!member) return;

      const orgId = member.organization_id;
      const today = new Date().toISOString().split('T')[0];

      const [
        { data: entries },
        { count: memberCount },
        { count: projectCount },
      ] = await Promise.all([
        supabase
          .from('hg_time_entries')
          .select('member_id, started_at, stopped_at, activity_percent, hg_members(full_name)')
          .eq('organization_id', orgId)
          .gte('started_at', `${today}T00:00:00`)
          .order('started_at', { ascending: false }),
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

      const userTotals = new Map<string, { name: string; seconds: number; avgActivity: number; count: number }>();
      let totalSecs = 0;

      for (const entry of entries ?? []) {
        const name = (entry as any).hg_members?.full_name ?? 'Unknown';
        const existing = userTotals.get(entry.member_id) ?? { name, seconds: 0, avgActivity: 0, count: 0 };
        if (entry.stopped_at) {
          const secs = (new Date(entry.stopped_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
          existing.seconds += secs;
          totalSecs += secs;
        }
        existing.avgActivity += entry.activity_percent;
        existing.count++;
        userTotals.set(entry.member_id, existing);
      }

      setSummary(
        Array.from(userTotals.values()).map((u) => ({
          ...u,
          hours: (u.seconds / 3600).toFixed(1),
          avgActivity: u.count > 0 ? Math.round(u.avgActivity / u.count) : 0,
        }))
      );
      setStats({
        members: memberCount ?? 0,
        projects: projectCount ?? 0,
        totalHours: Math.round((totalSecs / 3600) * 10) / 10,
      });
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Today&apos;s Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Total Hours Today</p>
          <p className="text-2xl font-bold mt-1">{stats.totalHours}h</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Active Members</p>
          <p className="text-2xl font-bold mt-1">{stats.members}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Active Projects</p>
          <p className="text-2xl font-bold mt-1">{stats.projects}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Activity by Member</h2>
      <div className="grid gap-3">
        {summary.length === 0 && (
          <p className="text-slate-400">No time tracked today.</p>
        )}
        {summary.map((user, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-slate-400">{user.hours}h tracked</p>
            </div>
            <div className="text-right">
              <p className="text-sm">Activity: {user.avgActivity}%</p>
              <div className="mt-1 h-2 w-24 rounded-full bg-slate-700">
                <div
                  className="h-2 rounded-full bg-green-500 transition-all"
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
