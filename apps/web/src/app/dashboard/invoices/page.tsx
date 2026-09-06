'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { SkeletonRows } from '@/components/skeleton';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hourlyRate, setHourlyRate] = useState('50');
  const [title, setTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const supabase = createClient();
  const { member } = useAuth();

  useEffect(() => {
    if (member) {
      loadInvoices();
      loadProjects();
    }
  }, [member]);

  async function loadInvoices() {
    if (!member) return;
    setLoading(true);
    const { data } = await supabase
      .from('hg_invoices')
      .select('*, hg_projects(name)')
      .eq('organization_id', member.organizationId)
      .order('created_at', { ascending: false });
    setInvoices(data ?? []);
    setLoading(false);
  }

  async function loadProjects() {
    if (!member) return;
    const { data } = await supabase
      .from('hg_projects')
      .select('*')
      .eq('organization_id', member.organizationId)
      .eq('is_active', true);
    setProjects(data ?? []);
  }

  async function generateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    setGenerating(true);

    let query = supabase
      .from('hg_time_entries')
      .select('started_at, stopped_at')
      .eq('organization_id', member.organizationId)
      .not('stopped_at', 'is', null)
      .gte('started_at', `${fromDate}T00:00:00`)
      .lte('started_at', `${toDate}T23:59:59`);

    if (projectId) query = query.eq('project_id', projectId);

    const { data: entries } = await query;

    const totalSeconds = (entries ?? []).reduce((sum, e) => {
      return sum + (new Date(e.stopped_at!).getTime() - new Date(e.started_at).getTime()) / 1000;
    }, 0);

    const totalHours = totalSeconds / 3600;
    const rate = parseFloat(hourlyRate);
    const totalAmount = totalHours * rate;

    const { error: insertError } = await supabase.from('hg_invoices').insert({
      organization_id: member.organizationId,
      project_id: projectId || null,
      created_by: member.id,
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

    if (insertError) {
      alert('Failed to generate invoice. Please try again.');
      return;
    }

    setTitle('');
    loadInvoices();
  }

  const inputClass = 'rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder-white/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors';

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">Invoices</h1>
      <p className="text-sm text-white/40 font-mono text-xs tracking-wider uppercase mb-6">// billing</p>

      <form onSubmit={generateInvoice} className="mb-8 glass-card p-6 space-y-4">
        <h2 className="font-display font-semibold">Generate Invoice</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="text" placeholder="Invoice title" value={title} onChange={(e) => setTitle(e.target.value)} className={`sm:col-span-2 ${inputClass}`} />
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="number" placeholder="Hourly rate" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className={inputClass} min="0" step="0.01" required />
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} required />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} required />
        </div>
        <button type="submit" disabled={generating} className="btn-brand px-4 py-2.5 text-sm">
          {generating ? 'Generating...' : 'Generate Invoice'}
        </button>
      </form>

      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Invoiced</p>
            <p className="text-xl font-display font-bold">${invoices.reduce((s, i) => s + (i.total_amount ?? 0), 0).toFixed(2)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Drafts</p>
            <p className="text-xl font-display font-bold text-yellow-400">{invoices.filter((i) => i.status === 'draft').length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Finalized</p>
            <p className="text-xl font-display font-bold text-green-400">{invoices.filter((i) => i.status === 'finalized').length}</p>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonRows count={3} />
      ) : invoices.length === 0 ? (
        <p className="text-white/40">No invoices yet.</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between glass-card p-4">
              <div>
                <p className="font-medium">{inv.title}</p>
                <p className="text-xs text-white/40">
                  {inv.from_date} — {inv.to_date} | {(inv as any).hg_projects?.name ?? 'All projects'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display font-semibold">${inv.total_amount.toFixed(2)}</p>
                <p className="text-xs text-white/40">{inv.total_hours}h @ ${inv.hourly_rate}/h</p>
                <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs ${inv.status === 'finalized' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                  {inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
