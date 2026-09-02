import { createClient } from '@/lib/supabase-server';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single();

  const today = new Date().toISOString().split('T')[0];

  const { data: entries } = await supabase
    .from('time_entries')
    .select('user_id, started_at, stopped_at, activity_percent, profiles(full_name)')
    .eq('organization_id', profile!.organization_id)
    .gte('started_at', `${today}T00:00:00`)
    .order('started_at', { ascending: false });

  const userTotals = new Map<string, { name: string; seconds: number; avgActivity: number; count: number }>();

  for (const entry of entries ?? []) {
    const name = (entry as any).profiles?.full_name ?? 'Unknown';
    const existing = userTotals.get(entry.user_id) ?? { name, seconds: 0, avgActivity: 0, count: 0 };
    if (entry.stopped_at) {
      existing.seconds += (new Date(entry.stopped_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
    }
    existing.avgActivity += entry.activity_percent;
    existing.count++;
    userTotals.set(entry.user_id, existing);
  }

  const summary = Array.from(userTotals.values()).map((u) => ({
    ...u,
    hours: (u.seconds / 3600).toFixed(1),
    avgActivity: u.count > 0 ? Math.round(u.avgActivity / u.count) : 0,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Today&apos;s Overview</h1>
      <div className="grid gap-4">
        {summary.length === 0 && (
          <p className="text-slate-400">No time tracked today.</p>
        )}
        {summary.map((user, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-slate-400">{user.hours}h tracked</p>
            </div>
            <div className="text-right">
              <p className="text-sm">Activity: {user.avgActivity}%</p>
              <div className="mt-1 h-2 w-24 rounded-full bg-slate-700">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${user.avgActivity}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
