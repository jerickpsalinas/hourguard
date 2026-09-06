import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase-server';
import { serverError } from '@/app/api/v1/_lib/http';

export const dynamic = 'force-dynamic';

// Paddle (Billing) webhook → auto-provision an org + owner after purchase.
//
// Security: every request is authenticated by the Paddle-Signature header
// (HMAC-SHA256 over `${ts}:${rawBody}` with PADDLE_WEBHOOK_SECRET). The raw body
// must be read verbatim — do not JSON.parse before verifying, or the signature
// won't match.
//
// Provisioning is idempotent: an email that already has a membership just gets
// Hourguard access ensured on its org; a new buyer gets an org, an auth user
// (with a set-password link), portal_users, and an owner hg_members row.
//
// NOTE (confirm live): the buyer email + desired org name are read from the
// checkout's `custom_data` ({ email, org_name }). If you instead rely on the
// Paddle customer record, fetch it from the Paddle API in `extractBuyer()` —
// that's the one place that needs to match your Paddle account's setup.

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  // Header form: "ts=1699999999;h1=abcdef..."
  const parts = Object.fromEntries(
    header.split(';').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    })
  );
  const ts = parts['ts'];
  const h1 = parts['h1'];
  if (!ts || !h1) return false;

  const expected = createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(h1, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// The single account-specific mapping point. Returns the buyer's email and the
// org name to create, or null to ignore the event.
function extractBuyer(data: any): { email: string; orgName: string } | null {
  const custom = data?.custom_data ?? {};
  const email = typeof custom.email === 'string' ? custom.email.trim().toLowerCase() : '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  const orgName =
    (typeof custom.org_name === 'string' && custom.org_name.trim()) ||
    `${email.split('@')[0]}'s team`;
  return { email, orgName };
}

async function ensureHourguardAccess(supabase: any, organizationId: string) {
  const { data: org } = await supabase
    .from('organizations')
    .select('access_type')
    .eq('id', organizationId)
    .single();
  const access: string[] = org?.access_type ?? [];
  if (!access.includes('hourguard')) {
    await supabase
      .from('organizations')
      .update({ access_type: [...access, 'hourguard'] })
      .eq('id', organizationId);
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[paddle] PADDLE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('paddle-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Provision on a completed purchase / activated subscription; acknowledge
  // everything else so Paddle doesn't retry events we don't act on.
  const provisioning = ['transaction.completed', 'subscription.activated', 'subscription.created'];
  if (!provisioning.includes(event?.event_type)) {
    return NextResponse.json({ ok: true, ignored: event?.event_type ?? 'unknown' });
  }

  const buyer = extractBuyer(event.data);
  if (!buyer) {
    // No usable email — acknowledge (don't force retries) but flag for review.
    console.warn('[paddle] provisioning skipped: no buyer email in', event?.event_type);
    return NextResponse.json({ ok: true, provisioned: false, reason: 'no buyer email' });
  }

  const supabase = createServiceClient();

  // Idempotent: if this email already has a membership, just ensure access.
  const { data: existing } = await supabase
    .from('hg_members')
    .select('organization_id')
    .eq('email', buyer.email)
    .limit(1)
    .maybeSingle();

  if (existing?.organization_id) {
    await ensureHourguardAccess(supabase, existing.organization_id);
    return NextResponse.json({ ok: true, provisioned: false, reason: 'already a member', organizationId: existing.organization_id });
  }

  // New buyer: create org.
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: buyer.orgName, access_type: ['hourguard'] })
    .select('id')
    .single();
  if (orgErr || !org) return serverError('paddle: create organization', orgErr);

  // Create the auth user (or reuse if it already exists) and a set-password link.
  let authUserId: string | null = null;
  let setPasswordLink: string | null = null;

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: buyer.email,
    email_confirm: true,
    user_metadata: { full_name: buyer.orgName },
  });

  if (created?.user) {
    authUserId = created.user.id;
  } else if (createErr) {
    // Likely already registered — look them up so we still link the membership.
    const { data: list } = await supabase.auth.admin.listUsers();
    authUserId = list?.users?.find((u: any) => u.email?.toLowerCase() === buyer.email)?.id ?? null;
  }

  if (!authUserId) {
    await supabase.from('organizations').delete().eq('id', org.id).then(() => {}, () => {});
    return serverError('paddle: resolve auth user', createErr);
  }

  // Recovery link lets the buyer set their password. Delivery depends on your
  // Supabase SMTP config; the link is returned/logged so it can be emailed.
  // Point the set-password link at Hourguard explicitly. The Supabase project
  // is shared across the portal products, so its default Site URL may not be
  // this app — send buyers to our own /reset-password when APP_URL is set.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: buyer.email,
    ...(appUrl ? { options: { redirectTo: `${appUrl}/reset-password` } } : {}),
  });
  setPasswordLink = linkData?.properties?.action_link ?? null;

  const { error: portalErr } = await supabase.from('portal_users').insert({
    auth_user_id: authUserId,
    organization_id: org.id,
    full_name: buyer.orgName,
    email: buyer.email,
    role: 'owner',
  });
  if (portalErr) {
    await supabase.from('organizations').delete().eq('id', org.id).then(() => {}, () => {});
    return serverError('paddle: create portal_users', portalErr);
  }

  const { error: memberErr } = await supabase.from('hg_members').insert({
    auth_user_id: authUserId,
    organization_id: org.id,
    full_name: buyer.orgName,
    email: buyer.email,
    role: 'owner',
  });
  if (memberErr) {
    await supabase.from('portal_users').delete().eq('auth_user_id', authUserId).then(() => {}, () => {});
    await supabase.from('organizations').delete().eq('id', org.id).then(() => {}, () => {});
    return serverError('paddle: create hg_members', memberErr);
  }

  if (setPasswordLink) console.log('[paddle] provisioned', buyer.email, '- set-password link generated');

  return NextResponse.json({ ok: true, provisioned: true, organizationId: org.id });
}
