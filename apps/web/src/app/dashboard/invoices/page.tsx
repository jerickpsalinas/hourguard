'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hourlyRate, setHourlyRate] = useState('50');
  const [title, setTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadInvoices();
    loadProjects();
  }, []);

  async function getMembership() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: member } = await supabase
      .from('hg_members')
      .select('id, organization_id')
      .eq('auth_user_id', user.id)
      .single();
    return member;
  }

  async function loadInvoices() {
    const m = await getMembership();
    if (!m) return;

    const { data } = await supabase
      .from('hg_invoices')
      .select('*, hg_projects(name)')
      .eq('organization_id', m.organization_id)
      .order('created_at', { ascending: false });

    setInvoices(data ?? []);
  }

  async function loadProjects() {
    const m = await getMembership();
    if (!m) return;

    const { data } = await supabase
      .from('hg_projects')
      .select('*')
      .eq('organization_id', m.organization_id)
      .eq('is_active', true);

    setProjects(data ?? []);
  }

  async function generateInvoice(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);

    const m = await getMembership();
    if (!m) return;

    let query = supabase
      .from('hg_time_entries')
      .select('started_at, stopped_at')
      .eq('organization_id', m.organization_id)
      .not('stopped_at', 'is', null)
      .gte('started_at', `${fromDate}T00:00:00`)
      .lte('started_at', `${toDate}T23:59:59`);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: entries } = await query;

    const totalSeconds = (entries ?? []).reduce((sum, e) => {
      return sum + (new Date(e.stopped_at!).getTime() - new Date(e.started_at).getTime()) / 1000;
    }, 0);

    const totalHours = totalSeconds / 3600;
    const rate = parseFloat(hourlyRate);
    const totalAmount = totalHours * rate;

    await supabase.from('hg_invoices').insert({
      organization_id: m.organization_id,
      project_id: projectId || null,
      created_by: m.id,
      title: title || `Invoice ${fromDate} to ${toDate}`,
      from_date: fromDate,
      to_date: toDate,
      total_hours: Math.round(totalHours * 100) / 100,
      hourly_rate: rate,
      total_amount: Math.round(totalAmount * 100) / 100,
      currency: 'USD',
      status: 'draft',
    });

    setGenerating(false);
    setTitle('');
    loadInvoices();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Invoices</h1>

      <form onSubmit={generateInvoice} className="mb-8 rounded-lg border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="font-semibold">Generate Invoice</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Invoice title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Hourly rate"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            min="0"
            step="0.01"
            required
          />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            required
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={generating}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate Invoice'}
        </button>
      </form>

      <div className="space-y-2">
        {invoices.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div>
              <p className="font-medium">{inv.title}</p>
              <p className="text-xs text-slate-400">
                {inv.from_date} — {inv.to_date} | {(inv as any).hg_projects?.name ?? 'All projects'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">${inv.total_amount.toFixed(2)}</p>
              <p className="text-xs text-slate-400">{inv.total_hours}h @ ${inv.hourly_rate}/h</p>
              <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs ${inv.status === 'finalized' ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>
                {inv.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
