import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, paginate } from '../_lib/auth';
import { isUuid, serverError, badRequest } from '../_lib/http';
import { createServiceClient } from '@/lib/supabase-server';
import { sendSlackNotification } from '@/lib/slack';

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { member_id, project_id, started_at, stopped_at } = body;
  if (!member_id || !started_at) {
    return NextResponse.json({ error: 'member_id and started_at are required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Member check, plus the optional project check, are independent — run together.
  const [{ data: memberCheck }, projectResult] = await Promise.all([
    supabase.from('hg_members').select('id').eq('id', member_id).eq('organization_id', auth.organizationId).single(),
    project_id
      ? supabase.from('hg_projects').select('id').eq('id', project_id).eq('organization_id', auth.organizationId).single()
      : Promise.resolve({ data: { id: null } }),
  ]);

  if (!memberCheck) {
    return NextResponse.json({ error: 'Member not found in this organization' }, { status: 404 });
  }
  if (project_id && !projectResult.data) {
    return NextResponse.json({ error: 'project_id not found in this organization' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('hg_time_entries')
    .insert({
      organization_id: auth.organizationId,
      member_id,
      project_id: project_id || null,
      started_at,
      stopped_at: stopped_at || null,
    })
    .select()
    .single();

  if (error) {
    return serverError('POST /time-entries', error);
  }

  // Best-effort Slack notification
  const { data: slackIntegration } = await supabase
    .from('hg_integrations')
    .select('config')
    .eq('organization_id', auth.organizationId)
    .eq('type', 'slack_webhook')
    .eq('is_active', true)
    .maybeSingle();

  if (slackIntegration?.config?.webhook_url) {
    const { data: memberInfo } = await supabase
      .from('hg_members')
      .select('full_name')
      .eq('id', member_id)
      .single();
    const name = memberInfo?.full_name ?? 'A team member';
    const action = stopped_at ? 'stopped tracking' : 'started tracking';
    sendSlackNotification(slackIntegration.config.webhook_url, `⏱️ ${name} ${action}`);
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

  if (memberId && !isUuid(memberId)) return badRequest('member_id must be a UUID');
  if (projectId && !isUuid(projectId)) return badRequest('project_id must be a UUID');

  const supabase = createServiceClient();

  let query = supabase
    .from('hg_time_entries')
    .select('*, hg_members(full_name, email), hg_projects(name)', { count: 'exact' })
    .eq('organization_id', auth.organizationId)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) query = query.gte('started_at', `${from}T00:00:00.000Z`);
  if (to) query = query.lte('started_at', `${to}T23:59:59.999Z`);
  if (memberId) query = query.eq('member_id', memberId);
  if (projectId) query = query.eq('project_id', projectId);

  const { data, count, error } = await query;

  if (error) {
    return serverError('GET /time-entries', error);
  }

  return NextResponse.json({ data, total: count, limit, offset });
}
