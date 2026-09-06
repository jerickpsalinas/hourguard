'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';

export default function TimesheetsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const supabase = createClient();
  const { member } = useAuth();

  useEffect(() => {
    if (!member) return;
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from('hg_time_entries')
        .select('*, hg_members(full_name), hg_projects(name)')
        .eq('organization_id', member.organizationId)
        .gte('started_at', `${fromDate}T00:00:00`)
        .lte('started_at', `${toDate}T23:59:59`)
        .order('started_at', { ascending: false })
        .limit(100);

      setEntries(data ?? []);
      setLoading(false);
    })();
  }, [member, fromDate, toDate]);

  function formatDuration(start: string, end: string | null) {
    if (!end) return 'In progress';
    const secs = (new Date(end).getTime() - new Date(start).getTime()) / 1000;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Timesheets</h1>
      <div className="flex gap-4 mb-6">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="text-left px-4 py-3">Employee</th>
              <th className="text-left px-4 py-3">Project</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Duration</th>
              <th className="text-left px-4 py-3">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No time entries for this period.</td></tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-3">{(entry as any).hg_members?.full_name}</td>
                  <td className="px-4 py-3 text-slate-400">{(entry as any).hg_projects?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{new Date(entry.started_at).toLocaleDateString()}</td>
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
