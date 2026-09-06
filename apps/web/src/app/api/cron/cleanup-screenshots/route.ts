import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { serverError } from '@/app/api/v1/_lib/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'screenshots';
const BATCH = 500;
const MAX_BATCHES = 100; // safety cap: up to 50k rows/run, then next run continues

// Screenshots accumulate forever otherwise, growing storage cost without bound
// and undermining the flat yearly hosting fee. This deletes screenshots older
// than the retention window from both storage and the hg_screenshots table.
//
// Intended to be called on a schedule (Vercel Cron — see vercel.json). Protected
// by CRON_SECRET so it can't be triggered by the public. Storage objects are
// removed first; DB rows for a batch are deleted only once their files are gone,
// so a storage failure leaves the rows for the next run to retry rather than
// orphaning files with no reference.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[cron] cleanup-screenshots: CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const retentionDays = Number(process.env.SCREENSHOT_RETENTION_DAYS) || 90;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const supabase = createServiceClient();
  let deletedFiles = 0;
  let deletedRows = 0;
  let storageErrors = 0;

  for (let i = 0; i < MAX_BATCHES; i++) {
    const { data: old, error } = await supabase
      .from('hg_screenshots')
      .select('id, storage_path')
      .lt('captured_at', cutoff)
      .order('captured_at', { ascending: true })
      .limit(BATCH);

    if (error) return serverError('cron/cleanup-screenshots: query', error);
    if (!old || old.length === 0) break;

    const paths = old.map((r) => r.storage_path).filter((p): p is string => !!p);
    if (paths.length > 0) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths);
      if (rmErr) {
        // Leave this batch's rows in place; a later run retries once storage is
        // healthy, rather than orphaning files we can no longer find.
        console.error('[cron] cleanup-screenshots: storage remove failed', rmErr);
        storageErrors++;
        break;
      }
      deletedFiles += paths.length;
    }

    const ids = old.map((r) => r.id);
    const { error: delErr } = await supabase.from('hg_screenshots').delete().in('id', ids);
    if (delErr) return serverError('cron/cleanup-screenshots: delete rows', delErr);
    deletedRows += ids.length;

    if (old.length < BATCH) break;
  }

  return NextResponse.json({
    ok: true,
    retentionDays,
    cutoff,
    deletedFiles,
    deletedRows,
    storageErrors,
  });
}
