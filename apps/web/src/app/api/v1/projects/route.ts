import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '../_lib/auth';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('hg_projects')
    .select('*')
    .eq('organization_id', auth.organizationId)
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
