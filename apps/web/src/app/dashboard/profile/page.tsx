'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const supabase = createClient();
  const { member, orgName, refresh } = useAuth();
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (member) setFullName(member.fullName);
  }, [member]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!member || !fullName.trim()) return;
    setSaving(true);
    setMessage(null);

    const name = fullName.trim();

    // Update the Hourguard membership record...
    const { error: memberErr } = await supabase
      .from('hg_members')
      .update({ full_name: name })
      .eq('id', member.id)
      .eq('organization_id', member.organizationId);

    // ...and the shared HireJPS identity row (best-effort, keeps products in sync).
    await supabase
      .from('portal_users')
      .update({ full_name: name })
      .eq('auth_user_id', member.authUserId);

    setSaving(false);

    if (memberErr) {
      setMessage({ type: 'error', text: 'Failed to save. Please try again.' });
      return;
    }

    await refresh();
    setMessage({ type: 'success', text: 'Profile updated.' });
  }

  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors disabled:opacity-50';

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">Profile</h1>
      <p className="text-sm text-white/60 font-mono text-xs tracking-wider uppercase mb-6">// your account</p>

      <form onSubmit={saveProfile} className="glass-card p-6 max-w-md space-y-4">
        <div>
          <label className="block text-sm text-white/50 mb-1.5">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="Your name"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-white/50 mb-1.5">Email</label>
          <input type="email" value={member?.email ?? ''} disabled className={inputClass} />
          <p className="mt-1 text-xs text-white/55">Email is managed by your HireJPS account and can&apos;t be changed here.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/50 mb-1.5">Organization</label>
            <input type="text" value={orgName} disabled className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-white/50 mb-1.5">Role</label>
            <input type="text" value={member?.role ?? ''} disabled className={`${inputClass} capitalize`} />
          </div>
        </div>

        {message && (
          <div className={`rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-brand px-4 py-2.5 text-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
