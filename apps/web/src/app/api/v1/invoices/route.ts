import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, paginate } from '../_lib/auth';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { limit, offset } = paginate(request);
  const supabase = createServiceClient();

  const { data, count, error } = await supabase
    .from('invoices')
    .select('*, projects(name)', { count: 'exact' })
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, limit, offset });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { title, from_date, to_date, project_id, hourly_rate } = body;

  if (!from_date || !to_date || !hourly_rate) {
    return NextResponse.json(
      { error: 'from_date, to_date, and hourly_rate are required' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  let query = supabase
    .from('time_entries')
    .select('started_at, stopped_at')
    .eq('organization_id', auth.organizationId)
    .not('stopped_at', 'is', null)
    .gte('started_at', `${from_date}T00:00:00`)
    .lte('started_at', `${to_date}T23:59:59`);

  if (project_id) query = query.eq('project_id', project_id);

  const { data: entries } = await query;

  const totalSeconds = (entries ?? []).reduce((sum, e) => {
    return sum + (new Date(e.stopped_at!).getTime() - new Date(e.started_at).getTime()) / 1000;
  }, 0);

  const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;
  const totalAmount = Math.round(totalHours * hourly_rate * 100) / 100;

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      organization_id: auth.organizationId,
      project_id: project_id || null,
      created_by: auth.apiKeyId,
      title: title || `Invoice ${from_date} to ${to_date}`,
      from_date,
      to_date,
      total_hours: totalHours,
      hourly_rate,
      total_amount: totalAmount,
      currency: body.currency || 'USD',
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: invoice }, { status: 201 });
}
