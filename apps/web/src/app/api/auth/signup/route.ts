import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { badRequest, serverError } from '@/app/api/v1/_lib/http';

export const dynamic = 'force-dynamic';

// Self-signup provisioning. Runs server-side with the service role because a
// brand-new user has no org membership yet, so the RLS policies on
// organizations / portal_users / hg_members would (correctly) reject these
// inserts from the browser. This route is the single trusted place that
// bootstraps the first owner of a new organization.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid request body');
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const orgName = typeof body.orgName === 'string' ? body.orgName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!fullName || !orgName) return badRequest('Full name and organization name are required');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest('A valid email is required');
  if (password.length < 6) return badRequest('Password must be at least 6 characters');

  const supabase = createServiceClient();

  // 1. Create the auth user (email pre-confirmed so signup completes without an
  //    email round-trip; the client signs in with the same credentials after).
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createErr || !created?.user) {
    const msg = createErr?.message?.toLowerCase() ?? '';
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 });
    }
    return serverError('signup: create auth user', createErr);
  }

  const authUserId = created.user.id;

  // Roll back the created auth user if any later provisioning step fails, so a
  // failed signup doesn't leave an orphaned login with no organization.
  const rollbackUser = async () => {
    await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
  };

  // 2. Create the organization with Hourguard access.
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: orgName, access_type: ['hourguard'] })
    .select('id')
    .single();

  if (orgErr || !org) {
    await rollbackUser();
    return serverError('signup: create organization', orgErr);
  }

  const rollbackAll = async () => {
    await supabase.from('organizations').delete().eq('id', org.id).then(() => {}, () => {});
    await rollbackUser();
  };

  // 3. Link the auth user to the org (portal identity) and 4. create the owner
  //    membership. Do them together so a partial failure rolls everything back.
  const { error: portalErr } = await supabase.from('portal_users').insert({
    auth_user_id: authUserId,
    organization_id: org.id,
    full_name: fullName,
    email,
    role: 'owner',
  });
  if (portalErr) {
    await rollbackAll();
    return serverError('signup: create portal_users', portalErr);
  }

  const { error: memberErr } = await supabase.from('hg_members').insert({
    auth_user_id: authUserId,
    organization_id: org.id,
    full_name: fullName,
    email,
    role: 'owner',
  });
  if (memberErr) {
    await supabase.from('portal_users').delete().eq('auth_user_id', authUserId).then(() => {}, () => {});
    await rollbackAll();
    return serverError('signup: create hg_members', memberErr);
  }

  return NextResponse.json({ ok: true, organizationId: org.id });
}
