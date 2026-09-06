'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { CopyButton } from '@/components/copy-button';
import { SkeletonRows } from '@/components/skeleton';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/components/toast';
import { summarizeEntries, type RawEntry } from '@/lib/aggregate';
import { formatHours } from '@/lib/format';
import { localDateKey, localDayBounds } from '@/lib/dates';

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [hoursByMember, setHoursByMember] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'employee' | 'manager'>('employee');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteError, setInviteError] = useState('');
  const supabase = createClient();
  const { member } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (member) {
      loadMembers();
      loadInvites();
      loadWeekHours();
    }
  }, [member]);

  async function loadWeekHours() {
    if (!member) return;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const { startISO } = localDayBounds(localDateKey(weekAgo));
    const { data } = await supabase
      .from('hg_time_entries')
      .select('member_id, started_at, stopped_at, activity_percent')
      .eq('organization_id', member.organizationId)
      .not('stopped_at', 'is', null)
      .gte('started_at', startISO);
    const { members: perMember } = summarizeEntries((data ?? []) as unknown as RawEntry[]);
    setHoursByMember(Object.fromEntries(perMember.map((m) => [m.memberId, m.hours])));
  }

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

  async function loadInvites() {
    if (!member) return;
    const { data } = await supabase
      .from('hg_invites')
      .select('*')
      .eq('organization_id', member.organizationId)
      .eq('accepted', false)
      .order('created_at', { ascending: false });
    setInvites(data ?? []);
  }

  async function revokeInvite(id: string) {
    if (!member) return;
    if (!confirm('Revoke this invite? The link will stop working.')) return;
    const { error } = await supabase.from('hg_invites').delete().eq('id', id).eq('organization_id', member.organizationId);
    if (error) return toast('Failed to revoke invite.', 'error');
    toast('Invite revoked.');
    loadInvites();
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
    loadInvites();
  }

  async function toggleMember(id: string, isActive: boolean) {
    if (!member || id === member.id) return;
    const { error } = await supabase.from('hg_members').update({ is_active: !isActive }).eq('id', id).eq('organization_id', member.organizationId);
    if (error) return toast('Failed to update member.', 'error');
    toast(isActive ? 'Member deactivated.' : 'Member activated.');
    loadMembers();
  }

  async function changeRole(id: string, newRole: string) {
    if (!member || id === member.id) return;
    const { error } = await supabase.from('hg_members').update({ role: newRole }).eq('id', id).eq('organization_id', member.organizationId);
    if (error) return toast('Failed to change role.', 'error');
    toast(`Role updated to ${newRole}.`);
    loadMembers();
  }

  const inputClass = 'rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors';

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">Members</h1>
      <p className="text-sm text-white/60 font-mono text-xs tracking-wider uppercase mb-6">// team management</p>

      <form onSubmit={createInvite} className="flex flex-wrap gap-3 mb-6">
        <input type="email" placeholder="Email (optional)" aria-label="Invite email (optional)" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className={`flex-1 min-w-[200px] ${inputClass}`} />
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

      {invites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-display font-semibold mb-3 text-white/70">Pending Invites</h2>
          <div className="space-y-2">
            {invites.map((inv) => {
              const expired = new Date(inv.expires_at) < new Date();
              const link = `${window.location.origin}/invite/${inv.token}`;
              return (
                <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 glass-card p-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{inv.email || 'Anyone with the link'}</p>
                    <p className="text-xs text-white/60">
                      <span className="capitalize">{inv.role}</span>
                      {' · '}
                      {expired ? (
                        <span className="text-red-400">Expired</span>
                      ) : (
                        <>Expires {new Date(inv.expires_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!expired && <CopyButton text={link} />}
                    <button
                      onClick={() => revokeInvite(inv.id)}
                      className="text-xs px-3 py-1 rounded-full border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="text-sm font-display font-semibold mb-3 text-white/70">Team</h2>
      {loading ? (
        <SkeletonRows count={3} />
      ) : members.length === 0 ? (
        <EmptyState
          icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          title="No members yet"
          description="Generate an invite link above to add your first team member."
        />
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between glass-card p-4">
              <div>
                <p className="font-medium">{m.full_name}</p>
                <p className="text-xs text-white/60">
                  {m.email}
                  <span className="text-white/55"> · {formatHours(hoursByMember[m.id] ?? 0)} this week</span>
                </p>
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
