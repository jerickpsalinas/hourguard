import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export interface ApiContext {
  organizationId: string;
  apiKeyId: string;
}

export async function authenticateApiKey(
  request: NextRequest
): Promise<ApiContext | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 }
    );
  }

  const rawKey = authHeader.slice(7);

  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const supabase = createServiceClient();

  const { data: apiKey, error } = await supabase
    .from('hg_api_keys')
    .select('id, organization_id')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if (error || !apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  await supabase
    .from('hg_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id);

  return {
    organizationId: apiKey.organization_id,
    apiKeyId: apiKey.id,
  };
}

export function paginate(request: NextRequest) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
