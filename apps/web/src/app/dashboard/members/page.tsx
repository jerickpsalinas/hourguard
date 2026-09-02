'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const supabase = createClient();

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', profile!.organization_id)
      .order('created_at', { ascending: true });

    setMembers(data ?? []);
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const token = crypto.randomUUID();

    await supabase.from('invites').insert({
      organization_id: profile!.organization_id,
      email: inviteEmail || null,
      token,
      role: 'employee',
    });

    setInviteLink(`${window.location.origin}/invite/${token}`);
    setInviteEmail('');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Members</h1>

      <form onSubmit={createInvite} className="flex gap-3 mb-6">
        <input
          type="email"
          placeholder="Email (optional)"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-700">
          Generate Invite
        </button>
      </form>

      {inviteLink && (
        <div className="mb-6 rounded-lg border border-green-800 bg-green-900/20 p-4">
          <p className="text-sm mb-1">Invite link created:</p>
          <code className="text-xs text-green-400 break-all">{inviteLink}</code>
        </div>
      )}

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div>
              <p className="font-medium">{m.full_name}</p>
              <p className="text-xs text-slate-400">{m.email}</p>
            </div>
            <div className="text-right">
              <span className="inline-block rounded-full bg-slate-800 px-3 py-1 text-xs capitalize">
                {m.role}
              </span>
              <p className="text-xs text-slate-400 mt-1">{m.is_active ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
