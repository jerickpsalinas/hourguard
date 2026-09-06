import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { badRequest, serverError } from '@/app/api/v1/_lib/http';

export const dynamic = 'force-dynamic';

// Look up an invite for the public invite page. Runs server-side with the
// service role because an unauthenticated visitor (or a user who isn't yet a
// member of the inviting org) can't read hg_invites under RLS. Only the fields
// the page needs are returned — never the raw invite row.
async function loadInvite(token: string) {
  const supabase = createServiceClient();
  const { data: invite, error } = await supabase
    .from('hg_invites')
    .select('id, organization_id, email, role, accepted, expires_at')
    .eq('token', token)
    .single();
  return { supabase, invite, error };
}

function inviteState(invite: { accepted: boolean; expires_at: string } | null): string | null {
  if (!invite) return 'This invite link is invalid or has already been used.';
  if (invite.accepted) return 'This invite has already been accepted.';
  if (new Date(invite.expires_at) < new Date()) return 'This invite has expired. Ask your administrator for a new one.';
  return null;
}

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const { supabase, invite } = await loadInvite(params.token);

  const problem = inviteState(invite as any);
  if (problem || !invite) {
    return NextResponse.json({ valid: false, reason: problem ?? 'Invalid invite.' }, { status: 200 });
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', invite.organization_id)
    .single();

  return NextResponse.json({
    valid: true,
    orgName: org?.name ?? '',
    role: invite.role,
    email: invite.email ?? null,
  });
}

// Accept an invite: create the auth user and provision their membership in the
// inviting org. Service-role for the same reason as signup — the new user has
// no membership yet, so RLS would reject the inserts from the browser.
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid request body');
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!fullName) return badRequest('Full name is required');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest('A valid email is required');
  if (password.length < 6) return badRequest('Password must be at least 6 characters');

  const { supabase, invite } = await loadInvite(params.token);
  const problem = inviteState(invite as any);
  if (problem || !invite) {
    return NextResponse.json({ error: problem ?? 'Invalid invite.' }, { status: 400 });
  }

  // If the invite was addressed to a specific email, the acceptor must use it —
  // otherwise a leaked link could onboard an unintended account into the org.
  if (invite.email && invite.email.trim().toLowerCase() !== email) {
    return badRequest('This invite was issued to a different email address.');
  }

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createErr || !created?.user) {
    const msg = createErr?.message?.toLowerCase() ?? '';
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in, then ask your administrator to add you.' }, { status: 409 });
    }
    return serverError('accept-invite: create auth user', createErr);
  }

  const authUserId = created.user.id;
  const rollbackUser = async () => { await supabase.auth.admin.deleteUser(authUserId).catch(() => {}); };

  const { error: portalErr } = await supabase.from('portal_users').insert({
    auth_user_id: authUserId,
    organization_id: invite.organization_id,
    full_name: fullName,
    email,
    role: invite.role,
  });
  if (portalErr) {
    await rollbackUser();
    return serverError('accept-invite: create portal_users', portalErr);
  }

  const { error: memberErr } = await supabase.from('hg_members').insert({
    auth_user_id: authUserId,
    organization_id: invite.organization_id,
    full_name: fullName,
    email,
    role: invite.role,
  });
  if (memberErr) {
    await supabase.from('portal_users').delete().eq('auth_user_id', authUserId).then(() => {}, () => {});
    await rollbackUser();
    return serverError('accept-invite: create hg_members', memberErr);
  }

  // Mark accepted only after the membership exists, so a mid-way failure leaves
  // the invite reusable rather than silently burned.
  await supabase.from('hg_invites').update({ accepted: true }).eq('id', invite.id);

  return NextResponse.json({ ok: true, organizationId: invite.organization_id });
}
