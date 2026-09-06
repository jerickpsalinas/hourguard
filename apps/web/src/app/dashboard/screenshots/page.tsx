'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { localDateKey, localDayBounds } from '@/lib/dates';

export default function ScreenshotsPage() {
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const supabase = createClient();
  const { member } = useAuth();

  useEffect(() => {
    if (!member) return;
    setLoading(true);

    (async () => {
      const { startISO, endISO } = localDayBounds(selectedDate);
      const { data } = await supabase
        .from('hg_screenshots')
        .select('*, hg_members(full_name)')
        .eq('organization_id', member.organizationId)
        .gte('captured_at', startISO)
        .lte('captured_at', endISO)
        .order('captured_at', { ascending: false })
        .limit(50);

      const withUrls = await Promise.all(
        (data ?? []).map(async (ss) => {
          const { data: urlData } = await supabase.storage
            .from('screenshots')
            .createSignedUrl(ss.storage_path, 3600);
          return { ...ss, url: urlData?.signedUrl };
        })
      );

      setScreenshots(withUrls);
      setLoading(false);
    })();
  }, [member, selectedDate]);

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
        <p className="text-white/40">No screenshots for this date.</p>
      ) : (
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
      )}

      {expandedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeModal}
          role="dialog"
          aria-label="Expanded screenshot"
        >
          <img src={expandedUrl} alt="Expanded screenshot" className="max-w-[90vw] max-h-[90vh] rounded-2xl" />
        </div>
      )}
    </div>
  );
}
