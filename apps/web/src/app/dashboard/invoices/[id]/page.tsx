'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/format';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = createClient();
  const { member, orgName } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isAdmin = member?.role === 'owner' || member?.role === 'manager';

  useEffect(() => {
    if (!member) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('hg_invoices')
        .select('*, hg_projects(name)')
        .eq('id', id)
        .eq('organization_id', member.organizationId)
        .single();
      setInvoice(data);
      setLoading(false);
    })();
  }, [member, id]);

  async function finalize() {
    if (!invoice) return;
    setBusy(true);
    const { error } = await supabase
      .from('hg_invoices')
      .update({ status: 'finalized' })
      .eq('id', invoice.id)
      .eq('organization_id', member!.organizationId);
    setBusy(false);
    if (error) {
      alert('Failed to finalize invoice.');
      return;
    }
    setInvoice({ ...invoice, status: 'finalized' });
  }

  async function revertToDraft() {
    if (!invoice) return;
    setBusy(true);
    const { error } = await supabase
      .from('hg_invoices')
      .update({ status: 'draft' })
      .eq('id', invoice.id)
      .eq('organization_id', member!.organizationId);
    setBusy(false);
    if (error) {
      alert('Failed to update invoice.');
      return;
    }
    setInvoice({ ...invoice, status: 'draft' });
  }

  if (loading) {
    return <p className="text-white/40">Loading...</p>;
  }

  if (!invoice) {
    return (
      <div>
        <p className="text-white/40 mb-4">Invoice not found.</p>
        <Link href="/dashboard/invoices" className="text-brand hover:underline text-sm">← Back to invoices</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Screen-only toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 print:hidden">
        <button onClick={() => router.push('/dashboard/invoices')} className="text-sm text-white/40 hover:text-white transition-colors">
          ← Back
        </button>
        <div className="ml-auto flex items-center gap-3">
          {isAdmin && invoice.status === 'draft' && (
            <button onClick={finalize} disabled={busy} className="btn-brand px-4 py-2 text-sm disabled:opacity-50">
              {busy ? 'Finalizing...' : 'Finalize'}
            </button>
          )}
          {isAdmin && invoice.status === 'finalized' && (
            <button onClick={revertToDraft} disabled={busy} className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/70 hover:text-white transition-colors disabled:opacity-50">
              Revert to draft
            </button>
          )}
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.1] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Invoice document — styled for both screen (glass) and print (white) */}
      <div className="glass-card p-8 print:bg-white print:text-black print:shadow-none print:border-0 max-w-3xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold">{orgName || 'Invoice'}</h1>
            <p className="text-sm text-white/40 print:text-gray-500">via Hourguard by HireJPS</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-white/40 print:text-gray-500">Invoice</p>
            <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs capitalize ${invoice.status === 'finalized' ? 'bg-green-500/10 text-green-400 border border-green-500/20 print:bg-green-100 print:text-green-700 print:border-green-300' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 print:bg-yellow-100 print:text-yellow-700 print:border-yellow-300'}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        <h2 className="text-lg font-display font-semibold mb-1">{invoice.title}</h2>
        <p className="text-sm text-white/50 print:text-gray-600 mb-6">
          {invoice.from_date} — {invoice.to_date}
          {invoice.hg_projects?.name ? ` · ${invoice.hg_projects.name}` : ' · All projects'}
        </p>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-white/[0.1] print:border-gray-300">
              <th className="text-left py-2 text-white/40 print:text-gray-500 font-medium text-xs uppercase tracking-wider">Description</th>
              <th className="text-right py-2 text-white/40 print:text-gray-500 font-medium text-xs uppercase tracking-wider">Hours</th>
              <th className="text-right py-2 text-white/40 print:text-gray-500 font-medium text-xs uppercase tracking-wider">Rate</th>
              <th className="text-right py-2 text-white/40 print:text-gray-500 font-medium text-xs uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/[0.06] print:border-gray-200">
              <td className="py-3">Tracked time{invoice.hg_projects?.name ? ` — ${invoice.hg_projects.name}` : ''}</td>
              <td className="py-3 text-right">{invoice.total_hours}</td>
              <td className="py-3 text-right">{formatCurrency(invoice.hourly_rate, invoice.currency)}</td>
              <td className="py-3 text-right">{formatCurrency(invoice.total_amount, invoice.currency)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-56">
            <div className="flex justify-between py-2 border-t border-white/[0.1] print:border-gray-300">
              <span className="font-display font-semibold">Total</span>
              <span className="font-display font-bold text-brand print:text-black">{formatCurrency(invoice.total_amount, invoice.currency)}</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs text-white/30 print:text-gray-400">
          Generated {new Date(invoice.created_at).toLocaleDateString()} · {invoice.total_hours}h @ {formatCurrency(invoice.hourly_rate, invoice.currency)}/h
        </p>
      </div>
    </div>
  );
}
