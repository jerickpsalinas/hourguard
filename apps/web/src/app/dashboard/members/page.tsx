'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const supabase = createClient();
  const { member } = useAuth();

  useEffect(() => {
    if (member) loadMembers();
  }, [member]);

  async function loadMembers() {
    if (!member) return;
    setLoading(true);
    const { data } = await supabase
      .from('hg_members')
      .select('*')
      .eq('organization_id', member.organizationId)
      .order('created_at', { ascending: true });
    setMembers(data ?? []);
    setLoading(false);
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;

    const token = crypto.randomUUID();
    await supabase.from('hg_invites').insert({
      organization_id: member.organizationId,
      email: inviteEmail || null,
      token,
      role: 'employee',
    });

    setInviteLink(`${window.location.origin}/invite/${token}`);
    setInviteEmail('');
  }

  const inputClass = 'flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors';

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">Members</h1>
      <p className="text-sm text-white/40 font-mono text-xs tracking-wider uppercase mb-6">// team management</p>

      <form onSubmit={createInvite} className="flex gap-3 mb-6">
        <input type="email" placeholder="Email (optional)" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className={inputClass} />
        <button type="submit" className="btn-brand px-4 py-2.5 text-sm">Generate Invite</button>
      </form>

      {inviteLink && (
        <div className="mb-6 glass-card border-green-500/20 p-4">
          <p className="text-sm mb-1 text-green-400">Invite link created:</p>
          <code className="text-xs text-green-400/80 font-mono break-all">{inviteLink}</code>
        </div>
      )}

      {loading ? (
        <p className="text-white/40">Loading...</p>
      ) : members.length === 0 ? (
        <p className="text-white/40">No members yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between glass-card p-4">
              <div>
                <p className="font-medium">{m.full_name}</p>
                <p className="text-xs text-white/40">{m.email}</p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded-full bg-white/[0.06] border border-white/10 px-3 py-1 text-xs capitalize">
                  {m.role}
                </span>
                <p className="text-xs text-white/40 mt-1">{m.is_active ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
