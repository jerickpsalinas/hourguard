'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { localDateKey, localDayBounds } from '@/lib/dates';
import { toCsv, downloadCsv } from '@/lib/csv';
import { EmptyState } from '@/components/empty-state';
import { BlurredScreenshot, type BlurZone } from '@/components/blurred-screenshot';
import { BlurZoneEditor } from '@/components/blur-zone-editor';
import { useToast } from '@/components/toast';

const PAGE_SIZE = 24;

export default function ScreenshotsPage() {
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [editingScreenshot, setEditingScreenshot] = useState<any | null>(null);
  const supabase = createClient();
  const { member } = useAuth();
  const { toast } = useToast();
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

  function exportCsv() {
    const rows = screenshots.map((ss) => [
      (ss as any).hg_members?.full_name ?? 'Unknown',
      new Date(ss.captured_at).toLocaleString(),
      `${ss.activity_percent}%`,
    ]);
    downloadCsv(`screenshots_${selectedDate}.csv`, toCsv(['Employee', 'Captured', 'Activity'], rows));
  }

  const closeModal = useCallback(() => setExpandedUrl(null), []);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!expandedUrl) return;
    // Move focus into the dialog and keep it there; restore it on close.
    prevFocusRef.current = document.activeElement as HTMLElement;
    closeBtnRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
      // Only the close button is focusable, so keep focus pinned to it.
      if (e.key === 'Tab') { e.preventDefault(); closeBtnRef.current?.focus(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      prevFocusRef.current?.focus?.();
    };
  }, [expandedUrl, closeModal]);

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">Screenshots</h1>
      <p className="text-sm text-white/60 font-mono text-xs tracking-wider uppercase mb-6">// activity captures</p>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors"
          aria-label="Select date"
        />
        <button
          onClick={exportCsv}
          disabled={loading || screenshots.length === 0}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>
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
                className="cursor-pointer glass-card overflow-hidden hover:border-white/20 transition-colors group relative"
                onClick={() => setExpandedUrl(ss.url)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedUrl(ss.url); } }}
              >
                {ss.url && (
                  <BlurredScreenshot
                    src={ss.url}
                    zones={ss.blur_zones ?? []}
                    alt={`Screenshot by ${memberName} at ${time}`}
                    className="w-full aspect-video object-cover"
                  />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingScreenshot(ss); }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/60 rounded-lg p-1.5 text-white/70 hover:text-white transition-all"
                  title="Edit blur zones"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </button>
                <div className="p-2">
                  <p className="text-xs font-medium">{memberName}</p>
                  <p className="text-xs text-white/60">
                    {time} — {ss.activity_percent}%
                    {(ss.blur_zones?.length ?? 0) > 0 && <span className="ml-1">🔒</span>}
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
            ref={closeBtnRef}
            onClick={closeModal}
            aria-label="Close"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {(() => {
            const expanded = screenshots.find((ss) => ss.url === expandedUrl);
            const zones = expanded?.blur_zones ?? [];
            return (
              <BlurredScreenshot
                src={expandedUrl}
                zones={zones}
                alt="Expanded screenshot"
                className="max-w-[90vw] max-h-[90vh] rounded-2xl"
                onClick={(e: any) => e.stopPropagation()}
              />
            );
          })()}
        </div>
      )}

      {editingScreenshot && editingScreenshot.url && (
        <BlurZoneEditor
          src={editingScreenshot.url}
          zones={editingScreenshot.blur_zones ?? []}
          onCancel={() => setEditingScreenshot(null)}
          onSave={async (zones) => {
            const { error } = await supabase
              .from('hg_screenshots')
              .update({ blur_zones: zones })
              .eq('id', editingScreenshot.id);
            if (error) {
              toast('Failed to save blur zones.', 'error');
            } else {
              setScreenshots((prev) =>
                prev.map((ss) => ss.id === editingScreenshot.id ? { ...ss, blur_zones: zones } : ss)
              );
              toast('Blur zones saved.');
            }
            setEditingScreenshot(null);
          }}
        />
      )}
    </div>
  );
}
