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
      .insert({ name: orgName })
      .select('id')
      .single();

    if (orgError || !org) {
      setError('Failed to create organization');
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      organization_id: org.id,
      full_name: fullName,
      email,
      role: 'owner',
    });

    setLoading(false);

    if (profileError) {
      setError('Failed to create profile');
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-8">
        <h1 className="text-2xl font-bold text-center">Create Account</h1>
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm"
          required
        />
        <input
          type="text"
          placeholder="Organization Name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
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
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Account'}
        </button>
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        <p className="text-sm text-slate-400 text-center">
          Already have an account? <a href="/login" className="text-blue-400 hover:underline">Sign in</a>
        </p>
      </form>
    </div>
  );
}
