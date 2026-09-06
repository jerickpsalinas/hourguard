import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

// SSO'd users (arriving from the HireJPS portal) go straight to the dashboard;
// anonymous visitors (e.g. from a marketing link) see the landing page.
export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const features = [
    {
      title: 'Automatic time tracking',
      body: 'One click starts the clock. The desktop tracker logs hours in the background so nothing slips through.',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      title: 'Activity & productivity insights',
      body: 'See keyboard and mouse activity levels per member, with a live daily and 7-day overview.',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
    {
      title: 'Screenshot verification',
      body: 'Periodic captures give managers proof of work — with per-capture activity percentages.',
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      title: 'One-click invoices',
      body: 'Turn tracked hours into a clean, printable invoice in seconds — filter by project and date range.',
      icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
    },
    {
      title: 'Built for teams',
      body: 'Owners, managers, and employees each get the right access. Invite your team in a click.',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    },
    {
      title: 'Works offline',
      body: 'The tracker keeps logging without a connection and syncs automatically when you reconnect.',
      icon: 'M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl btn-brand flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-display font-bold tracking-tight">Hourguard</span>
        </div>
        <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">Sign in</Link>
      </header>

      {/* Hero */}
      <section className="text-center px-6 pt-16 pb-20 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50 font-mono uppercase tracking-wider mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" /> by HireJPS
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight leading-tight">
          Know exactly where your team&apos;s <span className="text-brand">time</span> goes.
        </h1>
        <p className="mt-5 text-lg text-white/50 max-w-xl mx-auto">
          Hourguard tracks work hours, measures productivity, and turns time into invoices — automatically. No spreadsheets, no guesswork.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup" className="btn-brand px-6 py-3 text-sm">Get started free</Link>
          <Link href="/login" className="rounded-xl border border-white/10 bg-white/[0.06] px-6 py-3 text-sm text-white/70 hover:text-white hover:bg-white/[0.1] transition-colors">
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="glass-card p-6">
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                </svg>
              </div>
              <h3 className="font-display font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24 max-w-3xl mx-auto">
        <div className="glass-card p-10 text-center">
          <h2 className="text-2xl font-display font-bold">Your time deserves a guard.</h2>
          <p className="mt-3 text-white/50">Start tracking in minutes. Invite your team and see the difference.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/signup" className="btn-brand px-6 py-3 text-sm">Create your account</Link>
            <Link href="/download" className="rounded-xl border border-white/10 bg-white/[0.06] px-6 py-3 text-sm text-white/70 hover:text-white hover:bg-white/[0.1] transition-colors">
              Get the desktop app
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.08] px-6 py-8 text-center">
        <p className="text-xs text-white/30 font-mono uppercase tracking-wider">// Hourguard — a HireJPS Store product</p>
      </footer>
    </div>
  );
}
