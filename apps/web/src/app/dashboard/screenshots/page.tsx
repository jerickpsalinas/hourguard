'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function ScreenshotsPage() {
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadScreenshots();
  }, [selectedDate]);

  async function loadScreenshots() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const { data } = await supabase
      .from('screenshots')
      .select('*, profiles(full_name)')
      .eq('organization_id', profile!.organization_id)
      .gte('captured_at', `${selectedDate}T00:00:00`)
      .lte('captured_at', `${selectedDate}T23:59:59`)
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
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Screenshots</h1>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="mb-6 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
      />
      {screenshots.length === 0 ? (
        <p className="text-slate-400">No screenshots for this date.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {screenshots.map((ss) => (
            <div
              key={ss.id}
              className="cursor-pointer rounded-lg border border-slate-800 overflow-hidden hover:border-slate-600"
              onClick={() => setExpandedUrl(ss.url)}
            >
              {ss.url && (
                <img src={ss.url} alt="Screenshot" className="w-full aspect-video object-cover" />
              )}
              <div className="p-2">
                <p className="text-xs font-medium">{(ss as any).profiles?.full_name}</p>
                <p className="text-xs text-slate-400">
                  {new Date(ss.captured_at).toLocaleTimeString()} — {ss.activity_percent}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {expandedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setExpandedUrl(null)}
        >
          <img src={expandedUrl} alt="Screenshot" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}
    </div>
  );
}
