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

  const { member_id, project_id, started_at, stopped_at, memo } = body;
  if (!member_id || !started_at) {
    return NextResponse.json({ error: 'member_id and started_at are required' }, { status: 400 });
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
    .from('hg_time_entries')
    .insert({
      organization_id: auth.organizationId,
      member_id,
      project_id: project_id || null,
      started_at,
      stopped_at: stopped_at || null,
      memo: memo || null,
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
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const memberId = url.searchParams.get('member_id');
  const projectId = url.searchParams.get('project_id');

  const supabase = createServiceClient();

  let query = supabase
    .from('hg_time_entries')
    .select('*, hg_members(full_name, email), hg_projects(name)', { count: 'exact' })
    .eq('organization_id', auth.organizationId)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) query = query.gte('started_at', `${from}T00:00:00`);
  if (to) query = query.lte('started_at', `${to}T23:59:59`);
  if (memberId) query = query.eq('member_id', memberId);
  if (projectId) query = query.eq('project_id', projectId);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, limit, offset });
}
