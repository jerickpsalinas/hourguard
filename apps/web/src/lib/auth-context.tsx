'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface MemberInfo {
  id: string;
  authUserId: string;
  organizationId: string;
  fullName: string;
  email: string;
  role: 'owner' | 'manager' | 'employee';
}

interface Membership extends MemberInfo {
  orgName: string;
}

interface AuthContextValue {
  member: MemberInfo | null;
  orgName: string;
  memberships: Membership[];
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  switchOrg: (organizationId: string) => void;
}

const ACTIVE_ORG_KEY = 'hg_active_org';

const AuthContext = createContext<AuthContextValue>({
  member: null,
  orgName: '',
  memberships: [],
  isAdmin: false,
  loading: true,
  error: null,
  refresh: async () => {},
  switchOrg: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function readStoredOrg(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ORG_KEY);
  } catch {
    return null;
  }
}

function storeActiveOrg(orgId: string) {
  try {
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
  } catch {
    /* ignore (private mode, blocked storage) */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const member = memberships.find((m) => m.organizationId === activeOrgId) ?? null;
  const orgName = member?.orgName ?? '';
  const isAdmin = member?.role === 'owner' || member?.role === 'manager';

  async function loadUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMemberships([]);
        setError('not_authenticated');
        setLoading(false);
        return;
      }

      // A user can belong to multiple orgs (invite flow inserts one row per org),
      // so never use .single() here — it errors on 2+ rows and locks the user out.
      const { data: rows, error: mErr } = await supabase
        .from('hg_members')
        .select('id, auth_user_id, organization_id, full_name, email, role, is_active')
        .eq('auth_user_id', user.id);

      if (mErr || !rows || rows.length === 0) {
        setMemberships([]);
        setError('no_membership');
        setLoading(false);
        return;
      }

      const activeRows = rows.filter((r) => r.is_active !== false);
      if (activeRows.length === 0) {
        setMemberships([]);
        setError('no_membership');
        setLoading(false);
        return;
      }

      const orgIds = Array.from(new Set(activeRows.map((r) => r.organization_id)));
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, access_type')
        .in('id', orgIds);

      const orgMap = new Map((orgs ?? []).map((o) => [o.id, o]));

      const accessible: Membership[] = activeRows
        .filter((r) => orgMap.get(r.organization_id)?.access_type?.includes('hourguard'))
        .map((r) => ({
          id: r.id,
          authUserId: r.auth_user_id,
          organizationId: r.organization_id,
          fullName: r.full_name,
          email: r.email,
          role: r.role,
          orgName: orgMap.get(r.organization_id)?.name ?? '',
        }));

      if (accessible.length === 0) {
        setMemberships([]);
        setError('no_access');
        setLoading(false);
        return;
      }

      const stored = readStoredOrg();
      const active = accessible.find((m) => m.organizationId === stored) ?? accessible[0];

      setMemberships(accessible);
      setActiveOrgId(active.organizationId);
      storeActiveOrg(active.organizationId);
      setError(null);
    } catch {
      setError('unexpected_error');
    } finally {
      setLoading(false);
    }
  }

  function switchOrg(organizationId: string) {
    if (!memberships.some((m) => m.organizationId === organizationId)) return;
    setActiveOrgId(organizationId);
    storeActiveOrg(organizationId);
  }

  useEffect(() => {
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setMemberships([]);
        setActiveOrgId(null);
        setError('not_authenticated');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ member, orgName, memberships, isAdmin, loading, error, refresh: loadUser, switchOrg }}>
      {children}
    </AuthContext.Provider>
  );
}
