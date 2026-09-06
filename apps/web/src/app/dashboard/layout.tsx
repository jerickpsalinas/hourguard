'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { AuthProvider, useAuth } from '@/lib/auth-context';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/dashboard/timesheets', label: 'Timesheets', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/dashboard/screenshots', label: 'Screenshots', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { href: '/dashboard/projects', label: 'Projects', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { href: '/dashboard/members', label: 'Members', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', adminOnly: true },
  { href: '/dashboard/invoices', label: 'Invoices', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z', adminOnly: true },
  { href: '/dashboard/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', adminOnly: true },
  { href: '/dashboard/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { member, orgName, memberships, loading, error, switchOrg } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-brand" />
          <p className="text-sm text-white/50">Loading...</p>
        </div>
      </div>
    );
  }

  if (error === 'not_authenticated') {
    router.push('/login');
    return null;
  }

  if (error === 'no_membership') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-lg font-display font-semibold mb-2">No membership found</p>
          <p className="text-sm text-white/50">Your account is not linked to any organization in Hourguard. Contact your administrator or sign up for a new organization.</p>
        </div>
      </div>
    );
  }

  if (error === 'no_access') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-lg font-display font-semibold mb-2">Hourguard not activated</p>
          <p className="text-sm text-white/50">Your organization does not have access to Hourguard. Contact your administrator to activate it from the HireJPS portal.</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 border-r border-white/[0.08] bg-[#0a0a0a] p-5 flex flex-col
        transform transition-transform duration-200 ease-out
        lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl btn-brand flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-display font-bold tracking-tight">Hourguard</h2>
              {orgName && memberships.length <= 1 && (
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">// {orgName}</p>
              )}
            </div>
          </div>

          {memberships.length > 1 && (
            <select
              value={member?.organizationId ?? ''}
              onChange={(e) => switchOrg(e.target.value)}
              aria-label="Switch organization"
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs text-white/70 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors"
            >
              {memberships.map((m) => (
                <option key={m.organizationId} value={m.organizationId}>
                  {m.orgName}
                </option>
              ))}
            </select>
          )}
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.filter((item) => !item.adminOnly || member?.role === 'owner' || member?.role === 'manager').map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive(item.href)
                  ? 'bg-brand/10 text-brand font-medium'
                  : 'text-white/40 hover:bg-white/[0.06] hover:text-white/70'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/[0.08] pt-4 mt-4">
          {member && (
            <>
              <p className="text-sm font-medium">{member.fullName}</p>
              <p className="text-xs text-white/40 capitalize">{member.role}</p>
            </>
          )}
          <button
            onClick={handleLogout}
            className="mt-3 flex items-center gap-2 text-sm text-white/40 hover:text-brand transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-white/[0.08] bg-black/80 backdrop-blur px-6 py-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-xl p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-display font-semibold">Hourguard</span>
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
