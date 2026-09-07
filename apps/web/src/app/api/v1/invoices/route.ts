import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, paginate } from '../_lib/auth';
import { serverError } from '../_lib/http';
import { createServiceClient } from '@/lib/supabase-server';
import { computeInvoiceTotals, validateInvoiceInput } from '@/lib/invoice';

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

  const validation = validateInvoiceInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { from_date, to_date, hourly_rate } = validation.value;
  const { title, project_id } = body;

  const supabase = createServiceClient();

  let entriesQuery = supabase
    .from('hg_time_entries')
    .select('started_at, stopped_at')
    .eq('organization_id', auth.organizationId)
    .not('stopped_at', 'is', null)
    .gte('started_at', `${from_date}T00:00:00.000Z`)
    .lte('started_at', `${to_date}T23:59:59.999Z`);
  if (project_id) entriesQuery = entriesQuery.eq('project_id', project_id);

  const [projectResult, entriesResult] = await Promise.all([
    project_id
      ? supabase.from('hg_projects').select('id').eq('id', project_id).eq('organization_id', auth.organizationId).single()
      : Promise.resolve({ data: { id: null } }),
    entriesQuery,
  ]);

  if (project_id && !projectResult.data) {
    return NextResponse.json({ error: 'project_id not found in this organization' }, { status: 404 });
  }

  const { totalHours, totalAmount } = computeInvoiceTotals(entriesResult.data ?? [], hourly_rate);

  const { data: invoice, error } = await supabase
    .from('hg_invoices')
    .insert({
      organization_id: auth.organizationId,
      project_id: project_id || null,
      created_by: null,
      created_via: 'api',
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
