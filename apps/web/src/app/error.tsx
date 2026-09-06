'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface for debugging; a real deployment would forward this to Sentry/etc.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center max-w-sm p-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-2.98l-6.93-12a2 2 0 00-3.48 0l-6.93 12A2 2 0 005.07 19z" />
          </svg>
        </div>
        <h1 className="text-xl font-display font-semibold mb-2">Something went wrong</h1>
        <p className="text-sm text-white/50 mb-6">An unexpected error occurred. You can try again — if it keeps happening, please contact support.</p>
        <button onClick={reset} className="btn-brand px-6 py-2.5 text-sm">Try again</button>
      </div>
    </div>
  );
}
