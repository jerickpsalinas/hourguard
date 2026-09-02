import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, paginate } from '../_lib/auth';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { limit, offset } = paginate(request);
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const userId = url.searchParams.get('user_id');
  const projectId = url.searchParams.get('project_id');

  const supabase = createServiceClient();

  let query = supabase
    .from('time_entries')
    .select('*, profiles(full_name, email), projects(name)', { count: 'exact' })
    .eq('organization_id', auth.organizationId)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) query = query.gte('started_at', `${from}T00:00:00`);
  if (to) query = query.lte('started_at', `${to}T23:59:59`);
  if (userId) query = query.eq('user_id', userId);
  if (projectId) query = query.eq('project_id', projectId);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, limit, offset });
}
