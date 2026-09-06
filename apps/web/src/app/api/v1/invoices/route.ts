import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, paginate } from '../_lib/auth';
import { serverError } from '../_lib/http';
import { createServiceClient } from '@/lib/supabase-server';
import { computeInvoiceTotals } from '@/lib/invoice';

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
    return serverError('GET /invoices', error);
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

  let entriesQuery = supabase
    .from('hg_time_entries')
    .select('started_at, stopped_at')
    .eq('organization_id', auth.organizationId)
    .not('stopped_at', 'is', null)
    .gte('started_at', `${from_date}T00:00:00.000Z`)
    .lte('started_at', `${to_date}T23:59:59.999Z`);
  if (project_id) entriesQuery = entriesQuery.eq('project_id', project_id);

  // These three reads are independent — run them together.
  // hg_invoices.created_by is NOT NULL and references hg_members — an API key is
  // not a member, so attribute the invoice to an owner/manager of the org.
  const [creatorResult, projectResult, entriesResult] = await Promise.all([
    supabase
      .from('hg_members')
      .select('id, role')
      .eq('organization_id', auth.organizationId)
      .in('role', ['owner', 'manager'])
      .eq('is_active', true)
      .order('role', { ascending: true }) // 'manager' < 'owner' alphabetically; either is acceptable
      .limit(1)
      .maybeSingle(),
    project_id
      ? supabase.from('hg_projects').select('id').eq('id', project_id).eq('organization_id', auth.organizationId).single()
      : Promise.resolve({ data: { id: null } }),
    entriesQuery,
  ]);

  const creator = creatorResult.data;
  if (!creator) {
    return NextResponse.json(
      { error: 'No owner or manager member found to attribute the invoice to' },
      { status: 409 }
    );
  }
  if (project_id && !projectResult.data) {
    return NextResponse.json({ error: 'project_id not found in this organization' }, { status: 404 });
  }

  const { totalHours, totalAmount } = computeInvoiceTotals(entriesResult.data ?? [], hourly_rate);

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
    return serverError('POST /invoices', error);
  }

  return NextResponse.json({ data: invoice }, { status: 201 });
}
