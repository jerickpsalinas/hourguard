'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function TimesheetsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const supabase = createClient();

  useEffect(() => {
    loadEntries();
  }, [fromDate, toDate]);

  async function loadEntries() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const { data } = await supabase
      .from('time_entries')
      .select('*, profiles(full_name), projects(name)')
      .eq('organization_id', profile!.organization_id)
      .gte('started_at', `${fromDate}T00:00:00`)
      .lte('started_at', `${toDate}T23:59:59`)
      .order('started_at', { ascending: false })
      .limit(100);

    setEntries(data ?? []);
  }

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
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-900/50">
                <td className="px-4 py-3">{(entry as any).profiles?.full_name}</td>
                <td className="px-4 py-3 text-slate-400">{(entry as any).projects?.name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">{new Date(entry.started_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">{formatDuration(entry.started_at, entry.stopped_at)}</td>
                <td className="px-4 py-3">{entry.activity_percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
