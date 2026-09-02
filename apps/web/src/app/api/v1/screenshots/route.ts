import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, paginate } from '../_lib/auth';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { limit, offset } = paginate(request);
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const userId = url.searchParams.get('user_id');

  const supabase = createServiceClient();

  let query = supabase
    .from('screenshots')
    .select('*, profiles(full_name)', { count: 'exact' })
    .eq('organization_id', auth.organizationId)
    .order('captured_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (date) {
    query = query.gte('captured_at', `${date}T00:00:00`).lte('captured_at', `${date}T23:59:59`);
  }
  if (userId) query = query.eq('user_id', userId);

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
