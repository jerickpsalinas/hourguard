'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
}

const AuthContext = createContext<AuthContextValue>({
  member: null,
  orgName: '',
  loading: true,
  error: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
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
          setError('no_membership');
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

        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', m.organization_id)
          .single();

        if (org) setOrgName(org.name);
      } catch {
        setError('unexpected_error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ member, orgName, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
