import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, paginate } from '../_lib/auth';
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
  if (!member_id || !storage_path || !captured_at) {
    return NextResponse.json({ error: 'member_id, storage_path, and captured_at are required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: memberCheck } = await supabase
    .from('hg_members')
    .select('id')
    .eq('id', member_id)
    .eq('organization_id', auth.organizationId)
    .single();

  if (!memberCheck) {
    return NextResponse.json({ error: 'Member not found in this organization' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('hg_screenshots')
    .insert({
      organization_id: auth.organizationId,
      member_id,
      time_entry_id: time_entry_id || null,
      storage_path,
      captured_at,
      activity_percent: activity_percent ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const supabase = createServiceClient();

  let query = supabase
    .from('hg_screenshots')
    .select('*, hg_members(full_name)', { count: 'exact' })
    .eq('organization_id', auth.organizationId)
    .order('captured_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (date) {
    query = query.gte('captured_at', `${date}T00:00:00`).lte('captured_at', `${date}T23:59:59`);
  }
  if (memberId) query = query.eq('member_id', memberId);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
