'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { localDateKey, localDayBounds } from '@/lib/dates';
import { EmptyState } from '@/components/empty-state';

const PAGE_SIZE = 24;

export default function ScreenshotsPage() {
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const supabase = createClient();
  const { member } = useAuth();
  const reqSeq = useRef(0);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!member) return;
      const seq = ++reqSeq.current;
      if (append) setLoadingMore(true);
      else setLoading(true);

      const { startISO, endISO } = localDayBounds(selectedDate);
      const from = pageNum * PAGE_SIZE;
      const { data } = await supabase
        .from('hg_screenshots')
        .select('*, hg_members(full_name)')
        .eq('organization_id', member.organizationId)
        .gte('captured_at', startISO)
        .lte('captured_at', endISO)
        .order('captured_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      // Sign all paths in one request rather than one round-trip per screenshot.
      const rows = data ?? [];
      const { data: signed } = await supabase.storage
        .from('screenshots')
        .createSignedUrls(rows.map((ss) => ss.storage_path), 3600);
      const withUrls = rows.map((ss, i) => ({ ...ss, url: signed?.[i]?.signedUrl }));

      // Ignore a response that a newer request has superseded.
      if (seq !== reqSeq.current) return;
      setScreenshots((prev) => (append ? [...prev, ...withUrls] : withUrls));
      setHasMore(rows.length === PAGE_SIZE);
      setPage(pageNum);
      setLoadingMore(false);
      setLoading(false);
    },
    [member, selectedDate, supabase]
  );

  useEffect(() => {
    if (!member) return;
    loadPage(0, false);
  }, [member, selectedDate, loadPage]);

  const closeModal = useCallback(() => setExpandedUrl(null), []);

  useEffect(() => {
    if (!expandedUrl) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [expandedUrl, closeModal]);

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">Screenshots</h1>
      <p className="text-sm text-white/40 font-mono text-xs tracking-wider uppercase mb-6">// activity captures</p>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="mb-6 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors"
        aria-label="Select date"
      />
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card overflow-hidden animate-pulse">
              <div className="w-full aspect-video bg-white/[0.06]" />
              <div className="p-2 space-y-1">
                <div className="h-3 w-20 rounded bg-white/[0.08]" />
                <div className="h-3 w-28 rounded bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      ) : screenshots.length === 0 ? (
        <EmptyState
          icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          title="No screenshots for this date"
          description="Screenshots appear here once employees track time with the desktop app on the selected day."
        />
      ) : (
        <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {screenshots.map((ss) => {
            const memberName = (ss as any).hg_members?.full_name ?? 'Unknown';
            const time = new Date(ss.captured_at).toLocaleTimeString();
            return (
              <div
                key={ss.id}
                className="cursor-pointer glass-card overflow-hidden hover:border-white/20 transition-colors"
                onClick={() => setExpandedUrl(ss.url)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setExpandedUrl(ss.url); }}
              >
                {ss.url && (
                  <img src={ss.url} alt={`Screenshot by ${memberName} at ${time}`} className="w-full aspect-video object-cover" />
                )}
                <div className="p-2">
                  <p className="text-xs font-medium">{memberName}</p>
                  <p className="text-xs text-white/40">
                    {time} — {ss.activity_percent}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={() => loadPage(page + 1, true)}
              disabled={loadingMore}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
        </>
      )}

      {expandedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded screenshot"
        >
          <button
            onClick={closeModal}
            aria-label="Close"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img src={expandedUrl} alt="Expanded screenshot" className="max-w-[90vw] max-h-[90vh] rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
