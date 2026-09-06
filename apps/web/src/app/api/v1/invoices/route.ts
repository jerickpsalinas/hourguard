import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, paginate } from '../_lib/auth';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { limit, offset } = paginate(request);
  const supabase = createServiceClient();

  const { data, count, error } = await supabase
    .from('hg_invoices')
    .select('*, hg_projects(name)', { count: 'exact' })
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, from_date, to_date, project_id } = body;
  const hourly_rate = Number(body.hourly_rate);

  if (!from_date || !to_date) {
    return NextResponse.json(
      { error: 'from_date and to_date are required' },
      { status: 400 }
    );
  }

  if (!Number.isFinite(hourly_rate) || hourly_rate < 0) {
    return NextResponse.json(
      { error: 'hourly_rate must be a non-negative number' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // hg_invoices.created_by is NOT NULL and references hg_members — an API key is
  // not a member, so attribute the invoice to an owner/manager of the org.
  const { data: creator } = await supabase
    .from('hg_members')
    .select('id, role')
    .eq('organization_id', auth.organizationId)
    .in('role', ['owner', 'manager'])
    .eq('is_active', true)
    .order('role', { ascending: true }) // 'manager' < 'owner' alphabetically; either is acceptable
    .limit(1)
    .maybeSingle();

  if (!creator) {
    return NextResponse.json(
      { error: 'No owner or manager member found to attribute the invoice to' },
      { status: 409 }
    );
  }

  if (project_id) {
    const { data: projectCheck } = await supabase
      .from('hg_projects')
      .select('id')
      .eq('id', project_id)
      .eq('organization_id', auth.organizationId)
      .single();
    if (!projectCheck) {
      return NextResponse.json({ error: 'project_id not found in this organization' }, { status: 404 });
    }
  }

  let query = supabase
    .from('hg_time_entries')
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
    .from('hg_invoices')
    .insert({
      organization_id: auth.organizationId,
      project_id: project_id || null,
      created_by: creator.id,
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
