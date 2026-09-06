'use client';

export default function DownloadPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl btn-brand glow-pulse mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold">Download Hourguard</h1>
          <p className="text-sm text-white/50 mt-1 font-mono text-xs tracking-wider uppercase">// desktop tracker</p>
        </div>

        <div className="glass-card p-6 mb-6">
          <h2 className="font-display font-semibold mb-3">What does the desktop app do?</h2>
          <ul className="space-y-2 text-sm text-white/60">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-brand mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Automatically tracks time while you work
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-brand mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Takes periodic screenshots for activity proof
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-brand mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Monitors keyboard &amp; mouse activity levels
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-brand mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Works offline and syncs when reconnected
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <a
            href="#"
            className="glass-card p-5 text-center hover:border-white/20 transition-colors group"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-white/40 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
            </svg>
            <p className="font-medium text-sm">Windows</p>
            <p className="text-xs text-white/40 mt-1">Windows 10 or later</p>
            <span className="inline-block mt-2 text-xs text-white/30">Coming soon</span>
          </a>
          <a
            href="#"
            className="glass-card p-5 text-center hover:border-white/20 transition-colors group"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-white/40 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <p className="font-medium text-sm">macOS</p>
            <p className="text-xs text-white/40 mt-1">macOS 11 or later</p>
            <span className="inline-block mt-2 text-xs text-white/30">Coming soon</span>
          </a>
        </div>

        <div className="text-center">
          <p className="text-xs text-white/30 mb-3">Need help? Contact your administrator.</p>
          <a href="/login" className="text-sm text-brand hover:underline">Go to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
