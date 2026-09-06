'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { CopyButton } from '@/components/copy-button';
import { SkeletonRows } from '@/components/skeleton';

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'employee' | 'manager'>('employee');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteError, setInviteError] = useState('');
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
    setInviteError('');
    setInviteLink('');

    const token = crypto.randomUUID();
    const { error } = await supabase.from('hg_invites').insert({
      organization_id: member.organizationId,
      email: inviteEmail || null,
      token,
      role: inviteRole,
    });

    if (error) {
      setInviteError('Failed to create invite. Please try again.');
      return;
    }

    setInviteLink(`${window.location.origin}/invite/${token}`);
    setInviteEmail('');
  }

  async function toggleMember(id: string, isActive: boolean) {
    if (!member || id === member.id) return;
    await supabase.from('hg_members').update({ is_active: !isActive }).eq('id', id).eq('organization_id', member.organizationId);
    loadMembers();
  }

  async function changeRole(id: string, newRole: string) {
    if (!member || id === member.id) return;
    await supabase.from('hg_members').update({ role: newRole }).eq('id', id).eq('organization_id', member.organizationId);
    loadMembers();
  }

  const inputClass = 'rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors';

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">Members</h1>
      <p className="text-sm text-white/40 font-mono text-xs tracking-wider uppercase mb-6">// team management</p>

      <form onSubmit={createInvite} className="flex flex-wrap gap-3 mb-6">
        <input type="email" placeholder="Email (optional)" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className={`flex-1 min-w-[200px] ${inputClass}`} />
        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'employee' | 'manager')} className={inputClass} aria-label="Invite role">
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
        </select>
        <button type="submit" className="btn-brand px-4 py-2.5 text-sm">Generate Invite</button>
      </form>

      {inviteError && (
        <div className="mb-4 glass-card border-red-500/20 p-4">
          <p className="text-sm text-red-400">{inviteError}</p>
        </div>
      )}

      {inviteLink && (
        <div className="mb-6 glass-card border-green-500/20 p-4">
          <p className="text-sm mb-1 text-green-400">Invite link created:</p>
          <div className="flex items-start gap-2">
            <code className="text-xs text-green-400/80 font-mono break-all flex-1">{inviteLink}</code>
            <CopyButton text={inviteLink} />
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonRows count={3} />
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
              <div className="flex items-center gap-3">
                {m.id !== member?.id ? (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.id, e.target.value)}
                      className="rounded-xl bg-white/[0.06] border border-white/10 px-2 py-1 text-xs capitalize"
                      aria-label={`Role for ${m.full_name}`}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="owner">Owner</option>
                    </select>
                    <button
                      onClick={() => toggleMember(m.id, m.is_active)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${m.is_active ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' : 'border-green-500/20 text-green-400 hover:bg-green-500/10'}`}
                    >
                      {m.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </>
                ) : (
                  <span className="inline-block rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs text-brand capitalize">
                    {m.role} (you)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
