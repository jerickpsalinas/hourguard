import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, paginate } from '../_lib/auth';
import { serverError } from '../_lib/http';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { limit, offset } = paginate(request);
  const supabase = createServiceClient();

  const { data, count, error } = await supabase
    .from('hg_projects')
    .select('*', { count: 'exact' })
    .eq('organization_id', auth.organizationId)
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) {
    return serverError('GET /projects', error);
  }

  return NextResponse.json({ data, total: count, limit, offset });
}
