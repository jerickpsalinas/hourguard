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

interface AuthContextValue {
  member: MemberInfo | null;
  orgName: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  member: null,
  orgName: '',
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  async function loadUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMember(null);
        setError('not_authenticated');
        setLoading(false);
        return;
      }

      const { data: m, error: mErr } = await supabase
        .from('hg_members')
        .select('id, auth_user_id, organization_id, full_name, email, role')
        .eq('auth_user_id', user.id)
        .single();

      if (mErr || !m) {
        setMember(null);
        setError('no_membership');
        setLoading(false);
        return;
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('name, access_type')
        .eq('id', m.organization_id)
        .single();

      if (!org || !org.access_type?.includes('hourguard')) {
        setMember(null);
        setError('no_access');
        setLoading(false);
        return;
      }

      setMember({
        id: m.id,
        authUserId: m.auth_user_id,
        organizationId: m.organization_id,
        fullName: m.full_name,
        email: m.email,
        role: m.role,
      });
      setOrgName(org.name);
      setError(null);
    } catch {
      setError('unexpected_error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setMember(null);
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
    <AuthContext.Provider value={{ member, orgName, loading, error, refresh: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}
