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
      const { data: inv, error: invErr } = await supabase
        .from('hg_invites')
        .select('*')
        .eq('token', token)
        .single();

      if (invErr || !inv) {
        setStep('invalid');
        setError('This invite link is invalid or has already been used.');
        setLoading(false);
        return;
      }

      if (inv.accepted) {
        setStep('invalid');
        setError('This invite has already been accepted.');
        setLoading(false);
        return;
      }

      if (new Date(inv.expires_at) < new Date()) {
        setStep('invalid');
        setError('This invite has expired. Ask your administrator for a new one.');
        setLoading(false);
        return;
      }

      setInvite(inv);
      if (inv.email) setEmail(inv.email);

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', inv.organization_id)
        .single();

      if (org) setOrgName(org.name);

      setStep('form');
      setLoading(false);
    })();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Signup failed');
      setSubmitting(false);
      return;
    }

    const { error: memberError } = await supabase.from('hg_members').insert({
      auth_user_id: authData.user.id,
      organization_id: invite.organization_id,
      full_name: fullName,
      email,
      role: invite.role,
    });

    if (memberError) {
      setError('Failed to create member profile. You may already have an account.');
      setSubmitting(false);
      return;
    }

    await supabase
      .from('hg_invites')
      .update({ accepted: true })
      .eq('id', invite.id);

    setStep('done');
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
          <p className="text-sm text-slate-400">Verifying invite...</p>
        </div>
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Invalid Invite</h1>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <a href="/login" className="text-sm text-blue-400 hover:underline">Go to login</a>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Welcome to {orgName}!</h1>
          <p className="text-sm text-slate-400 mb-6">Your account has been created. You can now sign in and start tracking time.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-8">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold">Join {orgName}</h1>
          <p className="text-sm text-slate-400 mt-1">You&apos;ve been invited as <span className="capitalize text-slate-300">{invite?.role}</span></p>
        </div>
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm"
          required
          readOnly={!!invite?.email}
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm"
          required
          minLength={6}
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Creating account...' : 'Accept Invite & Create Account'}
        </button>
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        <p className="text-sm text-slate-400 text-center">
          Already have an account? <a href="/login" className="text-blue-400 hover:underline">Sign in</a>
        </p>
      </form>
    </div>
  );
}
