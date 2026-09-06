'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Signup failed');
      setLoading(false);
      return;
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: orgName, access_type: ['hourguard'] })
      .select('id')
      .single();

    if (orgError || !org) {
      setError('Failed to create organization');
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase.from('hg_members').insert({
      auth_user_id: authData.user.id,
      organization_id: org.id,
      full_name: fullName,
      email,
      role: 'owner',
    });

    setLoading(false);

    if (memberError) {
      setError('Failed to create member profile');
      return;
    }

    router.push('/dashboard');
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
          <h1 className="text-2xl font-display font-bold">Create Account</h1>
          <p className="text-sm text-white/50 mt-1 font-mono text-xs tracking-wider uppercase">// join hourguard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} required />
          <input type="text" placeholder="Organization Name" value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputClass} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
          <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required minLength={6} />
          <button type="submit" disabled={loading} className="w-full btn-brand py-2.5 text-sm">
            {loading ? 'Creating...' : 'Create Account'}
          </button>
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <p className="text-sm text-white/40 text-center">
            Already have an account? <a href="/login" className="text-brand hover:underline">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}
