'use client';

import { useEffect } from 'react';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="glass-card p-8 max-w-md">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-2.98l-6.93-12a2 2 0 00-3.48 0l-6.93 12A2 2 0 005.07 19z" />
        </svg>
      </div>
      <h2 className="text-lg font-display font-semibold mb-2">This page hit an error</h2>
      <p className="text-sm text-white/50 mb-6">Something went wrong loading this section. Try reloading it.</p>
      <button onClick={reset} className="btn-brand px-5 py-2 text-sm">Reload</button>
    </div>
  );
}
