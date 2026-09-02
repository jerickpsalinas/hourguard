import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/timesheets', label: 'Timesheets' },
  { href: '/dashboard/screenshots', label: 'Screenshots' },
  { href: '/dashboard/projects', label: 'Projects' },
  { href: '/dashboard/members', label: 'Members' },
  { href: '/dashboard/invoices', label: 'Invoices' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organizations(name)')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-slate-800 bg-slate-900 p-4 flex flex-col">
        <div className="mb-8">
          <h2 className="text-lg font-bold">Hubstaff Mimick</h2>
          <p className="text-xs text-slate-400 mt-1">{(profile as any)?.organizations?.name}</p>
        </div>
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-800 pt-4 mt-4">
          <p className="text-sm font-medium">{profile?.full_name}</p>
          <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
