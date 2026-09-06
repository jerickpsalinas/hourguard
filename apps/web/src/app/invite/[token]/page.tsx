'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter, useParams } from 'next/navigation';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [invite, setInvite] = useState<any>(null);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'loading' | 'invalid' | 'form' | 'done'>('loading');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      // hg_invites isn't readable anonymously under RLS, so validation runs
      // server-side with the service role. See /api/auth/invite/[token].
      let res: Response;
      try {
        res = await fetch(`/api/auth/invite/${token}`);
      } catch {
        setStep('invalid');
        setError('Could not verify this invite. Please try again.');
        setLoading(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.valid) {
        setStep('invalid');
        setError(data?.reason ?? 'This invite link is invalid or has already been used.');
        setLoading(false);
        return;
      }

      setInvite({ email: data.email ?? null, role: data.role });
      if (data.email) setEmail(data.email);
      setOrgName(data.orgName ?? '');
      setStep('form');
      setLoading(false);
    })();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    // Acceptance (auth user + membership + marking the invite used) runs
    // server-side with the service role. See /api/auth/invite/[token].
    let res: Response;
    try {
      res = await fetch(`/api/auth/invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
      return;
    }

    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(result?.error ?? 'Failed to accept invite. Please try again.');
      setSubmitting(false);
      return;
    }

    // Membership provisioned — sign in to establish the browser session.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setStep('done');
      return;
    }

    setStep('done');
  }

  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-brand" />
          <p className="text-sm text-white/50">Verifying invite...</p>
        </div>
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm text-center p-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold mb-4">Invalid Invite</h1>
          <p className="text-sm text-white/50 mb-6">{error}</p>
          <a href="/login" className="text-sm text-brand hover:underline">Go to login</a>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm text-center p-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold mb-4">Welcome to {orgName}!</h1>
          <p className="text-sm text-white/50 mb-6">Your account has been created. You can now sign in and start tracking time.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => router.push('/dashboard')} className="btn-brand px-6 py-2.5 text-sm">
              Go to Dashboard
            </button>
            <a href="/download" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-6 py-2.5 text-sm text-white/70 hover:bg-white/[0.1] hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Desktop Tracker
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl btn-brand glow-pulse mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold">Join {orgName}</h1>
          <p className="text-sm text-white/50 mt-1">You&apos;ve been invited as <span className="capitalize text-white/70">{invite?.role}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Full Name" aria-label="Full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} required />
          <input type="email" placeholder="Email" aria-label="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required readOnly={!!invite?.email} />
          <input type="password" placeholder="Password (min 6 characters)" aria-label="Password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required minLength={6} />
          <button type="submit" disabled={submitting} className="w-full btn-brand py-2.5 text-sm">
            {submitting ? 'Creating account...' : 'Accept Invite & Create Account'}
          </button>
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <p className="text-sm text-white/60 text-center">
            Already have an account? <a href="/login" className="text-brand hover:underline">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}
