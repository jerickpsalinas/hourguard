import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { Resend } from 'resend';
import { serverError } from '@/app/api/v1/_lib/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });

  const resend = new Resend(resendKey);
  const supabase = createServiceClient();

  const { data: orgs, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name')
    .contains('access_type', ['hourguard']);

  if (orgErr) return serverError('weekly-report: orgs', orgErr);
  if (!orgs || orgs.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let sent = 0;
  const errors: string[] = [];

  for (const org of orgs) {
    const [membersResult, entriesResult] = await Promise.all([
      supabase
        .from('hg_members')
        .select('id, full_name, email, role')
        .eq('organization_id', org.id)
        .eq('is_active', true),
      supabase
        .from('hg_time_entries')
        .select('member_id, started_at, stopped_at, hg_projects(name)')
        .eq('organization_id', org.id)
        .not('stopped_at', 'is', null)
        .gte('started_at', weekAgo),
    ]);

    const members = membersResult.data ?? [];
    const entries = entriesResult.data ?? [];
    const admins = members.filter((m) => m.role === 'owner' || m.role === 'manager');
    if (admins.length === 0 || entries.length === 0) continue;

    const memberHours = new Map<string, { name: string; seconds: number }>();
    const projectHours = new Map<string, number>();

    for (const e of entries) {
      const dur = (new Date(e.stopped_at!).getTime() - new Date(e.started_at).getTime()) / 1000;
      if (dur <= 0) continue;
      const m = memberHours.get(e.member_id) ?? { name: '', seconds: 0 };
      const member = members.find((mb) => mb.id === e.member_id);
      m.name = member?.full_name ?? 'Unknown';
      m.seconds += dur;
      memberHours.set(e.member_id, m);

      const pName = (e as any).hg_projects?.name ?? 'No project';
      projectHours.set(pName, (projectHours.get(pName) ?? 0) + dur);
    }

    const totalHours = Math.round(Array.from(memberHours.values()).reduce((s, m) => s + m.seconds, 0) / 360) / 10;
    const topMembers = Array.from(memberHours.values())
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 10);
    const topProjects = Array.from(projectHours.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const weekStart = new Date(weekAgo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEnd = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const html = buildEmailHtml({
      orgName: org.name,
      weekStart,
      weekEnd,
      totalHours,
      activeMemberCount: memberHours.size,
      totalMemberCount: members.length,
      topMembers: topMembers.map((m) => ({ name: m.name, hours: Math.round(m.seconds / 360) / 10 })),
      topProjects: topProjects.map(([name, secs]) => ({ name, hours: Math.round(secs / 360) / 10 })),
    });

    for (const admin of admins) {
      try {
        await resend.emails.send({
          from: 'Hourguard <noreply@hirejps.com>',
          to: admin.email,
          subject: `Weekly Activity Report — ${org.name} (${weekStart} – ${weekEnd})`,
          html,
        });
        sent++;
      } catch (err: any) {
        errors.push(`${admin.email}: ${err.message}`);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, errors: errors.length > 0 ? errors : undefined });
}

function buildEmailHtml(data: {
  orgName: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  activeMemberCount: number;
  totalMemberCount: number;
  topMembers: { name: string; hours: number }[];
  topProjects: { name: string; hours: number }[];
}) {
  const memberRows = data.topMembers
    .map((m) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #222">${m.name}</td><td style="padding:8px 12px;border-bottom:1px solid #222;text-align:right">${m.hours}h</td></tr>`)
    .join('');

  const projectRows = data.topProjects
    .map((p) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #222">${p.name}</td><td style="padding:8px 12px;border-bottom:1px solid #222;text-align:right">${p.hours}h</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="font-size:20px;margin:0 0 4px">Weekly Activity Report</h1>
    <p style="color:#999;font-size:14px;margin:0">${data.orgName} — ${data.weekStart} – ${data.weekEnd}</p>
  </div>

  <div style="display:flex;gap:12px;margin-bottom:24px;text-align:center">
    <div style="flex:1;background:#111;border:1px solid #222;border-radius:12px;padding:16px">
      <div style="font-size:24px;font-weight:bold;color:#e0192b">${data.totalHours}h</div>
      <div style="font-size:12px;color:#999;margin-top:4px">Total Hours</div>
    </div>
    <div style="flex:1;background:#111;border:1px solid #222;border-radius:12px;padding:16px">
      <div style="font-size:24px;font-weight:bold">${data.activeMemberCount}</div>
      <div style="font-size:12px;color:#999;margin-top:4px">Active Members</div>
    </div>
    <div style="flex:1;background:#111;border:1px solid #222;border-radius:12px;padding:16px">
      <div style="font-size:24px;font-weight:bold">${data.totalMemberCount}</div>
      <div style="font-size:12px;color:#999;margin-top:4px">Total Members</div>
    </div>
  </div>

  <h2 style="font-size:16px;margin:24px 0 12px">Hours by Member</h2>
  <table style="width:100%;border-collapse:collapse;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;font-size:14px">
    <thead><tr style="background:#1a1a1a"><th style="padding:10px 12px;text-align:left;color:#999;font-weight:500">Member</th><th style="padding:10px 12px;text-align:right;color:#999;font-weight:500">Hours</th></tr></thead>
    <tbody>${memberRows}</tbody>
  </table>

  ${data.topProjects.length > 0 ? `
  <h2 style="font-size:16px;margin:24px 0 12px">Top Projects</h2>
  <table style="width:100%;border-collapse:collapse;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;font-size:14px">
    <thead><tr style="background:#1a1a1a"><th style="padding:10px 12px;text-align:left;color:#999;font-weight:500">Project</th><th style="padding:10px 12px;text-align:right;color:#999;font-weight:500">Hours</th></tr></thead>
    <tbody>${projectRows}</tbody>
  </table>` : ''}

  <div style="text-align:center;margin-top:32px">
    <a href="https://hourguard.hirejps.com/dashboard" style="display:inline-block;background:#e0192b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500">View Full Dashboard</a>
  </div>

  <p style="text-align:center;color:#555;font-size:12px;margin-top:32px">
    Hourguard by HireJPS — Automated weekly report
  </p>
</div>
</body>
</html>`;
}
