import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, paginate } from '../_lib/auth';
import { isUuid, serverError, badRequest } from '../_lib/http';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { member_id, time_entry_id, storage_path, captured_at, activity_percent } = body;
  // hg_screenshots.time_entry_id is NOT NULL and references hg_time_entries.
  if (!member_id || !time_entry_id || !storage_path || !captured_at) {
    return NextResponse.json({ error: 'member_id, time_entry_id, storage_path, and captured_at are required' }, { status: 400 });
  }

  // Screenshots live under `<organization_id>/<member_id>/...`. Bind the path to
  // this org AND this member, and reject `..` segments, so a key holder can't
  // register a row pointing at another org's/member's object and read it via the
  // GET-signed URL.
  if (
    typeof storage_path !== 'string' ||
    !storage_path.startsWith(`${auth.organizationId}/${member_id}/`) ||
    storage_path.includes('..')
  ) {
    return badRequest(`storage_path must be within "${auth.organizationId}/${member_id}/"`);
  }

  const supabase = createServiceClient();

  // Both existence checks are independent — run them together.
  const [{ data: memberCheck }, { data: entryCheck }] = await Promise.all([
    supabase.from('hg_members').select('id').eq('id', member_id).eq('organization_id', auth.organizationId).single(),
    supabase.from('hg_time_entries').select('id').eq('id', time_entry_id).eq('organization_id', auth.organizationId).single(),
  ]);

  if (!memberCheck) {
    return NextResponse.json({ error: 'Member not found in this organization' }, { status: 404 });
  }
  if (!entryCheck) {
    return NextResponse.json({ error: 'time_entry_id not found in this organization' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('hg_screenshots')
    .insert({
      organization_id: auth.organizationId,
      member_id,
      time_entry_id,
      storage_path,
      captured_at,
      activity_percent: activity_percent ?? 0,
    })
    .select()
    .single();

  if (error) {
    return serverError('POST /screenshots', error);
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { limit, offset } = paginate(request);
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const memberId = url.searchParams.get('member_id');

  if (memberId && !isUuid(memberId)) return badRequest('member_id must be a UUID');

  const supabase = createServiceClient();

  let query = supabase
    .from('hg_screenshots')
    .select('*, hg_members(full_name)', { count: 'exact' })
    .eq('organization_id', auth.organizationId)
    .order('captured_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (date) {
    query = query.gte('captured_at', `${date}T00:00:00.000Z`).lte('captured_at', `${date}T23:59:59.999Z`);
  }
  if (memberId) query = query.eq('member_id', memberId);

  const { data, count, error } = await query;

  if (error) {
    return serverError('GET /screenshots', error);
  }

  const withUrls = await Promise.all(
    (data ?? []).map(async (ss) => {
      const { data: urlData } = await supabase.storage
        .from('screenshots')
        .createSignedUrl(ss.storage_path, 3600);
      return { ...ss, signed_url: urlData?.signedUrl };
    })
  );

  return NextResponse.json({ data: withUrls, total: count, limit, offset });
}
