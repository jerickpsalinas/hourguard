'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { SkeletonTable } from '@/components/skeleton';
import { toCsv, downloadCsv } from '@/lib/csv';
import { formatDuration, formatHours } from '@/lib/format';
import { localDateKey, localRangeBounds } from '@/lib/dates';

export default function TimesheetsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [memberFilter, setMemberFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return localDateKey(d);
  });
  const [toDate, setToDate] = useState(() => localDateKey(new Date()));
  const supabase = createClient();
  const { member, isAdmin } = useAuth();

  // Load filter options once (members only matter for managers; RLS limits
  // employees to their own entries regardless).
  useEffect(() => {
    if (!member) return;
    (async () => {
      const [{ data: proj }, { data: mem }] = await Promise.all([
        supabase.from('hg_projects').select('id, name').eq('organization_id', member.organizationId).order('name'),
        isAdmin
          ? supabase.from('hg_members').select('id, full_name').eq('organization_id', member.organizationId).order('full_name')
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setProjects(proj ?? []);
      setMembers(mem ?? []);
    })();
  }, [member, isAdmin]);

  // Filters hold IDs scoped to one org — clear them when the active org changes
  // so a stale member/project id can't constrain the query to a foreign record.
  const orgId = member?.organizationId;
  useEffect(() => {
    setMemberFilter('');
    setProjectFilter('');
  }, [orgId]);

  useEffect(() => {
    if (!member) return;
    let ignore = false;
    setLoading(true);

    (async () => {
      const { startISO, endISO } = localRangeBounds(fromDate, toDate);
      let query = supabase
        .from('hg_time_entries')
        .select('*, hg_members(full_name), hg_projects(name)')
        .eq('organization_id', member.organizationId)
        .gte('started_at', startISO)
        .lte('started_at', endISO)
        .order('started_at', { ascending: false })
        .limit(100);

      if (memberFilter) query = query.eq('member_id', memberFilter);
      if (projectFilter) query = query.eq('project_id', projectFilter);

      const { data } = await query;
      if (ignore) return;
      setEntries(data ?? []);
      setLoading(false);
    })();

    return () => { ignore = true; };
  }, [member, fromDate, toDate, memberFilter, projectFilter]);

  function exportCsv() {
    const rows = entries.map((entry) => [
      (entry as any).hg_members?.full_name ?? '',
      (entry as any).hg_projects?.name ?? '',
      new Date(entry.started_at).toLocaleString(),
      entry.stopped_at ? new Date(entry.stopped_at).toLocaleString() : '',
      formatDuration(entry.started_at, entry.stopped_at),
      `${entry.activity_percent}%`,
    ]);
    const csv = toCsv(
      ['Employee', 'Project', 'Started', 'Stopped', 'Duration', 'Activity'],
      rows
    );
    downloadCsv(`timesheets_${fromDate}_to_${toDate}.csv`, csv);
  }

  const totals = entries.reduce(
    (acc, e) => {
      if (e.stopped_at) {
        acc.seconds += (new Date(e.stopped_at).getTime() - new Date(e.started_at).getTime()) / 1000;
        acc.activitySum += e.activity_percent ?? 0;
        acc.completed += 1;
      }
      return acc;
    },
    { seconds: 0, activitySum: 0, completed: 0 }
  );
  const totalHoursStr = formatHours(totals.seconds / 3600);
  const avgActivity = totals.completed > 0 ? Math.round(totals.activitySum / totals.completed) : 0;

  const inputClass = 'rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors';

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">Timesheets</h1>
      <p className="text-sm text-white/40 font-mono text-xs tracking-wider uppercase mb-6">// time entries</p>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} max={toDate} className={inputClass} aria-label="From date" />
        <span className="text-white/30 text-sm">to</span>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} min={fromDate} className={inputClass} aria-label="To date" />
        {isAdmin && (
          <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className={inputClass} aria-label="Filter by member">
            <option value="">All members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        )}
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={inputClass} aria-label="Filter by project">
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={exportCsv}
          disabled={loading || entries.length === 0}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Hours</p>
            <p className="text-xl font-display font-bold">{totalHoursStr}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Entries</p>
            <p className="text-xl font-display font-bold">{entries.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Avg Activity</p>
            <p className="text-xl font-display font-bold">{avgActivity}%</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto glass-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Employee</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Project</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Date</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Duration</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {loading ? (
              <tr><td colSpan={5} className="p-0"><SkeletonTable rows={5} cols={5} /></td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-white/40">No time entries for this period.</td></tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">{(entry as any).hg_members?.full_name}</td>
                  <td className="px-4 py-3 text-white/50">{(entry as any).hg_projects?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-white/50">{new Date(entry.started_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{formatDuration(entry.started_at, entry.stopped_at)}</td>
                  <td className="px-4 py-3">{entry.activity_percent}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
