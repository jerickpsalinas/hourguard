'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot' | 'sent'>('login');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); } else { router.push('/dashboard'); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); } else { setMode('sent'); }
  };

  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors';

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl btn-brand glow-pulse mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold">Hourguard</h1>
          <p className="text-sm text-white/50 mt-1 font-mono text-xs tracking-wider uppercase">// by HireJPS</p>
        </div>

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Email" aria-label="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
            <input type="password" placeholder="Password" aria-label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
            <button type="submit" disabled={loading} className="w-full btn-brand py-2.5 text-sm">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="text-white/40 hover:text-brand transition-colors">
                Forgot password?
              </button>
              <a href="/signup" className="text-brand hover:underline">Sign up</a>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-sm text-white/50 text-center">Enter your email and we&apos;ll send you a reset link.</p>
            <input type="email" placeholder="Email" aria-label="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
            <button type="submit" disabled={loading} className="w-full btn-brand py-2.5 text-sm">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <button type="button" onClick={() => { setMode('login'); setError(''); }} className="w-full text-sm text-white/40 hover:text-brand transition-colors">
              Back to sign in
            </button>
          </form>
        )}

        {mode === 'sent' && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 mb-2">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-white/70">Check your email for a password reset link.</p>
            <p className="text-xs text-white/30">Didn&apos;t receive it? Check your spam folder.</p>
            <button type="button" onClick={() => { setMode('login'); setError(''); }} className="text-sm text-brand hover:underline">
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
